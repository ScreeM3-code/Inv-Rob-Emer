"""Routes pour la gestion des départements"""
import asyncpg
from fastapi import APIRouter, Depends, HTTPException
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime

from database import get_db_connection

router = APIRouter(prefix="/departements", tags=["departements"])


# ── Modèles ───────────────────────────────────────────────────

class DepartementBase(BaseModel):
    NomDepartement: str
    Description:   Optional[str] = ""
    Couleur:       Optional[str] = "#6366f1"

class DepartementCreate(DepartementBase):
    pass

class Departement(DepartementBase):
    RefDepartement: int
    Created:        Optional[datetime] = None
    Modified:       Optional[datetime] = None

    class Config:
        from_attributes = True


# ── Routes ────────────────────────────────────────────────────

@router.get("", response_model=List[Departement])
async def get_departements(conn: asyncpg.Connection = Depends(get_db_connection)):
    """Récupère tous les départements"""
    rows = await conn.fetch(
        'SELECT * FROM "Departement" ORDER BY "NomDepartement"'
    )
    return [Departement(**dict(r)) for r in rows]


@router.post("", response_model=Departement)
async def create_departement(
    dept: DepartementCreate,
    conn: asyncpg.Connection = Depends(get_db_connection)
):
    """Crée un nouveau département"""
    try:
        row = await conn.fetchrow(
            '''INSERT INTO "Departement" ("NomDepartement", "Description", "Couleur")
               VALUES ($1, $2, $3) RETURNING *''',
            dept.NomDepartement.strip(),
            dept.Description or "",
            dept.Couleur or "#6366f1"
        )
        return Departement(**dict(row))
    except asyncpg.UniqueViolationError:
        raise HTTPException(status_code=400, detail="Un département avec ce nom existe déjà")


@router.put("/{dept_id}", response_model=Departement)
async def update_departement(
    dept_id: int,
    dept: DepartementCreate,
    conn: asyncpg.Connection = Depends(get_db_connection)
):
    """Met à jour un département"""
    try:
        row = await conn.fetchrow(
            '''UPDATE "Departement"
               SET "NomDepartement" = $1,
                   "Description"    = $2,
                   "Couleur"        = $3,
                   "Modified"       = NOW()
               WHERE "RefDepartement" = $4
               RETURNING *''',
            dept.NomDepartement.strip(),
            dept.Description or "",
            dept.Couleur or "#6366f1",
            dept_id
        )
        if not row:
            raise HTTPException(status_code=404, detail="Département non trouvé")
        return Departement(**dict(row))
    except asyncpg.UniqueViolationError:
        raise HTTPException(status_code=400, detail="Un département avec ce nom existe déjà")


@router.delete("/{dept_id}")
async def delete_departement(
    dept_id: int,
    conn: asyncpg.Connection = Depends(get_db_connection)
):
    """Supprime un département (les pièces associées perdent leur département)"""
    result = await conn.execute(
        'DELETE FROM "Departement" WHERE "RefDepartement" = $1',
        dept_id
    )
    if result == "DELETE 0":
        raise HTTPException(status_code=404, detail="Département non trouvé")
    return {"message": "Département supprimé"}
