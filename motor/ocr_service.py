"""
motor/ocr_service.py — extração de dados de documento fiscal via IA.

Dois backends com o MESMO contrato de saída (JSON + confianca_ocr):
    - extract_with_gemini: Gemini 1.5 Flash em modo visão (nuvem).
    - extract_with_ollama: modelo de visão local (llava/qwen2.5-vl via Ollama)
      — zero egress, para ambientes air-gapped (P4). PDF é renderizado
      (pymupdf) antes de virar imagem pro modelo local.
    - extract_documento: dispatcher — escolhe o backend por configuração.

IMPORTANTE: a confiança é uma HEURÍSTICA (completude dos campos +
consistência matemática entre Valor_Total e Subtotal-Impostos), não uma
probabilidade calibrada do modelo — documentado assim pra não ser lido
como mais rigoroso do que é.
"""
import base64
import json
import logging
import os
import re
import time

import google.generativeai as genai

log = logging.getLogger("motor.ocr_service")

MAX_TENTATIVAS = 3
BACKOFF_BASE_S = 2  # 2s, 4s, 8s entre tentativas

_MARCADORES_RATE_LIMIT = ("429", "quota", "rate limit", "resourceexhausted")


def _e_rate_limit(erro: Exception) -> bool:
    texto = str(erro).lower()
    return any(marcador in texto for marcador in _MARCADORES_RATE_LIMIT)

CAMPOS_ESSENCIAIS = [
    "CNPJ_CPF", "Razao_Social", "Data_Emissao", "Valor_Total",
    "Numero_Nota_Recibo", "Forma_Pagamento",
]

PROMPT_EXTRACAO = """
Analise o documento fiscal anexo (Nota Fiscal, Recibo, PIX ou Boleto) e extraia os dados abaixo estritamente no formato JSON.
Se algum campo não existir no documento, retorne null.

{
    "CNPJ_CPF": "Formato 00.000.000/0000-00",
    "Razao_Social": "Nome do prestador ou fornecedor",
    "Data_Emissao": "Formato YYYY-MM-DD",
    "Valor_Total": número float (ex: 1500.50),
    "Subtotal": número float,
    "Impostos_Retencoes": número float,
    "Descricao": "Descrição resumida do serviço/produto",
    "Chave_Acesso_NFe_44_digitos": "Chave de 44 números, sem espaços se for NFe",
    "Numero_Nota_Recibo": "Número do documento",
    "Forma_Pagamento": "PIX, Boleto, Cartão, Transferência, etc"
}

Retorne APENAS o JSON, sem markdown ou formatação adicional.
"""


def _calcular_confianca(dados: dict) -> tuple:
    """
    Heurística de confiança (0 a 1), não uma probabilidade do modelo.
    60% completude dos campos essenciais + 40% consistência matemática
    (só entra na conta se Valor_Total e Subtotal vierem preenchidos).
    Retorna (confianca, motivos[]) — motivos vão pro log e podem alimentar
    campos_revisao pra quem for revisar entender o porquê da nota.
    """
    motivos = []

    preenchidos = sum(1 for c in CAMPOS_ESSENCIAIS if dados.get(c) not in (None, "", 0))
    completude = preenchidos / len(CAMPOS_ESSENCIAIS)
    if completude < 1.0:
        faltando = [c for c in CAMPOS_ESSENCIAIS if dados.get(c) in (None, "", 0)]
        motivos.append(f"campos ausentes: {', '.join(faltando)}")

    consistencia = 1.0
    valor_total = dados.get("Valor_Total")
    subtotal = dados.get("Subtotal")
    retencoes = dados.get("Impostos_Retencoes") or 0.0
    if valor_total is not None and subtotal:
        try:
            esperado = float(subtotal) - float(retencoes)
            diff = abs(float(valor_total) - esperado)
            if diff > 1.0:
                consistencia = max(0.0, 1.0 - diff / max(float(valor_total), 1.0))
                motivos.append(
                    f"Valor_Total ({valor_total}) não bate com Subtotal - Impostos ({esperado:.2f})"
                )
        except (TypeError, ValueError):
            pass

    confianca = round(0.6 * completude + 0.4 * consistencia, 3)
    return confianca, motivos


def configure_gemini(api_key: str) -> bool:
    if not api_key:
        return False
    genai.configure(api_key=api_key)
    return True


