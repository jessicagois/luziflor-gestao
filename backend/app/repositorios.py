"""Camada de dados (padrão Repository). Só aqui o código fala com o banco.

O SQLAlchemy gera consultas parametrizadas: nenhum texto digitado é
concatenado em comandos SQL (proteção contra injeção de SQL).
"""
from decimal import Decimal

from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app import models, schemas


class ProdutoRepositorio:
    def __init__(self, db: Session):
        self.db = db

    def listar(self) -> list[models.Produto]:
        return list(self.db.scalars(select(models.Produto).order_by(models.Produto.nome, models.Produto.tamanho)))

    def existe(self, id_produto: str) -> bool:
        return self.db.get(models.Produto, id_produto) is not None

    def salvar(self, dados: schemas.ProdutoEntrada) -> models.Produto:
        produto = self.db.get(models.Produto, dados.id_produto)
        if produto is None:
            produto = models.Produto(**dados.model_dump())
            self.db.add(produto)
        else:
            for campo, valor in dados.model_dump().items():
                setattr(produto, campo, valor)
        self.db.commit()
        return produto


class ClienteRepositorio:
    def __init__(self, db: Session):
        self.db = db

    def listar(self) -> list[models.Cliente]:
        return list(self.db.scalars(select(models.Cliente).order_by(models.Cliente.nome)))

    def existe(self, id_cliente: str) -> bool:
        return self.db.get(models.Cliente, id_cliente) is not None

    def salvar(self, dados: schemas.ClienteEntrada) -> models.Cliente:
        cliente = self.db.get(models.Cliente, dados.id_cliente)
        if cliente is None:
            cliente = models.Cliente(**dados.model_dump())
            self.db.add(cliente)
        else:
            for campo, valor in dados.model_dump().items():
                setattr(cliente, campo, valor)
        self.db.commit()
        return cliente


class VendaRepositorio:
    def __init__(self, db: Session):
        self.db = db

    def listar(self) -> list[models.Venda]:
        consulta = select(models.Venda).options(selectinload(models.Venda.itens)).order_by(models.Venda.data_venda.desc())
        return list(self.db.scalars(consulta))

    def salvar(self, dados: schemas.VendaEntrada) -> models.Venda:
        """Grava venda e itens em uma única transação. Reenvio do mesmo id não duplica."""
        venda = self.db.get(models.Venda, dados.id_venda)
        campos = dados.model_dump(exclude={"itens"})
        if venda is None:
            venda = models.Venda(**campos)
            self.db.add(venda)
        else:
            for campo, valor in campos.items():
                setattr(venda, campo, valor)
            venda.itens.clear()
        venda.itens.extend(models.ItemVenda(**item.model_dump()) for item in dados.itens)
        self.db.commit()
        return venda

    def resumo_fiado(self) -> tuple[list[tuple[str, str, Decimal]], Decimal]:
        consulta = (
            select(models.Cliente.id_cliente, models.Cliente.nome, func.sum(models.Venda.valor_total))
            .join(models.Venda, models.Venda.id_cliente == models.Cliente.id_cliente)
            .where(models.Venda.forma_pagamento == "fiado", models.Venda.status_pagamento == "pendente")
            .group_by(models.Cliente.id_cliente, models.Cliente.nome)
            .order_by(models.Cliente.nome)
        )
        linhas = [(i, n, Decimal(s)) for i, n, s in self.db.execute(consulta)]
        total = sum((s for _, _, s in linhas), Decimal("0"))
        return linhas, total
