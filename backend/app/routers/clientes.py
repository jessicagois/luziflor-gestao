from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app import schemas
from app.database import get_db
from app.repositorios import ClienteRepositorio
from app.seguranca import usuario_autenticado

router = APIRouter(prefix="/clientes", tags=["clientes"], dependencies=[Depends(usuario_autenticado)])


@router.get("", response_model=list[schemas.ClienteSaida])
def listar(db: Session = Depends(get_db)):
    return ClienteRepositorio(db).listar()


@router.post("", response_model=schemas.ClienteSaida)
def salvar(dados: schemas.ClienteEntrada, db: Session = Depends(get_db)):
    return ClienteRepositorio(db).salvar(dados)
