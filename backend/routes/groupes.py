
"""Routes pour la gestion des groupes de pièces"""
import asyncpg
from fastapi import APIRouter, Depends, HTTPException
from typing import List

from database import get_db_connection
from models import (
    Categorie, CategorieCreate,
    Groupe, GroupeCreate, GroupeComplet,
    GroupePiece, GroupePieceCreate
)
from utils.helpers import safe_string, safe_int

router = APIRouter(prefix="/groupes", tags=["groupes"])

# ==================== CATÉGORIES ====================

@router.get("/categories", response_model=List[Categorie])
async def get_categories(conn: asyncpg.Connection = Depends(get_db_connection)):
    """Récupère toutes les catégories"""
    rows = await conn.fetch('SELECT * FROM "Categorie" ORDER BY "NomCategorie"')
    return [Categorie(**dict(r)) for r in rows]

@router.post("/categories", response_model=Categorie)
async def create_categorie(
    categorie: CategorieCreate,
    conn: asyncpg.Connection = Depends(get_db_connection)
):
    """Crée une nouvelle catégorie"""
    row = await conn.fetchrow(
        '''INSERT INTO "Categorie" ("NomCategorie", "Description")
           VALUES ($1, $2) RETURNING *''',
        categorie.NomCategorie, categorie.Description or ""
    )
    return Categorie(**dict(row))

@router.put("/categories/{categorie_id}", response_model=Categorie)
async def update_categorie(
    categorie_id: int,
    categorie: CategorieCreate,
    conn: asyncpg.Connection = Depends(get_db_connection)
):
    """Met à jour une catégorie"""
    row = await conn.fetchrow(
        '''UPDATE "Categorie"
           SET "NomCategorie" = $1, "Description" = $2, "Modified" = NOW()
           WHERE "RefCategorie" = $3
           RETURNING *''',
        categorie.NomCategorie, categorie.Description or "", categorie_id
    )
    if not row:
        raise HTTPException(status_code=404, detail="Catégorie non trouvée")
    return Categorie(**dict(row))

@router.delete("/categories/{categorie_id}")
async def delete_categorie(
    categorie_id: int,
    conn: asyncpg.Connection = Depends(get_db_connection)
):
    """Supprime une catégorie"""
    result = await conn.execute(
        'DELETE FROM "Categorie" WHERE "RefCategorie" = $1',
        categorie_id
    )
    if result == "DELETE 0":
        raise HTTPException(status_code=404, detail="Catégorie non trouvée")
    return {"message": "Catégorie supprimée"}

# ==================== GROUPES ====================

@router.get("", response_model=List[GroupeComplet])
async def get_groupes(conn: asyncpg.Connection = Depends(get_db_connection)):
    """Récupère tous les groupes avec leurs catégories et pièces"""
    groupes_rows = await conn.fetch('''
        SELECT g.*, c."NomCategorie", c."Description" as "CategorieDescription"
        FROM "Groupe" g
        LEFT JOIN "Categorie" c ON g."RefCategorie" = c."RefCategorie"
        ORDER BY c."NomCategorie", g."NomGroupe"
    ''')
    
    result = []
    for g in groupes_rows:
        g_dict = dict(g)
        
        # Récupérer les pièces du groupe
        pieces_rows = await conn.fetch('''
            SELECT gp.*, p."NomPièce", p."NumPièce", p."Prix unitaire"
            FROM "GroupePiece" gp
            LEFT JOIN "Pièce" p ON gp."RéfPièce" = p."RéfPièce"
            WHERE gp."RefGroupe" = $1
            ORDER BY COALESCE(gp."Ordre", 999), gp."id"
        ''', g_dict["RefGroupe"])
        
        pieces = []
        for p in pieces_rows:
            p_dict = dict(p)
            pieces.append(GroupePiece(
                id=p_dict["id"],
                RefGroupe=p_dict["RefGroupe"],
                RéfPièce=p_dict["RéfPièce"],
                Quantite=p_dict["Quantite"],
                piece_info={
                    "NomPièce": safe_string(p_dict.get("NomPièce", "")),
                    "NumPièce": safe_string(p_dict.get("NumPièce", "")),
                    "Prix_unitaire": p_dict.get("Prix unitaire", 0)
                }
            ))
        
        groupe_complet = GroupeComplet(
            RefGroupe=g_dict["RefGroupe"],
            RefCategorie=g_dict["RefCategorie"],
            NomGroupe=safe_string(g_dict.get("NomGroupe", "")),
            Description=safe_string(g_dict.get("Description", "")),
            Created=g_dict.get("Created"),
            Modified=g_dict.get("Modified"),
            categorie=Categorie(
                RefCategorie=g_dict["RefCategorie"],
                NomCategorie=safe_string(g_dict.get("NomCategorie", "")),
                Description=safe_string(g_dict.get("CategorieDescription", ""))
            ) if g_dict.get("NomCategorie") else None,
            pieces=pieces
        )
        
        result.append(groupe_complet)
    
    return result

