"""Utilitaire centralisé pour logger les mouvements d'inventaire dans l'historique"""
from datetime import datetime


async def log_mouvement(
    conn,
    *,
    operation: str,
    piece_id: int,
    nom_piece: str = "",
    num_piece: str = "",
    qty_cmd: str = None,
    qty_sortie: str = None,
    description: str = "",
    user: str = "Système",
    delai: float = None,
) -> None:
    """
    Insère un enregistrement dans l'historique de manière silencieuse.
    Ne lève jamais d'exception — les erreurs sont loggées en console uniquement.

    Règles DateCMD / DateRecu :
      - "Commande"              → DateCMD = now,  DateRecu = None
      - "Sortie" / "Sortie rapide" / "Achat" → DateCMD = None, DateRecu = now
    """
    now = datetime.utcnow()

    if operation == "Commande":
        date_cmd = now
        date_recu = None
    else:
        date_cmd = None
        date_recu = now

    try:
        await conn.execute(
            '''
            INSERT INTO "historique" (
                "DateCMD", "DateRecu", "Opération", "numpiece", "description",
                "qtécommande", "QtéSortie", "nompiece", "RéfPièce", "User", "Delais"
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            ''',
            date_cmd,
            date_recu,
            operation,
            num_piece or "",
            description or "",
            qty_cmd,
            qty_sortie,
            nom_piece or "",
            float(piece_id),
            user or "Système",
            delai,
        )
        print(f"📋 Historique [{operation}] pièce={piece_id} qty_cmd={qty_cmd} qty_sortie={qty_sortie} user={user}")
    except Exception as e:
        print(f"⚠️  log_mouvement FAILED [{operation}] pièce={piece_id}: {e}")
