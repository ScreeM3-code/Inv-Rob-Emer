"""Routes pour l'upload de fichiers"""
import os
from pathlib import Path
from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from fastapi.responses import FileResponse
import asyncpg
from database import get_db_connection
from config import BASE_DIR

router = APIRouter(prefix="/uploads", tags=["uploads"])

# Créer le dossier uploads
UPLOADS_DIR = BASE_DIR / "uploads" / "soumissions"
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)


@router.post("/soumission/{soumission_id}")
async def upload_soumission_file(
        soumission_id: int,
        file: UploadFile = File(...),
        conn: asyncpg.Connection = Depends(get_db_connection)
):
    """Upload un fichier PDF pour une soumission"""

    # Vérifier l'extension
    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Seuls les PDF sont acceptés")

    # Créer un nom de fichier unique
    filename = f"soumission_{soumission_id}_{file.filename}"
    filepath = UPLOADS_DIR / filename

    # Sauvegarder le fichier
    content = await file.read()
    with open(filepath, 'wb') as f:
        f.write(content)

    # Mettre à jour la DB
    await conn.execute(
        '''UPDATE "Soumissions" SET "PieceJointe" = $1 WHERE "RefSoumission" = $2''',
        filename, soumission_id
    )

    return {"filename": filename, "message": "Fichier uploadé avec succès"}


@router.get("/soumission/{soumission_id}")
async def get_soumission_file(
        soumission_id: int,
        conn: asyncpg.Connection = Depends(get_db_connection)
):
    """Télécharge le PDF d'une soumission"""

    row = await conn.fetchrow(
        'SELECT "PieceJointe" FROM "Soumissions" WHERE "RefSoumission" = $1',
        soumission_id
    )

    if not row or not row["PieceJointe"]:
        raise HTTPException(status_code=404, detail="Aucun fichier pour cette soumission")

    filepath = UPLOADS_DIR / row["PieceJointe"]

    if not filepath.exists():
        raise HTTPException(status_code=404, detail="Fichier introuvable")

    return FileResponse(filepath, media_type='application/pdf', filename=row["PieceJointe"])


@router.delete("/soumission/{soumission_id}")
async def delete_soumission_file(
        soumission_id: int,
        conn: asyncpg.Connection = Depends(get_db_connection)
):
    """Supprime le PDF d'une soumission"""

    row = await conn.fetchrow(
        'SELECT "PieceJointe" FROM "Soumissions" WHERE "RefSoumission" = $1',
        soumission_id
    )

    if row and row["PieceJointe"]:
        filepath = UPLOADS_DIR / row["PieceJointe"]
        if filepath.exists():
            os.remove(filepath)

    await conn.execute(
        'UPDATE "Soumissions" SET "PieceJointe" = NULL WHERE "RefSoumission" = $1',
        soumission_id
    )

    return {"message": "Fichier supprimé"}