"""
routes/rubricas.py — CRUD das rubricas do orçamento aprovado do projeto.

POR QUE ESTA ROTA EXISTE
------------------------
Antes dela, `rubricas` só era populada indiretamente pela importação
(motor/importar.py -> obter_ou_criar_rubrica a partir do `rubricas_salic` do
config). Ou seja: um projeto que ainda não importou, ou cujo config não trouxe
o orçamento, não tinha como o auditor registrar as rubricas do SALIC — e a
regra SEM_RUBRICA (dominio/divergencias.py) ficava condenada a furar qualquer
lançamento, sem que houvesse tela pra consertar o catálogo.

Esta rota dá o CRUD mínimo do catálogo por projeto. A tabela e o RLS já
existem desde a 0001 (p_rubricas via pode_acessar_projeto); o que faltava era
o verbo HTTP. A regra de negócio aqui é só: codigo é único por projeto e,
quando já existe, o POST responde 409 em vez de sobrescrever a descricao.
"""
import json
from decimal import Decimal, InvalidOperation
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from backend.database import get_conn

logger = __import__("logging").getLogger(__name__)
router = APIRouter(prefix="/api/v1/projetos", tags=["rubricas"])


# ================================================================ payloads

class RubricaIn(BaseModel):
    codigo: str
    descricao: str
    descricao_completa: Optional[str] = None
    valor_orcado: Optional[float] = None


class RubricaUpdate(BaseModel):
    descricao: Optional[str] = None
    descricao_completa: Optional[str] = None
    valor_orcado: Optional[float] = None


# ================================================================ helpers

async def _projeto_existe(conn, projeto_id: str):
    projeto = await conn.fetchrow("select id from projetos where id = $1", projeto_id)
    if not projeto:
        raise HTTPException(404, "Projeto não encontrado (ou sem permissão via RLS).")


async def _get_rubrica(conn, projeto_id: str, rubrica_id: str):
    """Busca a rubrica garantindo que pertence ao projeto (RLS também barra,
    mas a checagem explícita dá 404 com a mesma mensagem dos outros módulos)."""
    row = await conn.fetchrow(
        "select * from rubricas where id = $1 and projeto_id = $2",
        rubrica_id, projeto_id,
    )
    if not row:
        raise HTTPException(404, "Rubrica não encontrada (ou sem permissão via RLS).")
    return row


def _shape(r):
    return {
        "id": str(r["id"]),
        "codigo": r["codigo"],
        "descricao": r["descricao"],
        "descricao_completa": r["descricao_completa"],
        "valor_orcado": float(r["valor_orcado"]) if r["valor_orcado"] is not None else None,
    }


def _valor_para_decimal(valor: float | None) -> Decimal | None:
    if valor is None:
        return None
    try:
        return Decimal(str(valor))
    except InvalidOperation:
        raise HTTPException(400, "valor_orcado inválido.")


# ================================================================ endpoints

@router.get("/{projeto_id}/rubricas")
async def listar_rubricas(projeto_id: str, dep=Depends(get_conn)):
    """Lista o catálogo de rubricas do orçamento aprovado do projeto."""
    conn, _ = dep
    await _projeto_existe(conn, projeto_id)

    total = await conn.fetchval(
        "select count(*) from rubricas where projeto_id = $1", projeto_id
    )
    rows = await conn.fetch(
        """
        select id, codigo, descricao, descricao_completa, valor_orcado
          from rubricas
         where projeto_id = $1
         order by codigo
        """,
        projeto_id,
    )
    return {
        "projeto_id": projeto_id,
        "total": total,
        "rubricas": [_shape(r) for r in rows],
    }


