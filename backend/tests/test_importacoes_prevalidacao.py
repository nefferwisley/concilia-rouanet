"""Entrada avançada sintética: contrato, HTTP e ausência de jobs/escritas inválidas."""

import copy
import json
from datetime import date

import pytest
import yaml
from fastapi.testclient import TestClient

from backend.database import get_conn
from backend.main import app
from backend.routes import importacoes
from backend.dominio.importacao_validacao import ler_entrada


def config():
    return {
        "projeto": {"pronac": "1961", "campos": {"pronac": "pronac"}},
        "mapeamento_lancamentos": {
            "projeto_path": None, "lancamentos_field": "pagamentos",
            "campos_obrigatorios": {"prestador": "favorecido", "data_pagamento": "dia", "valor_liquido": "montante"},
            "campos_opcionais": {"descricao": "servico", "confianca_ocr": "confianca"},
        },
        "regras_validacao": {
            "data_inicio_projeto": "2026-01-01", "data_fim_projeto": "2026-12-31",
            "valor_minimo": 0.01, "valor_maximo": 99999, "rubrica_obrigatoria": False,
        },
    }


def entrada():
    return {"pronac": "1961", "pagamentos": [
        {"favorecido": "Profissional sintético", "dia": "2026-10-07", "montante": 42.50, "servico": "Produção", "observacao": "Não mapeada"},
    ]}


class Conn:
    def __init__(self):
        self.escritas = []

    async def fetchrow(self, sql, *args):
        if "insert into importacoes" in sql:
            self.escritas.append((sql, args))
            return {"id": "importacao-sintetica"}
        return None if args[0] == "sem-acesso" else {"id": args[0], "pronac": "1961"}

    async def execute(self, sql, *args):
        self.escritas.append((sql, args))

    def transaction(self):
        return self

    async def __aenter__(self):
        return self

    async def __aexit__(self, *_args):
        pass


@pytest.fixture
def api(monkeypatch):
    conn = Conn()
    jobs, aquisicoes, liberacoes = [], [], []

    class Pool:
        async def release(self, conexao):
            liberacoes.append(conexao)

    async def adquirir():
        aquisicoes.append(True)
        return Pool(), conn

    monkeypatch.setattr(importacoes, "adquirir_conn", adquirir)
    monkeypatch.setattr(importacoes, "executar_importacao_bg", lambda *args: jobs.append(args))
    anteriores = app.dependency_overrides.copy()
    app.dependency_overrides[get_conn] = lambda: (conn, "usuario-sintetico")
    try:
        yield TestClient(app), conn, jobs, aquisicoes, liberacoes
    finally:
        app.dependency_overrides.clear()
        app.dependency_overrides.update(anteriores)


def enviar(api, conteudo=None, cfg=None, rota="validar", projeto="p1", extras=None):
    client = api[0]
    conteudo = entrada() if conteudo is None else conteudo
    cfg = config() if cfg is None else cfg
    json_bytes = conteudo if isinstance(conteudo, bytes) else json.dumps(conteudo).encode()
    yaml_bytes = cfg if isinstance(cfg, bytes) else yaml.safe_dump(cfg).encode()
    return client.post(
        "/api/v1/importacoes/validar" if rota == "validar" else "/api/v1/importacoes",
        data={"projeto_id": projeto, **(extras or {})},
        files={"arquivo": ("entrada.json", json_bytes), "config_yaml": ("config.yaml", yaml_bytes)},
    )


def sem_efeitos(api):
    _, conn, jobs, aquisicoes, _ = api
    assert conn.escritas == []
    assert jobs == []
    assert aquisicoes == []


def test_relatorio_aceita_vocabulario_mapeado_sem_escrever(api):
    res = enviar(api)
    assert res.status_code == 200
    report = res.json()
    assert report["apto_para_importar"] is True
    assert report["linhas_validas"] == report["linhas_total"] == 1
    assert report["campos_nao_mapeados"] == ["observacao"]
    assert {"conceito": "prestador", "chave": "favorecido"} in report["mapeamento"]
    assert report["linhas_alerta"] == 1
    assert report["rag_executado"] is False
    sem_efeitos(api)


@pytest.mark.parametrize("modo", ["dry_run", "commit"])
def test_importacao_revalida_antes_do_job(api, modo):
    res = enviar(api, rota="iniciar", extras={"modo": modo})
    assert res.status_code == 202
    _, conn, jobs, aquisicoes, liberacoes = api
    assert len(jobs) == len(aquisicoes) == len(liberacoes) == 1
    assert jobs[0][4] is (modo == "commit")
    insert = next(args for sql, args in conn.escritas if "insert into importacoes" in sql)
    assert json.loads(insert[3]) == entrada()
    assert len(insert[4]) == 64


@pytest.mark.parametrize("conteudo", [b"{", b'\xff', b'{"pagamentos":[],"pagamentos":[]}', b'{"x":NaN}', b'{"x":Infinity}', b'{"x":1e999}'])
@pytest.mark.parametrize("rota", ["validar", "iniciar"])
def test_json_invalido_sem_efeitos(api, conteudo, rota):
    assert enviar(api, conteudo=conteudo, rota=rota).status_code == 400
    sem_efeitos(api)


@pytest.mark.parametrize("cfg", [b"[", b"null", b"[]", b"projeto: {}\nprojeto: {}", b"!!python/object:obj {}"])
def test_yaml_invalido_sem_efeitos(api, cfg):
    assert enviar(api, cfg=cfg).status_code == 400
    sem_efeitos(api)