@router.get("/{groupe_id}", response_model=GroupeComplet)
async def get_groupe(
    groupe_id: int,
    conn: asyncpg.Connection = Depends(get_db_connection)
):
    """Récupère un groupe spécifique avec ses pièces"""
    g = await conn.fetchrow('''
        SELECT g.*, c."NomCategorie", c."Description" as "CategorieDescription"
        FROM "Groupe" g
        LEFT JOIN "Categorie" c ON g."RefCategorie" = c."RefCategorie"
        WHERE g."RefGroupe" = $1
    ''', groupe_id)
    
    if not g:
        raise HTTPException(status_code=404, detail="Groupe non trouvé")
    
    g_dict = dict(g)
    
    # Récupérer les pièces
    pieces_rows = await conn.fetch('''
        SELECT gp.*, p."NomPièce", p."NumPièce", p."Prix unitaire"
        FROM "GroupePiece" gp
        LEFT JOIN "Pièce" p ON gp."RéfPièce" = p."RéfPièce"
        WHERE gp."RefGroupe" = $1
        ORDER BY COALESCE(gp."Ordre", 999), gp."id"
    ''', g_dict["RefGroupe"])

    pieces = []
    for p in pieces_rows:
        p_dict = dict(p)
        pieces.append(GroupePiece(
            id=p_dict["id"],
            RefGroupe=p_dict["RefGroupe"],
            RéfPièce=p_dict["RéfPièce"],
            Quantite=p_dict["Quantite"],
            piece_info={
                "NomPièce": safe_string(p_dict.get("NomPièce", "")),
                "NumPièce": safe_string(p_dict.get("NumPièce", "")),
                "Prix_unitaire": p_dict.get("Prix unitaire", 0)
            }
        ))
    
    return GroupeComplet(
        RefGroupe=g_dict["RefGroupe"],
        RefCategorie=g_dict["RefCategorie"],
        NomGroupe=safe_string(g_dict.get("NomGroupe", "")),
        Description=safe_string(g_dict.get("Description", "")),
        Created=g_dict.get("Created"),
        Modified=g_dict.get("Modified"),
        categorie=Categorie(
            RefCategorie=g_dict["RefCategorie"],
            NomCategorie=safe_string(g_dict.get("NomCategorie", "")),
            Description=safe_string(g_dict.get("CategorieDescription", ""))
        ) if g_dict.get("NomCategorie") else None,
        pieces=pieces
    )

@router.post("", response_model=Groupe)
async def create_groupe(
    groupe: GroupeCreate,
    conn: asyncpg.Connection = Depends(get_db_connection)
):
    """Crée un nouveau groupe"""
    row = await conn.fetchrow(
        '''INSERT INTO "Groupe" ("RefCategorie", "NomGroupe", "Description")
           VALUES ($1, $2, $3) RETURNING *''',
        groupe.RefCategorie, groupe.NomGroupe, groupe.Description or ""
    )
    return Groupe(**dict(row))

@router.put("/{groupe_id}", response_model=Groupe)
async def update_groupe(
    groupe_id: int,
    groupe: GroupeCreate,
    conn: asyncpg.Connection = Depends(get_db_connection)
):
    """Met à jour un groupe"""
    row = await conn.fetchrow(
        '''UPDATE "Groupe"
           SET "RefCategorie" = $1, "NomGroupe" = $2, "Description" = $3, "Modified" = NOW()
           WHERE "RefGroupe" = $4
           RETURNING *''',
        groupe.RefCategorie, groupe.NomGroupe, groupe.Description or "", groupe_id
    )
    if not row:
        raise HTTPException(status_code=404, detail="Groupe non trouvé")
    return Groupe(**dict(row))