@router.post("/{projeto_id}/rubricas", status_code=201)
async def criar_rubrica(projeto_id: str, body: RubricaIn, dep=Depends(get_conn)):
    """Cadastra uma rubrica. codigo é único por projeto; duplicar dá 409."""
    conn, _ = dep
    await _projeto_existe(conn, projeto_id)

    codigo = (body.codigo or "").strip()
    descricao = (body.descricao or "").strip()
    if not codigo or not descricao:
        raise HTTPException(400, "codigo e descricao são obrigatórios.")

    existente = await conn.fetchval(
        "select id from rubricas where projeto_id = $1 and codigo = $2",
        projeto_id, codigo,
    )
    if existente:
        raise HTTPException(409, f"Já existe uma rubrica com o código '{codigo}' neste projeto.")

    valor = _valor_para_decimal(body.valor_orcado)
    row = await conn.fetchrow(
        """
        insert into rubricas (projeto_id, codigo, descricao, descricao_completa, valor_orcado)
        values ($1, $2, $3, $4, $5)
        returning id, codigo, descricao, descricao_completa, valor_orcado
        """,
        projeto_id, codigo, descricao, body.descricao_completa, valor,
    )
    return _shape(row)


@router.patch("/{projeto_id}/rubricas/{rubrica_id}")
async def atualizar_rubrica(
    projeto_id: str, rubrica_id: str, body: RubricaUpdate, dep=Depends(get_conn)
):
    """Atualiza descricao/descricao_completa/valor_orcado. codigo não muda via
    PATCH (é a chave do orçamento; trocá-lo exigiria reconciliar despesas)."""
    conn, _ = dep
    await _projeto_existe(conn, projeto_id)
    await _get_rubrica(conn, projeto_id, rubrica_id)

    campos = []
    valores = []
    if body.descricao is not None:
        campos.append("descricao = %s")
        valores.append(body.descricao.strip() or None)
    if body.descricao_completa is not None:
        campos.append("descricao_completa = %s")
        valores.append(body.descricao_completa.strip() or None)
    if body.valor_orcado is not None:
        campos.append("valor_orcado = %s")
        valores.append(_valor_para_decimal(body.valor_orcado))

    if campos:
        valores.append(rubrica_id)
        await conn.execute(
            f"update rubricas set {', '.join(campos)} where id = %s", valores
        )

    row = await conn.fetchrow(
        "select id, codigo, descricao, descricao_completa, valor_orcado from rubricas where id = $1",
        rubrica_id,
    )
    return _shape(row)


@router.delete("/{projeto_id}/rubricas/{rubrica_id}", status_code=204)
async def remover_rubrica(projeto_id: str, rubrica_id: str, dep=Depends(get_conn)):
    """Remove uma rubrica ainda não usada por nenhuma despesa. Se alguma despesa
    a referencia, responde 409 em vez de quebrar a constraint do banco."""
    conn, _ = dep
    await _projeto_existe(conn, projeto_id)
    await _get_rubrica(conn, projeto_id, rubrica_id)

    em_uso = await conn.fetchval(
        "select count(*) from despesas where rubrica_id = $1", rubrica_id
    )
    if em_uso:
        raise HTTPException(
            409,
            "Esta rubrica está em uso por despesa(s) do projeto; remova a atribuição antes de excluí-la.",
        )

    await conn.execute("delete from rubricas where id = $1", rubrica_id)
    return None


