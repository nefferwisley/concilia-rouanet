import asyncio
import sys
import asyncpg

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

async def testar():
    try:
        conn = await asyncpg.connect(
            host="127.0.0.1",
            port=5432,
            user="rouanet",
            password="rouanet_dev_password",
            database="rouanet_concilia",
        )
        total = await conn.fetchval("SELECT count(*) FROM projetos")
        print(f"✅ Conectado com sucesso via asyncpg! Total de projetos: {total}")
        await conn.close()
    except Exception as e:
        print(f"❌ Erro asyncpg: {e}")

if __name__ == "__main__":
    asyncio.run(testar())
