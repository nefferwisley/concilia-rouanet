import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from backend.config import settings
from backend.database import adquirir_conn, close_pool, get_pool, reiniciar_pool
from backend.routes import (
    auditoria,
    conciliacao,
    dev_demo,
    divergencias,
    documentos,
    importacoes,
    organizacao,
    orquestrador,
    planilha,
    projetos,
    real_imports,
    reconciliations,
    regularizacao,
    relatorios,
    revisao,
    reviews,
    rubricas,
    salic,
    websocket,
)

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")
log = logging.getLogger("rouanet-api")


@asynccontextmanager
async def lifespan(app: FastAPI):
    watcher_started = False
    try:
        await get_pool()
        log.info("Pool de conexões pronto.")

        from backend.scripts.apply_migrations import aplicar_migrations, verificar_migrations

        if settings.auto_apply_migrations:
            if settings.app_env.strip().lower() == "production":
                raise RuntimeError(
                    "AUTO_APPLY_MIGRATIONS não pode ser habilitado em produção; "
                    "aplique migrations por uma operação controlada."
                )
            await aplicar_migrations()
            log.info("Migrations aplicadas por opt-in explícito de ambiente não produtivo.")
        else:
            await verificar_migrations()
            log.info("Migrations verificadas no startup (verify-only).")

        # Inicia o monitoramento em tempo real da pasta de uploads.
        try:
            from backend.services.watcher import iniciar_watcher

            iniciar_watcher()
            watcher_started = True
            log.info("Watcher de arquivos iniciado.")
        except Exception as e:  # noqa: BLE001
            log.warning("Watcher de arquivos não pôde ser iniciado: %s", e)

        yield
    finally:
        if watcher_started:
            try:
                from backend.services.watcher import encerrar_watcher

                encerrar_watcher()
            except Exception:  # noqa: BLE001
                pass
        await close_pool()


app = FastAPI(title="RouanetConcilia API", version="1.0.0", lifespan=lifespan)

@app.middleware("http")
async def capturar_erros_com_cors(request: Request, call_next):
    try:
        return await call_next(request)
    except Exception:  # noqa: BLE001
        log.exception("Erro não tratado em %s %s", request.method, request.url)
        return JSONResponse(status_code=500, content={"detail": "Erro interno."})


app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in settings.cors_origins.split(",")],
    allow_origin_regex=r"https://([a-z0-9-]+\.)?rouanet-concilia\.pages\.dev",
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(projetos.router)
app.include_router(real_imports.router)
app.include_router(reconciliations.router)
app.include_router(reviews.router)
app.include_router(importacoes.router)
app.include_router(conciliacao.router)
app.include_router(relatorios.router)
app.include_router(websocket.router)
app.include_router(documentos.router)
app.include_router(auditoria.router)
app.include_router(divergencias.router)
app.include_router(revisao.router)
app.include_router(salic.router)
app.include_router(organizacao.router)
app.include_router(regularizacao.router)
app.include_router(planilha.router)
app.include_router(rubricas.router)
app.include_router(orquestrador.router)
app.include_router(dev_demo.router)


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    log.exception("Erro não tratado (fora da stack CORS) em %s %s", request.method, request.url)
    return JSONResponse(status_code=500, content={"detail": "Erro interno."})


@app.get("/health")
def health():
    return {"status": "ok", "version": "1.0"}


@app.get("/health/db")
async def health_db():
    try:
        acquired_pool, conn = await adquirir_conn()
        try:
            await conn.fetchval("select 1")
        finally:
            await acquired_pool.release(conn)
    except Exception as e:
        log.exception("health/db: banco inacessível")
        return JSONResponse(
            status_code=503,
            content={"status": "erro", "db": "inacessível", "detalhe": str(e)},
        )
    return {"status": "ok", "db": "reachable"}
