"""Routes pour la gestion des pièces"""
import asyncpg
from fastapi import APIRouter, Depends, HTTPException, Request
from typing import List, Optional
from datetime import datetime

from database import get_db_connection
from models import Piece, PieceCreate, PieceUpdate, Fournisseur, Contact
from utils.helpers import (
    safe_string, safe_int, safe_float,
    calculate_qty_to_order, get_stock_status
)

router = APIRouter(prefix="/pieces", tags=["pieces"])


@router.get("", response_model=List[Piece])
async def get_pieces(
        conn: asyncpg.Connection = Depends(get_db_connection),
        search: Optional[str] = None,
        statut: Optional[str] = None,  # ← NOUVEAU
        stock: Optional[str] = None  # ← NOUVEAU
):
    """Récupère toutes les pièces avec filtrage optionnel"""
    try:
        base_query = '''
            SELECT p.*,
                   f1."NomFournisseur" as fournisseur_principal_nom,
                   f1."NomContact" as fournisseur_principal_contact,
                   f1."NuméroTél" as fournisseur_principal_tel,
                   f2."NomAutreFournisseur" as autre_fournisseur_nom,
                   f3."NomFabricant"
            FROM "Pièce" p
            LEFT JOIN "Fournisseurs" f1 ON p."RéfFournisseur" = f1."RéfFournisseur"
            LEFT JOIN "Autre Fournisseurs" f2 ON p."RéfAutreFournisseur" = f2."RéfAutreFournisseur"
            LEFT JOIN "Fabricant" f3 ON p."RefFabricant" = f3."RefFabricant"
            WHERE 1=1
        '''

        params = []
        param_idx = 1

        # Filtrage par recherche
        if search:
            base_query += f' AND (COALESCE(p."NomPièce", \'\') ILIKE ${param_idx} OR COALESCE(p."NumPièce", \'\') ILIKE ${param_idx} OR COALESCE(p."DescriptionPièce", \'\') ILIKE ${param_idx} OR COALESCE(p."NumPièceAutreFournisseur", \'\') ILIKE ${param_idx})'
            params.append(f'%{search}%')
            param_idx += 1

        # Filtrage par statut (actif/obsolete/discontinue)
        if statut and statut != "tous":
            base_query += f' AND p."statut" = ${param_idx}'
            params.append(statut)
            param_idx += 1

        # Filtrage par niveau de stock
        if stock and stock != "tous":
            if stock == "critique":
                base_query += ' AND p."QtéenInventaire" < p."Qtéminimum"'
            elif stock == "faible":
                base_query += ' AND p."QtéenInventaire" = p."Qtéminimum"'
            elif stock == "ok":
                base_query += ' AND p."QtéenInventaire" > p."Qtéminimum"'

        pieces = await conn.fetch(base_query, *params)

        result = []
        for piece in pieces:
            piece_dict = dict(piece)

            # Sécuriser les valeurs
            nom_piece = safe_string(piece_dict.get("NomPièce", ""))
            if not nom_piece:
                continue

            qty_inventaire = safe_int(piece_dict.get("QtéenInventaire", 0))
            qty_minimum = safe_int(piece_dict.get("Qtéminimum", 0))
            qty_max = safe_int(piece_dict.get("Qtémax", 100))

            # Calculer la quantité à commander automatiquement
            qty_a_commander = calculate_qty_to_order(qty_inventaire, qty_minimum, qty_max)
            statut_stock = get_stock_status(qty_inventaire, qty_minimum)

            # Préparer les informations des fournisseurs
            fournisseur_principal = None
            if piece_dict.get("fournisseur_principal_nom"):
                fournisseur_principal = {
                    "RéfFournisseur": piece_dict.get("RéfFournisseur"),
                    "NomFournisseur": safe_string(piece_dict.get("fournisseur_principal_nom", "")),
                    "NomContact": safe_string(piece_dict.get("fournisseur_principal_contact", "")),
                    "NuméroTél": safe_string(piece_dict.get("fournisseur_principal_tel", ""))
                }

            autre_fournisseur = None
            if piece_dict.get("autre_fournisseur_nom"):
                autre_fournisseur = {
                    "RéfFournisseur": piece_dict.get("RéfAutreFournisseur"),
                    "NomFournisseur": safe_string(piece_dict.get("autre_fournisseur_nom", ""))
                }

            piece_response = Piece(
                RéfPièce=piece_dict["RéfPièce"],
                NomPièce=nom_piece,
                DescriptionPièce=safe_string(piece_dict.get("DescriptionPièce", "")),
                NumPièce=safe_string(piece_dict.get("NumPièce", "")),
                RéfFournisseur=piece_dict.get("RéfFournisseur"),
                RéfAutreFournisseur=piece_dict.get("RéfAutreFournisseur"),
                NumPièceAutreFournisseur=safe_string(piece_dict.get("NumPièceAutreFournisseur", "")),
                Lieuentreposage=safe_string(piece_dict.get("Lieuentreposage", "")),
                QtéenInventaire=qty_inventaire,
                Qtéminimum=qty_minimum,
                Qtémax=qty_max,
                Qtéàcommander=qty_a_commander,
                Prix_unitaire=safe_float(piece_dict.get("Prix unitaire", 0)),
                Soumission_LD=safe_string(piece_dict.get("Soumission LD", "")),
                SoumDem=safe_string(piece_dict.get("SoumDem", "")),
                fournisseur_principal=fournisseur_principal,
                autre_fournisseur=autre_fournisseur,
                NomFabricant=safe_string(piece_dict.get("NomFabricant", "")),
                RefFabricant=piece_dict.get("RefFabricant"),
                statut_stock=statut_stock,
                Created=piece_dict.get("Created"),
                Modified=piece_dict.get("Modified")
            )
            result.append(piece_response)

        return result
    except Exception as e:
        print(f"❌ Erreur get_pieces: {e}")
        return []

