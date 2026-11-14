"""Autenticação (RNF01): bcrypt para a senha, JWT para a sessão.

- A senha NUNCA é guardada em texto limpo, nem com MD5/SHA-1: só o hash bcrypt.
- Hash é de mão única; não existe forma de "descriptografar" a senha.
"""
import time
import uuid
from collections import defaultdict, deque
from datetime import UTC, datetime, timedelta

import bcrypt
import jwt
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.config import config

ALGORITMO = "HS256"
_bearer = HTTPBearer(auto_error=False)

# Lista de revogação e controle de tentativas ficam em memória neste MVP
# (uma única usuária e um único servidor). Ver limitação no README.
_tokens_revogados: dict[str, float] = {}
_tentativas: dict[str, deque[float]] = defaultdict(deque)

MSG_LOGIN_INVALIDO = "Usuário ou senha incorretos."


def gerar_hash(senha: str) -> str:
    return bcrypt.hashpw(senha.encode("utf-8"), bcrypt.gensalt(rounds=12)).decode("utf-8")


def senha_confere(senha: str, senha_hash: str) -> bool:
    if not senha_hash:
        return False
    try:
        return bcrypt.checkpw(senha.encode("utf-8"), senha_hash.encode("utf-8"))
    except ValueError:
        return False


def _criar_token(tipo: str, duracao: timedelta) -> tuple[str, str]:
    if not config.jwt_secret:
        raise RuntimeError("JWT_SECRET não configurado.")
    jti = str(uuid.uuid4())
    agora = datetime.now(UTC)
    dados = {"sub": "proprietaria", "tipo": tipo, "jti": jti, "iat": agora, "exp": agora + duracao}
    return jwt.encode(dados, config.jwt_secret, algorithm=ALGORITMO), jti


def criar_token_acesso() -> str:
    return _criar_token("acesso", timedelta(minutes=config.minutos_token_acesso))[0]


def criar_token_renovacao() -> str:
    return _criar_token("renovacao", timedelta(days=config.dias_token_renovacao))[0]


def ler_token(token: str, tipo_esperado: str) -> dict:
    try:
        dados = jwt.decode(token, config.jwt_secret, algorithms=[ALGORITMO])
    except jwt.PyJWTError:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Sessão inválida ou expirada.")
    if dados.get("tipo") != tipo_esperado or dados.get("jti") in _tokens_revogados:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Sessão inválida ou expirada.")
    return dados


def revogar(dados_token: dict) -> None:
    _tokens_revogados[dados_token["jti"]] = float(dados_token["exp"])
    agora = time.time()
    for jti, expira in list(_tokens_revogados.items()):
        if expira < agora:
            del _tokens_revogados[jti]


def registrar_tentativa_falha(ip: str) -> None:
    _tentativas[ip].append(time.time())


def bloqueado(ip: str) -> bool:
    janela = config.janela_bloqueio_minutos * 60
    fila = _tentativas[ip]
    while fila and fila[0] < time.time() - janela:
        fila.popleft()
    return len(fila) >= config.max_tentativas_login


def limpar_tentativas(ip: str) -> None:
    _tentativas.pop(ip, None)


def usuario_autenticado(
    credenciais: HTTPAuthorizationCredentials | None = Depends(_bearer),
) -> str:
    """Dependência aplicada a TODAS as rotas de dados: sem token válido, 401."""
    if credenciais is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Faça login para continuar.")
    return ler_token(credenciais.credentials, "acesso")["sub"]


def ip_da_requisicao(request: Request) -> str:
    return request.client.host if request.client else "desconhecido"
