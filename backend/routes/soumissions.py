"""Routes pour la gestion des soumissions"""
import asyncpg
from fastapi import APIRouter, Depends
from typing import List
from datetime import datetime

from database import get_db_connection
from models import Soumission, SoumissionCreate
from utils.helpers import safe_string

router = APIRouter(prefix="/soumissions", tags=["soumissions"])

@router.post("", response_model=Soumission)
async def create_soumission(
    soumission: SoumissionCreate,
    conn: asyncpg.Connection = Depends(get_db_connection)
):
    """Enregistre une soumission envoyée"""
    query = '''
        INSERT INTO "Soumissions" (
            "RéfFournisseur", "EmailsDestinataires", "Sujet", 
            "MessageCorps", "Pieces", "User", "Notes", "DateEnvoi"
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING "RefSoumission", "DateEnvoi", "Created"
    '''
    
    import json
    pieces_json = json.dumps([p.model_dump() for p in soumission.Pieces])
    
    row = await conn.fetchrow(
        query,
        soumission.RéfFournisseur,
        soumission.EmailsDestinataires,
        soumission.Sujet,
        soumission.MessageCorps,
        pieces_json,
        soumission.User,
        soumission.Notes or "",
        datetime.utcnow()
    )
    
    # Récupérer le nom du fournisseur
    fournisseur = await conn.fetchrow(
        'SELECT "NomFournisseur" FROM "Fournisseurs" WHERE "RéfFournisseur" = $1',
        soumission.RéfFournisseur
    )
    
    return Soumission(
        RefSoumission=row["RefSoumission"],
        DateEnvoi=row["DateEnvoi"],
        Created=row["Created"],
        RéfFournisseur=soumission.RéfFournisseur,
        EmailsDestinataires=soumission.EmailsDestinataires,
        Sujet=soumission.Sujet,
        MessageCorps=soumission.MessageCorps,
        Pieces=soumission.Pieces,
        User=soumission.User,
        Notes=soumission.Notes,
        fournisseur_nom=safe_string(fournisseur["NomFournisseur"]) if fournisseur else None
    )


@router.get("", response_model=List[Soumission])
async def get_soumissions(conn: asyncpg.Connection = Depends(get_db_connection)):
    """Récupère toutes les soumissions"""
    rows = await conn.fetch('''
        SELECT s.*, f."NomFournisseur" as fournisseur_nom
        FROM "Soumissions" s
        LEFT JOIN "Fournisseurs" f ON s."RéfFournisseur" = f."RéfFournisseur"
        ORDER BY s."DateEnvoi" DESC
    ''')
    
    import json
    result = []
    for r in rows:
        pieces = json.loads(r["Pieces"]) if r["Pieces"] else []
        result.append(Soumission(
            RefSoumission=r["RefSoumission"],
            DateEnvoi=r["DateEnvoi"],
            Created=r["Created"],
            RéfFournisseur=r["RéfFournisseur"],
            EmailsDestinataires=safe_string(r["EmailsDestinataires"]),
            Sujet=safe_string(r["Sujet"]),
            MessageCorps=safe_string(r["MessageCorps"]),
            Pieces=pieces,
            User=safe_string(r["User"]),
            Notes=safe_string(r["Notes"]),
            fournisseur_nom=safe_string(r["fournisseur_nom"])
        ))
    
    return result


@router.delete("/{soumission_id}")
async def delete_soumission(
    soumission_id: int,
    conn: asyncpg.Connection = Depends(get_db_connection)
):
    """Supprime une soumission"""
    result = await conn.execute(
        'DELETE FROM "Soumissions" WHERE "RefSoumission" = $1',
        soumission_id
    )
    
    if result == "DELETE 0":
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Soumission non trouvée")
    
    return {"message": "Soumission supprimée"}
