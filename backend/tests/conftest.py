"""Configura um banco SQLite temporário e uma senha de teste antes de importar a API."""
import os
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

_banco = Path(tempfile.gettempdir()) / "luziflor_teste.db"
_banco.unlink(missing_ok=True)
os.environ["DATABASE_URL"] = f"sqlite:///{_banco}"
os.environ["JWT_SECRET"] = "chave-apenas-para-testes-automatizados"
os.environ["AMBIENTE"] = "dev"
os.environ["CORS_ORIGINS"] = "http://localhost:4200"

SENHA_TESTE = "senha-de-teste-123"

try:
    import bcrypt

    os.environ["SENHA_HASH"] = bcrypt.hashpw(SENHA_TESTE.encode(), bcrypt.gensalt(rounds=4)).decode()
except ImportError:  # os testes de regras não precisam de bcrypt
    pass
