"""Configuration centralisée de l'application"""
import os
import sys
from pathlib import Path
from dotenv import load_dotenv

def get_base_path():
    """
    Retourne le chemin de base correct selon l'environnement:
    - En développement: dossier du script
    - Avec PyInstaller: dossier de l'exécutable
    """
    if getattr(sys, 'frozen', False):
        base = Path(sys.executable).parent
        print(f"🔧 Mode PyInstaller détecté")
        print(f"📂 Chemin exe: {sys.executable}")
        print(f"📂 Base directory: {base}")
        return base
    else:
        return Path(__file__).parent

# Chemins de base
BASE_DIR = get_base_path()
BUILD_DIR = BASE_DIR / "build"
ENV_FILE = BASE_DIR / ".env"
INI_FILE = BASE_DIR / "secteurs.ini"

# Charger les variables d'environnement
load_dotenv(ENV_FILE)

# Configuration PostgreSQL
POSTGRES_HOST = os.environ['POSTGRES_HOST']
POSTGRES_PORT = os.environ.get('POSTGRES_PORT', '5432')
POSTGRES_USER = os.environ['POSTGRES_USER']
POSTGRES_PASSWORD = os.environ['POSTGRES_PASSWORD']
POSTGRES_DB = os.environ['POSTGRES_DB']

DATABASE_URL = f"postgresql://{POSTGRES_USER}:{POSTGRES_PASSWORD}@{POSTGRES_HOST}:{POSTGRES_PORT}/{POSTGRES_DB}"

# Configuration CORS
CORS_ORIGINS = os.environ.get('CORS_ORIGINS', '*').split(',')
GOOGLE_API_KEY = os.environ.get('GOOGLE_API_KEY', '')
GOOGLE_CSE_ID = os.environ.get('GOOGLE_CSE_ID', '')

# Debug paths
print(f"=" * 50)
print(f"📍 Base directory: {BASE_DIR}")
print(f"📍 Build directory: {BUILD_DIR}")
print(f"📍 Build exists? {BUILD_DIR.exists()}")
if BUILD_DIR.exists():
    print(f"✅ Dossier 'build' trouvé!")
    print(f"📁 Contenu du dossier build:")
    for item in BUILD_DIR.iterdir():
        print(f"  - {item.name}")
else:
    print(f"❌ Dossier 'build' INTROUVABLE")
print(f"=" * 50)