@pytest.mark.parametrize("bloco,chave,valor", [
    ("projeto", "pronac", "9999"),
    ("projeto", "pronac", 1961.0),
    ("mapeamento_lancamentos", "campos_obrigatorios", {"prestador": "a"}),
    ("mapeamento_lancamentos", "campos_opcionais", []),
    ("mapeamento_lancamentos", "lancamentos_field", None),
    ("mapeamento_lancamentos", "tipo_documento_default", "INVENTADO"),
    ("mapeamento_lancamentos", "tipo_documento_default", []),
    ("regras_validacao", "data_inicio_projeto", "31/02/2026"),
    ("regras_validacao", "data_fim_projeto", "2025-01-01"),
    ("regras_validacao", "valor_minimo", -1),
    ("regras_validacao", "valor_maximo", "Infinity"),
    ("regras_validacao", "confianca_minima", 2),
    ("regras_validacao", "rubrica_obrigatoria", "false"),
])
def test_config_incompativel_bloqueia_job(api, bloco, chave, valor):
    cfg = config()
    cfg[bloco][chave] = valor
    assert enviar(api, cfg=cfg, rota="iniciar").status_code == 400
    sem_efeitos(api)


def test_mapeamento_ambiguo_e_conceito_desconhecido(api):
    for opcionais in ({"descricao": "favorecido"}, {"novo_conceito": "x"}, {"prestador": "nome"}):
        cfg = config()
        cfg["mapeamento_lancamentos"]["campos_opcionais"] = opcionais
        assert enviar(api, cfg=cfg).status_code == 400
    sem_efeitos(api)


@pytest.mark.parametrize("dados", [[], {"pagamentos": {}}, {"pagamentos": [1]}, {"pagamentos": []}, {"pagamentos": [{}], "pronac": "9999"}])
def test_estrutura_json_invalida(api, dados):
    assert enviar(api, conteudo=dados).status_code == 400
    sem_efeitos(api)


@pytest.mark.parametrize("campo,valor", [("dia", "31/02/2026"), ("montante", "dez"), ("montante", True), ("favorecido", {}), ("confianca", 101), ("confianca", "NaN")])
def test_erros_por_linha_reportados_e_bloqueados_no_inicio(api, campo, valor):
    dados = entrada()
    dados["pagamentos"][0][campo] = valor
    res = enviar(api, conteudo=dados)
    assert res.status_code == 200
    assert res.json()["apto_para_importar"] is False
    assert res.json()["linhas_invalidas"] == 1
    assert res.json()["erros"][0]["linha"] == 1
    assert enviar(api, conteudo=dados, rota="iniciar").status_code == 400
    sem_efeitos(api)


def test_projetos_aninhados_exigem_correspondencia_unica(api):
    cfg = config()
    cfg["mapeamento_lancamentos"]["projeto_path"] = "projetos"
    dados = {"projetos": [entrada()]}
    assert enviar(api, conteudo=dados, cfg=cfg).status_code == 200
    dados["projetos"].append(copy.deepcopy(entrada()))
    assert enviar(api, conteudo=dados, cfg=cfg).status_code == 400
    assert enviar(api, conteudo={"projetos": "invalido"}, cfg=cfg).status_code == 400
    sem_efeitos(api)


def test_datas_yaml_nativas_e_rag_sem_egresso(api):
    cfg = config()
    cfg["regras_validacao"]["data_inicio_projeto"] = date(2026, 1, 1)
    res = enviar(api, cfg=cfg, extras={"api_key_gemini": "chave-sintetica"})
    assert res.status_code == 200
    assert res.json()["rag_solicitado"] is True
    assert res.json()["rag_executado"] is False
    sem_efeitos(api)


def test_referencia_local_de_rubricas_nao_e_silenciosamente_ignorada(api):
    cfg = config()
    cfg["rubricas_salic"] = {"referencia_arquivo": "orcamento.json"}
    assert enviar(api, cfg=cfg).status_code == 400
    cfg["rubricas_salic"] = {"rubricas": []}
    assert enviar(api, cfg=cfg).status_code == 400
    sem_efeitos(api)


def test_pronac_pontuado_no_wrapper_corresponde_ao_destino(api):
    cfg = config()
    cfg["mapeamento_lancamentos"]["projeto_path"] = "projetos"
    cfg["projeto"]["pronac"] = "19.61"
    assert enviar(api, conteudo={"projetos": [entrada()]}, cfg=cfg).status_code == 200
    sem_efeitos(api)


def test_acesso_modo_e_limite(api, monkeypatch):
    assert enviar(api, projeto="sem-acesso").status_code == 404
    assert enviar(api, rota="iniciar", extras={"modo": "invalido"}).status_code == 400
    monkeypatch.setattr(importacoes.settings, "max_upload_mb", 0)
    assert enviar(api).status_code == 413
    sem_efeitos(api)


def test_validacao_requer_auth():
    assert TestClient(app).post("/api/v1/importacoes/validar").status_code == 401


def test_leitura_converte_datas_sem_mutar_semantica_do_json():
    cfg = config()
    cfg["regras_validacao"]["data_inicio_projeto"] = date(2026, 1, 1)
    dados, normalizado = ler_entrada(json.dumps(entrada()).encode(), yaml.safe_dump(cfg).encode())
    assert dados == entrada()
    assert normalizado["regras_validacao"]["data_inicio_projeto"] == "2026-01-01"
