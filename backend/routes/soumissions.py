"""Routes pour la gestion des soumissions"""
import asyncpg
from fastapi import APIRouter, Depends
from typing import List
from datetime import datetime
from typing import Optional
from database import get_db_connection
from models import Soumission, SoumissionCreate
from utils.helpers import safe_string
from models import SoumissionPrix, SoumissionPrixCreate

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


@router.put("/{soumission_id}/statut")
async def update_statut_soumission(
        soumission_id: int,
        statut: str,
        conn: asyncpg.Connection = Depends(get_db_connection)
):
    """Met à jour le statut d'une soumission"""
    from datetime import datetime

    # Si le statut est "Prix reçu", on met la date de réponse
    date_reponse = datetime.utcnow() if statut == "Prix reçu" else None

    result = await conn.execute(
        '''UPDATE "Soumissions" 
           SET "Statut" = $1, "DateReponse" = $2
           WHERE "RefSoumission" = $3''',
        statut, date_reponse, soumission_id
    )

    if result == "UPDATE 0":
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Soumission non trouvée")

    return {"message": "Statut mis à jour", "statut": statut}


@router.post("/{soumission_id}/prix", response_model=SoumissionPrix)
async def add_prix_soumission(
        soumission_id: int,
        prix: SoumissionPrixCreate,
        conn: asyncpg.Connection = Depends(get_db_connection)
):
    """Ajoute un prix reçu pour une pièce de la soumission"""
    row = await conn.fetchrow(
        '''INSERT INTO "SoumissionPrix" 
           ("RefSoumission", "RéfPièce", "PrixUnitaire", "DelaiLivraison", "Commentaire")
           VALUES ($1, $2, $3, $4, $5)
           RETURNING *''',
        soumission_id, prix.RéfPièce, prix.PrixUnitaire,
        prix.DelaiLivraison or "", prix.Commentaire or ""
    )
    return SoumissionPrix(**dict(row))


@router.get("/{soumission_id}/prix")
async def get_prix_soumission(
        soumission_id: int,
        conn: asyncpg.Connection = Depends(get_db_connection)
):
    """Récupère tous les prix d'une soumission"""
    rows = await conn.fetch(
        '''SELECT sp.*, p."NomPièce", p."NumPièce"
           FROM "SoumissionPrix" sp
           LEFT JOIN "Pièce" p ON sp."RéfPièce" = p."RéfPièce"
           WHERE sp."RefSoumission" = $1
           ORDER BY sp."DateSaisie" DESC''',
        soumission_id
    )
    return [dict(r) for r in rows]


@router.put("/{soumission_id}/statut-complet")
async def update_statut_complet(
        soumission_id: int,
        statut: str,
        note: Optional[str] = None,
        date_rappel: Optional[str] = None,
        conn: asyncpg.Connection = Depends(get_db_connection)
):
    """Met à jour le statut avec note et date de rappel"""
    from datetime import datetime

    date_reponse = datetime.utcnow() if statut == "Prix reçu" else None
    rappel = datetime.fromisoformat(date_rappel) if date_rappel else None

    result = await conn.execute(
        '''UPDATE "Soumissions" 
           SET "Statut" = $1, "DateReponse" = $2, "NoteStatut" = $3, "DateRappel" = $4
           WHERE "RefSoumission" = $5''',
        statut, date_reponse, note or "", rappel, soumission_id
    )

    if result == "UPDATE 0":
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Soumission non trouvée")

    return {"message": "Statut mis à jour"}


@router.get("/{soumission_id}/complet")
async def get_soumission_complete(
        soumission_id: int,
        conn: asyncpg.Connection = Depends(get_db_connection)
):
    """Récupère une soumission avec tous ses prix"""
    import json

    # Soumission
    soum = await conn.fetchrow(
        '''SELECT s.*, f."NomFournisseur" as fournisseur_nom
           FROM "Soumissions" s
           LEFT JOIN "Fournisseurs" f ON s."RéfFournisseur" = f."RéfFournisseur"
           WHERE s."RefSoumission" = $1''',
        soumission_id
    )

    if not soum:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Soumission non trouvée")

    # Prix reçus
    prix = await conn.fetch(
        '''SELECT sp.*, p."NomPièce", p."NumPièce"
           FROM "SoumissionPrix" sp
           LEFT JOIN "Pièce" p ON sp."RéfPièce" = p."RéfPièce"
           WHERE sp."RefSoumission" = $1''',
        soumission_id
    )

    result = dict(soum)
    result['Pieces'] = json.loads(result.get('Pieces', '[]'))
    result['prix_recus'] = [dict(p) for p in prix]

    return result