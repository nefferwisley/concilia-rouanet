#!/usr/bin/env python3
"""
motor/embedding_provider.py — embeddings com opção air-gapped (P4).

Backend local preferencial: Ollama com nomic-embed-text (768 dims — bate com
rubricas.embedding vector(768) do schema). ZERO egress: o peso já está no
daemon local, nada sai do perímetro.

Contrato:
    embed_texto(texto, modelo, cliente=None) -> list[float] | None
        - cliente injetável (testes); None -> tenta `import ollama`.
        - None significa "indisponível" — quem chama decide o fallback
          (Gemini se tiver chave, ou desabilita o RAG — nunca finge).
"""
import logging

log = logging.getLogger("motor.embedding_provider")

# nomic-embed-text (Ollama) == rubricas.embedding vector(768) do schema
DIMENSAO_PADRAO = 768
MODELO_PADRAO = "nomic-embed-text"


import socket

_OLLAMA_AVAILABLE = None


def embeddings_ollama_disponiveis() -> bool:
    global _OLLAMA_AVAILABLE
    if _OLLAMA_AVAILABLE is not None:
        return _OLLAMA_AVAILABLE
    try:
        import ollama  # noqa: PLC0415
        s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        s.settimeout(0.05)
        res = s.connect_ex(("127.0.0.1", 11434))
        s.close()
        _OLLAMA_AVAILABLE = (res == 0)
        return _OLLAMA_AVAILABLE
    except Exception:
        _OLLAMA_AVAILABLE = False
        return False


def embed_texto(texto: str, modelo: str = MODELO_PADRAO, cliente=None) -> list[float] | None:
    """Embedding local via Ollama. Retorna vetor (list[float]) ou None."""
    if not texto:
        return None
    if cliente is None:
        if not embeddings_ollama_disponiveis():
            log.info("Ollama indisponível — embeddings locais desabilitados.")
            return None
        import ollama as cliente  # noqa: PLC0415
    try:
        resp = cliente.embeddings(model=modelo, prompt=texto)
        vetor = resp["embedding"]
    except Exception as e:
        log.warning("Falha no embedding local (%s).", e)
        return None
    if not isinstance(vetor, list) or not vetor:
        return None
    return [float(x) for x in vetor]


def dimensao_correta(vetor, esperada: int = DIMENSAO_PADRAO) -> bool:
    return isinstance(vetor, list) and len(vetor) == esperada


def vetor_para_literal_pg(vetor) -> str:
    return "[" + ",".join(f"{x:.8f}" for x in vetor) + "]"