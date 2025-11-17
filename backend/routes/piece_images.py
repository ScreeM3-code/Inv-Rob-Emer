"""Routes pour la gestion des images de pièces"""
import os
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import FileResponse
import asyncpg
from typing import Optional, List
from pydantic import BaseModel
from config import GOOGLE_API_KEY, GOOGLE_CSE_ID
import httpx
import aiofiles

from database import get_db_connection
from config import BASE_DIR

router = APIRouter(prefix="/pieces", tags=["piece-images"])

# Créer le dossier uploads si inexistant
UPLOADS_DIR = BASE_DIR / "uploads" / "pieces"
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)

# Image placeholder par défaut
PLACEHOLDER_PATH = BASE_DIR / "static" / "placeholder_piece.png"


class ImageUrlRequest(BaseModel):
    image_url: str


async def search_images_google(search_term: str, num_results: int = 5):
    """Recherche des images via Google Custom Search API"""

    if not GOOGLE_API_KEY or not GOOGLE_CSE_ID:
        print("⚠️ Google API non configurée")
        return []

    url = "https://www.googleapis.com/customsearch/v1"
    params = {
        "q": search_term,
        "cx": GOOGLE_CSE_ID,
        "key": GOOGLE_API_KEY,
        "searchType": "image",
        "imgSize": "medium",
        "num": num_results
    }

    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(url, params=params)
            response.raise_for_status()
            data = response.json()

            if data.get("items"):
                return [
                    {
                        "url": item["link"],
                        "thumbnail": item.get("image", {}).get("thumbnailLink", item["link"]),
                        "title": item.get("title", ""),
                        "source": item.get("displayLink", "")
                    }
                    for item in data["items"]
                ]

        except httpx.HTTPStatusError as e:
            if e.response.status_code == 429:
                print(f"⚠️ Quota Google API dépassé (429) - 100 requêtes/jour max")
            else:
                print(f"❌ Erreur API Google ({e.response.status_code}): {e}")
        except Exception as e:
            print(f"❌ Erreur recherche Google: {e}")

    return []


@router.get("/{piece_id}/search-candidates")
async def get_image_candidates(
        piece_id: int,
        conn: asyncpg.Connection = Depends(get_db_connection)
):
    """
    Recherche des images candidates pour une pièce
    Retourne une liste d'URLs d'images à valider
    """

    # Vérifier si image existe déjà
    piece = await conn.fetchrow(
        '''SELECT "ImagePath", "NumPièceAutreFournisseur", "NoFESTO", 
                  s."NomFournisseur"
           FROM "Pièce" p
           LEFT JOIN "Fournisseurs" s ON p."RéfFournisseur" = s."RéfFournisseur"
           WHERE p."RéfPièce" = $1''',
        piece_id
    )

    if not piece:
        raise HTTPException(status_code=404, detail="Pièce non trouvée")

    # Si image existe déjà, retourner info
    if piece["ImagePath"]:
        filepath = UPLOADS_DIR / piece["ImagePath"]
        if filepath.exists():
            return {
                "has_image": True,
                "current_image": f"/api/pieces/{piece_id}/image",
                "candidates": []
            }

    # Construire les termes de recherche
    search_term = None

    # Priorité 1: NumPièceAutreFournisseur + Fournisseur
    if piece["NumPièceAutreFournisseur"]:
        search_term = piece["NumPièceAutreFournisseur"]
        if piece["NomFournisseur"]:
            search_term = f"{piece['NomFournisseur']} {search_term}"

        results = await search_images_google(search_term, num_results=5)
        if results:
            return {
                "has_image": False,
                "search_term": search_term,
                "candidates": results
            }

    # Priorité 2: NoFESTO
    if piece["NoFESTO"]:
        search_term = f"FESTO {piece['NoFESTO']}"
        results = await search_images_google(search_term, num_results=5)
        if results:
            return {
                "has_image": False,
                "search_term": search_term,
                "candidates": results
            }

    # Aucun résultat trouvé (quota dépassé ou pas de numéro)
    fallback_urls = []

    if piece["NumPièceAutreFournisseur"]:
        term = piece["NumPièceAutreFournisseur"]
        if piece["NomFournisseur"]:
            term = f"{piece['NomFournisseur']} {term}"
        fallback_urls.append({
            "label": f"Ouvrir Google Images",
            "url": f"https://www.google.com/search?q={term.replace(' ', '+')}&tbm=isch"
        })

    if piece["NoFESTO"]:
        term = f"FESTO {piece['NoFESTO']}"
        fallback_urls.append({
            "label": f"Ouvrir Google Images (FESTO)",
            "url": f"https://www.google.com/search?q={term.replace(' ', '+')}&tbm=isch"
        })

    return {
        "has_image": False,
        "search_term": search_term,
        "candidates": [],
        "fallback_urls": fallback_urls
    }


