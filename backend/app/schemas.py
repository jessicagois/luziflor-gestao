"""Validação das entradas no servidor (Pydantic). Nada chega ao banco sem passar por aqui."""
import re
from datetime import date, datetime
from decimal import Decimal
from typing import Annotated, Literal

from pydantic import AfterValidator, BaseModel, ConfigDict, Field, StringConstraints

_UUID = r"^[0-9a-fA-F-]{36}$"
_MARCACAO = re.compile(r"[<>]")


def _sem_marcacao(valor: str | None) -> str | None:
    if valor is not None and _MARCACAO.search(valor):
        raise ValueError("Texto com caracteres não permitidos.")
    return valor


Uuid = Annotated[str, StringConstraints(pattern=_UUID)]
Texto100 = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=100), AfterValidator(_sem_marcacao)]
Texto20 = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=20), AfterValidator(_sem_marcacao)]
TextoOpcional = Annotated[str | None, Field(default=None, max_length=200), AfterValidator(_sem_marcacao)]
Telefone = Annotated[str | None, Field(default=None, pattern=r"^[0-9 ()+-]{8,20}$")]
Dinheiro = Annotated[Decimal, Field(gt=0, max_digits=10, decimal_places=2)]


class Modelo(BaseModel):
    model_config = ConfigDict(extra="forbid", from_attributes=True)


class LoginEntrada(Modelo):
    senha: Annotated[str, StringConstraints(min_length=1, max_length=200)]


class TokenSaida(Modelo):
    token_acesso: str
    expira_em_minutos: int


class ProdutoEntrada(Modelo):
    id_produto: Uuid
    nome: Texto100
    categoria: Literal["feminino", "masculino", "infantil"]
    tamanho: Texto20
    preco_custo: Dinheiro
    preco_venda: Dinheiro
    quantidade_estoque: Annotated[int, Field(ge=0, le=100000)]
    ativo: bool = True
    criado_em: datetime
    atualizado_em: datetime


class ProdutoSaida(ProdutoEntrada):
    pass


class ClienteEntrada(Modelo):
    id_cliente: Uuid
    nome: Texto100
    telefone: Telefone = None
    observacao: TextoOpcional = None
    criado_em: datetime


class ClienteSaida(ClienteEntrada):
    pass


class ItemVendaEntrada(Modelo):
    id_item: Uuid
    id_produto: Uuid
    quantidade: Annotated[int, Field(gt=0, le=1000)]
    preco_unitario: Dinheiro
    custo_unitario: Dinheiro


class VendaEntrada(Modelo):
    id_venda: Uuid
    data_venda: datetime
    forma_pagamento: Literal["dinheiro", "pix", "cartao", "fiado"]
    valor_total: Dinheiro
    canal: Literal["presencial", "whatsapp"] = "presencial"
    id_cliente: Uuid | None = None
    status_pagamento: Literal["pago", "pendente"]
    data_quitacao: date | None = None
    itens: Annotated[list[ItemVendaEntrada], Field(min_length=1, max_length=50)]


class VendaSaida(VendaEntrada):
    pass


class SaldoCliente(Modelo):
    id_cliente: str
    nome: str
    saldo: Decimal


class ResumoFiado(Modelo):
    clientes: list[SaldoCliente]
    total_a_receber: Decimal
