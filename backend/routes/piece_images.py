"""Routes pour la gestion des images de pièces"""
import os
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import FileResponse
import asyncpg
from typing import Optional

from database import get_db_connection
from config import BASE_DIR

router = APIRouter(prefix="/pieces", tags=["piece-images"])

# Créer le dossier uploads si inexistant
UPLOADS_DIR = BASE_DIR / "uploads" / "pieces"
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)

# Image placeholder par défaut
PLACEHOLDER_PATH = BASE_DIR / "static" / "placeholder_piece.png"


@router.post("/{piece_id}/upload-image")
async def upload_piece_image(
        piece_id: int,
        file: UploadFile = File(...),
        conn: asyncpg.Connection = Depends(get_db_connection)
):
    """Upload manuel d'une image pour une pièce"""

    # Vérifier que la pièce existe
    piece = await conn.fetchrow(
        'SELECT "RéfPièce" FROM "Pièce" WHERE "RéfPièce" = $1',
        piece_id
    )
    if not piece:
        raise HTTPException(status_code=404, detail="Pièce non trouvée")

    # Valider le type de fichier
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Le fichier doit être une image")

    # Créer un nom de fichier unique
    ext = file.filename.split(".")[-1] if "." in file.filename else "jpg"
    filename = f"piece_{piece_id}.{ext}"
    filepath = UPLOADS_DIR / filename

    # Sauvegarder le fichier
    with open(filepath, "wb") as f:
        content = await file.read()
        f.write(content)

    # Mettre à jour la DB avec le chemin de l'image
    await conn.execute(
        '''UPDATE "Pièce" 
           SET "ImagePath" = $1, "Modified" = NOW()
           WHERE "RéfPièce" = $2''',
        str(filename),
        piece_id
    )

    return {
        "message": "Image uploadée avec succès",
        "filename": filename,
        "url": f"/api/pieces/{piece_id}/image"
    }


@router.get("/{piece_id}/image")
async def get_piece_image(
        piece_id: int,
        conn: asyncpg.Connection = Depends(get_db_connection)
):
    """
    Récupère l'image d'une pièce avec système de fallback intelligent:
    1. Image locale uploadée
    2. Recherche via NumPièceAutreFournisseur (Google Images)
    3. Recherche via NoFESTO (Google Images)
    4. Image placeholder
    """

    # 1. Chercher l'image locale
    piece = await conn.fetchrow(
        '''SELECT "ImagePath", "NumPièceAutreFournisseur", "NoFESTO", "RefFabricant" 
           FROM "Pièce" WHERE "RéfPièce" = $1''',
        piece_id
    )

    if not piece:
        raise HTTPException(status_code=404, detail="Pièce non trouvée")

    # Si image locale existe
    if piece["ImagePath"]:
        filepath = UPLOADS_DIR / piece["ImagePath"]
        if filepath.exists():
            return FileResponse(filepath)

    # 2. Sinon, retourner image placeholder
    # (La recherche externe sera gérée côté frontend pour plus de flexibilité)
    if PLACEHOLDER_PATH.exists():
        return FileResponse(PLACEHOLDER_PATH)

    raise HTTPException(status_code=404, detail="Aucune image disponible")


@router.delete("/{piece_id}/image")
async def delete_piece_image(
        piece_id: int,
        conn: asyncpg.Connection = Depends(get_db_connection)
):
    """Supprime l'image d'une pièce"""

    piece = await conn.fetchrow(
        'SELECT "ImagePath" FROM "Pièce" WHERE "RéfPièce" = $1',
        piece_id
    )

    if not piece:
        raise HTTPException(status_code=404, detail="Pièce non trouvée")

    if piece["ImagePath"]:
        filepath = UPLOADS_DIR / piece["ImagePath"]
        if filepath.exists():
            os.remove(filepath)

    await conn.execute(
        'UPDATE "Pièce" SET "ImagePath" = NULL, "Modified" = NOW() WHERE "RéfPièce" = $1',
        piece_id
    )

    return {"message": "Image supprimée"}


@router.get("/{piece_id}/search-urls")
async def get_search_urls(
        piece_id: int,
        conn: asyncpg.Connection = Depends(get_db_connection)
):
    """
    Retourne les URLs de recherche Google Images pour cette pièce
    Utilisé par le frontend pour afficher des suggestions
    """

    piece = await conn.fetchrow(
        '''SELECT p."NumPièceAutreFournisseur", p."NoFESTO", p."NomPièce",
                  f."NomFabricant", s."NomFournisseur"
           FROM "Pièce" p
           LEFT JOIN "Fabricant" f ON p."RefFabricant" = f."RefFabricant"
           LEFT JOIN "Fournisseurs" s ON p."RéfFournisseur" = s."RéfFournisseur"
           WHERE p."RéfPièce" = $1''',
        piece_id
    )

    if not piece:
        raise HTTPException(status_code=404, detail="Pièce non trouvée")

    search_urls = []

    # Priorité 1: NumPièceAutreFournisseur + Fournisseur
    if piece["NumPièceAutreFournisseur"]:
        search_term = piece["NumPièceAutreFournisseur"]
        if piece["NomFournisseur"]:
            search_term = f"{piece['NomFournisseur']} {search_term}"
        search_urls.append({
            "label": f"Recherche: {search_term}",
            "url": f"https://www.google.com/search?q={search_term.replace(' ', '+')}&tbm=isch"
        })

    # Priorité 2: NoFESTO
    if piece["NoFESTO"]:
        search_term = f"FESTO {piece['NoFESTO']}"
        search_urls.append({
            "label": f"Recherche: {search_term}",
            "url": f"https://www.google.com/search?q={search_term.replace(' ', '+')}&tbm=isch"
        })

    return {
        "piece_id": piece_id,
        "search_urls": search_urls
    }