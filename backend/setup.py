"""
╔══════════════════════════════════════════════════════════════╗
║          INVENTAIRE ROBOT — Script d'installation            ║
║  Crée le .env, la base de données, et l'utilisateur admin    ║
╚══════════════════════════════════════════════════════════════╝

Usage :  python setup.py
"""

import asyncio
import os
import secrets
import uuid
from pathlib import Path

import subprocess
import sys

# ── Auto-installation des dépendances ────────────────────────
REQUIREMENTS = ["asyncpg", "bcrypt", "python-dotenv"]

def install_requirements():
    print("📦 Vérification des dépendances Python...")
    to_install = []
    for pkg in REQUIREMENTS:
        import importlib
        # nom du module importable peut différer du nom pip
        module_name = pkg.replace("-", "_").split("[")[0]
        if importlib.util.find_spec(module_name) is None:
            to_install.append(pkg)

    if not to_install:
        print("✅ Toutes les dépendances sont déjà installées.\n")
        return

    print(f"   Installation de : {', '.join(to_install)}")
    try:
        subprocess.check_call(
            [sys.executable, "-m", "pip", "install", *to_install],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
        print("✅ Dépendances installées avec succès.\n")
    except subprocess.CalledProcessError:
        print("❌ Échec de l'installation automatique. Installez manuellement :")
        print(f"   pip install {' '.join(to_install)}")
        sys.exit(1)

install_requirements()

# ── Vérifier les dépendances avant tout ──────────────────────
MISSING = []
try:
    import asyncpg
except ImportError:
    MISSING.append("asyncpg")
try:
    import bcrypt as _bcrypt_lib
except ImportError:
    MISSING.append("bcrypt")
try:
    from dotenv import set_key, load_dotenv
except ImportError:
    MISSING.append("python-dotenv")

if MISSING:
    print("❌ Dépendances manquantes. Installez-les d'abord :")
    print(f"   pip install {' '.join(MISSING)}")
    sys.exit(1)

import bcrypt as _bcrypt_lib

def hash_password(password: str) -> str:
    """Hash un mot de passe avec bcrypt."""
    return _bcrypt_lib.hashpw(
        password.encode("utf-8"),
        _bcrypt_lib.gensalt()
    ).decode("utf-8")

# ─────────────────────────────────────────────────────────────
ROOT_DIR = Path(__file__).parent
ENV_FILE = ROOT_DIR / ".env"
# ─────────────────────────────────────────────────────────────

BANNER = """
╔══════════════════════════════════════════════════════════════╗
║          INVENTAIRE ROBOT — Script d'installation            ║
╚══════════════════════════════════════════════════════════════╝
"""

SQL_SCHEMA = """
-- ============================================================
-- USERS & AUTHENTIFICATION
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    email VARCHAR(255),
    role VARCHAR(50) DEFAULT 'user',
    group_id INTEGER,
    notification_prefs JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- GROUPES DE PERMISSIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS user_groups (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT DEFAULT '',
    permissions JSONB DEFAULT '{}'
);

ALTER TABLE users
    ADD CONSTRAINT IF NOT EXISTS fk_users_group
    FOREIGN KEY (group_id) REFERENCES user_groups(id) ON DELETE SET NULL;

-- ============================================================
-- RESET MOT DE PASSE
-- ============================================================
CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMP NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- FABRICANTS
-- ============================================================
CREATE TABLE IF NOT EXISTS "Fabricant" (
    "RefFabricant" SERIAL PRIMARY KEY,
    "NomFabricant" VARCHAR(200) NOT NULL,
    "Domaine"      VARCHAR(200) DEFAULT '',
    "NomContact"   VARCHAR(200) DEFAULT '',
    "TitreContact" VARCHAR(200) DEFAULT '',
    "Email"        VARCHAR(200) DEFAULT ''
);

-- ============================================================
-- FOURNISSEURS
-- ============================================================
CREATE TABLE IF NOT EXISTS "Fournisseurs" (
    "RéfFournisseur" SERIAL PRIMARY KEY,
    "NomFournisseur" VARCHAR(200) NOT NULL,
    "Adresse"        TEXT DEFAULT '',
    "Ville"          VARCHAR(100) DEFAULT '',
    "CodePostal"     VARCHAR(20)  DEFAULT '',
    "Pays"           VARCHAR(100) DEFAULT '',
    "NuméroTél"      VARCHAR(50)  DEFAULT '',
    "Domaine"        VARCHAR(200) DEFAULT '',
    "Produit"        TEXT DEFAULT '',
    "Marque"         TEXT DEFAULT '',
    "NumSap"         VARCHAR(50)  DEFAULT ''
);

-- ============================================================
-- CONTACTS FOURNISSEURS
-- ============================================================
CREATE TABLE IF NOT EXISTS "Contact" (
    "RéfContact"      SERIAL PRIMARY KEY,
    "RéfFournisseur"  INTEGER NOT NULL REFERENCES "Fournisseurs"("RéfFournisseur") ON DELETE CASCADE,
    "Nom"             VARCHAR(200) DEFAULT '',
    "Titre"           VARCHAR(200) DEFAULT '',
    "Email"           VARCHAR(200) DEFAULT '',
    "Telephone"       VARCHAR(50)  DEFAULT '',
    "Cell"            VARCHAR(50)  DEFAULT ''
);

-- ============================================================
-- DÉPARTEMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS "Departement" (
    "RefDepartement" SERIAL PRIMARY KEY,
    "NomDepartement" VARCHAR(100) UNIQUE NOT NULL,
    "Description"    TEXT DEFAULT '',
    "Couleur"        VARCHAR(20) DEFAULT '#6366f1',
    "Created"        TIMESTAMP DEFAULT NOW(),
    "Modified"       TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- PIÈCES (table principale)
-- ============================================================
CREATE TABLE IF NOT EXISTS "Pièce" (
    "RéfPièce"                SERIAL PRIMARY KEY,
    "NomPièce"                VARCHAR(300) NOT NULL,
    "DescriptionPièce"        TEXT DEFAULT '',
    "NumPièce"                VARCHAR(200) DEFAULT '',
    "NumPièceAutreFournisseur" VARCHAR(200) DEFAULT '',
    "RefFabricant"            INTEGER REFERENCES "Fabricant"("RefFabricant") ON DELETE SET NULL,
    "Lieuentreposage"         VARCHAR(200) DEFAULT '',
    "QtéenInventaire"         INTEGER DEFAULT 0,
    "Qtéminimum"              INTEGER DEFAULT 0,
    "Qtémax"                  INTEGER DEFAULT 100,
    "Qtécommandée"            INTEGER DEFAULT 0,
    "Qtéreçue"                INTEGER DEFAULT 0,
    "Qtéarecevoir"            INTEGER DEFAULT 0,
    "Prix unitaire"           NUMERIC(10,2) DEFAULT 0,
    "Soumission LD"           TEXT DEFAULT '',
    "SoumDem"                 BOOLEAN DEFAULT FALSE,
    "Datecommande"            DATE,
    "Cmd_info"                TEXT DEFAULT '',
    "ImagePath"               VARCHAR(255),
    "NoFESTO"                 VARCHAR(100) DEFAULT '',
    "RTBS"                    INTEGER,
    "devise"                  VARCHAR(10) DEFAULT 'CAD',
    "statut"                  VARCHAR(50) DEFAULT 'actif',
    "Discontinué"             VARCHAR(10) DEFAULT '',
    "approbation_statut"      VARCHAR(50),
    "approbation_par"         VARCHAR(100),
    "approbation_date"        TIMESTAMP,
    "approbation_note"        TEXT,
    "demandeur"               VARCHAR(100),
    "RefDepartement"          INTEGER REFERENCES "Departement"("RefDepartement") ON DELETE SET NULL,
    "Created"                 TIMESTAMP DEFAULT NOW(),
    "Modified"                TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- LIAISON PIÈCE ↔ FOURNISSEUR (many-to-many)
-- ============================================================
CREATE TABLE IF NOT EXISTS "PieceFournisseur" (
    "id"                  SERIAL PRIMARY KEY,
    "RéfPièce"            INTEGER NOT NULL REFERENCES "Pièce"("RéfPièce") ON DELETE CASCADE,
    "RéfFournisseur"      INTEGER NOT NULL REFERENCES "Fournisseurs"("RéfFournisseur") ON DELETE CASCADE,
    "EstPrincipal"        BOOLEAN DEFAULT FALSE,
    "NumPièceFournisseur" VARCHAR(100) DEFAULT '',
    "PrixUnitaire"        NUMERIC(10,2) DEFAULT 0,
    "DelaiLivraison"      VARCHAR(100) DEFAULT '',
    "DateAjout"           TIMESTAMP DEFAULT NOW(),
    UNIQUE("RéfPièce", "RéfFournisseur")
);

-- ============================================================
-- HISTORIQUE DES MOUVEMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS "historique" (
    "id"          SERIAL PRIMARY KEY,
    "DateCMD"     DATE,
    "DateRecu"    TIMESTAMP,
    "Opération"   VARCHAR(100),
    "numpiece"    VARCHAR(200) DEFAULT '',
    "description" TEXT DEFAULT '',
    "qtécommande" VARCHAR(50),
    "QtéSortie"   VARCHAR(50),
    "nompiece"    VARCHAR(300) DEFAULT '',
    "RéfPièce"    NUMERIC,
    "User"        VARCHAR(100),
    "Delais"      NUMERIC
);

-- ============================================================
-- SOUMISSIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS "Soumissions" (
    "RefSoumission"       SERIAL PRIMARY KEY,
    "RéfFournisseur"      INTEGER REFERENCES "Fournisseurs"("RéfFournisseur") ON DELETE SET NULL,
    "EmailsDestinataires" TEXT DEFAULT '',
    "Sujet"               TEXT DEFAULT '',
    "MessageCorps"        TEXT DEFAULT '',
    "Pieces"              JSONB DEFAULT '[]',
    "User"                VARCHAR(100) DEFAULT 'Système',
    "Notes"               TEXT DEFAULT '',
    "Statut"              VARCHAR(50) DEFAULT 'Envoyée',
    "DateEnvoi"           TIMESTAMP DEFAULT NOW(),
    "DateReponse"         TIMESTAMP,
    "DateRappel"          TIMESTAMP,
    "NoteStatut"          TEXT DEFAULT '',
    "PieceJointe"         VARCHAR(255),
    "Created"             TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "SoumissionPrix" (
    "id"             SERIAL PRIMARY KEY,
    "RefSoumission"  INTEGER NOT NULL REFERENCES "Soumissions"("RefSoumission") ON DELETE CASCADE,
    "RéfPièce"       INTEGER NOT NULL,
    "PrixUnitaire"   NUMERIC(10,2) NOT NULL,
    "DelaiLivraison" VARCHAR(100) DEFAULT '',
    "Commentaire"    TEXT DEFAULT '',
    "DateSaisie"     TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- GROUPES DE PIÈCES (entretiens)
-- ============================================================
CREATE TABLE IF NOT EXISTS "Categorie" (
    "RefCategorie" SERIAL PRIMARY KEY,
    "NomCategorie" VARCHAR(100) NOT NULL,
    "Description"  TEXT DEFAULT '',
    "Created"      TIMESTAMP DEFAULT NOW(),
    "Modified"     TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "Groupe" (
    "RefGroupe"    SERIAL PRIMARY KEY,
    "RefCategorie" INTEGER NOT NULL REFERENCES "Categorie"("RefCategorie") ON DELETE CASCADE,
    "NomGroupe"    VARCHAR(100) NOT NULL,
    "Description"  TEXT DEFAULT '',
    "Created"      TIMESTAMP DEFAULT NOW(),
    "Modified"     TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "GroupePiece" (
    "id"        SERIAL PRIMARY KEY,
    "RefGroupe" INTEGER NOT NULL REFERENCES "Groupe"("RefGroupe") ON DELETE CASCADE,
    "RéfPièce"  INTEGER NOT NULL REFERENCES "Pièce"("RéfPièce") ON DELETE CASCADE,
    "Quantite"  INTEGER DEFAULT 1,
    "Ordre"     INTEGER,
    UNIQUE("RefGroupe", "RéfPièce")
);

-- ============================================================
-- GROUPES DE PERMISSIONS PAR DÉFAUT
-- ============================================================
INSERT INTO user_groups (name, description, permissions) VALUES
(
    'admin',
    'Administrateur complet',
    '{"inventaire_view":true,"inventaire_create":true,"inventaire_update":true,"inventaire_delete":true,"inventaire_sortie_rapide":true,"groupes_view":true,"groupes_create":true,"groupes_update":true,"groupes_delete":true,"fournisseur_view":true,"fournisseur_create":true,"fournisseur_update":true,"fournisseur_delete":true,"fabricant_view":true,"fabricant_create":true,"fabricant_update":true,"fabricant_delete":true,"commandes_view":true,"commandes_create":true,"commandes_update":true,"soumissions_view":true,"soumissions_create":true,"soumissions_update":true,"receptions_view":true,"receptions_create":true,"receptions_update":true,"historique_view":true,"can_delete_any":true,"can_manage_users":true,"can_approve_orders":true,"can_submit_approval":true,"debug_access":true}'
),
(
    'acheteur',
    'Acheteur — peut commander et soumettre',
    '{"inventaire_view":true,"inventaire_create":true,"inventaire_update":true,"inventaire_sortie_rapide":true,"groupes_view":true,"fournisseur_view":true,"fabricant_view":true,"commandes_view":true,"commandes_create":true,"soumissions_view":true,"soumissions_create":true,"receptions_view":true,"historique_view":true,"can_submit_approval":true}'
),
(
    'user',
    'Utilisateur standard — lecture et sorties',
    '{"inventaire_view":true,"inventaire_sortie_rapide":true,"groupes_view":true,"fournisseur_view":true,"fabricant_view":true,"historique_view":true}'
)
ON CONFLICT (name) DO NOTHING;
"""


# ─── Helpers ──────────────────────────────────────────────────

def ask(prompt: str, default: str = "") -> str:
    """Demande une valeur avec valeur par défaut."""
    display = f" [{default}]" if default else ""
    raw = input(f"{prompt}{display} : ").strip()
    return raw if raw else default


def ask_password(prompt: str, default: str = "") -> str:
    """Demande un mot de passe (affiché en clair ici pour setup)."""
    display = f" [par défaut: {default}]" if default else ""
    raw = input(f"{prompt}{display} : ").strip()
    return raw if raw else default


def section(title: str):
    print(f"\n{'─' * 60}")
    print(f"  {title}")
    print(f"{'─' * 60}")


# ─── Étape 1 : Collecter la config et créer .env ─────────────

def load_existing_env() -> dict:
    """
    Charge les valeurs déjà présentes dans le .env et les retourne
    sous forme de dict.  Retourne {} si le fichier n'existe pas.
    """
    if not ENV_FILE.exists():
        return {}
    load_dotenv(ENV_FILE, override=False)   # ne pollue pas os.environ si déjà set
    # On relit directement le fichier pour avoir les valeurs brutes
    existing = {}
    for line in ENV_FILE.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, val = line.partition("=")
        existing[key.strip()] = val.strip().strip('"').strip("'")
    return existing


def collect_config() -> dict:
    # ── Charger les valeurs existantes pour s'en servir comme défauts ──
    existing = load_existing_env()

    if existing:
        print("\n💡 Un fichier .env existant a été détecté.")
        print("   Appuyez sur Entrée pour conserver chaque valeur actuelle.\n")
    else:
        print("\nEntrez les paramètres de connexion à PostgreSQL.")
        print("(Appuyez sur Entrée pour utiliser la valeur par défaut)\n")

    def e(key: str, fallback: str = "") -> str:
        """Retourne la valeur existante du .env, sinon le fallback fourni."""
        return existing.get(key, fallback)

    section("📋 CONFIGURATION POSTGRESQL")
    cfg = {
        "POSTGRES_HOST":     ask("Hôte PostgreSQL",           e("POSTGRES_HOST",     "localhost")),
        "POSTGRES_PORT":     ask("Port PostgreSQL",            e("POSTGRES_PORT",     "5432")),
        "POSTGRES_USER":     ask("Utilisateur PostgreSQL",     e("POSTGRES_USER",     "")),
        "POSTGRES_PASSWORD": ask_password("Mot de passe PostgreSQL", e("POSTGRES_PASSWORD", "")),
        "POSTGRES_DB":       ask("Nom de la base de données",  e("POSTGRES_DB",       "InvRobot")),
    }

    section("🌐 CONFIGURATION CORS / APP")
    cfg["CORS_ORIGINS"] = ask(
        "Origines CORS autorisées (séparées par virgule)",
        e("CORS_ORIGINS", "http://localhost:5173,http://localhost:3000")
    )
    cfg["APP_URL"] = ask(
        "URL publique de l'app (pour les emails)",
        e("APP_URL", "http://localhost:5173")
    )

    section("📧 CONFIGURATION SMTP (optionnel — laisser vide pour désactiver)")
    cfg["SMTP_HOST"]     = ask("Hôte SMTP",                            e("SMTP_HOST",     "localhost"))
    cfg["SMTP_PORT"]     = ask("Port SMTP",                             e("SMTP_PORT",     "25"))
    cfg["SMTP_FROM"]     = ask("Email expéditeur",                      e("SMTP_FROM",     "noreply@votre-entreprise.com"))
    cfg["SMTP_USER"]     = ask("Utilisateur SMTP (vide si sans auth)",  e("SMTP_USER",     ""))
    cfg["SMTP_PASSWORD"] = ask_password("Mot de passe SMTP (vide si sans auth)", e("SMTP_PASSWORD", ""))
    cfg["SMTP_TLS"]      = ask("STARTTLS ? (true/false)",               e("SMTP_TLS",      "false"))
    cfg["SMTP_SSL"]      = ask("SSL direct port 465 ? (true/false)",    e("SMTP_SSL",      "false"))

    section("🔑 CLÉ JWT")
    current_jwt = e("JWT_SECRET_KEY", "")
    if current_jwt and current_jwt != "your-secret-key-change-in-production":
        print(f"✅ Clé JWT existante conservée ({current_jwt[:16]}...)")
        regen = ask("Régénérer une nouvelle clé ? (o/N)", "N").lower()
        cfg["JWT_SECRET_KEY"] = secrets.token_urlsafe(32) if regen == "o" else current_jwt
    else:
        cfg["JWT_SECRET_KEY"] = secrets.token_urlsafe(32)
        print("✅ Nouvelle clé JWT générée.")

    return cfg


def write_env(cfg: dict):
    """Écrit toutes les variables dans le fichier .env"""
    # Créer le fichier s'il n'existe pas
    ENV_FILE.touch(exist_ok=True)

    for key, value in cfg.items():
        set_key(str(ENV_FILE), key, value)

    print(f"\n✅ Fichier .env créé/mis à jour : {ENV_FILE}")


# ─── Étape 2 : Créer la base de données ──────────────────────

async def create_database_if_needed(cfg: dict):
    """
    Se connecte à la DB 'postgres' par défaut et crée la DB cible
    si elle n'existe pas encore.
    """
    db_name = cfg["POSTGRES_DB"]
    admin_url = (
        f"postgresql://{cfg['POSTGRES_USER']}:{cfg['POSTGRES_PASSWORD']}"
        f"@{cfg['POSTGRES_HOST']}:{cfg['POSTGRES_PORT']}/postgres"
    )

    try:
        conn = await asyncpg.connect(admin_url)
        exists = await conn.fetchval(
            "SELECT 1 FROM pg_database WHERE datname = $1", db_name
        )
        if not exists:
            # Pas de paramètre pour CREATE DATABASE, on formate manuellement
            await conn.execute(f'CREATE DATABASE "{db_name}"')
            print(f"✅ Base de données '{db_name}' créée.")
        else:
            print(f"ℹ️  Base de données '{db_name}' existe déjà.")
        await conn.close()
    except Exception as e:
        print(f"⚠️  Impossible de créer la DB automatiquement : {e}")
        print("    Créez-la manuellement puis relancez ce script.")
        raise


async def apply_schema(cfg: dict):
    """Applique le schéma SQL sur la base cible."""
    db_url = (
        f"postgresql://{cfg['POSTGRES_USER']}:{cfg['POSTGRES_PASSWORD']}"
        f"@{cfg['POSTGRES_HOST']}:{cfg['POSTGRES_PORT']}/{cfg['POSTGRES_DB']}"
    )

    print("\n📦 Application du schéma SQL...")
    conn = await asyncpg.connect(db_url)

    # Découper sur les instructions (séparateur : point-virgule en fin de ligne seule)
    # asyncpg n'accepte qu'une instruction à la fois → on split
    statements = [s.strip() for s in SQL_SCHEMA.split(";") if s.strip()]

    ok = 0
    errors = []
    for stmt in statements:
        try:
            await conn.execute(stmt)
            ok += 1
        except Exception as e:
            errors.append((stmt[:60].replace("\n", " "), str(e)))

    await conn.close()

    print(f"✅ {ok}/{len(statements)} instructions appliquées.")
    if errors:
        print(f"⚠️  {len(errors)} instruction(s) ignorée(s) (probablement déjà existantes) :")
        for stmt_preview, err in errors[:5]:
            print(f"   • {stmt_preview}… → {err}")


# ─── Étape 3 : Créer l'utilisateur admin ─────────────────────

async def create_admin(cfg: dict, username: str, password: str):
    db_url = (
        f"postgresql://{cfg['POSTGRES_USER']}:{cfg['POSTGRES_PASSWORD']}"
        f"@{cfg['POSTGRES_HOST']}:{cfg['POSTGRES_PORT']}/{cfg['POSTGRES_DB']}"
    )

    conn = await asyncpg.connect(db_url)

    # Récupérer le group_id du groupe 'admin'
    admin_group = await conn.fetchrow(
        "SELECT id FROM user_groups WHERE name = 'admin'"
    )
    group_id = admin_group["id"] if admin_group else None

    existing = await conn.fetchrow(
        "SELECT id FROM users WHERE username = $1", username
    )

    pw_hash = hash_password(password)

    if existing:
        reset = ask(
            f"\n⚠️  L'utilisateur '{username}' existe déjà. Réinitialiser le mot de passe ? (o/N)",
            "N"
        ).lower()
        if reset == "o":
            await conn.execute(
                "UPDATE users SET password_hash = $1, role = 'admin', group_id = $2 WHERE username = $3",
                pw_hash, group_id, username
            )
            print(f"✅ Mot de passe de '{username}' mis à jour.")
        else:
            print("   Aucune modification effectuée.")
    else:
        user_id = uuid.uuid4()
        await conn.execute(
            """INSERT INTO users (id, username, password_hash, role, group_id, created_at)
               VALUES ($1, $2, $3, 'admin', $4, NOW())""",
            user_id, username, pw_hash, group_id
        )
        print(f"✅ Utilisateur admin '{username}' créé (id: {user_id}).")

    await conn.close()


# ─── Main ─────────────────────────────────────────────────────

async def main():
    print(BANNER)

    # ── 1. Config & .env ──────────────────────────────────────
    cfg = collect_config()
    write_env(cfg)

    # ── 2. Connexion test ─────────────────────────────────────
    section("🔌 TEST DE CONNEXION")
    try:
        await create_database_if_needed(cfg)
    except Exception:
        print("\n❌ Arrêt — corrigez la connexion PostgreSQL et relancez.")
        sys.exit(1)

    # ── 3. Schéma SQL ─────────────────────────────────────────
    section("🗄️  CRÉATION DES TABLES")
    try:
        await apply_schema(cfg)
    except Exception as e:
        print(f"❌ Erreur lors de l'application du schéma : {e}")
        sys.exit(1)

    # ── 4. Utilisateur admin ──────────────────────────────────
    section("👤 CRÉATION DE L'ADMINISTRATEUR")
    admin_username = ask("Nom d'utilisateur admin", "admin")
    admin_password = ask_password(
        "Mot de passe admin (min. 8 caractères)",
        "Admin123!"
    )
    if len(admin_password) < 8:
        print("⚠️  Mot de passe trop court, utilisation de 'Admin123!' par défaut.")
        admin_password = "Admin123!"

    try:
        await create_admin(cfg, admin_username, admin_password)
    except Exception as e:
        print(f"❌ Erreur création admin : {e}")
        sys.exit(1)

    # ── 5. Dossiers uploads ───────────────────────────────────
    section("📁 CRÉATION DES DOSSIERS")
    backend_dir = ROOT_DIR / "backend"
    dirs_to_create = [
        backend_dir / "uploads" / "pieces",
        backend_dir / "uploads" / "soumissions",
        backend_dir / "static",          # pour le placeholder image
    ]
    for d in dirs_to_create:
        d.mkdir(parents=True, exist_ok=True)
        print(f"✅ {d.relative_to(ROOT_DIR)}")

    # ── 6. Résumé ─────────────────────────────────────────────
    section("✅ INSTALLATION TERMINÉE — RÉSUMÉ")
    print(f"""
  Base de données : {cfg['POSTGRES_DB']} @ {cfg['POSTGRES_HOST']}:{cfg['POSTGRES_PORT']}
  Administrateur  : {admin_username}
  Fichier .env    : {ENV_FILE}

  👉 Pour démarrer le serveur :
       cd backend && python InvRobot.py

  👉 Pour démarrer le frontend (dev) :
       cd frontend && npm run dev

  🔐 Connexion :
       POST /api/auth/login
       {{ "username": "{admin_username}", "password": "..." }}
""")


if __name__ == "__main__":
    asyncio.run(main())