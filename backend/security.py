"""
Script de configuration de la sécurité et création de l'admin
À exécuter UNE SEULE FOIS lors de l'installation
"""
import secrets
import uuid
import asyncio
import asyncpg
from pathlib import Path
from dotenv import load_dotenv, set_key
import os
from passlib.context import CryptContext

# Chargement de l'environnement
ROOT_DIR = Path(__file__).parent
ENV_FILE = ROOT_DIR / '.env'
load_dotenv(ENV_FILE)

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def generate_secret_key():
    """Génère une clé secrète sécurisée pour JWT"""
    return secrets.token_urlsafe(32)


def hash_password(password: str) -> str:
    """Hash un mot de passe"""
    return pwd_context.hash(password)


async def create_admin_user(username: str, password: str, initiales: str = "ADM"):
    """Crée l'utilisateur admin dans PostgreSQL"""

    # Construction de l'URL de connexion
    postgres_host = os.environ.get('POSTGRES_HOST', 'localhost')
    postgres_port = os.environ.get('POSTGRES_PORT', '5432')
    postgres_user = os.environ.get('POSTGRES_USER')
    postgres_password = os.environ.get('POSTGRES_PASSWORD')
    postgres_db = os.environ.get('POSTGRES_DB')

    database_url = f"postgresql://{postgres_user}:{postgres_password}@{postgres_host}:{postgres_port}/{postgres_db}"

    print(f"\n🔌 Connexion à PostgreSQL...")
    print(f"   Host: {postgres_host}:{postgres_port}")
    print(f"   Database: {postgres_db}")

    try:
        # Connexion à la base de données
        conn = await asyncpg.connect(database_url)
        print(f"✅ Connexion réussie!")

        # Vérifier si l'admin existe déjà
        existing = await conn.fetchrow(
            "SELECT id, username FROM users WHERE username = $1",
            username
        )

        if existing:
            print(f"\n⚠️  L'utilisateur '{username}' existe déjà!")
            print(f"   ID: {existing['id']}")

            response = input("\n❓ Voulez-vous réinitialiser son mot de passe? (o/N): ")
            if response.lower() == 'o':
                password_hash = hash_password(password)
                await conn.execute(
                    "UPDATE users SET password_hash = $1 WHERE username = $2",
                    password_hash, username
                )
                print(f"✅ Mot de passe mis à jour pour '{username}'")
            else:
                print(f"❌ Opération annulée")
        else:
            # Créer l'utilisateur admin
            user_id = uuid.uuid4()
            password_hash = hash_password(password)

            await conn.execute(
                """INSERT INTO users (id, username, password_hash, role, created_at)
                   VALUES ($1, $2, $3, $4, NOW())""",
                user_id,
                username,
                password_hash,
                "admin"
            )

            print(f"\n✅ Utilisateur admin créé avec succès!")
            print(f"   ID: {user_id}")
            print(f"   Username: {username}")
            print(f"   Role: admin")
            print(f"   Initiales: {initiales}")

        await conn.close()

    except Exception as e:
        print(f"\n❌ Erreur lors de la création de l'admin: {e}")
        raise


def setup_jwt_secret():
    """Configure la clé secrète JWT dans le fichier .env"""

    print("\n🔑 Configuration de la clé secrète JWT...")

    # Vérifier si une clé existe déjà
    existing_key = os.environ.get('JWT_SECRET_KEY')

    if existing_key and existing_key != 'your-secret-key-change-in-production':
        print(f"✅ Une clé JWT existe déjà")
        print(f"   Clé (premiers caractères): {existing_key[:20]}...")

        response = input("\n❓ Voulez-vous générer une nouvelle clé? (o/N): ")
        if response.lower() != 'o':
            print("   Clé existante conservée")
            return existing_key

    # Générer une nouvelle clé
    new_key = generate_secret_key()

    # Mettre à jour le fichier .env
    set_key(ENV_FILE, 'JWT_SECRET_KEY', new_key)

    print(f"✅ Nouvelle clé JWT générée et sauvegardée dans .env")
    print(f"   Clé (premiers caractères): {new_key[:20]}...")

    return new_key


