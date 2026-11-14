"""Testes da API: autenticação, validação de entradas e fluxo da venda no fiado."""
import uuid
from datetime import datetime

import pytest

pytest.importorskip("fastapi")
pytest.importorskip("sqlalchemy")
pytest.importorskip("bcrypt")

from fastapi.testclient import TestClient  # noqa: E402

from app import seguranca  # noqa: E402
from app.main import app  # noqa: E402
from tests.conftest import SENHA_TESTE  # noqa: E402

cliente_http = TestClient(app)
AGORA = datetime(2026, 11, 14, 10, 0).isoformat()


def _id() -> str:
    return str(uuid.uuid4())


@pytest.fixture(autouse=True)
def zerar_tentativas():
    seguranca._tentativas.clear()


@pytest.fixture
def cabecalho():
    resposta = cliente_http.post("/auth/login", json={"senha": SENHA_TESTE})
    assert resposta.status_code == 200
    return {"Authorization": f"Bearer {resposta.json()['token_acesso']}"}


def _produto(nome="Blusa de malha", tamanho="M", estoque=3):
    return {"id_produto": _id(), "nome": nome, "categoria": "feminino", "tamanho": tamanho,
            "preco_custo": "25.00", "preco_venda": "45.00", "quantidade_estoque": estoque,
            "ativo": True, "criado_em": AGORA, "atualizado_em": AGORA}


def test_login_com_senha_errada_retorna_mensagem_generica():
    resposta = cliente_http.post("/auth/login", json={"senha": "errada"})
    assert resposta.status_code == 401
    assert resposta.json()["detail"] == "Usuário ou senha incorretos."


def test_sexta_tentativa_errada_e_bloqueada():
    for _ in range(5):
        cliente_http.post("/auth/login", json={"senha": "errada"})
    assert cliente_http.post("/auth/login", json={"senha": SENHA_TESTE}).status_code == 429


def test_rotas_de_dados_exigem_token():
    assert cliente_http.get("/clientes").status_code == 401
    assert cliente_http.get("/produtos", headers={"Authorization": "Bearer token-falso"}).status_code == 401


def test_token_de_renovacao_revogado_apos_sair():
    cliente_http.post("/auth/login", json={"senha": SENHA_TESTE})
    assert cliente_http.post("/auth/renovar").status_code == 200
    token_antigo = cliente_http.cookies.get("luziflor_renovacao")
    cliente_http.post("/auth/sair")
    cliente_http.cookies.set("luziflor_renovacao", token_antigo, path="/auth")
    assert cliente_http.post("/auth/renovar").status_code == 401


def test_texto_com_script_e_recusado(cabecalho):
    dados = {"id_cliente": _id(), "nome": "<script>alert(1)</script>", "criado_em": AGORA}
    resposta = cliente_http.post("/clientes", json=dados, headers=cabecalho)
    assert resposta.status_code == 422
    assert "Traceback" not in resposta.text


def test_busca_com_injecao_de_sql_nao_quebra_o_banco(cabecalho):
    dados = _produto(nome="' OR '1'='1; DROP TABLE produto; --", tamanho="P")
    assert cliente_http.post("/produtos", json=dados, headers=cabecalho).status_code == 200
    assert cliente_http.get("/produtos", headers=cabecalho).status_code == 200


def test_fluxo_venda_no_fiado_e_quitacao(cabecalho):
    produto = _produto()
    cliente = {"id_cliente": _id(), "nome": "Maria Souza", "criado_em": AGORA}
    assert cliente_http.post("/produtos", json=produto, headers=cabecalho).status_code == 200
    assert cliente_http.post("/clientes", json=cliente, headers=cabecalho).status_code == 200

    venda = {"id_venda": _id(), "data_venda": AGORA, "forma_pagamento": "fiado", "valor_total": "45.00",
             "id_cliente": cliente["id_cliente"], "status_pagamento": "pendente",
             "itens": [{"id_item": _id(), "id_produto": produto["id_produto"], "quantidade": 1,
                        "preco_unitario": "45.00", "custo_unitario": "25.00"}]}
    assert cliente_http.post("/vendas", json=venda, headers=cabecalho).status_code == 200
    # Reenvio da mesma venda (sincronização repetida) não duplica
    assert cliente_http.post("/vendas", json=venda, headers=cabecalho).status_code == 200

    resumo = cliente_http.get("/fiado/resumo", headers=cabecalho).json()
    maria = next(c for c in resumo["clientes"] if c["nome"] == "Maria Souza")
    assert maria["saldo"] in ("45.00", "45.0", 45.0)

    venda.update(status_pagamento="pago", data_quitacao="2026-11-20")
    assert cliente_http.post("/vendas", json=venda, headers=cabecalho).status_code == 200
    resumo = cliente_http.get("/fiado/resumo", headers=cabecalho).json()
    assert all(c["nome"] != "Maria Souza" for c in resumo["clientes"])


def test_fiado_sem_cliente_e_recusado(cabecalho):
    venda = {"id_venda": _id(), "data_venda": AGORA, "forma_pagamento": "fiado", "valor_total": "45.00",
             "status_pagamento": "pendente",
             "itens": [{"id_item": _id(), "id_produto": _id(), "quantidade": 1,
                        "preco_unitario": "45.00", "custo_unitario": "25.00"}]}
    resposta = cliente_http.post("/vendas", json=venda, headers=cabecalho)
    assert resposta.status_code == 422
    assert resposta.json()["detail"] == "Escolha o cliente para vender no fiado."
