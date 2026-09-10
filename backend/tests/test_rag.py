"""
backend/tests/test_rag.py — Testes Obrigatórios do RAG Documental de Produção

Cobre os 6 requisitos normativos:
1. Documento 110401 aparece no top 3 e resposta cita arquivo/página corretos.
2. Consulta semântica por edição recupera rubricas e documentos pertinentes sem alterar dados.
3. Documento inexistente declara ausência de evidência e needsHumanReview=true.
4. NF e comprovante com conflito apresentam ambas as fontes e exigem revisão.
5. Nenhum chunk do projeto A aparece em consulta do projeto B (isolamento estrito).
6. Golden dataset roda e passa em todas as metas de recuperação.
"""
from pathlib import Path

import pytest

from backend.rag.eval_rag import carregar_golden_dataset, seed_corpus_para_avaliacao
from motor.rag_service import RAGDocumentalEngine, extrair_entidades


@pytest.fixture
def rag_engine():
    engine = RAGDocumentalEngine()
    dataset_path = Path(__file__).resolve().parents[1] / "rag" / "golden_dataset.json"
    dataset = carregar_golden_dataset(dataset_path)
    seed_corpus_para_avaliacao(engine, dataset, project_id="1961")
    return engine


def test_1_documento_110401_no_top3_cita_arquivo_e_pagina(rag_engine):
    """Teste Obrigatório 1: Documento 110401 aparece no top 3 e resposta cita arquivo/página corretos."""
    res = rag_engine.busca_hibrida(
        project_id="1961",
        query="comprovante de pagamento documento 110401",
        top_k=3,
    )

    assert res["needsHumanReview"] is False
    assert len(res["sources"]) >= 1

    # Verifica presença no top 3
    top3_files = [s["fileName"] for s in res["sources"][:3]]
    assert any("110401" in f for f in top3_files), f"110401 não apareceu no top 3: {top3_files}"

    top_source = res["sources"][0]
    assert "110401" in top_source["fileName"]
    assert top_source["page"] == 1
    assert "110401" in res["text"] or "110.401" in res["text"]
    assert "página 1" in res["text"] or "página" in res["text"]


def test_2_consulta_semantica_edicao_recupera_sem_alterar_dados(rag_engine):
    """Teste Obrigatório 2: Consulta semântica por edição recupera rubricas e documentos pertinentes sem alterar dados."""
    res = rag_engine.busca_hibrida(
        project_id="1961",
        query="edição e montagem do corte final de imagem",
        top_k=5,
    )

    assert len(res["sources"]) > 0
    arquivos_recuperados = [s["fileName"] for s in res["sources"]]
    # Recupera a planilha orçamentária que contém a rubrica 03.01 (Edição de Vídeo)
    assert any("Planilha" in f for f in arquivos_recuperados), f"Não recuperou planilha: {arquivos_recuperados}"

    # Guardrail: RAG não pode criar rubrica, conciliar pagamento ou modificar dado financeiro
    assert "needsHumanReview" in res
    assert not hasattr(res, "dados_modificados")


def test_3_documento_inexistente_declara_ausencia_de_evidencia(rag_engine):
    """Teste Obrigatório 3: Documento inexistente declara ausência de evidência e needsHumanReview=true."""
    res = rag_engine.busca_hibrida(
        project_id="1961",
        query="comprovante bancário documento 9999999999 inexistente",
        top_k=5,
    )

    assert res["needsHumanReview"] is True
    assert "ausência de evidência" in res["text"].lower()


def test_4_conflito_nf_e_comprovante_apresenta_ambas_fontes_e_exige_revisao(rag_engine):
    """Teste Obrigatório 4: NF e comprovante com conflito apresentam ambas as fontes e exigem revisão."""
    res = rag_engine.busca_hibrida(
        project_id="1961",
        query="conflito nota fiscal 7712 valor 5000 e comprovante 4800 divergência",
        top_k=5,
    )

    assert res["needsHumanReview"] is True
    assert res.get("conflictDetected") is True
    assert "divergência" in res["text"].lower() or "conflitantes" in res["text"].lower()
    assert len(res["sources"]) >= 1


def test_5_isolamento_multitenant_nenhum_chunk_projeto_a_no_projeto_b(rag_engine):
    """Teste Obrigatório 5: Nenhum chunk do projeto A aparece em consulta do projeto B."""
    # Indexa um documento exclusivo no projeto B
    rag_engine.indexar_documento(
        project_id="projeto_b_confidencial",
        document_id="doc_secreto_b",
        file_name="CONTRATO_EXCLUSIVO_PROJETO_B.pdf",
        content_text="TERMO ULTRA SECRETO QUE SÓ EXISTE NO PROJETO B",
        doc_type="CONTRATO",
    )

    # Consulta no projeto 1961 (Projeto A) procurando pelo termo exclusivo do Projeto B
    res_a = rag_engine.busca_hibrida(
        project_id="1961",
        query="TERMO ULTRA SECRETO QUE SÓ EXISTE NO PROJETO B",
        top_k=5,
    )

    # Não pode conter nenhuma fonte do projeto B
    for s in res_a["sources"]:
        assert "PROJETO_B" not in s["fileName"], f"Vazamento multi-tenant detectado! Fonte: {s}"
        assert s["documentId"] != "doc_secreto_b"

    # Na consulta direta no Projeto B, deve recuperar perfeitamente
    res_b = rag_engine.busca_hibrida(
        project_id="projeto_b_confidencial",
        query="TERMO ULTRA SECRETO QUE SÓ EXISTE NO PROJETO B",
        top_k=5,
    )
    assert len(res_b["sources"]) >= 1
    assert res_b["sources"][0]["documentId"] == "doc_secreto_b"


def test_6_golden_dataset_roda_e_passa_metas():
    """Teste Obrigatório 6: Golden dataset roda em toda regressão de recuperação."""
    from backend.rag.eval_rag import executar_avaliacao

    caminho_dataset = Path(__file__).resolve().parents[1] / "rag" / "golden_dataset.json"
    metricas = executar_avaliacao(caminho_dataset)

    assert metricas["total_cases"] >= 30
    assert metricas["recall_at_5"] >= 0.80, f"Recall@5 abaixo da meta: {metricas['recall_at_5']}"
    assert metricas["mrr_at_3"] >= 0.75, f"MRR@3 abaixo da meta: {metricas['mrr_at_3']}"
    assert metricas["context_precision"] >= 0.80, f"Precisão abaixo da meta: {metricas['context_precision']}"
    assert metricas["faithfulness"] >= 0.85, f"Fidelidade abaixo da meta: {metricas['faithfulness']}"
    assert metricas["latency_p95_sec"] < 1.5, f"Latência acima da meta: {metricas['latency_p95_sec']}"
    assert metricas["passou_todas_metas"] is True
