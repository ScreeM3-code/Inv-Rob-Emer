import asyncpg
from datetime import datetime
from typing import Any, Dict, Optional
import json

DEFAULT_APP_SETTINGS = {
    "site_name": "Inventaire Robots",
    "site_description": "Système de gestion d'inventaire robotisé",
    "piece_label": "Pièces",
    "bc_prefix": "BC",
    "bc_format": "{PREFIX}-{YEAR}-{SEQUENCE:04d}",
    "bc_next_sequence": 1,
    "email_host": "",
    "email_port": 587,
    "email_from": "noreply@tonentreprise.com",
    "email_user": "",
    "email_password": "",
    "email_tls": True,
    "email_ssl": False,
    "features": {
        "bon_de_commande": True,
        "ereq_sap": True,
        "approbation": True,
        "code_barre": True,
        "groupes": True,
        "export_excel": True,
    },
}


async def ensure_app_settings_table(conn: asyncpg.Connection):
    await conn.execute('''
        CREATE TABLE IF NOT EXISTS "AppSettings" (
            "key" TEXT PRIMARY KEY,
            "value" JSONB NOT NULL
        )
    ''')
    await conn.execute('''
        CREATE TABLE IF NOT EXISTS "BonCommande" (
            "RefBonCommande" SERIAL PRIMARY KEY,
            "NuméroBonCommande" TEXT UNIQUE NOT NULL,
            "RéfPièce" INT NOT NULL,
            "RéfFournisseur" INT,
            "Datecommande" DATE,
            "Qtécommandée" INT,
            "PrixUnitaire" NUMERIC(12,2),
            "Devise" TEXT,
            "Cmd_info" TEXT,
            "Lignes" JSONB,
            "Created" TIMESTAMPTZ DEFAULT NOW()
        )
    ''')

    row = await conn.fetchrow('SELECT "value" FROM "AppSettings" WHERE "key" = $1', 'default')
    if not row:
        await conn.execute(
            'INSERT INTO "AppSettings" ("key", "value") VALUES ($1, $2)',
            'default',
            json.dumps(DEFAULT_APP_SETTINGS)
        )


async def get_app_settings(conn: asyncpg.Connection) -> Dict[str, Any]:
    row = await conn.fetchrow('SELECT "value" FROM "AppSettings" WHERE "key" = $1', 'default')
    if row and row.get('value'):
        settings = row['value']
        if not isinstance(settings, dict):
            settings = DEFAULT_APP_SETTINGS.copy()
        merged = DEFAULT_APP_SETTINGS.copy()
        merged.update(settings)
        if 'features' in settings and isinstance(settings['features'], dict):
            merged['features'] = {**DEFAULT_APP_SETTINGS['features'], **settings['features']}
        return merged
    return DEFAULT_APP_SETTINGS.copy()


async def upsert_app_settings(conn: asyncpg.Connection, settings: Dict[str, Any]) -> Dict[str, Any]:
    merged = DEFAULT_APP_SETTINGS.copy()
    merged.update(settings or {})
    if 'features' in settings and isinstance(settings['features'], dict):
        merged['features'] = {**DEFAULT_APP_SETTINGS['features'], **settings['features']}

    await conn.execute(
        '''
        INSERT INTO "AppSettings" ("key", "value") VALUES ($1, $2)
        ON CONFLICT ("key") DO UPDATE SET "value" = EXCLUDED."value"
        ''',
        'default',
        json.dumps(merged)
    )
    return merged


async def reserve_next_bc_sequence(conn: asyncpg.Connection) -> int:
    row = await conn.fetchrow(
        '''
        UPDATE "AppSettings"
        SET "value" = jsonb_set(
            "value",
            '{bc_next_sequence}',
            to_jsonb(COALESCE(("value"->>'bc_next_sequence')::int, 1) + 1),
            true
        )
        WHERE "key" = $1
        RETURNING "value"
        ''',
        'default'
    )
    if not row or not row.get('value'):
        raise RuntimeError('Impossible de réserver la séquence du bon de commande')
    value = row['value']
    current_seq = int(value.get('bc_next_sequence', 1)) - 1
    if current_seq < 1:
        current_seq = 1
    return current_seq


def format_bc_number(prefix: str, sequence: int, template: str) -> str:
    year = datetime.utcnow().year
    try:
        return template.format(PREFIX=prefix or 'BC', YEAR=year, SEQUENCE=sequence)
    except Exception:
        return f"{prefix or 'BC'}-{year}-{sequence:04d}"


async def create_bon_commande(
        conn: asyncpg.Connection,
        piece_id: int,
        piece_nom: str,
        num_piece: str,
        qte_commandee: int,
        prix_unitaire: float,
        devise: str,
        cmd_info: str,
        ref_fournisseur: Optional[int] = None,
        ligne_extra: Optional[dict] = None,
):
    settings = await get_app_settings(conn)
    sequence = await reserve_next_bc_sequence(conn)
    numero = format_bc_number(settings.get('bc_prefix', 'BC'), sequence, settings.get('bc_format', '{PREFIX}-{YEAR}-{SEQUENCE:04d}'))

    lignes = {
        'RéfPièce': piece_id,
        'NomPièce': piece_nom,
        'NumPièce': num_piece,
        'Qtécommandée': qte_commandee,
        'PrixUnitaire': prix_unitaire,
        'Devise': devise,
        **(ligne_extra or {})
    }

    await conn.execute(
        '''
        INSERT INTO "BonCommande"
            ("NuméroBonCommande", "RéfPièce", "RéfFournisseur", "Datecommande", "Qtécommandée", "PrixUnitaire", "Devise", "Cmd_info", "Lignes")
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ''',
        numero,
        piece_id,
        ref_fournisseur,
        datetime.utcnow().date(),
        qte_commandee,
        prix_unitaire,
        devise,
        cmd_info,
        lignes
    )
    return numero
