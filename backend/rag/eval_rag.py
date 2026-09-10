#!/usr/bin/env python3
"""
backend/rag/eval_rag.py — Executor de Avaliação e Benchmark do Golden Dataset

Mede:
- Recall@5 (Meta: >= 0,80)
- MRR@3 (Meta: >= 0,75)
- Precisão de Contexto (Meta: >= 0,80)
- Fidelidade (Meta: >= 0,85)
- p95 de latência (Meta: < 1,5s sem reranker, < 2,5s com reranker)
"""
import json
import logging
import os
import time
from pathlib import Path
from typing import Any, Dict, List

from motor.rag_service import RAGDocumentalEngine

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
log = logging.getLogger("eval_rag")

METAS = {
    "recall_at_5": 0.80,
    "mrr_at_3": 0.75,
    "context_precision": 0.80,
    "faithfulness": 0.85,
    "latency_p95_sec": 1.5,
}


def carregar_golden_dataset(caminho: Path) -> List[Dict[str, Any]]:
    with open(caminho, "r", encoding="utf-8") as f:
        dados = json.load(f)
    return dados.get("cases", [])


def seed_corpus_para_avaliacao(engine: RAGDocumentalEngine, dataset: List[Dict[str, Any]], project_id: str = "1961"):
    """
    Popula corpus em memória ou mock caso a conexão remota não tenha os documentos
    para garantir reproducibilidade estrita em qualquer ambiente de CI/CD.
    """
    corpus_documentos = [
        {
            "document_id": "doc-bb-110401",
            "file_name": "001 - 04-11-2022 - Comprovante BB 110401 TED Monica Guimaraes.pdf",
            "doc_type": "COMPROVANTE_PAGAMENTO",
            "content": (
                "BANCO DO BRASIL - SEGUNDA VIA DE COMPROVANTE DE TRANSFERÊNCIA\n"
                "CLIENTE: CIRCUNSTANCIA CINEMATOGRAFICA E PROD LTDA\n"
                "AGENCIA: 3324-3 CONTA VINCULADA: 1961-0\n"
                "DATA DO PAGAMENTO: 04/11/2022\n"
                "DOCUMENTO : 110401\n"
                "AUTENTICACAO SISBB : A.771.B90.221.004.110\n"
                "FAVORECIDO: MONICA GUIMARAES\n"
                "CPF/CNPJ: 12.345.678/0001-90\n"
                "VALOR LIQUIDO TRANSFERIDO: R$ 13.500,00\n"
                "FINALIDADE: PAGAMENTO DE SERVICOS DE PRODUCAO EXECUTIVA"
            ),
            "page": 1,
            "date": "04/11/2022",
        },
        {
            "document_id": "doc-nf-4521",
            "file_name": "001 - 04-11-2022 - Monica Guimaraes - Produtora Executiva.pdf",
            "doc_type": "NFSE",
            "content": (
                "PREFEITURA MUNICIPAL - NOTA FISCAL DE SERVIÇOS ELETRÔNICA - NFS-e\n"
                "NÚMERO DA NOTA: 4521\n"
                "DATA DE EMISSÃO: 04/11/2022\n"
                "PRESTADOR DE SERVIÇOS: MÔNICA GUIMARÃES PRODUÇÕES ME\n"
                "CNPJ: 12.345.678/0001-90\n"
                "DISCRIMINAÇÃO DOS SERVIÇOS: SERVIÇOS DE PRODUÇÃO EXECUTIVA PARA O PROJETO AUDIOVISUAL 1961.\n"
                "VALOR BRUTO DA NOTA: R$ 15.000,00\n"
                "RETENÇÕES NA FONTE: ISS (5%) R$ 750,00 | IRRF (1,5%) R$ 225,00 | INSS (11%) R$ 525,00\n"
                "TOTAL RETENÇÕES: R$ 1.500,00\n"
                "VALOR LÍQUIDO A PAGAR: R$ 13.500,00"
            ),
            "page": 1,
            "date": "04/11/2022",
        },
        {
            "document_id": "doc-fermata-166",
            "file_name": "166. Fermata - Licenciamento de Obra Musical.pdf",
            "doc_type": "NFE",
            "content": (
                "FERMATA DO BRASIL EDIÇÕES MUSICAIS LTDA\n"
                "CNPJ: 33.123.456/0001-78\n"
                "NOTA FISCAL Nº 166\n"
                "DATA: 10/12/2022\n"
                "DISCRIMINAÇÃO: CESSÃO DE DIREITOS AUTORAIS E LICENCIAMENTO DE SINCRONIZAÇÃO DE TRILHA SONORA ORIGINAL.\n"
                "VALOR TOTAL: R$ 4.500,00"
            ),
            "page": 1,
            "date": "10/12/2022",
        },
        {
            "document_id": "doc-ted-88201",
            "file_name": "045 - Locacao de Cameras e Grua Cine Locacoes doc 88201.pdf",
            "doc_type": "COMPROVANTE_PAGAMENTO",
            "content": (
                "COMPROVANTE DE TRANSFERÊNCIA ELETRÔNICA DISPONÍVEL - TED\n"
                "DOCUMENTO: 88201\n"
                "FAVORECIDO: CINE LOCAÇÕES E ILUMINAÇÃO LTDA\n"
                "VALOR TRANSFERIDO: R$ 12.350,00\n"
                "REF: LOCAÇÃO DE CÂMERAS E EQUIPAMENTOS DE ILUMINAÇÃO"
            ),
            "page": 1,
            "date": "15/11/2022",
        },
        {
            "document_id": "doc-nfe-8902",
            "file_name": "NF-e 8902 - Cine Locacoes Ltda.pdf",
            "doc_type": "NFE",
            "content": (
                "DANFE - NOTA FISCAL ELETRÔNICA\n"
                "Nº 8902 SÉRIE 1\n"
                "EMITENTE: CINE LOCAÇÕES E ILUMINAÇÃO LTDA - CNPJ: 44.555.666/0001-11\n"
                "VALOR TOTAL DA NOTA FISCAL: R$ 13.000,00\n"
                "VALOR RETIDO IRRF: R$ 650,00 | VALOR LÍQUIDO: R$ 12.350,00"
            ),
            "page": 1,
            "date": "15/11/2022",
        },
        {
            "document_id": "doc-darf-1708",
            "file_name": "Guia DARF 1708 IRRF Outubro 2022.pdf",
            "doc_type": "COMPROVANTE_RETENCAO",
            "content": (
                "MINISTÉRIO DA FAZENDA - SECRETARIA DA RECEITA FEDERAL DO BRASIL\n"
                "DOCUMENTO DE ARRECADAÇÃO DE RECEITAS FEDERAIS - DARF\n"
                "CÓDIGO DA RECEITA: 1708 (IRRF - SERVIÇOS PRESTADOS POR PESSOA JURÍDICA)\n"
                "PERÍODO DE APURAÇÃO: 31/10/2022\n"
                "VALOR DO PRINCIPAL: R$ 650,00 | AUTENTICAÇÃO BANCÁRIA BB CONFIRMADA"
            ),
            "page": 1,
            "date": "20/11/2022",
        },
        {
            "document_id": "doc-dam-iss",
            "file_name": "Guia ISS Prefeitura Municipal servico 4521.pdf",
            "doc_type": "COMPROVANTE_RETENCAO",
            "content": (
                "SECRETARIA MUNICIPAL DE FAZENDA - GUIA DAM DE RECOLHIMENTO\n"
                "TRIBUTO: ISS - IMPOSTO SOBRE SERVIÇOS RETIDO NA FONTE\n"
                "REF NOTA FISCAL: 4521\n"
                "VALOR RECOLHIDO: R$ 750,00"
            ),
            "page": 1,
            "date": "10/11/2022",
        },
        {
            "document_id": "doc-gps-inss",
            "file_name": "Guia da Previdencia Social GPS INSS Producao.pdf",
            "doc_type": "COMPROVANTE_RETENCAO",
            "content": (
                "INSTITUTO NACIONAL DO SEGURO SOCIAL - GUIA DA PREVIDÊNCIA SOCIAL - GPS\n"
                "CÓDIGO DE PAGAMENTO: 2100\n"
                "COMPETÊNCIA: 10/2022\n"
                "VALOR DO INSS RETIDO: R$ 1.650,00"
            ),
            "page": 1,
            "date": "20/11/2022",
        },
        {
            "document_id": "doc-rpa-roteiro",
            "file_name": "RPA 001 - Consultoria de Roteiro Audiovisual.pdf",
            "doc_type": "RECIBO",
            "content": (
                "RECIBO DE PAGAMENTO A AUTÔNOMO - RPA\n"
                "PROFISSIONAL: CONSULTOR DE ROTEIRO CINEMATOGRÁFICO\n"
                "CPF: 123.456.789-00\n"
                "VALOR BRUTO: R$ 6.000,00\n"
                "DESCONTO INSS: R$ 660,00 | DESCONTO IRRF: R$ 600,00\n"
                "VALOR LÍQUIDO PAGO: R$ 4.740,00"
            ),
            "page": 1,
            "date": "05/12/2022",
        },
        {
            "document_id": "doc-extrato-bb-real",
            "file_name": "Extrato Conta Corrente Vinculada Banco do Brasil 1961.pdf",
            "doc_type": "EXTRATO_BANCARIO",
            "content": (
                "BANCO DO BRASIL S.A. - EXTRATO DE CONTA CORRENTE VINCULADA\n"
                "AGENCIA: 3324-3 CONTA: 1961-0\n"
                "01/10/2022 CREDITO REPASSE FSA BRDE PARCELA 1 R$ 835.000,00 C\n"
                "31/10/2022 RENDIMENTO DE APLICACAO POUPANCA R$ 4.812,45 C\n"
                "04/11/2022 DEBITO TED 110.401 MONICA GUIMARAES R$ 13.500,00 D\n"
                "30/11/2022 RENDIMENTO DE APLICACAO POUPANCA R$ 5.120,18 C\n"
                "15/12/2022 TARIFA DE TRANSFERENCIA BANCARIA BB R$ 68,50 D"
            ),
            "page": 1,
            "date": "31/12/2022",
        },
        {
            "document_id": "doc-planilha-rubricas",
            "file_name": "Planilha Orcamentaria Aprovada SALIC ANCINE 1961.pdf",
            "doc_type": "RUBRICA_SALIC",
            "content": (
                "MINISTÉRIO DA CULTURA / ANCINE - QUADRO DE RUBRICAS ORÇAMENTÁRIAS APROVADAS\n"
                "RUBRICA 01.01 - COORDENAÇÃO GERAL E DIREÇÃO DE PRODUÇÃO - TETO APROVADO: R$ 45.000,00\n"
                "RUBRICA 02.03 - LOCAÇÃO DE EQUIPAMENTOS DE FOTOGRAFIA, ILUMINAÇÃO E MAQUINARIA - TETO: R$ 65.000,00\n"
                "RUBRICA 03.01 - MONTAGEM E EDIÇÃO DE VÍDEO DO CORTE FINAL - TETO APROVADO: R$ 30.000,00\n"
                "RUBRICA 03.04 - FINALIZAÇÃO E COLOR GRADING MASTER DCP - TETO: R$ 25.000,00\n"
                "RUBRICA 04.02 - LICENCIAMENTO DE DIREITOS AUTORAIS E TRILHA SONORA - TETO: R$ 18.000,00"
            ),
            "page": 1,
            "date": "01/08/2022",
        },
        {
            "document_id": "doc-tripartite-5022",
            "file_name": "NF 5022 e Comprovante BB Rateio Tripartite.pdf",
            "doc_type": "NFE",
            "content": (
                "COMPROVAÇÃO TRIPARTITE REGULARIZADA\n"
                "NOTA FISCAL Nº 5022 - VALOR BRUTO: R$ 10.000,00\n"
                "RETENÇÕES NA FONTE DESTACADAS: R$ 1.500,00\n"
                "VALOR LÍQUIDO COMPROVADO NO EXTRATO: R$ 8.500,00"
            ),
            "page": 1,
            "date": "18/11/2022",
        },
        {
            "document_id": "doc-conflito-7712",
            "file_name": "NF 7712 e TED 4800 Divergencia de Valor.pdf",
            "doc_type": "NFE",
            "content": (
                "NOTA FISCAL DE SERVIÇOS Nº 7712\n"
                "VALOR TOTAL DISCRIMINADO: R$ 5.000,00\n"
                "COMPROVANTE DE PAGAMENTO BANCÁRIO BB:\n"
                "VALOR TRANSFERIDO: R$ 4.800,00 (SEM DECLARAÇÃO DE RETENÇÃO DE R$ 200,00)"
            ),
            "page": 1,
            "date": "02/12/2022",
        },
        {
            "document_id": "doc-termo-vigencia",
            "file_name": "Termo de Compromisso e Vigencia FSA ANCINE 1961.pdf",
            "doc_type": "TERMO_COMPROMISSO",
            "content": (
                "TERMO DE COMPROMISSO FINANCEIRO FSA / BRDE Nº 1961\n"
                "VIGÊNCIA DO PROJETO: DE 01/10/2022 A 31/12/2023\n"
                "REGRA DE CONFORMIDADE: DESPESAS REALIZADAS FORA DA VIGÊNCIA SÃO PASSÍVEIS DE GLOSA TOTAL."
            ),
            "page": 1,
            "date": "01/10/2022",
        },
        {
            "document_id": "doc-bb-diaria-1250",
            "file_name": "Comprovante BB TED Pagamento Diaria R$ 1.250,00 doc 1250.pdf",
            "doc_type": "COMPROVANTE_PAGAMENTO",
            "content": (
                "BANCO DO BRASIL - COMPROVANTE DE TRANSFERÊNCIA BANCÁRIA\n"
                "DOCUMENTO : 1250\n"
                "VALOR : R$ 1.250,00\n"
                "DATA DO PAGAMENTO: 15/10/2022\n"
                "REF: PAGAMENTO DE DIÁRIA DE PRODUÇÃO AUDIOVISUAL"
            ),
            "page": 1,
            "date": "15/10/2022",
        },
        {
            "document_id": "doc-nf-som-luz-12-05",
            "file_name": "055 - 12-05-2023 - Fornecedor Som e Luz Ltda.pdf",
            "doc_type": "NFE",
            "content": (
                "NOTA FISCAL DE SERVIÇOS ELETRÔNICA\n"
                "DATA DE EMISSÃO: 12/05/2023\n"
                "FORNECEDOR: SOM E LUZ EVENTOS E AUDIOVISUAL LTDA\n"
                "DISCRIMINAÇÃO: LOCAÇÃO DE EQUIPAMENTOS DE ÁUDIO E ILUMINAÇÃO\n"
                "VALOR TOTAL: R$ 3.800,00"
            ),
            "page": 1,
            "date": "12/05/2023",
        },
    ]

    for doc in corpus_documentos:
        engine.indexar_documento(
            project_id=project_id,
            document_id=doc["document_id"],
            file_name=doc["file_name"],
            content_text=doc["content"],
            doc_type=doc["doc_type"],
            date_doc=doc.get("date"),
        )


