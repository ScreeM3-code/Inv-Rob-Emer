"""
Serveur FastAPI principal - Version modulaire
"""
import sys
import io
import logging
import multiprocessing
import os
from pathlib import Path
#from auth import create_access_token, verify_password, USERS_DB, require_auth
from pydantic import BaseModel

# Patch pour éviter l'erreur NoneType avec auto-py-to-exe
if sys.stdout is None:
    sys.stdout = io.StringIO()
if sys.stderr is None:
    sys.stderr = io.StringIO()

import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, HTMLResponse

# Imports locaux
from config import CORS_ORIGINS, BUILD_DIR
from database import lifespan
from routes import (
    pieces_router,
    piece_images_router,
    fournisseurs_router,
    fabricants_router,
    commandes_router,
    historique_router,
    groupes_router,
    soumissions_router,
    uploads_router
)

# backend/InvRobot.py - AJOUTE après les imports

from fastapi import Request, HTTPException
from config import is_user_authorized
import os

@app.middleware("http")
async def auth_middleware(request: Request, call_next):
    """Vérifie que l'utilisateur Windows est autorisé"""
    
    # Ignorer les fichiers statiques et assets
    if not request.url.path.startswith("/api/"):
        return await call_next(request)
    
    # Route publique (optionnel)
    if request.url.path == "/api/current-user":
        return await call_next(request)
    
    # Récupérer l'utilisateur Windows
    username = os.getenv("USERNAME") or os.getenv("USER") or "unknown"
    
    # Vérifier si autorisé
    user_info = is_user_authorized(username)
    if not user_info:
        raise HTTPException(
            status_code=403, 
            detail=f"Accès refusé. Utilisateur '{username}' non autorisé. Contactez l'administrateur."
        )
    
    # Ajouter l'info utilisateur à la requête (accessible dans les routes)
    request.state.user = user_info
    
    response = await call_next(request)
    return response

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    filename="InvRob.log",
    filemode="w"
)

logger = logging.getLogger("Inventaire-Robot")

# Création de l'application FastAPI
app = FastAPI(
    title="Inventaires Robot",
    version="2.0.0",
    lifespan=lifespan
)

# Middleware CORS
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=CORS_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routes utilitaires
# backend/InvRobot.py - REMPLACE la route existante

@app.get("/api/current-user")
def get_current_user():
    """Retourne l'utilisateur Windows actuel + rôle"""
    username = os.getenv("USERNAME") or os.getenv("USER") or "unknown"
    user_info = is_user_authorized(username)
    
    if not user_info:
        return {
            "user": username,
            "authorized": False,
            "role": None,
            "message": "Utilisateur non autorisé"
        }
    
    return {
        "user": username,
        "authorized": True,
        "role": user_info["role"],
        "nom_complet": user_info["nom_complet"]
    }

# Inclusion des routers
app.include_router(pieces_router, prefix="/api")
app.include_router(fournisseurs_router, prefix="/api")
app.include_router(fabricants_router, prefix="/api")
app.include_router(commandes_router, prefix="/api")
app.include_router(historique_router, prefix="/api")
app.include_router(groupes_router, prefix="/api")
app.include_router(soumissions_router, prefix="/api")
app.include_router(piece_images_router, prefix="/api")
app.include_router(uploads_router, prefix="/api")

# Configuration du frontend (si build existe)
if BUILD_DIR.exists():
    # 1. Servir les assets (CSS, JS, images)
    assets_dir = BUILD_DIR / "assets"
    if assets_dir.exists():
        app.mount("/assets", StaticFiles(directory=str(assets_dir)), name="assets")
        logger.info("✅ Assets montés depuis /assets")

    # 2. Route racine
    @app.get("/", response_class=FileResponse, include_in_schema=False)
    async def serve_root():
        index_file = BUILD_DIR / "index.html"
        if index_file.exists():
            return FileResponse(index_file)
        return HTMLResponse("<h1>Build not found</h1>", status_code=404)

    # 3. CATCH-ALL - DOIT ÊTRE LA DERNIÈRE ROUTE
    @app.get("/{full_path:path}", response_class=FileResponse, include_in_schema=False)
    async def serve_spa(full_path: str):
        # Vérifier explicitement si c'est une route API
        if full_path.startswith("api/"):
            return HTMLResponse("<h1>API route not found</h1>", status_code=404)

        # Essayer de servir un fichier statique s'il existe
        file_path = BUILD_DIR / full_path
        if file_path.exists() and file_path.is_file():
            return FileResponse(file_path)

        # Sinon servir index.html pour React Router
        index_file = BUILD_DIR / "index.html"
        if index_file.exists():
            return FileResponse(index_file)

        return HTMLResponse("<h1>Page not found</h1>", status_code=404)
    
    logger.info("✅ Frontend SPA configuré")
else:
    logger.warning("⚠️ Dossier 'build' introuvable. Lancez 'yarn build' d'abord.")


if __name__ == "__main__":
    multiprocessing.freeze_support()

    is_frozen = getattr(sys, 'frozen', False)
    is_dev = "--dev" in sys.argv and not is_frozen

    if is_dev:
        logger.info("🔧 Mode développement activé (avec reload)")
        uvicorn.run("server:app", host="0.0.0.0", port=8000, reload=True)
    else:
        logger.info("🚀 Mode production")
        uvicorn.run(app, host="0.0.0.0", port=8000, log_config=None, access_log=False)


# backend/InvRobot.py - AJOUTE une fonction helper

def require_admin(request: Request):
    """Vérifie que l'utilisateur est admin"""
    user = getattr(request.state, 'user', None)
    if not user or user.get('role') != 'admin':
        raise HTTPException(
            status_code=403,
            detail="Action réservée aux administrateurs"
        )
    return user

#@app.delete("/api/pieces/{piece_id}")
#async def delete_piece(piece_id: int, request: Request, conn: asyncpg.Connection = Depends(get_db_connection)):
    # Vérifier que c'est un admin
 #   require_admin(request)