"""Testes das regras de negócio (não precisam de banco nem de servidor)."""
from decimal import Decimal

import pytest

from app.regras import (ItemCalculo, RegraVioladaError, calcular_total, saldo_devedor,
                        status_inicial, validar_estoque, validar_venda)


def test_total_soma_quantidade_vezes_preco():
    itens = [ItemCalculo(2, Decimal("45.00")), ItemCalculo(1, Decimal("30.50"))]
    assert calcular_total(itens) == Decimal("120.50")


def test_venda_sem_itens_e_bloqueada():
    with pytest.raises(RegraVioladaError):
        calcular_total([])


def test_venda_acima_do_estoque_e_bloqueada():
    with pytest.raises(RegraVioladaError, match="Só tem 1 no estoque"):
        validar_estoque(quantidade_pedida=2, estoque_disponivel=1)


def test_venda_dentro_do_estoque_e_aceita():
    validar_estoque(quantidade_pedida=3, estoque_disponivel=3)


def test_quantidade_zero_e_bloqueada():
    with pytest.raises(RegraVioladaError):
        validar_estoque(quantidade_pedida=0, estoque_disponivel=5)


def test_fiado_sem_cliente_e_bloqueado():
    with pytest.raises(RegraVioladaError, match="Escolha o cliente"):
        status_inicial("fiado", None)


def test_fiado_comeca_pendente_e_demais_comecam_pagas():
    assert status_inicial("fiado", "id-da-cliente") == "pendente"
    assert status_inicial("pix", None) == "pago"


def test_forma_de_pagamento_invalida():
    with pytest.raises(RegraVioladaError):
        status_inicial("cheque", None)


def test_total_que_nao_confere_com_itens_e_recusado():
    with pytest.raises(RegraVioladaError, match="não confere"):
        validar_venda("dinheiro", None, "pago", [ItemCalculo(1, Decimal("45.00"))], Decimal("40.00"))


def test_venda_paga_nao_pode_ficar_pendente():
    with pytest.raises(RegraVioladaError):
        validar_venda("pix", None, "pendente", [ItemCalculo(1, Decimal("45.00"))], Decimal("45.00"))


def test_saldo_soma_apenas_fiado_pendente():
    vendas = [
        ("fiado", "pendente", Decimal("75.00")),
        ("fiado", "pendente", Decimal("45.00")),
        ("fiado", "pago", Decimal("100.00")),
        ("pix", "pago", Decimal("60.00")),
    ]
    assert saldo_devedor(vendas) == Decimal("120.00")