def verify_env_file():
    """Vérifie que le fichier .env contient toutes les variables nécessaires"""

    print("\n📋 Vérification du fichier .env...")

    required_vars = [
        'POSTGRES_HOST',
        'POSTGRES_PORT',
        'POSTGRES_USER',
        'POSTGRES_PASSWORD',
        'POSTGRES_DB',
        'JWT_SECRET_KEY',
        'CORS_ORIGINS'
    ]

    missing_vars = []
    for var in required_vars:
        value = os.environ.get(var)
        if not value:
            missing_vars.append(var)
            print(f"   ❌ {var}: MANQUANT")
        else:
            # Masquer les valeurs sensibles
            if 'PASSWORD' in var or 'SECRET' in var:
                display_value = value[:5] + "..." if len(value) > 5 else "***"
            else:
                display_value = value
            print(f"   ✅ {var}: {display_value}")

    if missing_vars:
        print(f"\n⚠️  Variables manquantes: {', '.join(missing_vars)}")
        print(f"   Veuillez les ajouter dans le fichier .env")
        return False

    print(f"\n✅ Toutes les variables d'environnement sont configurées!")
    return True


async def test_database_connection():
    """Teste la connexion à la base de données"""

    print("\n🧪 Test de connexion à la base de données...")

    postgres_host = os.environ.get('POSTGRES_HOST')
    postgres_port = os.environ.get('POSTGRES_PORT')
    postgres_user = os.environ.get('POSTGRES_USER')
    postgres_password = os.environ.get('POSTGRES_PASSWORD')
    postgres_db = os.environ.get('POSTGRES_DB')

    database_url = f"postgresql://{postgres_user}:{postgres_password}@{postgres_host}:{postgres_port}/{postgres_db}"

    try:
        conn = await asyncpg.connect(database_url)

        # Test: compter les utilisateurs
        count = await conn.fetchval("SELECT COUNT(*) FROM users")
        print(f"✅ Connexion réussie! {count} utilisateur(s) trouvé(s)")

        await conn.close()
        return True

    except Exception as e:
        print(f"❌ Erreur de connexion: {e}")
        return False


async def main():
    """Fonction principale de configuration"""

    print("=" * 60)
    print("🔐 CONFIGURATION SÉCURITÉ & CRÉATION ADMIN")
    print("=" * 60)

    # Étape 1: Vérifier le fichier .env
    if not verify_env_file():
        print("\n❌ Configuration .env incomplète. Veuillez corriger avant de continuer.")
        return

    # Étape 2: Tester la connexion
    if not await test_database_connection():
        print("\n❌ Impossible de se connecter à la base de données. Vérifiez vos paramètres.")
        return

    # Étape 3: Configurer la clé JWT
    jwt_key = setup_jwt_secret()

    # Étape 4: Créer l'utilisateur admin
    print("\n" + "=" * 60)
    print("👤 CRÉATION UTILISATEUR ADMIN")
    print("=" * 60)

    # Demander les informations admin
    default_username = "admin"
    username = input(f"\n📝 Username admin (défaut: {default_username}): ").strip()
    if not username:
        username = default_username

    default_password = "Admin123!"
    password = input(f"🔒 Mot de passe (défaut: {default_password}): ").strip()
    if not password:
        password = default_password
        print(f"   ⚠️  Utilisation du mot de passe par défaut. CHANGEZ-LE après la première connexion!")

    default_initiales = "ADM"
    initiales = input(f"✍️  Initiales (défaut: {default_initiales}): ").strip()
    if not initiales:
        initiales = default_initiales

    # Créer l'admin
    await create_admin_user(username, password, initiales)

    # Résumé final
    print("\n" + "=" * 60)
    print("✅ CONFIGURATION TERMINÉE!")
    print("=" * 60)
    print(f"\n📝 Informations de connexion:")
    print(f"   Username: {username}")
    print(f"   Password: {'[défaut]' if password == default_password else '[personnalisé]'}")
    print(f"   Role: admin")
    print(f"\n🚀 Vous pouvez maintenant démarrer le serveur:")
    print(f"   python server_pgsql.py")
    print(f"\n🔐 Pour vous connecter:")
    print(f"   POST http://localhost:8001/api/auth/login")
    print(f"   Body: {{'username': '{username}', 'password': '...' }}")
    print("\n" + "=" * 60)


if __name__ == "__main__":
    asyncio.run(main())