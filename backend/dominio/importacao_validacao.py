"""Contrato de entrada JSON/YAML e avaliação pura, sem banco ou chamadas de IA."""

import json
import math
import re
from datetime import date, datetime
from decimal import Decimal, InvalidOperation

import yaml

from motor.importar import Validador, carregar_rubricas_salic, resolver_projeto_e_lancamentos


class YAMLUnico(yaml.SafeLoader):
    pass


def _objeto_unico(pares):
    objeto = {}
    for chave, valor in pares:
        if chave in objeto:
            raise ValueError(f"Chave duplicada: {chave}.")
        objeto[chave] = valor
    return objeto


def _float_finito(texto):
    valor = float(texto)
    if not math.isfinite(valor):
        raise ValueError("Número JSON não finito.")
    return valor


def _constante_invalida(_texto):
    raise ValueError("Constante JSON inválida.")


def _yaml_unico(loader, node):
    loader.flatten_mapping(node)
    return _objeto_unico(loader.construct_pairs(node, deep=True))


YAMLUnico.add_constructor(yaml.resolver.BaseResolver.DEFAULT_MAPPING_TAG, _yaml_unico)


def _bloco(cfg, chave):
    bloco = cfg.get(chave)
    if not isinstance(bloco, dict):
        raise ValueError(f"Config: '{chave}' deve ser um objeto.")
    return bloco


def _numero(valor, campo):
    try:
        numero = Decimal(str(valor))
    except (InvalidOperation, ValueError):
        raise ValueError(f"Config: '{campo}' deve ser numérico.") from None
    if isinstance(valor, bool) or not numero.is_finite():
        raise ValueError(f"Config: '{campo}' deve ser finito.")
    return numero


def normalizar_pronac(valor):
    texto = str(valor or "").strip()
    if not isinstance(valor, (str, int)) or isinstance(valor, bool) or not re.fullmatch(r"\d+(?:\.\d+)*", texto):
        raise ValueError("PRONAC deve conter somente dígitos e separadores de ponto.")
    return texto.replace(".", "")


def validar_config(cfg):
    if not isinstance(cfg, dict):
        raise ValueError("Config YAML deve ser um objeto.")
    projeto = _bloco(cfg, "projeto")
    normalizar_pronac(projeto.get("pronac"))
    campos_projeto = projeto.get("campos", {})
    if not isinstance(campos_projeto, dict) or any(
        valor is not None and (not isinstance(valor, str) or not valor.strip())
        for valor in campos_projeto.values()
    ):
        raise ValueError("Config: projeto.campos deve mapear nomes para chaves textuais ou null.")
    projeto["campos"] = campos_projeto
    mapa = _bloco(cfg, "mapeamento_lancamentos")
    for chave in ("projeto_path", "lancamentos_field"):
        valor = mapa.get(chave)
        if chave == "projeto_path" and valor is None:
            continue
        if not isinstance(valor, str) or not valor.strip():
            raise ValueError(f"Config: '{chave}' deve ser uma chave textual.")
    obrigatorios = _bloco(mapa, "campos_obrigatorios")
    opcionais = mapa.get("campos_opcionais")
    opcionais = {} if opcionais is None else opcionais
    if not isinstance(opcionais, dict):
        raise ValueError("Config: campos_opcionais deve ser um objeto.")
    if not {"prestador", "data_pagamento", "valor_liquido"} <= obrigatorios.keys():
        raise ValueError("Mapeie prestador, data_pagamento e valor_liquido em campos_obrigatorios.")
    aceitos = {
        "prestador", "data_pagamento", "valor_liquido", "rubrica_salic", "descricao",
        "razao_social", "cnpj_cpf", "documento_ref", "confianca_ocr", "valor_nota_fiscal",
    }
    fontes = set()
    for grupo, campos in (("obrigatorios", obrigatorios), ("opcionais", opcionais)):
        for conceito, fonte in campos.items():
            if conceito not in aceitos or (grupo == "opcionais" and conceito in obrigatorios):
                raise ValueError(f"Conceito desconhecido ou duplicado no mapeamento: {conceito}.")
            if fonte is None and grupo == "opcionais":
                continue
            if not isinstance(fonte, str) or not fonte.strip():
                raise ValueError(f"Mapeamento de '{conceito}' deve indicar uma chave textual.")
            if fonte in fontes:
                raise ValueError(f"Chave '{fonte}' mapeada para mais de um conceito.")
            fontes.add(fonte)
    tipo = mapa.get("tipo_documento_default")
    if tipo is not None and (not isinstance(tipo, str) or tipo not in {"NFE", "RECIBO", "GRU", "OUTRO"}):
        raise ValueError("Config: tipo_documento_default deve ser NFE, RECIBO, GRU, OUTRO ou null.")
    regras = _bloco(cfg, "regras_validacao")
    datas = []
    for campo in ("data_inicio_projeto", "data_fim_projeto"):
        valor = regras.get(campo)
        if isinstance(valor, date) and not isinstance(valor, datetime):
            valor = valor.isoformat()
            regras[campo] = valor
        try:
            datas.append(datetime.strptime(str(valor), "%Y-%m-%d").date())
        except ValueError:
            raise ValueError(f"Config: '{campo}' deve ser uma data válida YYYY-MM-DD.") from None
    if datas[0] > datas[1]:
        raise ValueError("Config: início do projeto posterior ao fim.")
    minimo = _numero(regras.get("valor_minimo"), "valor_minimo")
    maximo = _numero(regras.get("valor_maximo"), "valor_maximo")
    if minimo < 0 or maximo < minimo:
        raise ValueError("Config: limites monetários inválidos.")
    for campo in ("confianca_minima", "limiar_rag"):
        if campo in regras and not 0 <= _numero(regras[campo], campo) <= 1:
            raise ValueError(f"Config: '{campo}' deve estar entre 0 e 1.")
    for campo in ("rubrica_obrigatoria", "validar_cnpj_cpf"):
        if campo in regras and not isinstance(regras[campo], bool):
            raise ValueError(f"Config: '{campo}' deve ser booleano.")
    banco = cfg.get("banco_captador")
    banco = {} if banco is None else banco
    if not isinstance(banco, dict):
        raise ValueError("Config: banco_captador deve ser um objeto.")
    if "saldo_inicial" in banco:
        _numero(banco["saldo_inicial"], "saldo_inicial")
    for campo in ("banco_nome", "agencia", "conta"):
        if banco.get(campo) is not None and not isinstance(banco[campo], str):
            raise ValueError(f"Config: banco_captador.{campo} deve ser textual.")
    rubricas = cfg.get("rubricas_salic")
    rubricas = {} if rubricas is None else rubricas
    if not isinstance(rubricas, dict) or (rubricas.get("rubricas") is not None and not isinstance(rubricas["rubricas"], dict)):
        raise ValueError("Config: rubricas_salic.rubricas deve ser um objeto.")
    if rubricas.get("referencia_arquivo"):
        raise ValueError("Via site, use rubricas_salic.rubricas inline; referência a arquivo local não é suportada.")
    for codigo, valor in (rubricas.get("rubricas") or {}).items():
        if not isinstance(codigo, str) or not codigo.strip() or _numero(valor, "rubrica") < 0:
            raise ValueError("Config: rubricas exigem código textual e orçamento não negativo.")
    return cfg


