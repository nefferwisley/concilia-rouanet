"""
apply_migrations.py — verifica ou, por opt-in operacional, aplica migrations.

No startup normal o backend usa `verificar_migrations`, que é somente leitura
e falha se o ledger estiver ausente ou atrasado. `aplicar_migrations` só é
usado com opt-in explícito fora de produção ou como comando operacional.

Uso operacional standalone (nunca implícito em produção):
    python -m scripts.apply_migrations
"""
import asyncio
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


def _arquivos_migration() -> list[pathlib.Path]:
    return sorted(MIGRATIONS_DIR.glob("[0-9][0-9][0-9][0-9]_*.sql"))


async def verificar_migrations() -> None:
    """Falha se o ledger não existir ou houver migration pendente; não escreve."""
    conn = await asyncpg.connect(settings.database_url, statement_cache_size=0)
    try:
        ledger_exists = await conn.fetchval(
            "select to_regclass('public.schema_migrations') is not null"
        )
        if ledger_exists is not True:
            raise RuntimeError(
                "schema_migrations ausente; aplique as migrations por uma operação controlada."
            )

        aplicadas = {r["id"] for r in await conn.fetch("select id from schema_migrations")}
        supabase = await _e_supabase(conn)
        esperadas = [
            arquivo.name
            for arquivo in _arquivos_migration()
            if not (arquivo.name == SHIM_LOCAL and supabase)
        ]
        pendentes = [nome for nome in esperadas if nome not in aplicadas]
        if pendentes:
            raise RuntimeError(
                "Migrations pendentes: " + ", ".join(pendentes)
            )
        log.info("Schema verificado: %d migration(s) aplicada(s), nenhuma pendente.", len(esperadas))
    finally:
        await conn.close()


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
                applied_at  timestamptz not null default now()
            )
            """
        )

        aplicadas = {
            r["id"]
            for r in await conn.fetch("select id from schema_migrations")
        }
        supabase = await _e_supabase(conn)

        contagem_ok, contagem_pulada = 0, 0

        # Quatro dígitos, não "000*": o glob antigo casava só até 0009 e teria
        # PULADO 0010 em diante — em silêncio, sem erro nenhum, que é o pior
        # modo de falhar (foi assim que 0009 não aplicou e derrubou produção).
        arquivos = _arquivos_migration()
        for arquivo in arquivos:
            if arquivo.name in aplicadas:
                contagem_pulada += 1
                continue
            if arquivo.name == SHIM_LOCAL and supabase:
                log.info("Pulando %s: banco é Supabase (auth.uid() já existe).", arquivo.name)
                contagem_pulada += 1
                continue

            sql = arquivo.read_text(encoding="utf-8")
            log.info("Aplicando migration %s ...", arquivo.name)
            # O runner é o único dono da transação. Qualquer erro reverte SQL
            # + registro no ledger e é propagado para o operador/startup.
            async with conn.transaction():
                await conn.execute(sql)
                await conn.execute(
                    "insert into schema_migrations (id) values ($1)",
                    arquivo.name,
                )
            contagem_ok += 1
            log.info("Migration %s aplicada.", arquivo.name)

        log.info(
            "Resumo das migrations: %d aplicada(s), %d pulada(s), 0 falha(s).",
            contagem_ok, contagem_pulada,
        )
    finally:
        await conn.close()


if __name__ == "__main__":
    asyncio.run(aplicar_migrations())
