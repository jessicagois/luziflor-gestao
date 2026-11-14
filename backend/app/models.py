"""Entidades do MVP: produto, cliente, venda e item_venda."""
from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import (Boolean, CheckConstraint, Date, DateTime, ForeignKey, Integer,
                        Numeric, String, UniqueConstraint)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Produto(Base):
    __tablename__ = "produto"
    __table_args__ = (
        UniqueConstraint("nome", "tamanho", name="uq_produto_nome_tamanho"),
        CheckConstraint("quantidade_estoque >= 0", name="ck_estoque_nao_negativo"),
        CheckConstraint("preco_custo > 0 AND preco_venda > 0", name="ck_precos_positivos"),
    )

    id_produto: Mapped[str] = mapped_column(String(36), primary_key=True)
    nome: Mapped[str] = mapped_column(String(100))
    categoria: Mapped[str] = mapped_column(String(20))
    tamanho: Mapped[str] = mapped_column(String(20))
    preco_custo: Mapped[Decimal] = mapped_column(Numeric(10, 2))
    preco_venda: Mapped[Decimal] = mapped_column(Numeric(10, 2))
    quantidade_estoque: Mapped[int] = mapped_column(Integer)
    ativo: Mapped[bool] = mapped_column(Boolean, default=True)
    criado_em: Mapped[datetime] = mapped_column(DateTime)
    atualizado_em: Mapped[datetime] = mapped_column(DateTime)


class Cliente(Base):
    __tablename__ = "cliente"

    id_cliente: Mapped[str] = mapped_column(String(36), primary_key=True)
    nome: Mapped[str] = mapped_column(String(100))
    telefone: Mapped[str | None] = mapped_column(String(20), nullable=True)
    observacao: Mapped[str | None] = mapped_column(String(200), nullable=True)
    criado_em: Mapped[datetime] = mapped_column(DateTime)

    vendas: Mapped[list["Venda"]] = relationship(back_populates="cliente")


class Venda(Base):
    __tablename__ = "venda"
    __table_args__ = (
        CheckConstraint("valor_total > 0", name="ck_valor_total_positivo"),
        CheckConstraint("forma_pagamento IN ('dinheiro','pix','cartao','fiado')", name="ck_forma_pagamento"),
        CheckConstraint("status_pagamento IN ('pago','pendente')", name="ck_status_pagamento"),
        CheckConstraint("forma_pagamento <> 'fiado' OR id_cliente IS NOT NULL", name="ck_fiado_exige_cliente"),
    )

    id_venda: Mapped[str] = mapped_column(String(36), primary_key=True)
    data_venda: Mapped[datetime] = mapped_column(DateTime)
    forma_pagamento: Mapped[str] = mapped_column(String(10))
    valor_total: Mapped[Decimal] = mapped_column(Numeric(10, 2))
    canal: Mapped[str] = mapped_column(String(15), default="presencial")
    id_cliente: Mapped[str | None] = mapped_column(ForeignKey("cliente.id_cliente"), nullable=True)
    status_pagamento: Mapped[str] = mapped_column(String(10))
    data_quitacao: Mapped[date | None] = mapped_column(Date, nullable=True)

    cliente: Mapped[Cliente | None] = relationship(back_populates="vendas")
    itens: Mapped[list["ItemVenda"]] = relationship(back_populates="venda", cascade="all, delete-orphan")


class ItemVenda(Base):
    __tablename__ = "item_venda"
    __table_args__ = (CheckConstraint("quantidade > 0", name="ck_quantidade_positiva"),)

    id_item: Mapped[str] = mapped_column(String(36), primary_key=True)
    id_venda: Mapped[str] = mapped_column(ForeignKey("venda.id_venda"))
    id_produto: Mapped[str] = mapped_column(ForeignKey("produto.id_produto"))
    quantidade: Mapped[int] = mapped_column(Integer)
    preco_unitario: Mapped[Decimal] = mapped_column(Numeric(10, 2))
    custo_unitario: Mapped[Decimal] = mapped_column(Numeric(10, 2))

    venda: Mapped[Venda] = relationship(back_populates="itens")