@router.get("/{piece_id}", response_model=Piece)
async def get_piece(piece_id: int, request: Request):
    conn = await request.app.state.pool.acquire()
    try:
        query = '''
            SELECT p.*,
                   f1."NomFournisseur" as fournisseur_principal_nom,
                   f1."NomContact" as fournisseur_principal_contact,
                   f1."NuméroTél" as fournisseur_principal_tel,
                   f2."NomAutreFournisseur" as autre_fournisseur_nom,
                   f3."NomFabricant"
            FROM "Pièce" p
            LEFT JOIN "Fournisseurs" f1 ON p."RéfFournisseur" = f1."RéfFournisseur"
            LEFT JOIN "Autre Fournisseurs" f2 ON p."RéfAutreFournisseur" = f2."RéfAutreFournisseur"
            LEFT JOIN "Fabricant" f3 ON p."RefFabricant" = f3."RefFabricant"
            WHERE p."RéfPièce" = $1
        '''

        piece = await conn.fetchrow(query, piece_id)
        if not piece:
            raise HTTPException(status_code=404, detail="Pièce non trouvée")

        piece_dict = dict(piece)

        nom_piece = safe_string(piece_dict.get("NomPièce", ""))
        if not nom_piece:
            raise HTTPException(status_code=404, detail="Pièce invalide")

        qty_inventaire = safe_int(piece_dict.get("QtéenInventaire", 0))
        qty_minimum = safe_int(piece_dict.get("Qtéminimum", 0))
        qty_max = safe_int(piece_dict.get("Qtémax", 100))

        # Calculer automatiquement
        qty_a_commander = calculate_qty_to_order(qty_inventaire, qty_minimum, qty_max)
        statut_stock = get_stock_status(qty_inventaire, qty_minimum)

        # Fournisseurs
        fournisseur_principal = None
        if piece_dict.get("fournisseur_principal_nom"):
            fournisseur_principal = {
                "RéfFournisseur": piece_dict.get("RéfFournisseur"),
                "NomFournisseur": safe_string(piece_dict.get("fournisseur_principal_nom", "")),
                "NomContact": safe_string(piece_dict.get("fournisseur_principal_contact", "")),
                "NuméroTél": safe_string(piece_dict.get("fournisseur_principal_tel", ""))
            }

        autre_fournisseur = None
        if piece_dict.get("autre_fournisseur_nom"):
            autre_fournisseur = {
                "RéfFournisseur": piece_dict.get("RéfAutreFournisseur"),
                "NomFournisseur": safe_string(piece_dict.get("autre_fournisseur_nom", ""))
             }

        return Piece(
            RéfPièce=piece_dict["RéfPièce"],
            NomPièce=nom_piece,
            DescriptionPièce=safe_string(piece_dict.get("DescriptionPièce", "")),
            NumPièce=safe_string(piece_dict.get("NumPièce", "")),
            RéfFournisseur=piece_dict.get("RéfFournisseur"),
            RéfAutreFournisseur=piece_dict.get("RéfAutreFournisseur"),
            NumPièceAutreFournisseur=safe_string(piece_dict.get("NumPièceAutreFournisseur", "")),
            Lieuentreposage=safe_string(piece_dict.get("Lieuentreposage", "")),
            QtéenInventaire=qty_inventaire,
            Qtéminimum=qty_minimum,
            Qtémax=qty_max,
            Qtéàcommander=qty_a_commander,
            Prix_unitaire=safe_float(piece_dict.get("Prix unitaire", 0)),
            Soumission_LD=safe_string(piece_dict.get("Soumission LD", "")),
            SoumDem=safe_string(piece_dict.get("SoumDem", "")),
            fournisseur_principal=fournisseur_principal,
            autre_fournisseur=autre_fournisseur,
            NomFabricant=safe_string(piece_dict.get("NomFabricant", "")),
            RefFabricant=piece_dict.get("RefFabricant"),
            statut_stock=statut_stock,
            Created=piece_dict.get("Created"),
            Modified=piece_dict.get("Modified")
        )
    except HTTPException:
        raise
    except Exception as e:
        print(f"Erreur get_piece {piece_id}: {e}")
        raise HTTPException(status_code=500, detail="Erreur serveur")
    finally:
        await request.app.state.pool.release(conn)


