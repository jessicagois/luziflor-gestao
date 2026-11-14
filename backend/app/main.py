"""API da Luziflor Gestão (FastAPI)."""
import logging

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.exc import IntegrityError

from app.config import config
from app.database import Base, engine
from app.regras import RegraVioladaError
from app.routers import auth, clientes, produtos, vendas

logger = logging.getLogger("luziflor")

app = FastAPI(
    title="Luziflor Gestão API",
    version="1.0.0",
    # Documentação automática só em desenvolvimento (RNF02)
    docs_url=None if config.producao else "/docs",
    redoc_url=None,
    openapi_url=None if config.producao else "/openapi.json",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=config.cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["Authorization", "Content-Type"],
)


@app.middleware("http")
async def cabecalhos_seguranca(request: Request, call_next):
    resposta = await call_next(request)
    resposta.headers["X-Content-Type-Options"] = "nosniff"
    resposta.headers["X-Frame-Options"] = "DENY"
    resposta.headers["Referrer-Policy"] = "no-referrer"
    return resposta


# Mensagens de erro simples, sem detalhes técnicos (RNF02)
@app.exception_handler(RegraVioladaError)
async def erro_regra(_: Request, erro: RegraVioladaError):
    return JSONResponse(status_code=422, content={"detail": str(erro)})


@app.exception_handler(RequestValidationError)
async def erro_validacao(_: Request, erro: RequestValidationError):
    campos = sorted({str(e["loc"][-1]) for e in erro.errors() if e.get("loc")})
    return JSONResponse(status_code=422, content={"detail": "Dados inválidos.", "campos": campos})


@app.exception_handler(IntegrityError)
async def erro_integridade(_: Request, erro: IntegrityError):
    logger.warning("Violação de integridade: %s", erro.orig)
    return JSONResponse(status_code=409, content={"detail": "Esses dados já existem ou estão inconsistentes."})


@app.exception_handler(Exception)
async def erro_inesperado(_: Request, erro: Exception):
    logger.exception("Erro inesperado")
    return JSONResponse(status_code=500, content={"detail": "Não foi possível concluir a operação."})


@app.get("/saude", tags=["sistema"])
def saude():
    return {"status": "ok"}


app.include_router(auth.router)
app.include_router(produtos.router)
app.include_router(clientes.router)
app.include_router(vendas.router)

Base.metadata.create_all(bind=engine)
