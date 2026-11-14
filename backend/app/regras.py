"""Regras de negócio puras (sem banco), fáceis de testar.

As mesmas regras existem no front-end (src/app/core/regras.ts) e são
repetidas aqui para garantir a integridade dos dados no servidor.
"""
from dataclasses import dataclass
from decimal import Decimal

FORMAS_PAGAMENTO = {"dinheiro", "pix", "cartao", "fiado"}


class RegraVioladaError(ValueError):
    """Erro de regra de negócio com mensagem simples para o usuário."""


@dataclass(frozen=True)
class ItemCalculo:
    quantidade: int
    preco_unitario: Decimal


def calcular_total(itens: list[ItemCalculo]) -> Decimal:
    if not itens:
        raise RegraVioladaError("A venda precisa ter pelo menos uma peça.")
    total = Decimal("0")
    for item in itens:
        if item.quantidade <= 0:
            raise RegraVioladaError("A quantidade precisa ser maior que zero.")
        total += Decimal(item.quantidade) * item.preco_unitario
    return total.quantize(Decimal("0.01"))


def validar_estoque(quantidade_pedida: int, estoque_disponivel: int) -> None:
    if quantidade_pedida <= 0:
        raise RegraVioladaError("A quantidade precisa ser maior que zero.")
    if quantidade_pedida > estoque_disponivel:
        raise RegraVioladaError(f"Só tem {estoque_disponivel} no estoque. Diminua a quantidade.")


def status_inicial(forma_pagamento: str, id_cliente: str | None) -> str:
    if forma_pagamento not in FORMAS_PAGAMENTO:
        raise RegraVioladaError("Forma de pagamento inválida.")
    if forma_pagamento == "fiado":
        if not id_cliente:
            raise RegraVioladaError("Escolha o cliente para vender no fiado.")
        return "pendente"
    return "pago"


def validar_venda(forma_pagamento: str, id_cliente: str | None, status_pagamento: str,
                  itens: list[ItemCalculo], valor_total: Decimal) -> None:
    """Confere uma venda recebida na sincronização."""
    if forma_pagamento not in FORMAS_PAGAMENTO:
        raise RegraVioladaError("Forma de pagamento inválida.")
    if forma_pagamento == "fiado" and not id_cliente:
        raise RegraVioladaError("Escolha o cliente para vender no fiado.")
    if forma_pagamento != "fiado" and status_pagamento != "pago":
        raise RegraVioladaError("Só vendas no fiado podem ficar pendentes.")
    if calcular_total(itens) != valor_total.quantize(Decimal("0.01")):
        raise RegraVioladaError("O total da venda não confere com os itens.")


def saldo_devedor(vendas: list[tuple[str, str, Decimal]]) -> Decimal:
    """Soma as vendas no fiado pendentes. Cada venda: (forma, status, valor)."""
    total = sum((valor for forma, status, valor in vendas if forma == "fiado" and status == "pendente"), Decimal("0"))
    return total.quantize(Decimal("0.01"))
