"""Vocabulário explícito de planilhas financeiras, compartilhado com a API."""

import re
import unicodedata


COLUNAS_FINANCEIRAS = {
    "controle": ("CONTROLE",),
    "entrada": ("ENTRADA",),
    "valor_entrada": ("VALOR ENTRADA",),
    "prestador": (
        "PRESTADOR DE SERVIÇO", "PRESTADOR", "FORNECEDOR",
        "FORNECEDOR PESSOA FÍSICA", "FAVORECIDO", "BENEFICIÁRIO",
    ),
    "razao_social": ("RAZÃO SOCIAL",),
    "data": ("DATA", "DATA DE PAGAMENTO", "DATA DO PAGAMENTO", "DATA PAGAMENTO"),
    "valor": ("VALOR", "VALOR PAGO", "VALOR DO PAGAMENTO", "VALOR PAGAMENTO"),
    "saldo": ("SALDO",),
    "item": ("ITEM",),
    "rubrica": ("RUBRICA", "RUBRICA SALIC"),
    "status_revisao": ("STATUS DA REVISÃO",),
    "documento_fiscal": ("DOCUMENTO FISCAL", "DOC FISCAL", "DOCUMENTO"),
    "evidencia": ("PRINT (EVIDÊNCIA)",),
}


def normalizar_cabecalho(valor) -> str:
    texto = unicodedata.normalize("NFKD", str(valor or ""))
    texto = "".join(c for c in texto if not unicodedata.combining(c))
    return re.sub(r"\s+", " ", texto).strip().upper()


def mapear_cabecalho(celulas, aliases, linha: int, linhas_dados=()) -> dict[str, int]:
    """Índices zero-based; candidatos incompletos não são cabeçalhos."""
    candidatas = {
        conceito: [
            indice for indice, valor in enumerate(celulas)
            if normalizar_cabecalho(valor) in {normalizar_cabecalho(n) for n in nomes}
        ]
        for conceito, nomes in aliases.items()
    }
    mapeadas = {conceito: indices[0] for conceito, indices in candidatas.items() if indices}
    if not {"prestador", "data", "valor"} <= mapeadas.keys():
        return {}
    # Modelos legados possuem duas RUBRICA: descrição e código. Só resolve
    # quando todas as células preenchidas comprovam papéis distintos.
    rubricas = candidatas.get("rubrica", [])
    if len(rubricas) > 1:
        valores = {indice: [] for indice in rubricas}
        for dados in linhas_dados:
            for indice in rubricas:
                if indice < len(dados) and dados[indice] not in (None, ""):
                    valores[indice].append(str(dados[indice]).strip())
        codigos = [
            indice for indice, textos in valores.items()
            if textos and all(re.fullmatch(r"\d+(?:\.\d+)+", texto) for texto in textos)
        ]
        if len(codigos) == 1 and all(
            textos and all(not re.fullmatch(r"\d+(?:\.\d+)+", texto) for texto in textos)
            for indice, textos in valores.items() if indice != codigos[0]
        ):
            candidatas["rubrica"] = codigos
            mapeadas["rubrica"] = codigos[0]
    ambiguas = [
        f"{conceito} (colunas {', '.join(str(i + 1) for i in indices)})"
        for conceito, indices in candidatas.items() if len(indices) > 1
    ]
    if ambiguas:
        raise ValueError(
            f"Cabeçalho ambíguo na linha {linha}: {'; '.join(ambiguas)}. "
            "Mantenha uma única coluna por conceito."
        )
    return mapeadas
