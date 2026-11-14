"""Configurações lidas de variáveis de ambiente (nunca do código)."""
import os
from dataclasses import dataclass, field


def _carregar_env(caminho: str = ".env") -> None:
    """Lê um arquivo .env simples, sem dependências extras."""
    if not os.path.exists(caminho):
        return
    with open(caminho, encoding="utf-8") as arquivo:
        for linha in arquivo:
            linha = linha.strip()
            if not linha or linha.startswith("#") or "=" not in linha:
                continue
            chave, valor = linha.split("=", 1)
            os.environ.setdefault(chave.strip(), valor.strip())


_carregar_env()


@dataclass(frozen=True)
class Config:
    database_url: str = field(default_factory=lambda: os.getenv("DATABASE_URL", "sqlite:///./luziflor.db"))
    jwt_secret: str = field(default_factory=lambda: os.getenv("JWT_SECRET", ""))
    senha_hash: str = field(default_factory=lambda: os.getenv("SENHA_HASH", ""))
    cors_origins: list[str] = field(
        default_factory=lambda: [o.strip() for o in os.getenv("CORS_ORIGINS", "http://localhost:4200").split(",") if o.strip()]
    )
    ambiente: str = field(default_factory=lambda: os.getenv("AMBIENTE", "dev"))

    # Regras de sessão (RNF01)
    minutos_token_acesso: int = 30
    dias_token_renovacao: int = 7
    max_tentativas_login: int = 5
    janela_bloqueio_minutos: int = 15

    @property
    def producao(self) -> bool:
        return self.ambiente == "prod"


config = Config()
