"""Routes pour la gestion des commandes"""
import asyncpg
from fastapi import APIRouter, Depends, HTTPException
from typing import List
from datetime import datetime

from database import get_db_connection
from models import Commande, StatsResponse
from utils.helpers import safe_string, safe_int, safe_float, calculate_qty_to_order

router = APIRouter(tags=["commandes"])

@router.get("/stats", response_model=StatsResponse)
async def get_stats(conn: asyncpg.Connection = Depends(get_db_connection)):
    """Récupère les statistiques d'inventaire"""
    try:
        # Total pièces
        total_pieces = await conn.fetchval('SELECT COUNT(*) FROM "Pièce"') or 0

        # Stock critique
        stock_critique = await conn.fetchval(
            'SELECT COUNT(*) FROM "Pièce" WHERE "QtéenInventaire" = 0 AND "Qtéminimum" > 0'
        ) or 0

        # Valeur stock (en CAD $)
        valeur_stock = await conn.fetchval(
            'SELECT COALESCE(SUM("QtéenInventaire" * COALESCE("Prix unitaire", 0)), 0) FROM "Pièce"'
        ) or 0.0

        # Pièces à commander (calculées automatiquement)
        pieces_a_commander = await conn.fetchval(
            '''
            SELECT COUNT(*)
            FROM "Pièce"
            WHERE "Qtécommandée" <= 0
              AND "QtéenInventaire" < "Qtéminimum"
              AND "Qtéminimum" > 0
            '''
        ) or 0

        return StatsResponse(
            total_pieces=total_pieces,
            stock_critique=stock_critique,
            valeur_stock=float(valeur_stock),
            pieces_a_commander=pieces_a_commander
        )
    except Exception as e:
        print(f"❌ Erreur stats: {e}")
        return StatsResponse(total_pieces=0, stock_critique=0, valeur_stock=0.0, pieces_a_commander=0)


@router.get("/commande", response_model=List[Commande])
async def get_commande(conn: asyncpg.Connection = Depends(get_db_connection)):
    """Récupère les commandes en cours"""
    try:
        rows = await conn.fetch('''
            SELECT p.*,
                   f1."NomFournisseur" AS fournisseur_principal_nom,
                   f2."NomAutreFournisseur" AS autre_fournisseur_nom,
                   f3."NomFabricant"
            FROM "Pièce" p
            LEFT JOIN "Fournisseurs" f1 ON p."RéfFournisseur" = f1."RéfFournisseur"
            LEFT JOIN "Autre Fournisseurs" f2 ON p."RéfAutreFournisseur" = f2."RéfAutreFournisseur"
            LEFT JOIN "Fabricant" f3 ON p."RefFabricant" = f3."RefFabricant"
            WHERE COALESCE(p."Qtécommandée", 0) > 0
        ''')

        result = []
        for row in rows:
            piece_dict = dict(row)

            fournisseur_principal = None
            if piece_dict.get("fournisseur_principal_nom"):
                fournisseur_principal = {
                    "RéfFournisseur": piece_dict.get("RéfFournisseur"),
                    "NomFournisseur": safe_string(piece_dict.get("fournisseur_principal_nom", "")),
                }

            autre_fournisseur = None
            if piece_dict.get("autre_fournisseur_nom"):
                autre_fournisseur = {
                    "RéfFournisseur": piece_dict.get("RéfAutreFournisseur"),
                    "NomAutreFournisseur": safe_string(piece_dict.get("autre_fournisseur_nom", "")),
                }

            commande = Commande(
                RéfPièce=piece_dict["RéfPièce"],
                Datecommande=piece_dict.get("Datecommande"),
                NomPièce=safe_string(piece_dict.get("NomPièce", "")),
                NumPièce=safe_string(piece_dict.get("NumPièce", "")),
                Qtécommandée=safe_int(piece_dict.get("Qtécommandée", 0)),
                Qtéreçue=safe_int(piece_dict.get("Qtéreçue", 0)),
                Qtéarecevoir=safe_int(piece_dict.get("Qtéarecevoir", 0)),
                Cmd_info=safe_string(piece_dict.get("Cmd_info", "")),
                NumPièceAutreFournisseur=safe_string(piece_dict.get("NumPièceAutreFournisseur", "")),
                DescriptionPièce=safe_string(piece_dict.get("DescriptionPièce", "")),
                RéfFournisseur=piece_dict.get("RéfFournisseur"),
                RéfAutreFournisseur=piece_dict.get("RéfAutreFournisseur"),
                QtéenInventaire=safe_int(piece_dict.get("QtéenInventaire", 0)),
                Qtéminimum=safe_int(piece_dict.get("Qtéminimum", 0)),
                Qtéàcommander=safe_int(piece_dict.get("Qtéàcommander", 0)),
                Prix_unitaire=safe_float(piece_dict.get("Prix unitaire", 0)),
                fournisseur_principal=fournisseur_principal,
                autre_fournisseur=autre_fournisseur,
                NomFabricant=safe_string(piece_dict.get("NomFabricant", "")),
                Soumission_LD=safe_string(piece_dict.get("Soumission LD", "")),
                SoumDem=bool(piece_dict.get("SoumDem", False))
            )

            result.append(commande)

        return result
    except Exception as e:
        print(f"❌ Erreur get_commande: {e}")
        return []