@router.post("", response_model=Piece)
async def create_piece(
    piece: PieceCreate,
    conn: asyncpg.Connection = Depends(get_db_connection)
):
    """Crée une nouvelle pièce"""
    query = '''
        INSERT INTO "Pièce" (
            "NomPièce", "DescriptionPièce", "NumPièce", "RéfFournisseur",
            "RéfAutreFournisseur", "NumPièceAutreFournisseur", "RefFabricant", 
            "Lieuentreposage", "QtéenInventaire", "Qtéminimum", "Qtémax", 
            "Prix unitaire", "Soumission LD", "SoumDem", "Created", "Modified"
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
        RETURNING *
    '''

    now = datetime.utcnow()
    row = await conn.fetchrow(
        query,
        piece.NomPièce,
        piece.DescriptionPièce or "",
        piece.NumPièce or "",
        piece.RéfFournisseur,
        piece.RéfAutreFournisseur,
        piece.NumPièceAutreFournisseur or "",
        piece.RefFabricant,
        piece.Lieuentreposage or "",
        piece.QtéenInventaire,
        piece.Qtéminimum,
        piece.Qtémax,
        piece.Prix_unitaire,
        piece.Soumission_LD or "",
        piece.SoumDem or "",
        now,
        now
    )

    piece_dict = dict(row)
    qty_a_commander = calculate_qty_to_order(
        piece_dict.get("QtéenInventaire", 0),
        piece_dict.get("Qtéminimum", 0),
        piece_dict.get("Qtémax", 100)
    )

    return Piece(
        RéfPièce=piece_dict["RéfPièce"],
        NomPièce=safe_string(piece_dict.get("NomPièce", "")),
        DescriptionPièce=safe_string(piece_dict.get("DescriptionPièce", "")),
        NumPièce=safe_string(piece_dict.get("NumPièce", "")),
        RéfFournisseur=piece_dict.get("RéfFournisseur"),
        RéfAutreFournisseur=piece_dict.get("RéfAutreFournisseur"),
        NumPièceAutreFournisseur=safe_string(piece_dict.get("NumPièceAutreFournisseur", "")),
        Lieuentreposage=safe_string(piece_dict.get("Lieuentreposage", "")),
        QtéenInventaire=safe_int(piece_dict.get("QtéenInventaire", 0)),
        Qtéminimum=safe_int(piece_dict.get("Qtéminimum", 0)),
        Qtémax=safe_int(piece_dict.get("Qtémax", 100)),
        Qtéàcommander=qty_a_commander,
        Prix_unitaire=safe_float(piece_dict.get("Prix unitaire", 0)),
        Soumission_LD=safe_string(piece_dict.get("Soumission LD", "")),
        SoumDem=safe_string(piece_dict.get("SoumDem", "")),
        statut_stock=get_stock_status(
            safe_int(piece_dict.get("QtéenInventaire", 0)),
            safe_int(piece_dict.get("Qtéminimum", 0))
        ),
        Created=piece_dict.get("Created"),
        Modified=piece_dict.get("Modified")
    )