def ler_entrada(arquivo_bytes, config_bytes):
    try:
        conteudo = json.loads(
            arquivo_bytes, object_pairs_hook=_objeto_unico,
            parse_float=_float_finito, parse_constant=_constante_invalida,
        )
    except (ValueError, UnicodeError, RecursionError):
        raise ValueError("JSON inválido: verifique sintaxe, codificação e chaves duplicadas.") from None
    try:
        cfg = yaml.load(config_bytes, Loader=YAMLUnico)
    except (yaml.YAMLError, ValueError, TypeError, RecursionError):
        raise ValueError("YAML inválido: verifique sintaxe e chaves duplicadas.") from None
    return conteudo, validar_config(cfg)


def avaliar_entrada(conteudo, cfg, usar_rag=False):
    raiz, lancamentos = resolver_projeto_e_lancamentos(conteudo, cfg)
    campo_pronac = cfg["projeto"]["campos"].get("pronac", "pronac")
    if campo_pronac and raiz.get(campo_pronac) is not None:
        if normalizar_pronac(raiz[campo_pronac]) != normalizar_pronac(cfg["projeto"]["pronac"]):
            raise ValueError("PRONAC do JSON diverge da configuração.")
    if not lancamentos:
        raise ValueError("Nenhum lançamento encontrado no JSON.")
    mapa = cfg["mapeamento_lancamentos"]
    campos = {**mapa["campos_obrigatorios"], **(mapa.get("campos_opcionais") or {})}
    validador = Validador(cfg, carregar_rubricas_salic(cfg), usar_rag=usar_rag)
    erros, alertas = [], []
    validas = 0
    for numero, linha in enumerate(lancamentos, 1):
        problemas = []
        for conceito, fonte in campos.items():
            valor = linha.get(fonte) if fonte else None
            if valor is None:
                continue
            if conceito in {"valor_liquido", "valor_nota_fiscal", "confianca_ocr"}:
                try:
                    finito = Decimal(str(valor)).is_finite() and not isinstance(valor, bool)
                except InvalidOperation:
                    finito = False
                if not finito:
                    problemas.append(f"Campo '{conceito}' deve ser numérico e finito.")
                elif conceito == "confianca_ocr" and not 0 <= Decimal(str(valor)) <= 100:
                    problemas.append("Confiança OCR deve estar entre 0 e 1 ou entre 0 e 100.")
                elif conceito == "valor_nota_fiscal" and Decimal(str(valor)) < 0:
                    problemas.append("Valor da nota fiscal não pode ser negativo.")
            elif not isinstance(valor, str):
                problemas.append(f"Campo '{conceito}' deve ser textual.")
        if problemas:
            erros.append({"linha": numero, "motivos": problemas})
            continue
        ok, motivos, avisos, _ = validador.validar(linha, numero)
        if ok:
            validas += 1
        else:
            erros.append({"linha": numero, "motivos": motivos})
        if avisos:
            alertas.append({"linha": numero, "motivos": avisos})
    usadas = {fonte for fonte in campos.values() if fonte}
    return {
        "apto_para_importar": not erros,
        "linhas_total": len(lancamentos), "linhas_validas": validas,
        "linhas_invalidas": len(erros), "linhas_alerta": len(alertas),
        "erros": erros, "alertas": alertas,
        "mapeamento": [{"conceito": conceito, "chave": fonte} for conceito, fonte in campos.items() if fonte],
        "campos_nao_mapeados": sorted({chave for linha in lancamentos for chave in linha} - usadas),
        "rag_solicitado": usar_rag, "rag_executado": False,
    }
