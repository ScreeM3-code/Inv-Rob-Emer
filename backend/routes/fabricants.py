"""Routes pour la gestion des fabricants"""
import asyncpg
from fastapi import APIRouter, Depends, HTTPException
from typing import List

from database import get_db_connection
from models import FabricantBase, FabricantCreate
from utils.helpers import safe_string

router = APIRouter(prefix="/fabricant", tags=["fabricants"])

@router.get("")
async def get_fabricants(conn: asyncpg.Connection = Depends(get_db_connection)):
    """Récupère tous les fabricants"""
    rows = await conn.fetch(
        'SELECT "RefFabricant", "NomFabricant", "Domaine", "NomContact", "TitreContact", "Email" FROM "Fabricant" ORDER BY "NomFabricant"'
    )
    # ✅ FIX: Retourner TOUS les champs, pas juste le nom
    return [
        {
            "RefFabricant": r["RefFabricant"],
            "NomFabricant": r["NomFabricant"],
            "Domaine": safe_string(r.get("Domaine", "")),
            "NomContact": safe_string(r.get("NomContact", "")),
            "TitreContact": safe_string(r.get("TitreContact", "")),
            "Email": safe_string(r.get("Email", ""))
        }
        for r in rows
    ]

@router.post("", response_model=FabricantBase)
async def create_fabricant(
    fabricant: FabricantCreate,
    conn: asyncpg.Connection = Depends(get_db_connection)
):
    """Crée un nouveau fabricant"""
    query = '''
        INSERT INTO "Fabricant" (
            "NomFabricant", "Domaine", "NomContact", "TitreContact", "Email"
        ) VALUES ($1, $2, $3, $4, $5)
        RETURNING "RefFabricant"
    '''

    fabricant_id = await conn.fetchval(
        query,
        fabricant.NomFabricant,
        fabricant.Domaine,
        fabricant.NomContact,
        fabricant.TitreContact,
        fabricant.Email,
    )

    created_fabricant = await conn.fetchrow(
        'SELECT * FROM "Fabricant" WHERE "RefFabricant" = $1',
        fabricant_id
    )

    f_dict = dict(created_fabricant)
    return FabricantBase(
        NomFabricant=safe_string(f_dict.get("NomFabricant", "")),
        Domaine=safe_string(f_dict.get("Domaine", "")),
        NomContact=safe_string(f_dict.get("NomContact", "")),
        TitreContact=safe_string(f_dict.get("TitreContact", "")),
        Email=safe_string(f_dict.get("Email", ""))
    )


@router.put("/{fabricant_id}", response_model=FabricantBase)
async def update_fabricant(
    fabricant_id: int,
    fabricant: FabricantBase,
    conn: asyncpg.Connection = Depends(get_db_connection)
):
    """Met à jour un fabricant"""
    try:
        row = await conn.fetchrow(
            '''UPDATE "Fabricant"
               SET "NomFabricant" = $1,
                   "Domaine" = $2,
                   "NomContact" = $3,
                   "TitreContact" = $4,
                   "Email" = $5
               WHERE "RefFabricant" = $6
             RETURNING *''',
            fabricant.NomFabricant,
            fabricant.Domaine or "",
            fabricant.NomContact or "",
            fabricant.TitreContact or "",
            fabricant.Email or "",
            fabricant_id
        )
        if not row:
            raise HTTPException(status_code=404, detail="Fabricant non trouvé")

        return FabricantBase(
            NomFabricant=safe_string(row["NomFabricant"]),
            Domaine=safe_string(row["Domaine"]),
            NomContact=safe_string(row["NomContact"]),
            TitreContact=safe_string(row["TitreContact"]),
            Email=safe_string(row["Email"])
        )
    except Exception as e:
        print(f"❌ Erreur update_fabricant: {e}")
        raise HTTPException(status_code=500, detail="Erreur lors de la modification du fabricant")


@router.delete("/{fabricant_id}")
async def delete_fabricant(
    fabricant_id: int,
    conn: asyncpg.Connection = Depends(get_db_connection)
):
    """Supprime un fabricant"""
    result = await conn.execute('DELETE FROM "Fabricant" WHERE "RefFabricant" = $1', fabricant_id)
    if result == "DELETE 0":
        raise HTTPException(status_code=404, detail="Fabricant non trouvé")
    return {"message": "Fabricant supprimé"}