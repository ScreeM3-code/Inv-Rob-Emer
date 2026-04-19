"""Routes pour la gestion des commandes"""
import asyncpg
from fastapi import APIRouter, Depends, HTTPException, Request
from typing import List, Optional
from datetime import datetime
import httpx
from database import get_db_connection
from utils.helpers import safe_string, safe_int, safe_float, calculate_qty_to_order
from utils.settings import get_app_settings
from auth import require_admin, require_auth
from models import Commande, StatsResponse, ApprobationRequest
from utils.historique import log_mouvement
import asyncio
from notification_service import (
    notify_demande_approbation,
    notify_approbation_result,
    notify_piece_commandee,
)

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
                   f3."NomFabricant",
                   fp."NomFournisseur"  AS fournisseur_principal_nom,
                   fp."NumSap"          AS fournisseur_principal_num_sap,
                   fp."RéfFournisseur"  AS ref_four_principal,
                   (
                       SELECT json_agg(json_build_object(
                           'RéfFournisseur',      fall."RéfFournisseur",
                           'NomFournisseur',      fall."NomFournisseur",
                           'NumSap',              fall."NumSap",
                           'EstPrincipal',        pfall."EstPrincipal",
                           'NumPièceFournisseur', pfall."NumPièceFournisseur"
                       ) ORDER BY pfall."EstPrincipal" DESC)
                       FROM "PieceFournisseur" pfall
                       JOIN "Fournisseurs" fall ON fall."RéfFournisseur" = pfall."RéfFournisseur"
                       WHERE pfall."RéfPièce" = p."RéfPièce"
                   ) AS tous_fournisseurs
            FROM "Pièce" p
            LEFT JOIN "PieceFournisseur" pf_p ON pf_p."RéfPièce" = p."RéfPièce" AND pf_p."EstPrincipal" = TRUE
            LEFT JOIN "Fournisseurs" fp ON fp."RéfFournisseur" = pf_p."RéfFournisseur"
            LEFT JOIN "Fabricant" f3 ON p."RefFabricant" = f3."RefFabricant"
            LEFT JOIN "Departement" d ON p."RefDepartement" = d."RefDepartement"
            WHERE COALESCE(p."Qtécommandée", 0) > 0
        ''')

        import json as _json
        result = []
        for row in rows:
            piece_dict = dict(row)

            fournisseur_principal = None
            if piece_dict.get("fournisseur_principal_nom"):
                fournisseur_principal = {
                    "RéfFournisseur": piece_dict.get("ref_four_principal"),
                    "NomFournisseur": safe_string(piece_dict.get("fournisseur_principal_nom", "")),
                    "NumSap": safe_string(piece_dict.get("fournisseur_principal_num_sap", "")),
                    "EstPrincipal": True,
                }

            tous_raw = piece_dict.get("tous_fournisseurs")
            if tous_raw:
                fournisseurs = _json.loads(tous_raw) if isinstance(tous_raw, str) else list(tous_raw)
            else:
                fournisseurs = [fournisseur_principal] if fournisseur_principal else []

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
                QtéenInventaire=safe_int(piece_dict.get("QtéenInventaire", 0)),
                Qtéminimum=safe_int(piece_dict.get("Qtéminimum", 0)),
                Qtéàcommander=safe_int(piece_dict.get("Qtéàcommander", 0)),
                Prix_unitaire=safe_float(piece_dict.get("Prix unitaire", 0)),
                fournisseur_principal=fournisseur_principal,
                fournisseurs=fournisseurs,
                NomFabricant=safe_string(piece_dict.get("NomFabricant", "")),
                Soumission_LD=safe_string(piece_dict.get("Soumission LD", "")),
                SoumDem=bool(piece_dict.get("SoumDem", False)),
                devise=safe_string(piece_dict.get("devise", "CAD")) or "CAD",
                RefDepartement=piece_dict.get("RefDepartement"),
                NomDepartement=safe_string(piece_dict.get("NomDepartement", ""))
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
        settings = await get_app_settings(conn)
        approbation_enabled = bool(settings.get('features', {}).get('approbation', True))

        query = '''
            SELECT p.*,
                   f3."NomFabricant",
                   fp."NomFournisseur"  AS fournisseur_principal_nom,
                   fp."NumSap"          AS fournisseur_principal_num_sap,
                   fp."RéfFournisseur"  AS ref_four_principal,
                   (
                       SELECT json_agg(json_build_object(
                           'RéfFournisseur',      fall."RéfFournisseur",
                           'NomFournisseur',      fall."NomFournisseur",
                           'NumSap',              fall."NumSap",
                           'EstPrincipal',        pfall."EstPrincipal",
                           'NumPièceFournisseur', pfall."NumPièceFournisseur"
                       ) ORDER BY pfall."EstPrincipal" DESC)
                       FROM "PieceFournisseur" pfall
                       JOIN "Fournisseurs" fall ON fall."RéfFournisseur" = pfall."RéfFournisseur"
                       WHERE pfall."RéfPièce" = p."RéfPièce"
                   ) AS tous_fournisseurs
            FROM "Pièce" p
            LEFT JOIN "PieceFournisseur" pf_p ON pf_p."RéfPièce" = p."RéfPièce" AND pf_p."EstPrincipal" = TRUE
            LEFT JOIN "Fournisseurs" fp ON fp."RéfFournisseur" = pf_p."RéfFournisseur"
            LEFT JOIN "Fabricant" f3 ON p."RefFabricant" = f3."RefFabricant"
            LEFT JOIN "Departement" d ON p."RefDepartement" = d."RefDepartement"
            WHERE COALESCE(p."Qtécommandée", 0) <= 0
             AND p."QtéenInventaire" < p."Qtéminimum"
             AND p."Qtéminimum" > 0
        '''
        if approbation_enabled:
            query += "\n             AND p.approbation_statut = 'approuvee'"

        rows = await conn.fetch(query)

        import json as _json
        result = []
        for row in rows:
            piece_dict = dict(row)

            fournisseur_principal = None
            if piece_dict.get("fournisseur_principal_nom"):
                fournisseur_principal = {
                    "RéfFournisseur": piece_dict.get("ref_four_principal"),
                    "NomFournisseur": safe_string(piece_dict.get("fournisseur_principal_nom", "")),
                    "NumSap": safe_string(piece_dict.get("fournisseur_principal_num_sap", "")),
                    "EstPrincipal": True,
                }

            tous_raw = piece_dict.get("tous_fournisseurs")
            if tous_raw:
                fournisseurs = _json.loads(tous_raw) if isinstance(tous_raw, str) else list(tous_raw)
            else:
                fournisseurs = [fournisseur_principal] if fournisseur_principal else []

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
                RTBS=piece_dict.get("RTBS", None),
                NumPièceAutreFournisseur=safe_string(piece_dict.get("NumPièceAutreFournisseur", "")),
                DescriptionPièce=safe_string(piece_dict.get("DescriptionPièce", "")),
                Lieuentreposage=safe_string(piece_dict.get("Lieuentreposage", "")),
                QtéenInventaire=safe_int(piece_dict.get("QtéenInventaire", 0)),
                Qtéminimum=safe_int(piece_dict.get("Qtéminimum", 0)),
                Qtéàcommander=qty_a_commander,
                Prix_unitaire=safe_float(piece_dict.get("Prix unitaire", 0)),
                fournisseur_principal=fournisseur_principal,
                fournisseurs=fournisseurs,
                NomFabricant=safe_string(piece_dict.get("NomFabricant", "")),
                Soumission_LD=safe_string(piece_dict.get("Soumission LD", "")),
                SoumDem=bool(piece_dict.get("SoumDem", False)),
                NoFESTO=safe_string(piece_dict.get("NoFESTO")),
                devise=safe_string(piece_dict.get("devise", "CAD")) or "CAD",
                RefDepartement=piece_dict.get("RefDepartement"),
                NomDepartement=safe_string(piece_dict.get("NomDepartement", ""))
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
        now = datetime.utcnow()

        # 1. Récupérer les infos de la commande AVANT la mise à jour
        piece_info = await conn.fetchrow(
            'SELECT "Qtécommandée", "Qtéarecevoir" FROM "Pièce" WHERE "RéfPièce" = $1',
            piece_id
        )

        if not piece_info:
            raise HTTPException(status_code=404, detail="Pièce non trouvée")

        qty_received = piece_info["Qtécommandée"] or 0

        if qty_received <= 0:
            raise HTTPException(status_code=400, detail="Aucune quantité à recevoir")

        # 2. Mettre à jour la pièce
        query = '''
            UPDATE "Pièce"
            SET "QtéenInventaire" = "QtéenInventaire" + $2,
                "Qtéreçue" = 0,
                "Qtéarecevoir" = 0,
                "Qtécommandée" = 0,
                "Datecommande" = NULL,
                "Cmd_info" = NULL,
                "SoumDem" = FALSE,
                "approbation_statut" = NULL,
                "approbation_par" = NULL,
                "approbation_date" = NULL,
                "approbation_note" = NULL,
                "Modified" = $3
            WHERE "RéfPièce" = $1
        '''
        result = await conn.execute(query, piece_id, qty_received, now)

        if result == "UPDATE 0":
            raise HTTPException(status_code=404, detail="Pièce non trouvée")

        # 3. Mettre à jour l'historique (avec gestion d'erreur)
        try:
            await conn.execute("""
                    UPDATE "historique"
                    SET "DateRecu" = $1,
                            -- Comme "DateCMD" est un type DATE (sans heure), calculer le délai
                            -- en jours en convertissant $1 en DATE puis en faisant la soustraction
                            "Delais" = CASE
                                    WHEN "DateCMD" IS NOT NULL
                                    THEN ($1::date - "DateCMD")
                                    ELSE NULL
                            END
                    WHERE "RéfPièce" = $2
                        AND ("Opération" = 'Commande' OR "Opération" = 'Achat')
                        AND "DateRecu" IS NULL
                        AND id = (
                            SELECT id FROM "historique"
                            WHERE "RéfPièce" = $2
                                AND ("Opération" = 'Commande' OR "Opération" = 'Achat')
                                AND "DateRecu" IS NULL
                            ORDER BY COALESCE("DateCMD", '1970-01-01') DESC
                            LIMIT 1
                        );
            """, now, piece_id)
        except Exception as hist_error:
            print(f"⚠️ Erreur mise à jour historique (non bloquant): {hist_error}")

            # ── Log réception totale ────────────────────────────────────
            try:
                nom_row = await conn.fetchrow(
                    'SELECT "NomPièce", "NumPièce" FROM "Pièce" WHERE "RéfPièce" = $1', piece_id
                )
                # Calculer le délai depuis la dernière commande
                cmd_row = await conn.fetchrow(
                    '''SELECT "DateCMD" FROM "historique"
                       WHERE "RéfPièce" = $1 AND "Opération" = \'Commande\'
                       ORDER BY id DESC LIMIT 1''',
                    piece_id
                )
                delai = None
                if cmd_row and cmd_row["DateCMD"]:
                    delai = float((now.date() - cmd_row["DateCMD"].date()).days)

                if nom_row:
                    await log_mouvement(
                        conn,
                        operation="Achat",
                        piece_id=piece_id,
                        nom_piece=str(nom_row["NomPièce"] or ""),
                        num_piece=str(nom_row["NumPièce"] or ""),
                        qty_cmd=str(qty_received),
                        user="Réception",
                        delai=delai,
                    )
            except Exception as log_err:
                print(f"⚠️  Log réception totale (non bloquant): {log_err}")

        return {
            "message": "Réception totale effectuée",
            "piece_id": piece_id,
            "quantity_received": qty_received
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Erreur receive_all_order: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Erreur lors de la réception: {str(e)}")


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

        # ── Log réception partielle ─────────────────────────────────
        try:
            nom_row = await conn.fetchrow(
                'SELECT "NomPièce", "NumPièce" FROM "Pièce" WHERE "RéfPièce" = $1', piece_id
            )
            cmd_row = await conn.fetchrow(
                '''SELECT "DateCMD" FROM "historique"
                   WHERE "RéfPièce" = $1 AND "Opération" = \'Commande\'
                   ORDER BY id DESC LIMIT 1''',
                piece_id
            )
            delai = None
            if cmd_row and cmd_row["DateCMD"]:
                from datetime import datetime as _dt
                delai = float((_dt.utcnow().date() - cmd_row["DateCMD"].date()).days)

            if nom_row:
                await log_mouvement(
                    conn,
                    operation="Achat",
                    piece_id=piece_id,
                    nom_piece=str(nom_row["NomPièce"] or ""),
                    num_piece=str(nom_row["NumPièce"] or ""),
                    qty_cmd=str(quantity_received),
                    description=f"Réception partielle : {quantity_received} unité(s)",
                    user="Réception",
                    delai=delai,
                )
        except Exception as log_err:
            print(f"⚠️  Log réception partielle (non bloquant): {log_err}")

        if result == "UPDATE 0":
            raise HTTPException(status_code=404, detail="Pièce non trouvée")

        return {"message": "Réception partielle effectuée", "piece_id": piece_id, "quantity": quantity_received}
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Erreur receive_partial_order: {e}")
        raise HTTPException(status_code=500, detail="Erreur lors de la réception partielle")


@router.post("/ereq/submit")
async def submit_ereq(payload: dict, request: Request):
    """Proxy vers SAP eReq — relaie les cookies de session Windows du navigateur"""
    EREQ_BASE = "https://fip.remote.riotinto.com/sap/opu/odata/rio/ZMPTP_EREQ_SRV"
    SAP_CLIENT = "500"

    sap_cookies = payload.get("sap_cookies", "")
    body_json = payload.get("body_json", "")

    if not sap_cookies:
        raise HTTPException(status_code=400,
                            detail="Cookies SAP manquants. Assurez-vous d'être connecté à eReq dans ce navigateur.")

    try:
        async with httpx.AsyncClient(verify=False, timeout=60.0) as client:
            # Étape 1 : récupérer le x-csrf-token
            token_resp = await client.get(
                f"{EREQ_BASE}/?sap-client={SAP_CLIENT}",
                headers={
                    "x-csrf-token": "Fetch",
                    "Accept": "application/json",
                    "Cookie": sap_cookies,
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                    "Referer": "https://fip.remote.riotinto.com/sap/bc/ui5_ui5/sap/zmptp_ereq/index.html",
                    "Origin": "https://fip.remote.riotinto.com",
                },
            )
            print(f"🔑 Token response status: {token_resp.status_code}")
            print(f"🔑 Token response headers: {dict(token_resp.headers)}")
            csrf_token = token_resp.headers.get("x-csrf-token")
            if not csrf_token:
                raise HTTPException(status_code=401,
                                    detail=f"Session SAP expirée ou invalide (HTTP {token_resp.status_code}). Reconnectez-vous à eReq.")

            # Étape 2 : construire et envoyer le batch
            ts = int(datetime.now().timestamp())
            batch_boundary = f"batch_{ts}"
            changeset_boundary = f"changeset_{ts}"

            # Construire la requête interne HTTP
            inner_headers = "\r\n".join([
                f"POST PRHeaderSet?sap-client={SAP_CLIENT} HTTP/1.1",
                "sap-contextid-accept: header",
                "Accept: application/json",
                "Accept-Language: fr",
                "DataServiceVersion: 2.0",
                "MaxDataServiceVersion: 2.0",
                f"x-csrf-token: {csrf_token}",
                "Content-Type: application/json",
                f"Content-Length: {len(body_json.encode('utf-8'))}",
                "",
                "",
            ])
            inner_request = inner_headers + body_json

            # Construire le changeset
            changeset_content = "\r\n".join([
                f"--{changeset_boundary}",
                "Content-Type: application/http",
                "Content-Transfer-Encoding: binary",
                "",
                inner_request,
                f"--{changeset_boundary}--",
            ])

            # Construire le batch complet
            batch_body = "\r\n".join([
                f"--{batch_boundary}",
                f"Content-Type: multipart/mixed; boundary={changeset_boundary}",
                "",
                changeset_content,
                f"--{batch_boundary}--",
            ])

            batch_resp = await client.post(
                f"{EREQ_BASE}/$batch?sap-client={SAP_CLIENT}",
                content=batch_body.encode(),
                headers={
                    "Content-Type": f"multipart/mixed; boundary={batch_boundary}",
                    "x-csrf-token": csrf_token,
                    "Accept": "multipart/mixed",
                    "DataServiceVersion": "2.0",
                    "MaxDataServiceVersion": "2.0",
                    "Cookie": sap_cookies,
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                    "Referer": "https://fip.remote.riotinto.com/sap/bc/ui5_ui5/sap/zmptp_ereq/index.html",
                    "Origin": "https://fip.remote.riotinto.com",
                },
            )

            print(f"📦 Batch response status: {batch_resp.status_code}")
            print(f"📦 Batch response body: {batch_resp.text[:500]}")
            return {"status": batch_resp.status_code, "body": batch_resp.text}

    except Exception as e:
        print(f"❌ EREQ ERROR: {type(e).__name__}: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=502, detail=f"Erreur: {type(e).__name__}: {str(e)}")


@router.get("/toorders/en-attente")
async def get_pieces_en_attente(
        conn: asyncpg.Connection = Depends(get_db_connection),
        user: dict = Depends(require_admin)
):
    """
    Retourne les pièces soumises pour approbation (admin seulement).
    Inclut aussi les refusées pour que l'admin puisse les réviser.
    """
    rows = await conn.fetch('''
        SELECT p."RéfPièce", p."NomPièce", p."NumPièce",
               p."QtéenInventaire", p."Qtéminimum", p."Qtémax",
               p."Prix unitaire" AS prix_unitaire,
               p.approbation_statut,
               p.approbation_par,
               p.approbation_date,
               p.approbation_note,
               p."demandeur",
               fp."NomFournisseur"  AS fournisseur_principal_nom,
               f3."NomFabricant"
        FROM "Pièce" p
        LEFT JOIN "PieceFournisseur" pf_p ON pf_p."RéfPièce" = p."RéfPièce" AND pf_p."EstPrincipal" = TRUE
        LEFT JOIN "Fournisseurs" fp       ON fp."RéfFournisseur" = pf_p."RéfFournisseur"
        LEFT JOIN "Fabricant" f3          ON p."RefFabricant" = f3."RefFabricant"
        WHERE COALESCE(p."Qtécommandée", 0) <= 0
          AND p."QtéenInventaire" < p."Qtéminimum"
          AND p."Qtéminimum" > 0
          AND (p.approbation_statut IN ('en_attente', 'refusee') OR p.approbation_statut IS NULL)
        ORDER BY
            CASE WHEN p.approbation_statut IS NULL THEN 0
                WHEN p.approbation_statut = 'en_attente' THEN 1
                ELSE 2 END,
            p.approbation_date DESC NULLS LAST
    ''')

    return [dict(r) for r in rows]


@router.post("/toorders/{piece_id}/soumettre")
async def soumettre_approbation(
        piece_id: int,
        piece_nom: str,
        conn: asyncpg.Connection = Depends(get_db_connection),
        user: dict = Depends(require_auth)
):
    """
    L'acheteur soumet une pièce pour approbation par l'admin.
    Passe le statut à 'en_attente'.
    """

    # Notifier les admins (dans le même context de connexion pour éviter un conn async fermé)
    piece_info = await conn.fetchrow(
        'SELECT "RéfPièce", "NomPièce" FROM "Pièce" WHERE "RéfPièce" = $1', piece_id
    )
    piece_nom = piece_info['NomPièce'] if piece_info else f"Pièce #{piece_id}"
    await notify_demande_approbation(conn, piece_nom, piece_id, user['username'])

    piece = await conn.fetchrow(
        'SELECT "RéfPièce", approbation_statut FROM "Pièce" WHERE "RéfPièce" = $1',
        piece_id
    )
    if not piece:
        raise HTTPException(status_code=404, detail="Pièce introuvable")

    if piece['approbation_statut'] == 'en_attente':
        return {"msg": "Déjà en attente d'approbation"}

    await conn.execute(
        '''UPDATE "Pièce"
           SET approbation_statut = 'en_attente',
               approbation_par    = NULL,
               approbation_date   = NOW(),
               approbation_note   = NULL
           WHERE "RéfPièce" = $1''',
        piece_id
    )
    return {"msg": "Pièce soumise pour approbation", "statut": "en_attente"}


@router.post("/toorders/{piece_id}/approuver")
async def approuver_piece(
        piece_id: int,
        data: ApprobationRequest,
        piece_nom: Optional[str] = None,
        conn: asyncpg.Connection = Depends(get_db_connection),
        user: dict = Depends(require_admin)
):
    """
    Admin approuve une pièce — elle devient visible dans la liste de commande.
    """
    piece = await conn.fetchrow(
        'SELECT "RéfPièce", "NomPièce" FROM "Pièce" WHERE "RéfPièce" = $1', piece_id
    )
    if not piece:
        raise HTTPException(status_code=404, detail="Pièce introuvable")

    await conn.execute(
        '''UPDATE "Pièce"
           SET approbation_statut = 'approuvee',
               approbation_par    = $1,
               approbation_date   = NOW(),
               approbation_note   = $2
           WHERE "RéfPièce" = $3''',
        user['username'], data.note, piece_id
    )
    demandeur = await conn.fetchval(
        'SELECT "demandeur" FROM "Pièce" WHERE "RéfPièce" = $1', piece_id
    )
    await notify_approbation_result(conn, piece['NomPièce'], "approuvee", data.note or "", demandeur)
    return {"msg": "Pièce approuvée", "statut": "approuvee"}


@router.post("/toorders/{piece_id}/refuser")
async def refuser_piece(
        piece_id: int,
        data: ApprobationRequest,
        piece_nom: Optional[str] = None,
        conn: asyncpg.Connection = Depends(get_db_connection),
        user: dict = Depends(require_admin)
):
    """
    Admin refuse une pièce — elle reste visible avec statut 'refusee'.
    """
    piece = await conn.fetchrow(
        'SELECT "RéfPièce", "NomPièce" FROM "Pièce" WHERE "RéfPièce" = $1', piece_id
    )
    if not piece:
        raise HTTPException(status_code=404, detail="Pièce introuvable")

    await conn.execute(
        '''UPDATE "Pièce"
           SET approbation_statut = 'refusee',
               approbation_par    = $1,
               approbation_date   = NOW(),
               approbation_note   = $2
           WHERE "RéfPièce" = $3''',
        user['username'], data.note, piece_id
    )
    demandeur = await conn.fetchval(
        'SELECT "demandeur" FROM "Pièce" WHERE "RéfPièce" = $1', piece_id
    )
    await notify_approbation_result(conn, piece['NomPièce'], "refusee", data.note or "", demandeur)
    return {"msg": "Pièce refusée", "statut": "refusee"}


@router.post("/toorders/{piece_id}/reset-approbation")
async def reset_approbation(
        piece_id: int,
        conn: asyncpg.Connection = Depends(get_db_connection),
        user: dict = Depends(require_admin)
):
    """
    Admin remet une pièce à NULL (retire l'approbation/refus).
    """
    await conn.execute(
        '''UPDATE "Pièce"
           SET approbation_statut = NULL,
               approbation_par    = NULL,
               approbation_date   = NULL,
               approbation_note   = NULL
           WHERE "RéfPièce" = $1''',
        piece_id
    )
    return {"msg": "Approbation réinitialisée"}