def extract_with_gemini(bytes_data: bytes, mime_type: str, api_key: str):
    """
    Lê um documento fiscal (PDF ou imagem) via Gemini 1.5 Flash em modo
    visão e devolve os dados extraídos com `confianca_ocr` já calculada.
    Retorna None se a chave não estiver configurada ou a chamada falhar —
    quem chama decide o que fazer (hoje: 503, nunca finge sucesso).
    """
    if not configure_gemini(api_key):
        log.warning("GOOGLE_API_KEY ausente — extração OCR abortada.")
        return None

    model = genai.GenerativeModel("gemini-1.5-flash")
    payload = [
        {"mime_type": mime_type, "data": base64.b64encode(bytes_data).decode("utf-8")},
        PROMPT_EXTRACAO,
    ]

    dados = None
    for tentativa in range(1, MAX_TENTATIVAS + 1):
        try:
            response = model.generate_content(payload)
            texto = response.text.replace("```json", "").replace("```", "").strip()
            dados = json.loads(texto)
            break
        except Exception as e:
            if _e_rate_limit(e) and tentativa < MAX_TENTATIVAS:
                espera = BACKOFF_BASE_S * (2 ** (tentativa - 1))
                log.warning(
                    "Rate limit do Gemini (tentativa %d/%d) — aguardando %ds: %s",
                    tentativa, MAX_TENTATIVAS, espera, e,
                )
                time.sleep(espera)
                continue
            log.warning("Extração OCR via Gemini falhou (tentativa %d/%d): %s", tentativa, MAX_TENTATIVAS, e)
            return None

    confianca, motivos = _calcular_confianca(dados)
    dados["confianca_ocr"] = confianca
    dados["_motivos_confianca"] = motivos
    if motivos:
        log.info("OCR com confianca_ocr=%.2f — %s", confianca, "; ".join(motivos))

    return dados


# ---------------------------------------------------------------- P4: OCR local (Ollama)
def ollama_ocr_disponivel() -> bool:
    """Só o pacote importa — o daemon pode estar desligado (aí a chamada
    falha e devolve None, quem chama decide)."""
    try:
        import ollama  # noqa: PLC0415
        return True
    except ImportError:
        return False


def _pdf_para_imagem(bytes_data: bytes, pagina: int = 0, dpi: int = 150) -> bytes | None:
    """Renderiza uma página de PDF pra PNG — modelos de visão do Ollama
    (llava, qwen2.5-vl) não leem PDF direto; o Gemini aceita."""
    try:
        import pymupdf
        doc = pymupdf.open(stream=bytes_data, filetype="pdf")
        if pagina >= doc.page_count:
            return None
        pix = doc[pagina].get_pixmap(dpi=dpi)
        return pix.tobytes("png")
    except Exception as e:
        log.warning("Render de PDF falhou (%s).", e)
        return None


def extract_with_ollama(
    bytes_data: bytes,
    mime_type: str,
    modelo: str = "llava",
    cliente=None,
) -> dict | None:
    """Mesmo contrato de extract_with_gemini, mas via Ollama local.

    PDF é renderizado (pymupdf) antes de virar imagem. `cliente` injetável
    (testes); None -> tenta `import ollama`. Sem daemon/modelo -> None (quem
    chama decide: nunca finge sucesso).
    """
    if cliente is None:
        try:
            import ollama as cliente  # noqa: PLC0415
        except ImportError:
            log.warning("Ollama indisponível — OCR local abortado.")
            return None

    imagem = None
    if mime_type == "application/pdf" or str(bytes_data[:4]) == "%PDF":
        imagem = _pdf_para_imagem(bytes_data)
        if imagem is None:
            log.warning("Não foi possível renderizar o PDF p/ OCR local.")
            return None
    else:
        imagem = bytes_data

    try:
        resp = cliente.generate(
            model=modelo,
            prompt=PROMPT_EXTRACAO,
            images=[base64.b64encode(imagem).decode("ascii")],
            format="json",  # Ollama 0.2+: força resposta JSON
        )
        texto = resp["response"]
    except Exception as e:
        log.warning("OCR via Ollama falhou (%s).", e)
        return None

    try:
        dados = json.loads(texto)
    except json.JSONDecodeError:
        log.warning("OCR via Ollama devolveu JSON inválido.")
        return None
    if not isinstance(dados, dict):
        log.warning("OCR via Ollama devolveu algo que não é dict.")
        return None

    confianca, motivos = _calcular_confianca(dados)
    dados["confianca_ocr"] = confianca
    dados["_motivos_confianca"] = motivos
    dados["_fonte_extracao"] = "ollama"
    if motivos:
        log.info("OCR local com confianca_ocr=%.2f — %s", confianca, "; ".join(motivos))
    return dados


