"""Routes pour la gestion de l'historique"""
import asyncpg
from fastapi import APIRouter, Depends
from typing import List, Optional

from database import get_db_connection
from models import HistoriqueCreate, HistoriqueResponse

router = APIRouter(prefix="/historique", tags=["historique"])

@router.get("", response_model=List[HistoriqueResponse])
async def get_historique(conn: asyncpg.Connection = Depends(get_db_connection)):
    """Récupère tout l'historique"""
    rows = await conn.fetch('SELECT * FROM "historique" ORDER BY "id" DESC')
    return [HistoriqueResponse(**dict(r)) for r in rows]


@router.get("/{piece_id}", response_model=List[HistoriqueResponse])
async def get_historique_by_piece(
    piece_id: int,
    conn: asyncpg.Connection = Depends(get_db_connection)
):
    """Récupère l'historique d'une pièce spécifique"""
    rows = await conn.fetch(
        'SELECT * FROM "historique" WHERE "RéfPièce" = $1 ORDER BY "id" DESC',
        piece_id
    )
    return [HistoriqueResponse(**dict(row)) for row in rows]


@router.post("", response_model=HistoriqueResponse)
async def add_historique(
    entry: HistoriqueCreate,
    conn: asyncpg.Connection = Depends(get_db_connection)
):
    """Ajoute une entrée dans l'historique"""
    query = '''
        INSERT INTO "historique" (
            "DateCMD", "DateRecu", "Opération", "numpiece", "description",
            "qtécommande", "QtéSortie", "nompiece", "RéfPièce", "User", "Delais"
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
        RETURNING *
    '''
    row = await conn.fetchrow(
        query,
        entry.DateCMD,
        entry.DateRecu,
        entry.Opération,
        entry.numpiece,
        entry.description,
        entry.qtécommande,
        entry.QtéSortie,
        entry.nompiece,
        entry.RéfPièce,
        entry.User,
        entry.Delais
    )
    return HistoriqueResponse(**dict(row))