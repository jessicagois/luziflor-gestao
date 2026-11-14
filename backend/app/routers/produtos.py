from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app import schemas
from app.database import get_db
from app.repositorios import ProdutoRepositorio
from app.seguranca import usuario_autenticado

router = APIRouter(prefix="/produtos", tags=["produtos"], dependencies=[Depends(usuario_autenticado)])


@router.get("", response_model=list[schemas.ProdutoSaida])
def listar(db: Session = Depends(get_db)):
    return ProdutoRepositorio(db).listar()


@router.post("", response_model=schemas.ProdutoSaida)
def salvar(dados: schemas.ProdutoEntrada, db: Session = Depends(get_db)):
    """Cria ou atualiza (mesmo id não duplica). Usado na sincronização."""
    return ProdutoRepositorio(db).salvar(dados)
