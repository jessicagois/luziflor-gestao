"""Gera o hash bcrypt da senha da proprietária para colocar em SENHA_HASH.

Uso: python scripts/gerar_hash.py
A senha é digitada sem aparecer na tela e não é salva em lugar nenhum.
"""
import getpass
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from app.seguranca import gerar_hash  # noqa: E402

senha = getpass.getpass("Digite a senha (mínimo 10 caracteres): ")
if len(senha) < 10:
    sys.exit("A senha precisa ter pelo menos 10 caracteres.")
if senha != getpass.getpass("Repita a senha: "):
    sys.exit("As senhas não conferem.")
print("\nCopie a linha abaixo para o arquivo .env:\n")
print(f"SENHA_HASH={gerar_hash(senha)}")