@router.get("/{projeto_id}/rubricas/execucao")
async def obter_execucao_orcamentaria(projeto_id: str, dep=Depends(get_conn)):
    """
    Retorna o status de execução financeira por rubrica orçamentária e analisa
    o cumprimento do limite legal de 20% de remanejamento (Art. 18 / IN MinC / ANCINE).
    """
    conn, _ = dep
    await _projeto_existe(conn, projeto_id)

    rubricas = await conn.fetch(
        """
        SELECT r.id, r.codigo, r.descricao, r.descricao_completa, r.valor_orcado,
               coalesce(sum(t.valor), 0.0) as valor_executado,
               count(t.id) as transacoes_count
        FROM rubricas r
        LEFT JOIN transacoes t ON t.rubrica_id = r.id AND t.projeto_id = r.projeto_id
        WHERE r.projeto_id = $1
        GROUP BY r.id, r.codigo, r.descricao, r.descricao_completa, r.valor_orcado
        ORDER BY r.codigo
        """,
        projeto_id
    )

    total_orcado = sum((float(r["valor_orcado"]) if r["valor_orcado"] is not None else 0.0) for r in rubricas)
    total_executado = sum(float(r["valor_executado"]) for r in rubricas)

    itens = []
    total_remanejamentos_acima_20 = 0

    for r in rubricas:
        orcado = float(r["valor_orcado"]) if r["valor_orcado"] is not None else 0.0
        executado = float(r["valor_executado"])
        saldo = orcado - executado
        pct_exec = round((executado / orcado * 100), 2) if orcado > 0 else 0.0

        limite_20_permitido = orcado * 1.20

        if executado > limite_20_permitido and orcado > 0:
            status_remanejamento = "EXCEDE_LIMITE_20"
            excesso = round(executado - limite_20_permitido, 2)
            requer_aprovacao = True
            total_remanejamentos_acima_20 += 1
        elif executado > orcado:
            status_remanejamento = "REMANEJAMENTO_AUTOMATICO_PERMITIDO"
            excesso = 0.0
            requer_aprovacao = False
        else:
            status_remanejamento = "DENTRO_DO_ORCADO"
            excesso = 0.0
            requer_aprovacao = False

        itens.append({
            "id": str(r["id"]),
            "codigo": r["codigo"],
            "descricao": r["descricao"],
            "valor_orcado": orcado,
            "valor_executado": executado,
            "saldo": saldo,
            "percentual_executado": pct_exec,
            "transacoes_count": r["transacoes_count"],
            "status_remanejamento": status_remanejamento,
            "excesso_remanejamento": excesso,
            "requer_aprovacao_minc": requer_aprovacao,
        })

    return {
        "projeto_id": projeto_id,
        "total_orcado": total_orcado,
        "total_executado": total_executado,
        "saldo_global": total_orcado - total_executado,
        "alerta_bloqueio_20": total_remanejamentos_acima_20 > 0,
        "rubricas_com_excesso_20": total_remanejamentos_acima_20,
        "rubricas": itens,
    }


class RemanejamentoIn(BaseModel):
    rubrica_origem_id: str
    rubrica_destino_id: str
    valor: float
    justificativa: str


@router.post("/{projeto_id}/rubricas/solicitar-remanejamento")
async def solicitar_remanejamento(
    projeto_id: str,
    body: RemanejamentoIn,
    dep=Depends(get_conn)
):
    """
    Registra solicitação formal de remanejamento orçamentário entre rubricas.
    Valida limites legais de 20% e audita a justificativa do proponente.
    """
    conn, user_id = dep
    await _projeto_existe(conn, projeto_id)

    if body.valor <= 0:
        raise HTTPException(400, "O valor do remanejamento deve ser maior que zero.")
    if not body.justificativa.strip():
        raise HTTPException(400, "Justificativa regulatória é obrigatória para remanejamento orçamentário.")

    origem = await _get_rubrica(conn, projeto_id, body.rubrica_origem_id)
    destino = await _get_rubrica(conn, projeto_id, body.rubrica_destino_id)

    val_origem_orcado = float(origem["valor_orcado"] or 0)
    val_destino_orcado = float(destino["valor_orcado"] or 0)

    # Verifica se destino excede 20%
    novo_destino = val_destino_orcado + body.valor
    excede_20 = (novo_destino > val_destino_orcado * 1.20) if val_destino_orcado > 0 else True

    # Registra no audit trail
    await conn.execute(
        """
        INSERT INTO audit_events (
            projeto_id, entity_type, entity_id, action, before_state, after_state, reason, actor_id
        )
        VALUES ($1, 'BUDGET_REALLOCATION', $2, $3, $4::jsonb, $5::jsonb, $6, $7)
        """,
        projeto_id,
        destino["id"],
        "SOLICITACAO_REMANEJAMENTO",
        json.dumps({"orcado_origem": val_origem_orcado, "orcado_destino": val_destino_orcado}),
        json.dumps({
            "rubrica_origem": origem["codigo"],
            "rubrica_destino": destino["codigo"],
            "valor_transferido": body.valor,
            "novo_orcado_destino": novo_destino,
            "excede_20_porcento": excede_20
        }),
        body.justificativa,
        user_id
    )

    return {
        "status": "REGISTRADO",
        "excede_limite_20": excede_20,
        "requer_aprovacao_minc": excede_20,
        "mensagem": (
            "Remanejamento acima de 20% do orçamento da rubrica registrado. Requer anuência prévia do MinC/ANCINE no SALIC."
            if excede_20
            else "Remanejamento dentro do limite automático de 20% registrado com sucesso."
        ),
    }