@router.post("/{piece_id}/save-image-from-url")
async def save_image_from_url(
        piece_id: int,
        request: ImageUrlRequest,
        conn: asyncpg.Connection = Depends(get_db_connection)
):
    """
    Télécharge une image depuis une URL et la sauvegarde dans uploads/pieces/
    Exactement comme un upload manuel
    """

    # Vérifier que la pièce existe
    piece = await conn.fetchrow(
        'SELECT "RéfPièce" FROM "Pièce" WHERE "RéfPièce" = $1',
        piece_id
    )
    if not piece:
        raise HTTPException(status_code=404, detail="Pièce non trouvée")

    try:
        print(f"📥 Téléchargement image pour pièce {piece_id} depuis: {request.image_url}")

        # Télécharger l'image
        async with httpx.AsyncClient(timeout=30.0, follow_redirects=True, verify=False) as client:
            response = await client.get(request.image_url)
            response.raise_for_status()

            # Détecter l'extension depuis le Content-Type
            content_type = response.headers.get('content-type', '').lower()
            ext_map = {
                'image/jpeg': 'jpg',
                'image/jpg': 'jpg',
                'image/png': 'png',
                'image/gif': 'gif',
                'image/webp': 'webp'
            }
            ext = ext_map.get(content_type, 'jpg')

            # Créer le nom de fichier (même format que upload manuel)
            filename = f"piece_{piece_id}.{ext}"
            filepath = UPLOADS_DIR / filename

            print(f"💾 Sauvegarde dans: {filepath}")

            # Sauvegarder le fichier
            async with aiofiles.open(filepath, 'wb') as f:
                await f.write(response.content)

            # Mettre à jour la DB
            await conn.execute(
                '''UPDATE "Pièce" 
                   SET "ImagePath" = $1, "Modified" = NOW()
                   WHERE "RéfPièce" = $2''',
                filename,
                piece_id
            )

            print(f"✅ Image sauvegardée: {filename}")

            return {
                "message": "Image téléchargée et sauvegardée",
                "filename": filename,
                "path": str(filepath),
                "url": f"/api/pieces/{piece_id}/image"
            }

    except httpx.HTTPError as e:
        print(f"❌ Erreur HTTP téléchargement: {e}")
        raise HTTPException(status_code=500, detail=f"Erreur téléchargement: {str(e)}")
    except Exception as e:
        print(f"❌ Erreur sauvegarde: {e}")
        raise HTTPException(status_code=500, detail=f"Erreur: {str(e)}")


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

    print(f"📤 Upload manuel: {filename}")

    # Sauvegarder le fichier
    content = await file.read()
    async with aiofiles.open(filepath, 'wb') as f:
        await f.write(content)

    # Mettre à jour la DB
    await conn.execute(
        '''UPDATE "Pièce" 
           SET "ImagePath" = $1, "Modified" = NOW()
           WHERE "RéfPièce" = $2''',
        filename,
        piece_id
    )

    print(f"✅ Upload réussi: {filename}")

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
    """Récupère l'image d'une pièce depuis uploads/pieces/"""

    piece = await conn.fetchrow(
        'SELECT "ImagePath" FROM "Pièce" WHERE "RéfPièce" = $1',
        piece_id
    )

    if not piece:
        raise HTTPException(status_code=404, detail="Pièce non trouvée")

    # Si image locale existe dans uploads/pieces/
    if piece["ImagePath"]:
        filepath = UPLOADS_DIR / piece["ImagePath"]
        if filepath.exists():
            return FileResponse(filepath)

    # Retourner image placeholder
    if PLACEHOLDER_PATH.exists():
        return FileResponse(PLACEHOLDER_PATH)

    raise HTTPException(status_code=404, detail="Aucune image disponible")


@router.delete("/{piece_id}/image")
async def delete_piece_image(
        piece_id: int,
        conn: asyncpg.Connection = Depends(get_db_connection)
):
    """Supprime l'image d'une pièce de uploads/pieces/"""

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
            print(f"🗑️ Image supprimée: {filepath}")

    await conn.execute(
        'UPDATE "Pièce" SET "ImagePath" = NULL, "Modified" = NOW() WHERE "RéfPièce" = $1',
        piece_id
    )

    return {"message": "Image supprimée"}