@router.put("/{piece_id}", response_model=Piece)
async def update_piece(piece_id: int, piece_update: PieceUpdate, conn: asyncpg.Connection = Depends(get_db_connection)):
    # Construire la requête de mise à jour dynamiquement
    update_fields = []
    values = []
    param_count = 0

    for field, value in piece_update.dict(exclude_unset=True).items():
        if value is not None:
            param_count += 1
            if field == "Lieuentreposage":
                update_fields.append(f'"Lieuentreposage" = ${param_count}')
            elif field == "Prix_unitaire":
                update_fields.append(f'"Prix unitaire" = ${param_count}')
            elif field == "Soumission_LD":
                update_fields.append(f'"Soumission LD" = ${param_count}')
            else:
                update_fields.append(f'"{field}" = ${param_count}')
            values.append(value)

    if not update_fields:
        return await get_piece(piece_id)

    param_count += 1
    update_fields.append(f'"Modified" = ${param_count}')
    values.append(datetime.utcnow())

    param_count += 1
    values.append(piece_id)

    query = f'''
            UPDATE "Pièce"
            SET {", ".join(update_fields)}
            WHERE "RéfPièce" = ${param_count}
        '''

    await conn.execute(query, *values)

    # Récupérer la pièce mise à jour directement
    query_get = '''
            SELECT p.*,
                   f1."NomFournisseur" as fournisseur_principal_nom,
                   f1."NomContact" as fournisseur_principal_contact,
                   f1."NuméroTél" as fournisseur_principal_tel,
                   f2."NuméroTél" as autre_fournisseur_tel,
                   f3."NomFabricant"
            FROM "Pièce" p
            LEFT JOIN "Fournisseurs" f1 ON p."RéfFournisseur" = f1."RéfFournisseur"
            LEFT JOIN "Autre Fournisseurs" f2 ON p."RéfAutreFournisseur" = f2."RéfAutreFournisseur"
            LEFT JOIN "Fabricant" f3 ON p."RefFabricant" = f3."RefFabricant"
            WHERE p."RéfPièce" = $1
        '''

    piece = await conn.fetchrow(query_get, piece_id)
    if not piece:
        raise HTTPException(status_code=404, detail="Pièce non trouvée")

    piece_dict = dict(piece)

    nom_piece = safe_string(piece_dict.get("NomPièce", ""))
    if not nom_piece:
        raise HTTPException(status_code=404, detail="Pièce invalide")

    qty_inventaire = safe_int(piece_dict.get("QtéenInventaire", 0))
    qty_minimum = safe_int(piece_dict.get("Qtéminimum", 0))
    qty_max = safe_int(piece_dict.get("Qtémax", 100))

    # Calculer automatiquement
    qty_a_commander = calculate_qty_to_order(qty_inventaire, qty_minimum, qty_max)
    statut_stock = get_stock_status(qty_inventaire, qty_minimum)

    # Fournisseurs
    fournisseur_principal = None
    if piece_dict.get("fournisseur_principal_nom"):
        fournisseur_principal = {
            "RéfFournisseur": piece_dict.get("RéfFournisseur"),
            "NomFournisseur": safe_string(piece_dict.get("fournisseur_principal_nom", "")),
            "NomContact": safe_string(piece_dict.get("fournisseur_principal_contact", "")),
            "NuméroTél": safe_string(piece_dict.get("fournisseur_principal_tel", ""))
        }

    autre_fournisseur = None
    if piece_dict.get("autre_fournisseur_nom"):
        autre_fournisseur = {
            "RéfFournisseur": piece_dict.get("RéfAutreFournisseur"),
            "NomFournisseur": safe_string(piece_dict.get("autre_fournisseur_nom", ""))
        }

    return Piece(
        RéfPièce=piece_dict["RéfPièce"],
        NomPièce=nom_piece,
        DescriptionPièce=safe_string(piece_dict.get("DescriptionPièce", "")),
        NumPièce=safe_string(piece_dict.get("NumPièce", "")),
        RéfFournisseur=piece_dict.get("RéfFournisseur"),
        RéfAutreFournisseur=piece_dict.get("RéfAutreFournisseur"),
        NumPièceAutreFournisseur=safe_string(piece_dict.get("NumPièceAutreFournisseur", "")),
        Lieuentreposage=safe_string(piece_dict.get("Lieuentreposage", "")),
        QtéenInventaire=qty_inventaire,
        Qtéminimum=qty_minimum,
        Qtémax=qty_max,
        Qtéàcommander=qty_a_commander,
        Qtéarecevoir=safe_int(piece_dict.get("Qtéarecevoir", 0)),
        Qtécommandée=safe_int(piece_dict.get("Qtécommandée", 0)),
        Prix_unitaire=safe_float(piece_dict.get("Prix unitaire", 0)),
        Soumission_LD=safe_string(piece_dict.get("Soumission LD", "")),
        SoumDem=safe_string(piece_dict.get("SoumDem", "")),
        fournisseur_principal=fournisseur_principal,
        autre_fournisseur=autre_fournisseur,
        NomFabricant=safe_string(piece_dict.get("NomFabricant", "")),
        RefFabricant=piece_dict.get("RefFabricant"),
        statut_stock=statut_stock,
        Created=piece_dict.get("Created"),
        Modified=piece_dict.get("Modified")
    )


@router.delete("/{piece_id}")
async def delete_piece(piece_id: int, conn: asyncpg.Connection = Depends(get_db_connection)):
    result = await conn.execute('DELETE FROM "Pièce" WHERE "RéfPièce" = $1', piece_id)
    if result == "DELETE 0":
        raise HTTPException(status_code=404, detail="Pièce non trouvée")
    return {"message": "Pièce supprimée"}

