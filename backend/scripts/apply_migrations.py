"""
apply_migrations.py — aplica migrations pendentes no startup do backend.

Por que existe: sem isso, o schema do banco fica atrasado (ex: produção sem
a tabela `documentos_projeto`) até alguém rodar psql manualmente. Com este
runner, toda vez que o app sobe, ele verifica quais arquivos de
db/migrations/000X_*.sql já foram aplicados (tabela schema_migrations) e
aplica os que faltam, em ordem.

Uso (chamado no main.py, mas pode rodar standalone):
    python -m scripts.apply_migrations
"""
import asyncio
import hashlib
import pathlib
from logging import getLogger

import asyncpg

from backend.config import settings

log = getLogger("rouanet-api.migrations")

MIGRATIONS_DIR = pathlib.Path(__file__).resolve().parents[2] / "db" / "migrations"


# 0000_local_dev_shim.sql recria auth.users/auth.uid()/role authenticated pra
# rodar contra o Postgres vanilla do docker-compose. O próprio cabeçalho do
# arquivo diz pra NÃO rodar contra Supabase (lá isso já existe nativamente).
SHIM_LOCAL = "0000_local_dev_shim.sql"

# Este projeto teve duas linhas de migrations com nomes diferentes aplicadas
# ao mesmo banco. A produção contém os objetos abaixo, mas a tabela de controle
# registra apenas os nomes da linha antiga (0015_planilha_sync_versionada etc.).
# Os probes permitem adotar SOMENTE aliases cuja estrutura já está comprovada.
LEGACY_FORK_MARKERS = {
    "0015_planilha_sync_versionada.sql",
    "0016_storage_orphans.sql",
    "0017_sincronizacao_documentos.sql",
    "0018_sincronizacao_documentos_integridade.sql",
}

LEGACY_BASELINE_PROBES = {
    "0001_schema.sql": """
        select to_regclass('public.projetos') is not null
           and to_regclass('public.transacoes') is not null
           and to_regclass('public.despesas') is not null
           and to_regprocedure('public.pode_acessar_projeto(uuid)') is not null
    """,
    "0002_importacoes.sql": "select to_regclass('public.importacoes') is not null",
    "0003_documentos_projeto.sql": "select to_regclass('public.documentos_projeto') is not null",
    "0004_regularizacao.sql": "select to_regclass('public.regularizacoes') is not null",
    "0005_valor_captado.sql": """
        select exists (
            select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'projetos'
               and column_name = 'valor_captado'
        )
    """,
    "0012_planilha_revisada.sql": "select to_regclass('public.planilha_revisada') is not null",
    "0013_rename_cnpj_to_documento.sql": """
        select exists (
            select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'transacoes'
               and column_name = 'documento'
        ) and not exists (
            select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'transacoes'
               and column_name = 'cnpj_fornecedor'
        )
    """,
    "0015_real_imports.sql": """
        select to_regclass('public.import_files') is not null
           and to_regclass('public.processing_jobs') is not null
           and to_regclass('public.processing_events') is not null
    """,
    "0016_evidence_reconciliation.sql": "select to_regclass('public.evidence_links') is not null",
    "0017_evidence_review_audit.sql": """
        select to_regclass('public.review_decisions') is not null
           and to_regclass('public.audit_events') is not null
    """,
}


async def _e_supabase(conn: asyncpg.Connection) -> bool:
    """
    Detecta pelo ESTADO DO BANCO (não por env var, que alguém esquece de
    setar): se o schema `auth` e a função `auth.uid()` já existem, estamos
    num Supabase real e o shim local é desnecessário. Em caso de dúvida
    (erro na checagem) responde False — rodar o shim num Postgres vanilla é
    o comportamento antigo e seguro; pulá-lo por engano quebraria o dev local.
    """
    try:
        return bool(
            await conn.fetchval(
                """
                select exists (
                    select 1
                    from pg_proc p
                    join pg_namespace n on n.oid = p.pronamespace
                    where n.nspname = 'auth' and p.proname = 'uid'
                )
                """
            )
        )
    except Exception as e:  # noqa: BLE001
        log.warning("Não deu pra detectar se o banco é Supabase (%s); assumindo local.", e)
        return False


def _checksum(arquivo: pathlib.Path) -> str:
    return hashlib.sha256(arquivo.read_bytes()).hexdigest()


async def _adotar_baseline_legado(
    conn: asyncpg.Connection,
    aplicadas: dict[str, str | None],
) -> list[str]:
    """Registra aliases da linha atual quando o fork legado está comprovado.

    Nunca considera apenas o nome/ordem numérica: cada alias exige seu objeto
    estrutural. Isso evita tanto recriar objetos existentes quanto mascarar uma
    migration realmente pendente (como project_snapshots/0018 nesta produção).
    """
    if not LEGACY_FORK_MARKERS.intersection(aplicadas):
        return []

    adotadas: list[str] = []
    for nome, probe in LEGACY_BASELINE_PROBES.items():
        if nome in aplicadas:
            continue
        arquivo = MIGRATIONS_DIR / nome
        if not arquivo.exists() or not await conn.fetchval(probe):
            continue
        checksum = _checksum(arquivo)
        await conn.execute(
            """
            insert into schema_migrations (id, checksum)
            values ($1, $2)
            on conflict (id) do nothing
            """,
            nome,
            checksum,
        )
        aplicadas[nome] = checksum
        adotadas.append(nome)
        log.warning("Baseline legado adotado após probe estrutural: %s", nome)
    return adotadas