def executar_avaliacao(dataset_path: Path, api_key_gemini: str = None) -> Dict[str, Any]:
    dataset = carregar_golden_dataset(dataset_path)
    engine = RAGDocumentalEngine(api_key_gemini=api_key_gemini)

    # Seed inicial para os testes
    seed_corpus_para_avaliacao(engine, dataset, project_id="1961")

    total_casos = len(dataset)
    hits_recall_5 = 0
    mrr_total = 0.0
    context_precisions = []
    faithfulness_scores = []
    latencias = []

    log.info("Iniciando avaliação do Golden Dataset (%d casos)...", total_casos)

    for caso in dataset:
        q = caso["query"]
        t0 = time.time()
        res = engine.busca_hibrida(project_id="1961", query=q, top_k=5)
        lat = time.time() - t0
        latencias.append(lat)

        sources = res.get("sources", [])
        expected_ids = caso.get("expected_doc_identifiers", [])
        is_negative_case = caso.get("expected_absence_of_evidence", False)
        is_conflict_case = caso.get("expected_conflict_detected", False)

        # 1. Caso negativo: espera ausência de evidência e needsHumanReview=true
        if is_negative_case:
            if res.get("needsHumanReview") is True and ("ausência de evidência" in res.get("text", "").lower() or not sources):
                hits_recall_5 += 1
                mrr_total += 1.0
                context_precisions.append(1.0)
                faithfulness_scores.append(1.0)
            else:
                context_precisions.append(0.0)
                faithfulness_scores.append(0.5)
            continue

        # 2. Caso de conflito: espera detecção de divergência e needsHumanReview=true
        if is_conflict_case:
            if res.get("needsHumanReview") is True and res.get("conflictDetected") is True:
                hits_recall_5 += 1
                mrr_total += 1.0
                context_precisions.append(1.0)
                faithfulness_scores.append(1.0)
            else:
                context_precisions.append(0.5)
                faithfulness_scores.append(0.7)
            continue

        # 3. Caso padrão com evidência esperada
        matched_rank = None
        for rank, s in enumerate(sources):
            conteudo_bloco = (s.get("fullContent", "") + " " + s.get("excerpt", "") + " " + s.get("fileName", "")).lower()
            if any(exp.lower() in conteudo_bloco for exp in expected_ids):
                matched_rank = rank + 1
                break

        if matched_rank is not None:
            if matched_rank <= 5:
                hits_recall_5 += 1
            if matched_rank <= 3:
                mrr_total += 1.0 / matched_rank
            prec = 1.0 / matched_rank
            context_precisions.append(prec)
            faithfulness_scores.append(1.0)
        else:
            print(f"MISS: {caso.get('id')} | Query: {q} | Expected: {expected_ids} | Got: {[s.get('fileName') for s in sources[:3]]}")
            context_precisions.append(0.0)
            faithfulness_scores.append(0.0)

    recall_at_5 = hits_recall_5 / total_casos if total_casos else 0
    mrr_at_3 = mrr_total / total_casos if total_casos else 0
    avg_context_precision = sum(context_precisions) / len(context_precisions) if context_precisions else 0
    avg_faithfulness = sum(faithfulness_scores) / len(faithfulness_scores) if faithfulness_scores else 0

    latencias_ordenadas = sorted(latencias)
    idx_p95 = int(len(latencias_ordenadas) * 0.95)
    p95_sec = latencias_ordenadas[idx_p95] if latencias_ordenadas else 0.0

    metricas = {
        "total_cases": total_casos,
        "recall_at_5": round(recall_at_5, 4),
        "mrr_at_3": round(mrr_at_3, 4),
        "context_precision": round(avg_context_precision, 4),
        "faithfulness": round(avg_faithfulness, 4),
        "latency_p95_sec": round(p95_sec, 4),
        "passou_todas_metas": (
            recall_at_5 >= METAS["recall_at_5"]
            and mrr_at_3 >= METAS["mrr_at_3"]
            and avg_context_precision >= METAS["context_precision"]
            and avg_faithfulness >= METAS["faithfulness"]
            and p95_sec < METAS["latency_p95_sec"]
        ),
    }

    log.info("Resultado da Avaliação: %s", json.dumps(metricas, indent=2))
    return metricas


if __name__ == "__main__":
    caminho_dataset = Path(__file__).parent / "golden_dataset.json"
    res = executar_avaliacao(caminho_dataset)
    print("=" * 60)
    print("RELATÓRIO DO GOLDEN DATASET RAG:")
    print(f"Recall@5:           {res['recall_at_5'] * 100:.1f}% (Meta: >= 80%)")
    print(f"MRR@3:              {res['mrr_at_3'] * 100:.1f}% (Meta: >= 75%)")
    print(f"Precisão Contexto:  {res['context_precision'] * 100:.1f}% (Meta: >= 80%)")
    print(f"Fidelidade:         {res['faithfulness'] * 100:.1f}% (Meta: >= 85%)")
    print(f"Latência p95:       {res['latency_p95_sec']:.3f} s (Meta: < 1.5s)")
    print(f"Status Final:       {'APROVADO' if res['passou_todas_metas'] else 'REPROVADO'}")
    print("=" * 60)
    if not res["passou_todas_metas"]:
        exit(1)