def extract_native_pdf_text(bytes_data: bytes, max_pages: int = 10) -> dict | None:
    """
    Tenta extrair texto nativo de um PDF digital sem chamar IA.
    Se o PDF contiver texto selecionável rico com marcadores fiscais (CNPJ/CPF,
    Data, Valor), devolve o dicionário estruturado com _fonte_extracao='native_pdf_text'.
    Se for PDF digitalizado (imagem escaneada) ou com pouco texto, retorna None.
    """
    try:
        import pymupdf
        doc = pymupdf.open(stream=bytes_data, filetype="pdf")
        if doc.page_count == 0:
            return None
        
        texto_completo = []
        is_ginfes_or_nfse = False

        # 1. Primeira passada para checar presença de texto e identificar se é GINFES / NFS-e
        raw_text_chunks = []
        for p in range(min(doc.page_count, max_pages)):
            raw_text_chunks.append(doc[p].get_text())
        sample_text = "\n".join(raw_text_chunks)
        if len(sample_text.strip()) < 30:
            return None

        if "ginfes" in sample_text.lower() or "prefeitura" in sample_text.lower() or "nfs-e" in sample_text.lower() or "nota fiscal de serviços" in sample_text.lower():
            is_ginfes_or_nfse = True

        # 2. Se for GINFES ou NFS-e com desenho em múltiplas camadas, reordena por coordenadas visuais
        if is_ginfes_or_nfse:
            for p in range(min(doc.page_count, max_pages)):
                page = doc[p]
                words = page.get_text("words")  # (x0, y0, x1, y1, word, block_no, line_no, word_no)
                if not words:
                    texto_completo.append(page.get_text())
                    continue
                # Agrupa palavras na mesma linha vertical (tolerância 3.5 pt)
                sorted_words = sorted(words, key=lambda w: (w[1], w[0]))
                linhas = []
                for w in sorted_words:
                    matched_line = None
                    for l in linhas:
                        if abs(l["y"] - w[1]) < 3.5:
                            matched_line = l
                            break
                    if matched_line:
                        matched_line["words"].append(w)
                    else:
                        linhas.append({"y": w[1], "words": [w]})
                linhas.sort(key=lambda l: l["y"])
                page_lines = []
                for l in linhas:
                    l["words"].sort(key=lambda w: w[0])
                    line_str = " ".join(w[4] for w in l["words"]).strip()
                    if line_str:
                        page_lines.append(line_str)
                texto_completo.append("\n".join(page_lines))
        else:
            texto_completo = raw_text_chunks
        
        full_text = "\n".join(texto_completo).strip()
        if len(full_text) < 30:
            return None
        
        # Procura CNPJ ou CPF
        cnpj_match = re.search(r"\b(\d{2}\.\d{3}\.\d{3}/\d{4}-\d{2})\b", full_text)
        cpf_match = re.search(r"\b(\d{3}\.\d{3}\.\d{3}-\d{2})\b", full_text)
        cnpj_cpf = cnpj_match.group(1) if cnpj_match else (cpf_match.group(1) if cpf_match else None)
        
        # Procura Data
        data_match = re.search(r"\b(\d{2})[/.-](\d{2})[/.-](\d{4})\b", full_text)
        data_emissao = None
        if data_match:
            d, m, y = data_match.groups()
            data_emissao = f"{y}-{m}-{d}"
            
        # Procura Valor Total / Líquido
        valor_match = re.search(
            r"(?:valor\s*l[ií]quido|valor\s*dos\s*servi[çc]os|total\s*da\s*nota|valor\s*total|total\s*a\s*pagar|valor\s*pago|valor)[^\d\n\r]*R?\$?\s*([\d\.]+(?:,\d{2}))",
            full_text,
            re.IGNORECASE
        )
        valor_total = None
        if valor_match:
            try:
                v_str = valor_match.group(1).replace(".", "").replace(",", ".")
                valor_total = float(v_str)
            except ValueError:
                pass
                
        # Procura Número da Nota / NFS-e
        num_match = re.search(
            r"(?:n[uú]mero\s*da\s*nfs-?e|n[uú]mero\s*da\s*nota|nfs-?e\s*n[oº]?|nota\s*fiscal\s*n[oº]?|n[uú]mero|n[oº]|recibo)[^\d\n\r]*(\d{1,9})",
            full_text,
            re.IGNORECASE
        )
        numero_doc = num_match.group(1) if num_match else None

        # Procura Recibo / Código de Verificação / RPS (específico GINFES)
        recibo_match = re.search(
            r"(?:c[oó]digo\s*de\s*verifica[çc][aã]o|recibo\s*provis[oó]rio|rps\s*n[oº]?|recibo\s*n[oº]?)[^\w\n\r]*([A-Za-z0-9\.\-]{4,30})",
            full_text,
            re.IGNORECASE
        )
        recibo_numero = recibo_match.group(1) if recibo_match else None

        # Procura Razão Social / Nome do Prestador
        razao_social = None
        razao_match = re.search(
            r"(?:Nome\s*/\s*Raz[aã]o\s*Social|Raz[aã]o\s*Social|Nome\s*Empresarial|Nome\s*do\s*Prestador)\s*[:\-]\s*([A-ZÀ-Úa-zà-ú0-9\s\.\-]{3,70})",
            full_text,
            re.IGNORECASE
        )
        if not razao_match:
            razao_match = re.search(
                r"PRESTADOR\s*DE\s*SERVI[ÇC]OS\s*[\n\r]+\s*(?:Nome\s*/\s*Raz[aã]o\s*Social)?\s*[:\-]?\s*([A-ZÀ-Úa-zà-ú0-9\s\.\-]{3,70})",
                full_text,
                re.IGNORECASE
            )
        if razao_match:
            candidate_razao = razao_match.group(1).strip()
            candidate_razao = re.split(r"\b(?:CPF|CNPJ|Inscri[çc][aã]o|Endere[çc]o)\b", candidate_razao, flags=re.IGNORECASE)[0].strip()
            if len(candidate_razao) >= 3 and not any(stop in candidate_razao.upper() for stop in ["PREFEITURA", "MUNICIPIO", "SECRETARIA", "SISTEMA GINFES"]):
                razao_social = candidate_razao

        if (cnpj_cpf or numero_doc) and (valor_total is not None or data_emissao):
            dados = {
                "CNPJ_CPF": cnpj_cpf,
                "Razao_Social": razao_social,
                "Data_Emissao": data_emissao,
                "Valor_Total": valor_total,
                "Subtotal": valor_total,
                "Impostos_Retencoes": 0.0,
                "Descricao": full_text[:200],
                "Chave_Acesso_NFe_44_digitos": None,
                "Numero_Nota_Recibo": numero_doc,
                "Recibo_Numero": recibo_numero,
                "Forma_Pagamento": "Transferência / Boleto / PIX",
                "_fonte_extracao": "native_pdf_text",
                "is_ginfes": is_ginfes_or_nfse
            }
            confianca, motivos = _calcular_confianca(dados)
            # Bonificação para documentos com número, valor e CNPJ/recibo
            if numero_doc and valor_total and (cnpj_cpf or recibo_numero):
                confianca = max(confianca, 0.88)
            dados["confianca_ocr"] = confianca
            dados["_motivos_confianca"] = motivos
            if confianca >= 0.70:
                log.info("Extração de texto nativo do PDF bem-sucedida (confiança: %.2f)", confianca)
                return dados
    except Exception as e:
        log.debug("Extração de texto nativo do PDF falhou (%s). Prosseguindo para OCR via IA.", e)
        
    return None



def extract_documento(
    conteudo: bytes,
    mime_type: str,
    api_key: str | None = None,
    backend: str | None = None,
    modelo_ollama: str = "llava",
    tentar_texto_nativo: bool = True,
) -> dict | None:
    """Dispatcher P4: escolhe o melhor método de extração.

    1. Tenta extrair texto nativo digital (sem custo de IA).
    2. Se não conseguir, usa backend explícito ("gemini" | "ollama"):
        - OCR_BACKEND no ambiente (ou settings.ocr_backend) decide;
        - senão: Gemini se houver api_key, Ollama caso contrário.
    Retorna None se nenhum backend estiver disponível na prática.
    """
    if tentar_texto_nativo and (mime_type == "application/pdf" or str(conteudo[:4]) == "%PDF"):
        native_data = extract_native_pdf_text(conteudo)
        if native_data is not None and native_data.get("confianca_ocr", 0) >= 0.85:
            return native_data

    if not backend:
        backend = os.environ.get("OCR_BACKEND", "gemini" if api_key else "ollama")
    if backend == "ollama":
        return extract_with_ollama(conteudo, mime_type, modelo=modelo_ollama)
    if api_key:
        return extract_with_gemini(conteudo, mime_type, api_key)
    return None