async def aplicar_migrations() -> None:
    # statement_cache_size=0 pelo mesmo motivo do pool (ver database.py): se a
    # DATABASE_URL apontar pro pooler em transaction mode, prepared statement
    # cacheado vira `prepared statement "__asyncpg_stmt_NNN__" does not exist`.
    conn = await asyncpg.connect(settings.database_url, statement_cache_size=0)
    try:
        await conn.execute(
            """
            create table if not exists schema_migrations (
                id          text primary key,
                checksum    text,
                applied_at  timestamptz not null default now()
            )
            """
        )
        await conn.execute(
            "alter table schema_migrations add column if not exists checksum text"
        )

        aplicadas = {
            r["id"]: r["checksum"]
            for r in await conn.fetch("select id, checksum from schema_migrations")
        }
        supabase = await _e_supabase(conn)
        adotadas = await _adotar_baseline_legado(conn, aplicadas) if supabase else []
        if adotadas:
            log.warning("%d migration(s) reconciliada(s) com o baseline legado.", len(adotadas))

        contagem_ok, contagem_pulada, falhas = 0, 0, []

        # Quatro dígitos, não "000*": o glob antigo casava só até 0009 e teria
        # PULADO 0010 em diante — em silêncio, sem erro nenhum, que é o pior
        # modo de falhar (foi assim que 0009 não aplicou e derrubou produção).
        arquivos = sorted(MIGRATIONS_DIR.glob("[0-9][0-9][0-9][0-9]_*.sql"))
        for arquivo in arquivos:
            sql_bytes = arquivo.read_bytes()
            checksum = hashlib.sha256(sql_bytes).hexdigest()
            if arquivo.name in aplicadas:
                checksum_aplicado = aplicadas[arquivo.name]
                if checksum_aplicado is None:
                    await conn.execute(
                        "update schema_migrations set checksum = $1 where id = $2",
                        checksum,
                        arquivo.name,
                    )
                elif checksum_aplicado != checksum:
                    raise RuntimeError(
                        f"Migration {arquivo.name} foi alterada depois de aplicada "
                        f"(esperado {checksum_aplicado}, atual {checksum})."
                    )
                contagem_pulada += 1
                continue
            if arquivo.name == SHIM_LOCAL and supabase:
                log.info("Pulando %s: banco é Supabase (auth.uid() já existe).", arquivo.name)
                contagem_pulada += 1
                continue

            # Alguns editores salvam .sql como UTF-8 com BOM. O PostgreSQL
            # interpreta esse caractere invisível antes de CREATE como token
            # inválido; ``utf-8-sig`` o remove quando presente e preserva
            # arquivos UTF-8 comuns.
            sql = sql_bytes.decode("utf-8-sig")
            log.info("Aplicando migration %s ...", arquivo.name)
            # Cada migration na SUA transação e com o erro contido aqui: antes,
            # uma falha (ex: 0001 recriando tabela que já existe no Supabase)
            # subia a exceção e abortava TODA a cadeia seguinte — foi assim que
            # 0009 nunca rodou em produção e toda rota autenticada virou 500
            # por `column t.razao_social does not exist`.
            try:
                async with conn.transaction():
                    await conn.execute(sql)
                    await conn.execute(
                        "insert into schema_migrations (id, checksum) values ($1, $2)",
                        arquivo.name,
                        checksum,
                    )
                contagem_ok += 1
                log.info("Migration %s aplicada.", arquivo.name)
            except Exception as e:  # noqa: BLE001 — interromper no primeiro erro
                falhas.append((arquivo.name, str(e)))
                log.error("FALHA na migration %s: %s", arquivo.name, e)
                break

        log.info(
            "Resumo das migrations: %d aplicada(s), %d pulada(s), %d falha(s).",
            contagem_ok, contagem_pulada, len(falhas),
        )
        if falhas:
            # Berra alto: o modo de falha anterior era silencioso (o lifespan
            # engolia tudo num log.warning) e ninguém notava schema atrasado.
            log.error("=" * 60)
            log.error("ATENÇÃO: %d migration(s) FALHARAM — schema pode estar atrasado.", len(falhas))
            for nome, erro in falhas:
                log.error("  - %s -> %s", nome, erro)
            log.error("=" * 60)
            nome, erro = falhas[0]
            raise RuntimeError(f"Migration obrigatória {nome} falhou: {erro}")
    finally:
        await conn.close()


if __name__ == "__main__":
    asyncio.run(aplicar_migrations())
