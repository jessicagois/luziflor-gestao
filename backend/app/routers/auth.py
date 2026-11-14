from fastapi import APIRouter, HTTPException, Request, Response, status

from app import schemas, seguranca
from app.config import config

router = APIRouter(prefix="/auth", tags=["autenticação"])
COOKIE = "luziflor_renovacao"


def _gravar_cookie(resposta: Response, token: str) -> None:
    # Front-end (GitHub Pages) e API (Render) ficam em sites diferentes,
    # então em produção o cookie precisa de SameSite=None + Secure.
    resposta.set_cookie(
        COOKIE, token, httponly=True, secure=config.producao,
        samesite="none" if config.producao else "lax",
        max_age=config.dias_token_renovacao * 86400, path="/auth",
    )


@router.post("/login", response_model=schemas.TokenSaida)
def login(dados: schemas.LoginEntrada, request: Request, resposta: Response):
    ip = seguranca.ip_da_requisicao(request)
    if seguranca.bloqueado(ip):
        raise HTTPException(status.HTTP_429_TOO_MANY_REQUESTS, "Muitas tentativas. Tente de novo em 15 minutos.")
    if not seguranca.senha_confere(dados.senha, config.senha_hash):
        seguranca.registrar_tentativa_falha(ip)
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, seguranca.MSG_LOGIN_INVALIDO)
    seguranca.limpar_tentativas(ip)
    _gravar_cookie(resposta, seguranca.criar_token_renovacao())
    return schemas.TokenSaida(token_acesso=seguranca.criar_token_acesso(), expira_em_minutos=config.minutos_token_acesso)


@router.post("/renovar", response_model=schemas.TokenSaida)
def renovar(request: Request):
    token = request.cookies.get(COOKIE)
    if not token:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Faça login para continuar.")
    seguranca.ler_token(token, "renovacao")
    return schemas.TokenSaida(token_acesso=seguranca.criar_token_acesso(), expira_em_minutos=config.minutos_token_acesso)


@router.post("/sair", status_code=status.HTTP_204_NO_CONTENT)
def sair(request: Request, resposta: Response):
    token = request.cookies.get(COOKIE)
    if token:
        try:
            seguranca.revogar(seguranca.ler_token(token, "renovacao"))
        except HTTPException:
            pass
    resposta.delete_cookie(COOKIE, path="/auth")
