from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app import regras, schemas
from app.database import get_db
from app.repositorios import ClienteRepositorio, ProdutoRepositorio, VendaRepositorio
from app.seguranca import usuario_autenticado

router = APIRouter(tags=["vendas e fiado"], dependencies=[Depends(usuario_autenticado)])


@router.get("/vendas", response_model=list[schemas.VendaSaida])
def listar(db: Session = Depends(get_db)):
    return VendaRepositorio(db).listar()


@router.post("/vendas", response_model=schemas.VendaSaida)
def salvar(dados: schemas.VendaEntrada, db: Session = Depends(get_db)):
    """Recebe uma venda do celular. Valida de novo as regras antes de gravar.

    O estoque é controlado no aparelho (fonte da verdade) e chega ao servidor
    pela sincronização dos produtos; por isso a venda não desconta estoque aqui.
    """
    regras.validar_venda(
        dados.forma_pagamento, dados.id_cliente, dados.status_pagamento,
        [regras.ItemCalculo(i.quantidade, i.preco_unitario) for i in dados.itens], dados.valor_total,
    )
    if dados.id_cliente and not ClienteRepositorio(db).existe(dados.id_cliente):
        raise regras.RegraVioladaError("Cliente não encontrado. Sincronize os clientes primeiro.")
    produtos = ProdutoRepositorio(db)
    if any(not produtos.existe(i.id_produto) for i in dados.itens):
        raise regras.RegraVioladaError("Peça não encontrada. Sincronize os produtos primeiro.")
    return VendaRepositorio(db).salvar(dados)


@router.get("/fiado/resumo", response_model=schemas.ResumoFiado)
def resumo_fiado(db: Session = Depends(get_db)):
    linhas, total = VendaRepositorio(db).resumo_fiado()
    return schemas.ResumoFiado(
        clientes=[schemas.SaldoCliente(id_cliente=i, nome=n, saldo=s) for i, n, s in linhas],
        total_a_receber=total,
    )