@router.get("/toorders", response_model=List[Commande])
async def get_toorders(conn: asyncpg.Connection = Depends(get_db_connection)):
    """Récupère les pièces à commander"""
    try:
        rows = await conn.fetch('''
            SELECT p.*,
                   f1."NomFournisseur" AS fournisseur_principal_nom,
                   f2."NomAutreFournisseur" AS autre_fournisseur_nom,
                   f3."NomFabricant"
            FROM "Pièce" p
            LEFT JOIN "Fournisseurs" f1 ON p."RéfFournisseur" = f1."RéfFournisseur"
            LEFT JOIN "Autre Fournisseurs" f2 ON p."RéfAutreFournisseur" = f2."RéfAutreFournisseur"
            LEFT JOIN "Fabricant" f3 ON p."RefFabricant" = f3."RefFabricant"
            WHERE p."Qtécommandée" <= 0
             AND p."QtéenInventaire" < p."Qtéminimum"
             AND p."Qtéminimum" > 0
        ''')

        result = []
        for row in rows:
            piece_dict = dict(row)

            fournisseur_principal = None
            if piece_dict.get("fournisseur_principal_nom"):
                fournisseur_principal = {
                    "RéfFournisseur": piece_dict.get("RéfFournisseur"),
                    "NomFournisseur": safe_string(piece_dict.get("fournisseur_principal_nom", "")),
                }

            autre_fournisseur = None
            if piece_dict.get("autre_fournisseur_nom"):
                autre_fournisseur = {
                    "RéfFournisseur": piece_dict.get("RéfAutreFournisseur"),
                    "NomFournisseur": safe_string(piece_dict.get("autre_fournisseur_nom", "")),
                }

            qty_a_commander = calculate_qty_to_order(
                piece_dict.get("QtéenInventaire", 0),
                piece_dict.get("Qtéminimum", 0),
                piece_dict.get("Qtémax", 100)
            )

            commande = Commande(
                RéfPièce=piece_dict["RéfPièce"],
                Datecommande=piece_dict.get("Datecommande"),
                NomPièce=safe_string(piece_dict.get("NomPièce", "")),
                NumPièce=safe_string(piece_dict.get("NumPièce", "")),
                RTBS=safe_int(piece_dict.get("RTBS", "")),
                NumPièceAutreFournisseur=safe_string(piece_dict.get("NumPièceAutreFournisseur", "")),
                DescriptionPièce=safe_string(piece_dict.get("DescriptionPièce", "")),
                RéfFournisseur=piece_dict.get("RéfFournisseur"),
                RéfAutreFournisseur=piece_dict.get("RéfAutreFournisseur"),
                QtéenInventaire=safe_int(piece_dict.get("QtéenInventaire", 0)),
                Qtéminimum=safe_int(piece_dict.get("Qtéminimum", 0)),
                Qtéàcommander=qty_a_commander,
                Prix_unitaire=safe_float(piece_dict.get("Prix unitaire", 0)),
                fournisseur_principal=fournisseur_principal,
                autre_fournisseur=autre_fournisseur,
                NomFabricant=safe_string(piece_dict.get("NomFabricant", "")),
                Soumission_LD=safe_string(piece_dict.get("Soumission LD", "")),
                SoumDem=bool(piece_dict.get("SoumDem", False))
            )

            result.append(commande)

        return result
    except Exception as e:
        print(f"❌ Erreur get_toorders: {e}")
        return []