@router.delete("/{groupe_id}")
async def delete_groupe(
    groupe_id: int,
    conn: asyncpg.Connection = Depends(get_db_connection)
):
    """Supprime un groupe"""
    result = await conn.execute(
        'DELETE FROM "Groupe" WHERE "RefGroupe" = $1',
        groupe_id
    )
    if result == "DELETE 0":
        raise HTTPException(status_code=404, detail="Groupe non trouvé")
    return {"message": "Groupe supprimé"}

# ==================== PIÈCES DANS GROUPES ====================

@router.post("/pieces", response_model=GroupePiece)
async def add_piece_to_groupe(
    piece: GroupePieceCreate,
    conn: asyncpg.Connection = Depends(get_db_connection)
):
    """Ajoute une pièce à un groupe"""
    try:
        row = await conn.fetchrow(
            '''INSERT INTO "GroupePiece" ("RefGroupe", "RéfPièce", "Quantite")
               VALUES ($1, $2, $3) RETURNING *''',
            piece.RefGroupe, piece.RéfPièce, piece.Quantite
        )
        return GroupePiece(**dict(row))
    except Exception as e:
        if "unique" in str(e).lower():
            raise HTTPException(status_code=400, detail="Cette pièce est déjà dans le groupe")
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/pieces/{piece_groupe_id}", response_model=GroupePiece)
async def update_piece_in_groupe(
    piece_groupe_id: int,
    quantite: int,
    conn: asyncpg.Connection = Depends(get_db_connection)
):
    """Met à jour la quantité d'une pièce dans un groupe"""
    row = await conn.fetchrow(
        '''UPDATE "GroupePiece"
           SET "Quantite" = $1
           WHERE "id" = $2
           RETURNING *''',
        quantite, piece_groupe_id
    )
    if not row:
        raise HTTPException(status_code=404, detail="Pièce non trouvée dans ce groupe")
    return GroupePiece(**dict(row))


@router.put("/pieces/{piece_groupe_id}/ordre")
async def update_piece_ordre(
        piece_groupe_id: int,
        nouvel_ordre: int,
        conn: asyncpg.Connection = Depends(get_db_connection)
):
    """Met à jour l'ordre d'affichage d'une pièce dans un groupe"""
    # Vérifier que la pièce existe et récupérer son RefGroupe
    piece = await conn.fetchrow(
        'SELECT "RefGroupe" FROM "GroupePiece" WHERE "id" = $1',
        piece_groupe_id
    )

    if not piece:
        raise HTTPException(status_code=404, detail="Pièce non trouvée dans ce groupe")

    ref_groupe = piece["RefGroupe"]

    # Récupérer toutes les pièces du groupe triées par ordre
    pieces = await conn.fetch(
        '''SELECT "id", "Ordre" 
           FROM "GroupePiece" 
           WHERE "RefGroupe" = $1 
           ORDER BY COALESCE("Ordre", 999), "id"''',
        ref_groupe
    )

    # Réorganiser les ordres
    piece_ids = [p["id"] for p in pieces]
    current_index = piece_ids.index(piece_groupe_id)

    # Retirer la pièce de sa position actuelle
    piece_ids.pop(current_index)

    # L'insérer à la nouvelle position (en ajustant l'index car on utilise 1-based)
    new_index = nouvel_ordre - 1
    piece_ids.insert(new_index, piece_groupe_id)

    # Mettre à jour tous les ordres
    for ordre, pid in enumerate(piece_ids, start=1):
        await conn.execute(
            'UPDATE "GroupePiece" SET "Ordre" = $1 WHERE "id" = $2',
            ordre, pid
        )

    return {"message": "Ordre mis à jour", "nouvel_ordre": nouvel_ordre}

@router.delete("/pieces/{piece_groupe_id}")
async def remove_piece_from_groupe(
    piece_groupe_id: int,
    conn: asyncpg.Connection = Depends(get_db_connection)
):
    """Retire une pièce d'un groupe"""
    result = await conn.execute(
        'DELETE FROM "GroupePiece" WHERE "id" = $1',
        piece_groupe_id
    )
    if result == "DELETE 0":
        raise HTTPException(status_code=404, detail="Pièce non trouvée dans ce groupe")
    return {"message": "Pièce retirée du groupe"}