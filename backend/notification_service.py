import logging
import json as _json
import asyncio
import asyncpg
from email_service import (
    send_notification_pieces_a_commander,
    send_notification_demande_approbation,
    send_notification_approbation_result,
    send_notification_piece_commandee,
)

logger = logging.getLogger("Inventaire-Robot")


async def _get_users_with_pref(conn: asyncpg.Connection, pref_key: str) -> list[dict]:
    """
    Retourne tous les users qui ont un email ET la préférence activée.
    """
    rows = await conn.fetch(
        """SELECT username, email, notification_prefs
           FROM users
           WHERE email IS NOT NULL AND email != ''"""
    )
    result = []
    for row in rows:
        # Parser JSON si c'est une string, ou utiliser directement si c'est un dict
        prefs_raw = row['notification_prefs']
        if isinstance(prefs_raw, str):
            prefs = _json.loads(prefs_raw) if prefs_raw else {}
        elif isinstance(prefs_raw, dict):
            prefs = prefs_raw
        else:
            prefs = {}
        # Par défaut True pour la plupart des notifs sauf piece_commandee
        default = False if pref_key == "piece_commandee" else True
        if prefs.get(pref_key, default):
            result.append({"username": row['username'], "email": row['email']})
    return result


async def notify_pieces_a_commander(conn: asyncpg.Connection, pieces: list[dict]):
    """
    Envoie une notification aux users qui veulent être alertés des pièces à commander.
    pieces = liste de dicts avec NomPièce, NumPièce, QtéenInventaire, Qtéàcommander
    """
    if not pieces:
        return
    users = await _get_users_with_pref(conn, "pieces_a_commander")
    for u in users:
        try:
            # Exécuter l'envoi email en background sans bloquer la connection
            asyncio.create_task(asyncio.to_thread(
                send_notification_pieces_a_commander, u['email'], u['username'], pieces
            ))
            logger.info(f"📧 Notif pieces_a_commander → {u['username']} ({u['email']})")
        except Exception as e:
            logger.error(f"❌ Notif pieces_a_commander → {u['username']}: {e}")


async def notify_demande_approbation(conn: asyncpg.Connection, piece_nom: str, piece_ref: int, demande_par: str):
    """
    Notifie les admins qu'une pièce est soumise pour approbation.
    """
    rows = await conn.fetch(
        """SELECT username, email, notification_prefs
           FROM users
           WHERE role = 'admin' AND email IS NOT NULL AND email != ''"""
    )
    for row in rows:
        # Parser JSON si c'est une string, ou utiliser directement si c'est un dict
        prefs_raw = row['notification_prefs']
        if isinstance(prefs_raw, str):
            prefs = _json.loads(prefs_raw) if prefs_raw else {}
        elif isinstance(prefs_raw, dict):
            prefs = prefs_raw
        else:
            prefs = {}
        if prefs.get("demande_approbation", True):
            try:
                # Exécuter l'envoi email en background sans bloquer la connection
                asyncio.create_task(asyncio.to_thread(
                    send_notification_demande_approbation,
                    row['email'], row['username'], piece_nom, piece_ref, demande_par
                ))
                logger.info(f"📧 Notif demande_approbation → {row['username']}")
            except Exception as e:
                logger.error(f"❌ Notif demande_approbation → {row['username']}: {e}")


async def notify_approbation_result(
    conn: asyncpg.Connection,
    piece_nom: str,
    statut: str,       # 'approuvee' ou 'refusee'
    note: str = "",
    demandeur_username: str = None   # username qui avait soumis la pièce
):
    """
    Notifie les users du résultat d'une approbation.
    Si demandeur_username fourni, notifie seulement ce user.
    Sinon notifie tous les users qui ont la préf activée.
    """
    pref_key = "approbation_accordee" if statut == "approuvee" else "approbation_refusee"

    if demandeur_username:
        # Notifier seulement le demandeur
        row = await conn.fetchrow(
            "SELECT username, email, notification_prefs FROM users WHERE username = $1",
            demandeur_username
        )
        if row and row['email']:
            # Parser JSON si c'est une string, ou utiliser directement si c'est un dict
            prefs_raw = row['notification_prefs']
            if isinstance(prefs_raw, str):
                prefs = _json.loads(prefs_raw) if prefs_raw else {}
            elif isinstance(prefs_raw, dict):
                prefs = prefs_raw
            else:
                prefs = {}
            if prefs.get(pref_key, True):
                try:
                    # Exécuter l'envoi email en background sans bloquer la connection
                    asyncio.create_task(asyncio.to_thread(
                        send_notification_approbation_result,
                        row['email'], row['username'], piece_nom, statut, note
                    ))
                    logger.info(f"📧 Notif {pref_key} → {row['username']}")
                except Exception as e:
                    logger.error(f"❌ Notif {pref_key} → {row['username']}: {e}")
    else:
        users = await _get_users_with_pref(conn, pref_key)
        for u in users:
            try:
                # Exécuter l'envoi email en background sans bloquer la connection
                asyncio.create_task(asyncio.to_thread(
                    send_notification_approbation_result,
                    u['email'], u['username'], piece_nom, statut, note
                ))
                logger.info(f"📧 Notif {pref_key} → {u['username']}")
            except Exception as e:
                logger.error(f"❌ Notif {pref_key} → {u['username']}: {e}")


async def notify_piece_commandee(conn: asyncpg.Connection, piece_nom: str, qte: int):
    """
    Notifie les users qui veulent savoir quand une commande est passée.
    """
    users = await _get_users_with_pref(conn, "piece_commandee")
    for u in users:
        try:
            # Exécuter l'envoi email en background sans bloquer la connection
            asyncio.create_task(asyncio.to_thread(
                send_notification_piece_commandee,
                u['email'], u['username'], piece_nom, qte
            ))
            logger.info(f"📧 Notif piece_commandee → {u['username']}")
        except Exception as e:
            logger.error(f"❌ Notif piece_commandee → {u['username']}: {e}")
