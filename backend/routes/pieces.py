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
        statut: Optional[str] = None,
        stock: Optional[str] = None
):
    """Récupère toutes les pièces avec filtrage optionnel"""
    try:
        base_query = '''
            SELECT p.*,
                   f3."NomFabricant",
                   fp."RéfFournisseur"  as ref_four_principal,
                   fp."NomFournisseur"  as fournisseur_principal_nom,
                   fp."NuméroTél"       as fournisseur_principal_tel,
                   fp."NumSap"          as fournisseur_principal_numsap,
                   (
                       SELECT json_agg(
                           json_build_object(
                               'RéfFournisseur',      fall."RéfFournisseur",
                               'NomFournisseur',      fall."NomFournisseur",
                               'NuméroTél',           fall."NuméroTél",
                               'NumSap',              fall."NumSap",
                               'EstPrincipal',        pfall."EstPrincipal",
                               'NumPièceFournisseur', pfall."NumPièceFournisseur",
                               'PrixUnitaire',        pfall."PrixUnitaire"
                           ) ORDER BY pfall."EstPrincipal" DESC, pfall."DateAjout" ASC
                       )
                       FROM "PieceFournisseur" pfall
                       JOIN "Fournisseurs" fall ON fall."RéfFournisseur" = pfall."RéfFournisseur"
                       WHERE pfall."RéfPièce" = p."RéfPièce"
                   ) as tous_fournisseurs
            FROM "Pièce" p
            LEFT JOIN "Fabricant" f3 ON p."RefFabricant" = f3."RefFabricant"
            LEFT JOIN "PieceFournisseur" pf_principal ON (
                pf_principal."RéfPièce" = p."RéfPièce" AND pf_principal."EstPrincipal" = TRUE
            )
            LEFT JOIN "Fournisseurs" fp ON fp."RéfFournisseur" = pf_principal."RéfFournisseur"
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
                    "RéfFournisseur": piece_dict.get("ref_four_principal"),
                    "NomFournisseur": safe_string(piece_dict.get("fournisseur_principal_nom", "")),
                    "NuméroTél": safe_string(piece_dict.get("fournisseur_principal_tel", "")),
                    "NumSap": safe_string(piece_dict.get("fournisseur_principal_numsap", "")),
                    "EstPrincipal": True,
                }

            # Charger tous les fournisseurs depuis la subquery JSON
            import json as _json
            tous_raw = piece_dict.get("tous_fournisseurs")
            if tous_raw:
                if isinstance(tous_raw, str):
                    tous_fournisseurs = _json.loads(tous_raw)
                else:
                    tous_fournisseurs = list(tous_raw)
            else:
                tous_fournisseurs = [fournisseur_principal] if fournisseur_principal else []

            piece_response = Piece(
                RéfPièce=piece_dict["RéfPièce"],
                NomPièce=nom_piece,
                DescriptionPièce=safe_string(piece_dict.get("DescriptionPièce", "")),
                NumPièce=safe_string(piece_dict.get("NumPièce", "")),
                NumPièceAutreFournisseur=safe_string(piece_dict.get("NumPièceAutreFournisseur", "")),
                Lieuentreposage=safe_string(piece_dict.get("Lieuentreposage", "")),
                QtéenInventaire=qty_inventaire,
                Qtéminimum=qty_minimum,
                Qtémax=qty_max,
                Qtéàcommander=qty_a_commander,
                Qtécommandée=safe_int(piece_dict.get("Qtécommandée")),
                Prix_unitaire=safe_float(piece_dict.get("Prix unitaire", 0)),
                Soumission_LD=safe_string(piece_dict.get("Soumission LD", "")),
                SoumDem=piece_dict.get("SoumDem", ""),
                fournisseur_principal=fournisseur_principal,
                fournisseurs=tous_fournisseurs,
                NomFabricant=safe_string(piece_dict.get("NomFabricant", "")),
                RefFabricant=piece_dict.get("RefFabricant"),
                statut_stock=statut_stock,
                Created=piece_dict.get("Created"),
                Modified=piece_dict.get("Modified"),
                RTBS=piece_dict.get("RTBS"),
                NoFESTO=safe_string(piece_dict.get("NoFESTO"))
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
            SELECT p.*, f3."NomFabricant"
            FROM "Pièce" p
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

        fournisseurs_rows = await conn.fetch('''
            SELECT pf."id", pf."RéfFournisseur", pf."EstPrincipal",
                   pf."NumPièceFournisseur", pf."PrixUnitaire", pf."DelaiLivraison",
                   f."NomFournisseur", f."NuméroTél", f."Domaine", f."NumSap",
                   (SELECT c."Email" FROM "Contact" c
                    WHERE c."RéfFournisseur" = f."RéfFournisseur"
                    ORDER BY c."RéfContact" LIMIT 1) as email_contact
            FROM "PieceFournisseur" pf
            JOIN "Fournisseurs" f ON f."RéfFournisseur" = pf."RéfFournisseur"
            WHERE pf."RéfPièce" = $1
            ORDER BY pf."EstPrincipal" DESC, pf."DateAjout" ASC
        ''', piece_id)

        fournisseurs = [
            {
                "id": r["id"],
                "RéfFournisseur": r["RéfFournisseur"],
                "NomFournisseur": safe_string(r.get("NomFournisseur", "")),
                "NuméroTél": safe_string(r.get("NuméroTél", "")),
                "Domaine": safe_string(r.get("Domaine", "")),
                "NumSap": safe_string(r.get("NumSap", "")),
                "EstPrincipal": r["EstPrincipal"],
                "NumPièceFournisseur": safe_string(r.get("NumPièceFournisseur", "")),
                "PrixUnitaire": safe_float(r.get("PrixUnitaire", 0)),
                "DelaiLivraison": safe_string(r.get("DelaiLivraison", "")),
                "EmailContact": safe_string(r.get("email_contact", "")),
            }
            for r in fournisseurs_rows
        ]

        fournisseur_principal = next((f for f in fournisseurs if f["EstPrincipal"]), None)

        return Piece(
            RéfPièce=piece_dict["RéfPièce"],
            NomPièce=nom_piece,
            DescriptionPièce=safe_string(piece_dict.get("DescriptionPièce", "")),
            NumPièce=safe_string(piece_dict.get("NumPièce", "")),
            NumPièceAutreFournisseur=safe_string(piece_dict.get("NumPièceAutreFournisseur", "")),
            Lieuentreposage=safe_string(piece_dict.get("Lieuentreposage", "")),
            QtéenInventaire=qty_inventaire,
            Qtéminimum=qty_minimum,
            Qtémax=qty_max,
            Qtéàcommander=qty_a_commander,
            Prix_unitaire=safe_float(piece_dict.get("Prix unitaire", 0)),
            Soumission_LD=safe_string(piece_dict.get("Soumission LD", "")),
            SoumDem=piece_dict.get("SoumDem", ""),
            fournisseurs=fournisseurs,
            fournisseur_principal=fournisseur_principal,
            NomFabricant=safe_string(piece_dict.get("NomFabricant", "")),
            RefFabricant=piece_dict.get("RefFabricant"),
            statut_stock=statut_stock,
            Created=piece_dict.get("Created"),
            Modified=piece_dict.get("Modified"),
            Discontinué=safe_string(piece_dict.get("Discontinué", "")),
            RTBS=piece_dict.get("RTBS"),
            NoFESTO=safe_string(piece_dict.get("NoFESTO"))

        )
    except HTTPException:
        raise
    except Exception as e:
        print(f"Erreur get_piece {piece_id}: {e}")
        raise HTTPException(status_code=500, detail="Erreur serveur")
    finally:
        await request.app.state.pool.release(conn)


# Après la route GET /pieces/{piece_id}
@router.get("/{piece_id}/fournisseurs")
async def get_piece_fournisseurs(
        piece_id: int,
        conn: asyncpg.Connection = Depends(get_db_connection)
):
    """Récupère tous les fournisseurs d'une pièce"""
    rows = await conn.fetch('''
        SELECT pf.*, f."NomFournisseur", f."NuméroTél", f."Domaine"
        FROM "PieceFournisseur" pf
        LEFT JOIN "Fournisseurs" f ON pf."RéfFournisseur" = f."RéfFournisseur"
        WHERE pf."RéfPièce" = $1
        ORDER BY pf."EstPrincipal" DESC, pf."DateAjout" DESC
    ''', piece_id)

    return [
        {
            "id": r["id"],
            "RéfFournisseur": r["RéfFournisseur"],
            "EstPrincipal": r["EstPrincipal"],
            "NumPièceFournisseur": safe_string(r.get("NumPièceFournisseur", "")),
            "PrixUnitaire": safe_float(r.get("PrixUnitaire", 0)),
            "DelaiLivraison": safe_string(r.get("DelaiLivraison", "")),
            "fournisseur": {
                "NomFournisseur": safe_string(r.get("NomFournisseur", "")),
                "NuméroTél": safe_string(r.get("NuméroTél", "")),
                "Domaine": safe_string(r.get("Domaine", ""))
            }
        }
        for r in rows
    ]


@router.post("/{piece_id}/fournisseurs")
async def add_fournisseur_to_piece(
        piece_id: int,
        fournisseur_data: dict,
        conn: asyncpg.Connection = Depends(get_db_connection)
):
    """Ajoute un fournisseur à une pièce"""

    # Si marqué comme principal, retirer le flag des autres
    if fournisseur_data.get("EstPrincipal"):
        await conn.execute(
            'UPDATE "PieceFournisseur" SET "EstPrincipal" = FALSE WHERE "RéfPièce" = $1',
            piece_id
        )

    row = await conn.fetchrow('''
        INSERT INTO "PieceFournisseur" 
        ("RéfPièce", "RéfFournisseur", "EstPrincipal", "NumPièceFournisseur", "PrixUnitaire", "DelaiLivraison")
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
    ''',
                              piece_id,
                              fournisseur_data["RéfFournisseur"],
                              fournisseur_data.get("EstPrincipal", False),
                              fournisseur_data.get("NumPièceFournisseur", ""),
                              fournisseur_data.get("PrixUnitaire", 0),
                              fournisseur_data.get("DelaiLivraison", "")
                              )

    return dict(row)


@router.delete("/{piece_id}/fournisseurs/{piece_fournisseur_id}")
async def remove_fournisseur_from_piece(
        piece_id: int,
        piece_fournisseur_id: int,
        conn: asyncpg.Connection = Depends(get_db_connection)
):
    """Retire un fournisseur d'une pièce"""
    result = await conn.execute(
        'DELETE FROM "PieceFournisseur" WHERE "id" = $1 AND "RéfPièce" = $2',
        piece_fournisseur_id, piece_id
    )

    if result == "DELETE 0":
        raise HTTPException(status_code=404, detail="Liaison non trouvée")

    return {"message": "Fournisseur retiré"}

@router.post("", response_model=Piece)
async def create_piece(
    piece: PieceCreate,
    conn: asyncpg.Connection = Depends(get_db_connection)
):
    """Crée une nouvelle pièce puis insère les fournisseurs dans PieceFournisseur"""

    now = datetime.utcnow()

    # 1. Insérer la pièce (sans fournisseurs — c'est dans PieceFournisseur)
    row = await conn.fetchrow(
        '''
        INSERT INTO "Pièce" (
            "NomPièce", "DescriptionPièce", "NumPièce",
            "NumPièceAutreFournisseur", "RefFabricant",
            "Lieuentreposage", "QtéenInventaire", "Qtéminimum", "Qtémax",
            "Prix unitaire", "Soumission LD", "SoumDem",
            "Created", "Modified", "NoFESTO", "RTBS"
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
        RETURNING *
        ''',
        piece.NomPièce,
        piece.DescriptionPièce or "",
        piece.NumPièce or "",
        piece.NumPièceAutreFournisseur or "",
        piece.RefFabricant,
        piece.Lieuentreposage or "",
        piece.QtéenInventaire,
        piece.Qtéminimum,
        piece.Qtémax,
        piece.Prix_unitaire,
        piece.Soumission_LD or "",
        piece.SoumDem or False,
        now,
        now,
        piece.NoFESTO or "",
        piece.RTBS
    )

    piece_id = row["RéfPièce"]

    # 2. Insérer les fournisseurs dans PieceFournisseur
    fournisseurs_input = piece.fournisseurs or []

    # Si pas de fournisseurs dans le nouveau format mais ancien champ présent
    if not fournisseurs_input and hasattr(piece, 'RéfFournisseur') and piece.RéfFournisseur:
        fournisseurs_input = [{"RéfFournisseur": piece.RéfFournisseur, "EstPrincipal": True}]

    for i, f in enumerate(fournisseurs_input):
        ref = f.get("RéfFournisseur") if isinstance(f, dict) else getattr(f, "RéfFournisseur", None)
        if not ref:
            continue
        est_principal = f.get("EstPrincipal", i == 0) if isinstance(f, dict) else getattr(f, "EstPrincipal", i == 0)
        num_piece_fourn = f.get("NumPièceFournisseur", "") if isinstance(f, dict) else getattr(f, "NumPièceFournisseur", "")
        prix = f.get("PrixUnitaire", 0) if isinstance(f, dict) else getattr(f, "PrixUnitaire", 0)
        delai = f.get("DelaiLivraison", "") if isinstance(f, dict) else getattr(f, "DelaiLivraison", "")

        # Si déjà un principal, forcer les suivants à False
        if est_principal:
            await conn.execute(
                'UPDATE "PieceFournisseur" SET "EstPrincipal" = FALSE WHERE "RéfPièce" = $1',
                piece_id
            )

        await conn.execute(
            '''
            INSERT INTO "PieceFournisseur"
                ("RéfPièce", "RéfFournisseur", "EstPrincipal",
                 "NumPièceFournisseur", "PrixUnitaire", "DelaiLivraison", "DateAjout")
            VALUES ($1, $2, $3, $4, $5, $6, NOW())
            ''',
            piece_id, ref, est_principal,
            num_piece_fourn or "", prix or 0, delai or ""
        )

    # 3. Recharger les fournisseurs pour la réponse
    fournisseurs_rows = await conn.fetch(
        '''
        SELECT pf."id", pf."RéfFournisseur", pf."EstPrincipal",
               pf."NumPièceFournisseur", pf."PrixUnitaire", pf."DelaiLivraison",
               f."NomFournisseur", f."NuméroTél", f."NumSap"
        FROM "PieceFournisseur" pf
        JOIN "Fournisseurs" f ON f."RéfFournisseur" = pf."RéfFournisseur"
        WHERE pf."RéfPièce" = $1
        ORDER BY pf."EstPrincipal" DESC, pf."DateAjout" ASC
        ''',
        piece_id
    )
    fournisseurs_list = [
        {
            "RéfFournisseur": r["RéfFournisseur"],
            "NomFournisseur": safe_string(r.get("NomFournisseur", "")),
            "NuméroTél": safe_string(r.get("NuméroTél", "")),
            "NumSap": safe_string(r.get("NumSap", "")),
            "EstPrincipal": r["EstPrincipal"],
            "NumPièceFournisseur": safe_string(r.get("NumPièceFournisseur", "")),
            "PrixUnitaire": safe_float(r.get("PrixUnitaire", 0)),
        }
        for r in fournisseurs_rows
    ]
    fournisseur_principal = next((f for f in fournisseurs_list if f["EstPrincipal"]), None)

    piece_dict = dict(row)
    qty_a_commander = calculate_qty_to_order(
        piece_dict.get("QtéenInventaire", 0),
        piece_dict.get("Qtéminimum", 0),
        piece_dict.get("Qtémax", 100)
    )

    return Piece(
        RéfPièce=piece_id,
        NomPièce=safe_string(piece_dict.get("NomPièce", "")),
        DescriptionPièce=safe_string(piece_dict.get("DescriptionPièce", "")),
        NumPièce=safe_string(piece_dict.get("NumPièce", "")),
        NumPièceAutreFournisseur=safe_string(piece_dict.get("NumPièceAutreFournisseur", "")),
        Lieuentreposage=safe_string(piece_dict.get("Lieuentreposage", "")),
        QtéenInventaire=safe_int(piece_dict.get("QtéenInventaire", 0)),
        Qtéminimum=safe_int(piece_dict.get("Qtéminimum", 0)),
        Qtémax=safe_int(piece_dict.get("Qtémax", 100)),
        Qtéàcommander=qty_a_commander,
        Prix_unitaire=safe_float(piece_dict.get("Prix unitaire", 0)),
        Soumission_LD=safe_string(piece_dict.get("Soumission LD", "")),
        SoumDem=piece_dict.get("SoumDem", ""),
        fournisseurs=fournisseurs_list,
        fournisseur_principal=fournisseur_principal,
        statut_stock=get_stock_status(
            safe_int(piece_dict.get("QtéenInventaire", 0)),
            safe_int(piece_dict.get("Qtéminimum", 0))
        ),
        Created=piece_dict.get("Created"),
        Modified=piece_dict.get("Modified"),
        RTBS=piece_dict.get("RTBS"),
        NoFESTO=safe_string(piece_dict.get("NoFESTO"))
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

    # Sauvegarder les fournisseurs si fournis dans la mise à jour
    update_dict = piece_update.dict(exclude_unset=True)
    if "fournisseurs" in update_dict and update_dict["fournisseurs"] is not None:
        # Supprimer toutes les liaisons existantes
        await conn.execute('DELETE FROM "PieceFournisseur" WHERE "RéfPièce" = $1', piece_id)
        # Réinsérer
        for f in update_dict["fournisseurs"]:
            await conn.execute('''
                INSERT INTO "PieceFournisseur"
                    ("RéfPièce", "RéfFournisseur", "EstPrincipal", "NumPièceFournisseur", "PrixUnitaire", "DelaiLivraison")
                VALUES ($1, $2, $3, $4, $5, $6)
            ''',
                piece_id,
                f["RéfFournisseur"],
                f.get("EstPrincipal", False),
                f.get("NumPièceFournisseur", ""),
                f.get("PrixUnitaire", 0),
                f.get("DelaiLivraison", ""),
            )

    # Récupérer la pièce mise à jour avec ses fournisseurs via PieceFournisseur
    piece = await conn.fetchrow('''
        SELECT p.*, f3."NomFabricant"
        FROM "Pièce" p
        LEFT JOIN "Fabricant" f3 ON p."RefFabricant" = f3."RefFabricant"
        WHERE p."RéfPièce" = $1
    ''', piece_id)
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

    # Charger les fournisseurs depuis PieceFournisseur
    fournisseurs_rows = await conn.fetch('''
        SELECT pf."id", pf."RéfFournisseur", pf."EstPrincipal",
               pf."NumPièceFournisseur", pf."PrixUnitaire", pf."DelaiLivraison",
               f."NomFournisseur", f."NuméroTél", f."Domaine", f."NumSap"
        FROM "PieceFournisseur" pf
        JOIN "Fournisseurs" f ON f."RéfFournisseur" = pf."RéfFournisseur"
        WHERE pf."RéfPièce" = $1
        ORDER BY pf."EstPrincipal" DESC, pf."DateAjout" ASC
    ''', piece_id)

    fournisseurs_list = [
        {
            "id": r["id"],
            "RéfFournisseur": r["RéfFournisseur"],
            "NomFournisseur": safe_string(r.get("NomFournisseur", "")),
            "NuméroTél": safe_string(r.get("NuméroTél", "")),
            "Domaine": safe_string(r.get("Domaine", "")),
            "NumSap": safe_string(r.get("NumSap", "")),
            "EstPrincipal": r["EstPrincipal"],
            "NumPièceFournisseur": safe_string(r.get("NumPièceFournisseur", "")),
            "PrixUnitaire": safe_float(r.get("PrixUnitaire", 0)),
            "DelaiLivraison": safe_string(r.get("DelaiLivraison", "")),
        }
        for r in fournisseurs_rows
    ]
    fournisseur_principal = next((f for f in fournisseurs_list if f["EstPrincipal"]), None)

    return Piece(
        RéfPièce=piece_dict["RéfPièce"],
        NomPièce=nom_piece,
        DescriptionPièce=safe_string(piece_dict.get("DescriptionPièce", "")),
        NumPièce=safe_string(piece_dict.get("NumPièce", "")),
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
        SoumDem=piece_dict.get("SoumDem", ""),
        fournisseurs=fournisseurs_list,
        fournisseur_principal=fournisseur_principal,
        NomFabricant=safe_string(piece_dict.get("NomFabricant", "")),
        RefFabricant=piece_dict.get("RefFabricant"),
        statut_stock=statut_stock,
        Created=piece_dict.get("Created"),
        Modified=piece_dict.get("Modified"),
        RTBS=piece_dict.get("RTBS"),
        NoFESTO=safe_string(piece_dict.get("NoFESTO"))
    )


@router.delete("/{piece_id}")
async def delete_piece(piece_id: int, conn: asyncpg.Connection = Depends(get_db_connection)):
    result = await conn.execute('DELETE FROM "Pièce" WHERE "RéfPièce" = $1', piece_id)
    if result == "DELETE 0":
        raise HTTPException(status_code=404, detail="Pièce non trouvée")
    return {"message": "Pièce supprimée"}