@router.put("/ordersall/{piece_id}")
async def receive_all_order(
    piece_id: int,
    conn: asyncpg.Connection = Depends(get_db_connection)
):
    """Réception totale d'une commande"""
    try:
        query = '''
            UPDATE "Pièce"
            SET "QtéenInventaire" = "QtéenInventaire" + COALESCE("Qtécommandée", 0),
                "Qtéreçue" = COALESCE("Qtécommandée", 0),
                "Qtéarecevoir" = 0,
                "Qtécommandée" = 0,
                "Datecommande" = NULL,
                "Cmd_info" = NULL,
                "Modified" = $2
            WHERE "RéfPièce" = $1
        '''
        result = await conn.execute(query, piece_id, datetime.utcnow())

        # Mise à jour de l'historique
        await conn.execute("""
            WITH last_entry AS (
                SELECT id
                FROM "historique"
                WHERE "RéfPièce" = $2
                  AND "Opération" = 'Commande' or 'Achat'
                  AND "DateRecu" IS NULL
                ORDER BY "id" DESC
                LIMIT 1
            )
            UPDATE "historique"
            SET "DateRecu" = $1,
                "Delais" = EXTRACT(DAY FROM ($1 - "DateCMD"))
            WHERE id IN (SELECT id FROM last_entry);
        """,  datetime.utcnow(), piece_id)


        if result == "UPDATE 0":
            raise HTTPException(status_code=404, detail="Pièce non trouvée")

        return {"message": "Réception totale effectuée", "piece_id": piece_id}
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Erreur receive_all_order: {e}")
        raise HTTPException(status_code=500, detail="Erreur lors de la réception")


@router.put("/orderspar/{piece_id}")
async def receive_partial_order(
    piece_id: int,
    quantity_received: int,
    conn: asyncpg.Connection = Depends(get_db_connection)
):
    """Réception partielle d'une commande"""
    try:
        # Vérifier que la quantité est valide
        piece = await conn.fetchrow(
            'SELECT "Qtéarecevoir" FROM "Pièce" WHERE "RéfPièce" = $1',
            piece_id
        )

        if not piece:
            raise HTTPException(status_code=404, detail="Pièce non trouvée")

        if quantity_received > piece["Qtéarecevoir"]:
            raise HTTPException(
                status_code=400,
                detail=f"Quantité reçue ({quantity_received}) supérieure à la quantité à recevoir ({piece['Qtéarecevoir']})"
            )

        query = '''
            UPDATE "Pièce"
            SET "QtéenInventaire" = "QtéenInventaire" + $2,
                "Qtéreçue" = COALESCE("Qtéreçue", 0) + $2,
                "Qtéarecevoir" = GREATEST(0, COALESCE("Qtéarecevoir", 0) - $2),
                "Modified" = $3
            WHERE "RéfPièce" = $1
        '''

        result = await conn.execute(query, piece_id, quantity_received, datetime.utcnow())

        if result == "UPDATE 0":
            raise HTTPException(status_code=404, detail="Pièce non trouvée")

        return {"message": "Réception partielle effectuée", "piece_id": piece_id, "quantity": quantity_received}
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Erreur receive_partial_order: {e}")
        raise HTTPException(status_code=500, detail="Erreur lors de la réception partielle")