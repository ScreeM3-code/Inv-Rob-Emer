from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime, date
import asyncpg
import json
from urllib.parse import urlparse



ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# PostgreSQL connection
POSTGRES_HOST = os.environ['POSTGRES_HOST']
POSTGRES_PORT = os.environ.get('POSTGRES_PORT', '5432')
POSTGRES_USER = os.environ['POSTGRES_USER']
POSTGRES_PASSWORD = os.environ['POSTGRES_PASSWORD']
POSTGRES_DB = os.environ['POSTGRES_DB']

DATABASE_URL = f"postgresql://{POSTGRES_USER}:{POSTGRES_PASSWORD}@{POSTGRES_HOST}:{POSTGRES_PORT}/{POSTGRES_DB}"

# Connection pool
connection_pool = None

# Create the main app
app = FastAPI(title="Gestion Inventaire Maintenance", version="2.0.0")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Pydantic Models corrigés
class PieceBase(BaseModel):
    RéfPièce: Optional[int] = None
    NomPièce: Optional[str] = ""
    DescriptionPièce: Optional[str] = ""
    NumPièce: Optional[str] = ""
    RéfFournisseur: Optional[int] = None
    RéfAutreFournisseur: Optional[int] = None
    NumPièceAutreFournisseur: Optional[str] = ""
    RefFabricant: Optional[int] = None
    Lieuentreposage: Optional[str] = ""
    QtéenInventaire: Optional[int] = 0
    Qtéminimum: Optional[int] = 0
    Qtémax: Optional[int] = 100
    Prix_unitaire: Optional[float] = 0.0
    Soumission_LD: Optional[str] = ""
    SoumDem: Optional[str] = ""

class PieceCreate(BaseModel):
    NomPièce: Optional[str] = ""
    DescriptionPièce: Optional[str] = ""
    NumPièce: Optional[str] = ""
    RéfFournisseur: Optional[int] = None
    RéfAutreFournisseur: Optional[int] = None
    NumPièceAutreFournisseur: Optional[str] = ""
    RefFabricant: Optional[int] = None
    Lieuentreposage: Optional[str] = ""
    QtéenInventaire: Optional[int] = 0
    Qtéminimum: Optional[int] = 0
    Qtémax: Optional[int] = 100
    Prix_unitaire: Optional[float] = 0.0
    Soumission_LD: Optional[str] = ""
    SoumDem: Optional[str] = ""

class PieceUpdate(BaseModel):
    NomPièce: Optional[str] = None
    DescriptionPièce: Optional[str] = None
    NumPièce: Optional[str] = None
    RéfFournisseur: Optional[int] = None
    RéfAutreFournisseur: Optional[int] = None
    RefFabricant: Optional[int] = None
    NumPièceAutreFournisseur: Optional[str] = None
    Lieuentreposage: Optional[str] = None
    QtéenInventaire: Optional[int] = None
    Qtéminimum: Optional[int] = None
    Qtémax: Optional[int] = None
    Prix_unitaire: Optional[float] = None
    Soumission_LD: Optional[str] = None
    SoumDem: Optional[str] = None

class Piece(PieceBase):
    pass

class Contact(BaseModel):
    RéfContact: int
    Nom: Optional[str] = ""
    Titre: Optional[str] = ""
    Email: Optional[str] = ""
    Telephone: Optional[str] = ""
    Cell: Optional[str] = ""
    RéfFournisseur: Optional[int] = None
    Produit: Optional[str] = ""

class ContactCreate(BaseModel):
    Nom: str
    Titre: Optional[str] = ""
    Email: Optional[str] = ""
    Telephone: Optional[str] = ""
    Cell: Optional[str] = ""
    RéfFournisseur: int
    Produit: Optional[str] = ""


class FournisseurBase(BaseModel):
    RéfFournisseur: Optional[int] = None
    NomFournisseur: str
    NomContact: Optional[str] = ""
    TitreContact: Optional[str] = ""
    Adresse: Optional[str] = ""
    Ville: Optional[str] = ""
    CodePostal: Optional[str] = ""
    Pays: Optional[str] = ""
    NuméroTél: Optional[str] = ""
    NumTélécopie: Optional[str] = ""
    Domaine: Optional[str] = ""
    contacts: List[Contact] = []


class FournisseurCreate(FournisseurBase):
    pass

class Fournisseur(FournisseurBase):
    RéfFournisseur: Optional[int] = None
    #contacts: List[contacts] = []

class StatsResponse(BaseModel):
    total_pieces: int
    stock_critique: int
    valeur_stock: float
    pieces_a_commander: int

class Commande(BaseModel):
    RéfPièce: int
    NomPièce: Optional[str] = ""
    DescriptionPièce: Optional[str] = ""
    NumPièce: Optional[str] = ""
    RéfFournisseur: Optional[int] = None
    RéfAutreFournisseur: Optional[int] = None
    RefFabricant: Optional[int] = None
    NumPièceAutreFournisseur: Optional[str] = ""
    Lieuentreposage: Optional[str] = ""
    QtéenInventaire: int = 0
    Qtéminimum: int = 0
    Qtémax: int = 100
    Qtécommandée: Optional[int] = 0
    Datecommande: Optional[date] = None
    Qtéreçue: Optional[int] = 0
    Qtéarecevoir: Optional[int] = 0
    Cmd_info: Optional[str] = ""
    Qtéàcommander: Optional[int] = 0
    Prix_unitaire: float = 0.0
    fournisseur_principal: Optional[dict] = None
    autre_fournisseur: Optional[dict] = None
    NomFabricant: Optional[str] = ""
    Soumission_LD: Optional[str] = ""
    SoumDem: Optional[str] = ""

class FabricantBase(BaseModel):
    NomFabricant: str
    Domaine: Optional[str] = ""
    NomContact: Optional[str] = ""
    TitreContact: Optional[str] = ""
    Email: Optional[str] = ""

class FabricantCreate(FabricantBase):
    pass

class ContactBase(BaseModel):
    Nom: Optional[str] = ""
    Titre: Optional[str] = ""
    Email: Optional[str] = ""
    Telephone: Optional[str] = ""
    Cell: Optional[str] = ""
    Produit: Optional[str] = ""
    RéfFournisseur: int

class ContactCreate(ContactBase):
    pass

class Contact(ContactBase):
    RéfContact: int

class HistoriqueCreate(BaseModel):
    DateCMD: Optional[datetime] = None
    DateRecu: Optional[datetime] = None
    Opération: Optional[str] = None
    numpiece: Optional[str] = None
    description: Optional[str] = None
    qtécommande: Optional[str] = None
    QtéSortie: Optional[str] = None
    nompiece: Optional[str] = None
    RéfPièce: Optional[float] = None
    User: Optional[str] = None
    Delais: Optional[float] = None

class HistoriqueResponse(HistoriqueCreate):
    id: int
    class Config:
        orm_mode = True

# Helper functions
async def get_db_connection():
    global connection_pool
    if connection_pool is None:
        connection_pool = await asyncpg.create_pool(DATABASE_URL, min_size=5, max_size=20)
    return connection_pool

def extract_domain_from_email(email: str) -> str:
    if email and "@" in email:
        return email.split("@")[1].lower()
    return ""

def safe_string(value) -> str:
    """Convertit une valeur en string sûre"""
    return str(value) if value is not None else ""

def safe_int(value) -> int:
    """Convertit une valeur en int sûr"""
    try:
        return int(value) if value is not None else 0
    except (ValueError, TypeError):
        return 0

def safe_float(value) -> float:
    """Convertit une valeur en float sûr"""
    try:
        return float(value) if value is not None else 0.0
    except (ValueError, TypeError):
        return 0.0

def calculate_qty_to_order(qty_inventaire: int, qty_minimum: int, qty_max: int) -> int:
    """Calcule automatiquement la quantité à commander basée sur le stock critique"""
    qty_inventaire = safe_int(qty_inventaire)
    qty_minimum = safe_int(qty_minimum)
    qty_max = safe_int(qty_max)

    if qty_inventaire < qty_minimum and qty_minimum > 0:
        return qty_minimum - qty_inventaire
    return 0

def get_stock_status(qty_inventaire: int, qty_minimum: int) -> str:
    """Détermine le statut du stock"""
    qty_inventaire = safe_int(qty_inventaire)
    qty_minimum = safe_int(qty_minimum)

    if qty_inventaire < qty_minimum:
        return "critique"
    elif qty_inventaire <= qty_minimum:
        return "faible"
    else:
        return "ok"

# Routes
@api_router.get("/")
async def root():
    return {"message": "API Gestion Inventaire Maintenance - PostgreSQL InventaireRobots"}

@app.get("/api/current-user")
def get_current_user():
    user = os.getenv("USERNAME") or os.getenv("USER") or "Invité"
    return {"user": user}

@api_router.get("/historique", response_model=List[HistoriqueResponse])
async def get_historique():
    pool = await get_db_connection()
    async with pool.acquire() as conn:

        rows = await conn.fetch('SELECT * FROM "historique" ORDER BY "id" DESC')
    return [HistoriqueResponse(**dict(r)) for r in rows]

@api_router.get("/historique", response_model=List[HistoriqueResponse])
async def get_historique(refpiece: Optional[int] = None):
    """Retourne tout l'historique ou seulement pour une RéfPièce donnée."""
    pool = await get_db_connection()
    async with pool.acquire() as conn:
        if refpiece is not None:
            rows = await conn.fetch('SELECT * FROM "historique" WHERE "RéfPièce" = $1 ORDER BY "id" DESC', refpiece)
        else:
            rows = await conn.fetch('SELECT * FROM "historique" ORDER BY "id" DESC')
        return [HistoriqueResponse(**dict(r)) for r in rows]


@api_router.post("/historique", response_model=HistoriqueResponse)
async def add_historique(entry: HistoriqueCreate):
    pool = await get_db_connection()
    async with pool.acquire() as conn:
        query = '''
            INSERT INTO "historique" (
                "DateCMD", "DateRecu", "Opération", "numpiece", "description",
                "qtécommande", "QtéSortie", "nompiece", "RéfPièce", "User", "Delais"
            )
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
            RETURNING *
        '''
        row = await conn.fetchrow(
            query,
            entry.DateCMD,
            entry.DateRecu,
            entry.Opération,
            entry.numpiece,
            entry.description,
            entry.qtécommande,
            entry.QtéSortie,
            entry.nompiece,
            entry.RéfPièce,
            entry.User,
            entry.Delais
        )
        return HistoriqueResponse(**dict(row))


@api_router.post("/contacts", response_model=Contact)
async def create_contact(contact: ContactCreate):
    try:
        pool = await get_db_connection()
        async with pool.acquire() as conn:
            # Ajouter le contact
            row = await conn.fetchrow(
                '''INSERT INTO "Contact" 
                ("Nom", "Titre", "Email", "Telephone", "Cell", "RéfFournisseur", "Produit")
                VALUES ($1, $2, $3, $4, $5, $6, $7)
                RETURNING *''',
                contact.Nom, contact.Titre, contact.Email, contact.Telephone,
                contact.Cell, contact.RéfFournisseur, contact.Produit
            )

            if contact.Email:
                domaine = extract_domain_from_email(contact.Email)
                if domaine:
                    await conn.execute(
                        '''UPDATE "Fournisseurs" 
                           SET "Domaine" = $1
                         WHERE "RéfFournisseur" = $2
                           AND (COALESCE("Domaine", '') = '')''',
                        domaine, contact.RéfFournisseur
                    )

            return Contact(**dict(row))
    except Exception as e:
        print(f"Erreur create_contact: {e}")
        raise HTTPException(status_code=500, detail="Erreur lors de l'ajout du contact")


@api_router.put("/contacts/{contact_id}", response_model=Contact)
async def update_contact(contact_id: int, contact: ContactCreate):
    try:
        pool = await get_db_connection()
        async with pool.acquire() as conn:
            row = await conn.fetchrow(
                '''UPDATE "Contacts"
                   SET "Nom" = $1,
                       "Titre" = $2,
                       "Email" = $3,
                       "Telephone" = $4,
                       "Cell" = $5,
                       "RéfFournisseur" = $6,
                       "Produit" = $7
                 WHERE "RéfContact" = $8
                 RETURNING *''',
                contact.Nom, contact.Titre, contact.Email, contact.Telephone,
                contact.Cell, contact.RéfFournisseur, contact.Produit, contact_id
            )
            if not row:
                raise HTTPException(status_code=404, detail="Contact non trouvé")
            return Contact(**dict(row))
    except Exception as e:
        print(f"Erreur update_contact: {e}")
        raise HTTPException(status_code=500, detail="Erreur lors de la modification du contact")


@api_router.delete("/contacts/{contact_id}")
async def delete_contact(contact_id: int):
    try:
        pool = await get_db_connection()
        async with pool.acquire() as conn:
            await conn.execute('DELETE FROM "Contact" WHERE "RéfContact" = $1', contact_id)
            return {"message": "Contact supprimé"}
    except Exception as e:
        print(f"Erreur delete_contact: {e}")
        raise HTTPException(status_code=500, detail="Erreur lors de la suppression du contact")


@api_router.get("/fabricant")
async def get_fabricant():
    pool = await get_db_connection()
    async with pool.acquire() as conn:
        rows = await conn.fetch('SELECT "RefFabricant", "NomFabricant", "Domaine", "NomContact", "TitreContact", "Email" FROM "Fabricant" ORDER BY "NomFabricant"')
        return [{"RefFabricant": r["RefFabricant"], "NomFabricant": r["NomFabricant"]} for r in rows]


@api_router.post("/fabricant", response_model=FabricantBase)
async def create_fabricant(fabricant: FabricantCreate):
    pool = await get_db_connection()
    async with pool.acquire() as conn:
        query = '''
            INSERT INTO "Fabricant" (
                "NomFabricant", "Domaine", "NomContact", "TitreContact", "Email"
            ) VALUES ($1, $2, $3, $4, $5)
            RETURNING "RefFabricant"
        '''

        fabricant_id = await conn.fetchval(
            query,
            fabricant.NomFabricant,
            fabricant.Domaine,
            fabricant.NomContact,
            fabricant.TitreContact,
            fabricant.Email,
        )

        created_fabricant = await conn.fetchrow(
            'SELECT * FROM "Fabricant" WHERE "RefFabricant" = $1',
            fabricant_id
        )

        f_dict = dict(created_fabricant)
        return FabricantBase(
            NomFabricant=safe_string(f_dict.get("NomFabricant", "")),
            Domaine=safe_string(f_dict.get("Domaine", "")),
            NomContact=safe_string(f_dict.get("NomContact", "")),
            TitreContact=safe_string(f_dict.get("TitreContact", "")),
            Email=safe_string(f_dict.get("Email", ""))

        )

@api_router.put("/fabricant/{RefFabricant}", response_model=FabricantBase)
async def update_fabricant(RefFabricant: int, fabricant: FabricantBase):
    try:
        pool = await get_db_connection()
        async with pool.acquire() as conn:
            row = await conn.fetchrow(
                '''UPDATE "Fabricant"
                   SET "NomFabricant" = $1,
                       "Domaine" = $2,
                       "TitreContact" = $3,
                       "NomContact" = $4,
                       "Email" = $5
                   WHERE "RefFabricant" = $6
                 RETURNING *''',
                fabricant.NomFabricant,
                fabricant.Domaine,
                fabricant.TitreContact,
                fabricant.NomContact,
                fabricant.Email,
                RefFabricant
            )
            if not row:
                raise HTTPException(status_code=404, detail="Fabricant non trouvé")
            return FabricantBase(**dict(row))
    except Exception as e:
        print(f"Erreur update_fabricant: {e}")
        raise HTTPException(status_code=500, detail="Erreur lors de la modification du Fabricant")

@api_router.delete("/fabricant/{RefFabricant_id}")
async def delete_fabricant(RefFabricant_id: int):
    pool = await get_db_connection()
    async with pool.acquire() as conn:
        result = await conn.execute('DELETE FROM "Fabricant" WHERE "RefFabricant" = $1', RefFabricant_id)
        if result == "DELETE 0":
            raise HTTPException(status_code=404, detail="Fabricant non trouvée")
        return {"message": "Fabricant supprimée"}

@api_router.get("/stats", response_model=StatsResponse)
async def get_stats():
    try:
        pool = await get_db_connection()
        async with pool.acquire() as conn:
            # Total pièces
            total_pieces = await conn.fetchval('SELECT COUNT(*) FROM "Pièce"') or 0

            # Stock critique
            stock_critique = await conn.fetchval(
                'SELECT COUNT(*) FROM "Pièce" WHERE "QtéenInventaire" = "Qtéminimum" AND "Qtéminimum" > 0'
            ) or 0

            # Valeur stock (en CAD $)
            valeur_stock = await conn.fetchval(
                'SELECT COALESCE(SUM("QtéenInventaire" * COALESCE("Prix unitaire", 0)), 0) FROM "Pièce"'
            ) or 0.0

            # Pièces à commander (calculées automatiquement)
            pieces_a_commander = await conn.fetchval(
                '''
                SELECT COUNT(*)
                FROM "Pièce"
                WHERE "Qtécommandée" <= 0
                  AND "QtéenInventaire" < "Qtéminimum"
                  AND "Qtéminimum" > 0
                  AND "Qtéminimum" IS NOT NULL
                  AND "Qtéàcommander" > 0 
                  '''
            ) or 0

            return StatsResponse(
                total_pieces=total_pieces,
                stock_critique=stock_critique,
                valeur_stock=float(valeur_stock),
                pieces_a_commander=pieces_a_commander
            )
    except Exception as e:
        print(f"Erreur stats: {e}")
        return StatsResponse(total_pieces=0, stock_critique=0, valeur_stock=0.0, pieces_a_commander=0)

@api_router.get("/pieces", response_model=List[Piece])
async def get_pieces(limit: int = 50, offset: int = 0, search: Optional[str] = None):
    try:
        pool = await get_db_connection()
        async with pool.acquire() as conn:
            base_query = '''
                SELECT p.*,
                       f1."NomFournisseur" as fournisseur_principal_nom,
                       f1."NomContact" as fournisseur_principal_contact,
                       f1."NuméroTél" as fournisseur_principal_tel,
                       f2."NomFournisseur" as autre_fournisseur_nom,
                       f2."NomContact" as autre_fournisseur_contact,
                       f2."NuméroTél" as autre_fournisseur_tel,
                       f3."NomFabricant"
                FROM "Pièce" p
                LEFT JOIN "Fournisseurs" f1 ON p."RéfFournisseur" = f1."RéfFournisseur"
                LEFT JOIN "Fournisseurs" f2 ON p."RéfAutreFournisseur" = f2."RéfFournisseur"
                LEFT JOIN "Fabricant" f3 ON p."RefFabricant" = f3."RefFabricant"
            '''

            params = []
            param_count = 0

            if search:
                base_query += ' WHERE (COALESCE(p."NomPièce", \'\') ILIKE $1 OR COALESCE(p."NumPièce", \'\') ILIKE $1 OR COALESCE(p."DescriptionPièce", \'\') ILIKE $1)'
                params.append(f'%{search}%')
                param_count = 1

            base_query += f' ORDER BY p."RéfPièce" DESC LIMIT ${param_count + 1} OFFSET ${param_count + 2}'
            params.extend([limit, offset])

            pieces = await conn.fetch(base_query, *params)

            result = []
            for piece in pieces:
                piece_dict = dict(piece)

                # Sécuriser les valeurs
                nom_piece = safe_string(piece_dict.get("NomPièce", ""))
                if not nom_piece:
                    continue

                qty_inventaire = safe_int(piece_dict.get("QtéenInventaire", 0))
                qty_minimum = safe_int(piece_dict.get("Qtéminimum", 0))
                qty_max = safe_int(piece_dict.get("Qtémax", 100))

                # Calculer la quantité à commander automatiquement
                qty_a_commander = calculate_qty_to_order(qty_inventaire, qty_minimum, qty_max)

                # Déterminer le statut du stock
                statut_stock = get_stock_status(qty_inventaire, qty_minimum)

                # Préparer les informations des fournisseurs
                fournisseur_principal = None
                if piece_dict.get("fournisseur_principal_nom"):
                    fournisseur_principal = {
                        "RéfFournisseur": piece_dict.get("RéfFournisseur"),
                        "NomFournisseur": safe_string(piece_dict.get("fournisseur_principal_nom", "")),
                        "NomContact": safe_string(piece_dict.get("fournisseur_principal_contact", "")),
                        "NuméroTél": safe_string(piece_dict.get("fournisseur_principal_tel", ""))
                    }

                autre_fournisseur = None
                if piece_dict.get("autre_fournisseur_nom"):
                    autre_fournisseur = {
                        "RéfFournisseur": piece_dict.get("RéfAutreFournisseur"),
                        "NomFournisseur": safe_string(piece_dict.get("autre_fournisseur_nom", "")),
                        "NomContact": safe_string(piece_dict.get("autre_fournisseur_contact", "")),
                        "NuméroTél": safe_string(piece_dict.get("autre_fournisseur_tel", ""))
                    }

                piece_response = Piece(
                    RéfPièce=piece_dict["RéfPièce"],
                    NomPièce=nom_piece,
                    DescriptionPièce=safe_string(piece_dict.get("DescriptionPièce", "")),
                    NumPièce=safe_string(piece_dict.get("NumPièce", "")),
                    RéfFournisseur=piece_dict.get("RéfFournisseur"),
                    RéfAutreFournisseur=piece_dict.get("RéfAutreFournisseur"),
                    NumPièceAutreFournisseur=safe_string(piece_dict.get("NumPièceAutreFournisseur", "")),
                    Lieuentreposage=safe_string(piece_dict.get("Lieuentreposage", "")),
                    QtéenInventaire=qty_inventaire,
                    Qtéminimum=qty_minimum,
                    Qtémax=qty_max,
                    Qtéàcommander=qty_a_commander,
                    Prix_unitaire=safe_float(piece_dict.get("Prix unitaire", 0)),
                    Soumission_LD=safe_string(piece_dict.get("Soumission LD", "")),
                    SoumDem=safe_string(piece_dict.get("SoumDem", "")),
                    fournisseur_principal=fournisseur_principal,
                    autre_fournisseur=autre_fournisseur,
                    NomFabricant=safe_string(piece_dict.get("NomFabricant", "")),
                    RefFabricant=piece_dict.get("RefFabricant"),
                    statut_stock=statut_stock,
                    Created=piece_dict.get("Created"),
                    Modified=piece_dict.get("Modified")
                )
                result.append(piece_response)

            return result
    except Exception as e:
        print(f"Erreur get_pieces: {e}")
        return []

@api_router.get("/pieces/{piece_id}", response_model=Piece)
async def get_piece(piece_id: int):
    try:
        pool = await get_db_connection()
        async with pool.acquire() as conn:
            query = '''
                SELECT p.*,
                       f1."NomFournisseur" as fournisseur_principal_nom,
                       f1."NomContact" as fournisseur_principal_contact,
                       f1."NuméroTél" as fournisseur_principal_tel,
                       f2."NomFournisseur" as autre_fournisseur_nom,
                       f2."NomContact" as autre_fournisseur_contact,
                       f2."NuméroTél" as autre_fournisseur_tel,
                       f3."NomFabricant"
                FROM "Pièce" p
                LEFT JOIN "Fournisseurs" f1 ON p."RéfFournisseur" = f1."RéfFournisseur"
                LEFT JOIN "Fournisseurs" f2 ON p."RéfAutreFournisseur" = f2."RéfFournisseur"
                LEFT JOIN "Fabricant" f3 ON p."RefFabricant" = f3."RefFabricant"
                WHERE p."RéfPièce" = $1
            '''

            piece = await conn.fetchrow(query, piece_id)
            if not piece:
                raise HTTPException(status_code=404, detail="Pièce non trouvée")

            piece_dict = dict(piece)

            nom_piece = safe_string(piece_dict.get("NomPièce", ""))
            if not nom_piece:
                raise HTTPException(status_code=404, detail="Pièce invalide")

            qty_inventaire = safe_int(piece_dict.get("QtéenInventaire", 0))
            qty_minimum = safe_int(piece_dict.get("Qtéminimum", 0))
            qty_max = safe_int(piece_dict.get("Qtémax", 100))

            # Calculer automatiquement
            qty_a_commander = calculate_qty_to_order(qty_inventaire, qty_minimum, qty_max)
            statut_stock = get_stock_status(qty_inventaire, qty_minimum)

            # Fournisseurs
            fournisseur_principal = None
            if piece_dict.get("fournisseur_principal_nom"):
                fournisseur_principal = {
                    "RéfFournisseur": piece_dict.get("RéfFournisseur"),
                    "NomFournisseur": safe_string(piece_dict.get("fournisseur_principal_nom", "")),
                    "NomContact": safe_string(piece_dict.get("fournisseur_principal_contact", "")),
                    "NuméroTél": safe_string(piece_dict.get("fournisseur_principal_tel", ""))
                }

            autre_fournisseur = None
            if piece_dict.get("autre_fournisseur_nom"):
                autre_fournisseur = {
                    "RéfFournisseur": piece_dict.get("RéfAutreFournisseur"),
                    "NomFournisseur": safe_string(piece_dict.get("autre_fournisseur_nom", "")),
                    "NomContact": safe_string(piece_dict.get("autre_fournisseur_contact", "")),
                    "NuméroTél": safe_string(piece_dict.get("autre_fournisseur_tel", ""))
                }

            return Piece(
                RéfPièce=piece_dict["RéfPièce"],
                NomPièce=nom_piece,
                DescriptionPièce=safe_string(piece_dict.get("DescriptionPièce", "")),
                NumPièce=safe_string(piece_dict.get("NumPièce", "")),
                RéfFournisseur=piece_dict.get("RéfFournisseur"),
                RéfAutreFournisseur=piece_dict.get("RéfAutreFournisseur"),
                NumPièceAutreFournisseur=safe_string(piece_dict.get("NumPièceAutreFournisseur", "")),
                Lieuentreposage=safe_string(piece_dict.get("Lieuentreposage", "")),
                QtéenInventaire=qty_inventaire,
                Qtéminimum=qty_minimum,
                Qtémax=qty_max,
                Qtéàcommander=qty_a_commander,
                Prix_unitaire=safe_float(piece_dict.get("Prix unitaire", 0)),
                Soumission_LD=safe_string(piece_dict.get("Soumission LD", "")),
                SoumDem=safe_string(piece_dict.get("SoumDem", "")),
                fournisseur_principal=fournisseur_principal,
                autre_fournisseur=autre_fournisseur,
                NomFabricant=safe_string(piece_dict.get("NomFabricant", "")),
                RefFabricant=piece_dict.get("RefFabricant"),
                statut_stock=statut_stock,
                Created=piece_dict.get("Created"),
                Modified=piece_dict.get("Modified")
            )
    except HTTPException:
        raise
    except Exception as e:
        print(f"Erreur get_piece {piece_id}: {e}")
        raise HTTPException(status_code=500, detail="Erreur serveur")

@api_router.post("/pieces", response_model=Piece)
async def create_piece(piece: PieceCreate):
    pool = await get_db_connection()
    async with pool.acquire() as conn:
        query = '''
            INSERT INTO "Pièce" (
                "NomPièce", "DescriptionPièce", "NumPièce", "RéfFournisseur",
                "RéfAutreFournisseur", "NumPièceAutreFournisseur", "RefFabricant", 
                "Lieuentreposage", "QtéenInventaire", "Qtéminimum", "Qtémax", 
                "Prix unitaire", "Soumission LD", "SoumDem", "Created", "Modified"
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
            RETURNING "RéfPièce"
        '''

        now = datetime.utcnow()
        piece_id = await conn.fetchval(
            query,
            piece.NomPièce,
            piece.DescriptionPièce or "",
            piece.NumPièce or "",
            piece.RéfFournisseur,
            piece.RéfAutreFournisseur,
            piece.NumPièceAutreFournisseur or "",
            piece.RefFabricant,
            piece.Lieuentreposage or "",
            piece.QtéenInventaire,
            piece.Qtéminimum,
            piece.Qtémax,
            piece.Prix_unitaire,
            piece.Soumission_LD or "",
            piece.SoumDem or "",
            now,
            now
        )

        return await get_piece(piece_id)

@api_router.put("/pieces/{piece_id}", response_model=Piece)
async def update_piece(piece_id: int, piece_update: PieceUpdate):
    pool = await get_db_connection()
    async with pool.acquire() as conn:
        # Construire la requête de mise à jour dynamiquement
        update_fields = []
        values = []
        param_count = 0

        for field, value in piece_update.dict(exclude_unset=True).items():
            if value is not None:
                param_count += 1
                if field == "Lieuentreposage":
                    update_fields.append(f'"Lieuentreposage" = ${param_count}')
                elif field == "Prix_unitaire":
                    update_fields.append(f'"Prix unitaire" = ${param_count}')
                elif field == "Soumission_LD":
                    update_fields.append(f'"Soumission LD" = ${param_count}')
                else:
                    update_fields.append(f'"{field}" = ${param_count}')
                values.append(value)

        if not update_fields:
            return await get_piece(piece_id)

        param_count += 1
        update_fields.append(f'"Modified" = ${param_count}')
        values.append(datetime.utcnow())

        param_count += 1
        values.append(piece_id)

        query = f'''
            UPDATE "Pièce"
            SET {", ".join(update_fields)}
            WHERE "RéfPièce" = ${param_count}
        '''

        await conn.execute(query, *values)
        return await get_piece(piece_id)

@api_router.delete("/pieces/{piece_id}")
async def delete_piece(piece_id: int):
    pool = await get_db_connection()
    async with pool.acquire() as conn:
        result = await conn.execute('DELETE FROM "Pièce" WHERE "RéfPièce" = $1', piece_id)
        if result == "DELETE 0":
            raise HTTPException(status_code=404, detail="Pièce non trouvée")
        return {"message": "Pièce supprimée"}


@api_router.get("/fournisseurs", response_model=List[Fournisseur])
async def get_fournisseurs():
    try:
        pool = await get_db_connection()
        async with pool.acquire() as conn:
            fournisseurs = await conn.fetch('SELECT * FROM "Fournisseurs" ORDER BY "NomFournisseur"')
            result = []

            for f in fournisseurs:
                f_dict = dict(f)

                # Charger les contacts liés
                contacts = await conn.fetch(
                    'SELECT * FROM "Contact" WHERE "RéfFournisseur" = $1',
                    f_dict["RéfFournisseur"]
                )

                contact_list = [
                    Contact(
                        RéfContact=c["RéfContact"],
                        Nom=safe_string(c.get("Nom", "")),
                        Titre=safe_string(c.get("Titre", "")),
                        Email=safe_string(c.get("Email", "")),
                        Telephone=safe_string(c.get("Telephone", "")),
                        Cell=safe_string(c.get("Cell", "")),
                        RéfFournisseur=c.get("RéfFournisseur"),
                        Produit=safe_string(c.get("Produit", ""))
                    ) for c in contacts
                ]

                result.append(Fournisseur(
                    RéfFournisseur=f_dict["RéfFournisseur"],
                    NomFournisseur=safe_string(f_dict.get("NomFournisseur", "")),
                    NomContact=safe_string(f_dict.get("NomContact", "")),
                    TitreContact=safe_string(f_dict.get("TitreContact", "")),
                    Adresse=safe_string(f_dict.get("Adresse", "")),
                    Ville=safe_string(f_dict.get("Ville", "")),
                    CodePostal=safe_string(f_dict.get("CodePostal", "")),
                    Pays=safe_string(f_dict.get("Pays", "")),
                    NuméroTél=safe_string(f_dict.get("NuméroTél", "")),
                    NumTélécopie=safe_string(f_dict.get("NumTélécopie", "")),
                    contacts=[c.model_dump() for c in contact_list],
                    Domaine=safe_string(f_dict.get("Domaine", "")),
                ))

            return result
    except Exception as e:
        print(f"Erreur get_fournisseurs: {e}")
        return []


@api_router.post("/fournisseurs", response_model=Fournisseur)
async def create_fournisseur(fournisseur: FournisseurCreate):
    pool = await get_db_connection()
    async with pool.acquire() as conn:
        query = '''
            INSERT INTO "Fournisseurs" (
                "NomFournisseur", "NomContact", "TitreContact", "Adresse",
                "Ville", "CodePostal", "Pays", "NuméroTél", "NumTélécopie"
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING "RéfFournisseur"
        '''

        fournisseur_id = await conn.fetchval(
            query,
            fournisseur.NomFournisseur,
            fournisseur.NomContact or "",
            fournisseur.TitreContact or "",
            fournisseur.Adresse or "",
            fournisseur.Ville or "",
            fournisseur.CodePostal or "",
            fournisseur.Pays or "",
            fournisseur.NuméroTél or "",
            fournisseur.NumTélécopie or ""
        )

        created_fournisseur = await conn.fetchrow(
            'SELECT * FROM "Fournisseurs" WHERE "RéfFournisseur" = $1',
            fournisseur_id
        )
        
        f_dict = dict(created_fournisseur)
        return Fournisseur(
            RéfFournisseur=f_dict["RéfFournisseur"],
            NomFournisseur=safe_string(f_dict.get("NomFournisseur", "")),
            NomContact=safe_string(f_dict.get("NomContact", "")),
            TitreContact=safe_string(f_dict.get("TitreContact", "")),
            Adresse=safe_string(f_dict.get("Adresse", "")),
            Ville=safe_string(f_dict.get("Ville", "")),
            CodePostal=safe_string(f_dict.get("CodePostal", "")),
            Pays=safe_string(f_dict.get("Pays", "")),
            NuméroTél=safe_string(f_dict.get("NuméroTél", "")),
            NumTélécopie=safe_string(f_dict.get("NumTélécopie", ""))
        )

@api_router.put("/fournisseurs/{RefFournisseur_id}", response_model=Fournisseur)
async def update_fournisseur(RefFournisseur_id: int):
    try:
        pool = await get_db_connection()
        async with pool.acquire() as conn:
            row = await conn.fetchrow(
                '''UPDATE "Fournisseurs"
                   SET "NomFournisseur" = $1,
                       "NomContact" = $2,
                       "TitreContact" = $3,
                       "Adresse" = $4,
                       "Ville" = $5,
                       "CodePostal" = $6,
                       "DépartementOuRégion" = $7
                       "Pays" = $8,
                       "NuméroTél" = $9,
                       "NumTélécopie" = $1.,
                       "Domaine" = $11,
                   WHERE "RéfFournisseur" = $12
                 RETURNING *''',
                Fournisseur.NomFournisseur, Fournisseur.NomContact, Fournisseur.Adresse, Fournisseur.Ville,
                Fournisseur.CodePostal, Fournisseur.DépartementOuRégion, Fournisseur.Pays,
            Fournisseur.NuméroTél, Fournisseur.NumTélécopie, Fournisseur.Domaine, Fournisseur.RéfFournisseur
            )
            if not row:
                raise HTTPException(status_code=404, detail="Contact non trouvé")
            return Contact(**dict(row))
    except Exception as e:
        print(f"Erreur update_contact: {e}")
        raise HTTPException(status_code=500, detail="Erreur lors de la modification du contact")

@api_router.delete("/fournisseurs/{RefFournisseur_id}")
async def delete_fournisseur(RefFournisseur_id: int):
    pool = await get_db_connection()
    async with pool.acquire() as conn:
        result = await conn.execute('DELETE FROM "Fournisseurs" WHERE "RéfFournisseur" = $1', RefFournisseur_id)
        if result == "DELETE 0":
            raise HTTPException(status_code=404, detail="Fournisseur non trouvée")
        return {"message": "Fournisseur supprimée"}

@api_router.get("/commande", response_model=List[Commande])
async def get_commande():
    try:
        pool = await get_db_connection()
        async with pool.acquire() as conn:
            rows = await conn.fetch('''
                SELECT p.*,
                       f1."NomFournisseur" AS fournisseur_principal_nom,
                       f1."NomContact" AS fournisseur_principal_contact,
                       f1."NuméroTél" AS fournisseur_principal_tel,
                       f2."NomFournisseur" AS autre_fournisseur_nom,
                       f2."NomContact" AS autre_fournisseur_contact,
                       f2."NuméroTél" AS autre_fournisseur_tel,
                       f3."NomFabricant"
                FROM "Pièce" p
                LEFT JOIN "Fournisseurs" f1 ON p."RéfFournisseur" = f1."RéfFournisseur"
                LEFT JOIN "Fournisseurs" f2 ON p."RéfAutreFournisseur" = f2."RéfFournisseur"
                LEFT JOIN "Fabricant" f3 ON p."RefFabricant" = f3."RefFabricant"
                WHERE COALESCE(p."Qtécommandée", 0) > 0
                  AND p."QtéenInventaire" <= p."Qtéminimum"
                  AND p."Qtéminimum" > 0
            ''')

            result = []
            for row in rows:
                piece_dict = dict(row)

                fournisseur_principal = None
                if piece_dict.get("fournisseur_principal_nom"):
                    fournisseur_principal = {
                        "RéfFournisseur": piece_dict.get("RéfFournisseur"),
                        "NomFournisseur": safe_string(piece_dict.get("fournisseur_principal_nom", "")),
                    }

                autre_fournisseur = None
                if piece_dict.get("autre_fournisseur_nom"):
                    autre_fournisseur = {
                        "RéfFournisseur": piece_dict.get("RéfAutreFournisseur"),
                        "NomFournisseur": safe_string(piece_dict.get("autre_fournisseur_nom", "")),
                    }

                commande = Commande(
                    RéfPièce=piece_dict["RéfPièce"],
                    Datecommande=piece_dict.get("Datecommande"),
                    NomPièce=safe_string(piece_dict.get("NomPièce", "")),
                    NumPièce=safe_string(piece_dict.get("NumPièce", "")),
                    Qtécommandée=safe_int(piece_dict.get("Qtécommandée", 0)),
                    Qtéreçue=safe_int(piece_dict.get("Qtéreçue", 0)),
                    Qtéarecevoir=safe_int(piece_dict.get("Qtéarecevoir", 0)),
                    Cmd_info=safe_string(piece_dict.get("Cmd_info", "")),
                    NumPièceAutreFournisseur=safe_string(piece_dict.get("NumPièceAutreFournisseur", "")),
                    DescriptionPièce=safe_string(piece_dict.get("DescriptionPièce", "")),
                    RéfFournisseur=piece_dict.get("RéfFournisseur"),
                    RéfAutreFournisseur=piece_dict.get("RéfAutreFournisseur"),
                    QtéenInventaire=safe_int(piece_dict.get("QtéenInventaire", 0)),
                    Qtéminimum=safe_int(piece_dict.get("Qtéminimum", 0)),
                    Qtéàcommander=safe_int(piece_dict.get("Qtéàcommander", 0)),
                    Prix_unitaire=safe_float(piece_dict.get("Prix unitaire", 0)),
                    fournisseur_principal=fournisseur_principal,
                    autre_fournisseur=autre_fournisseur,
                    NomFabricant=safe_string(piece_dict.get("NomFabricant", "")),
                    Soumission_LD=safe_string(piece_dict.get("Soumission LD", "")),
                    SoumDem=safe_string(piece_dict.get("SoumDem", ""))
                )

                result.append(commande)

            return result
    except Exception as e:
        print(f"Erreur get_commande: {e}")
        return []

@api_router.get("/toorders", response_model=List[Commande])
async def get_toorders():
    try:
        pool = await get_db_connection()
        async with pool.acquire() as conn:
            rows = await conn.fetch('''
                SELECT p.*,
                       f1."NomFournisseur" AS fournisseur_principal_nom,
                       f1."NomContact" AS fournisseur_principal_contact,
                       f1."NuméroTél" AS fournisseur_principal_tel,
                       f2."NomFournisseur" AS autre_fournisseur_nom,
                       f2."NomContact" AS autre_fournisseur_contact,
                       f2."NuméroTél" AS autre_fournisseur_tel,
                       f3."NomFabricant"
                FROM "Pièce" p
                LEFT JOIN "Fournisseurs" f1 ON p."RéfFournisseur" = f1."RéfFournisseur"
                LEFT JOIN "Fournisseurs" f2 ON p."RéfAutreFournisseur" = f2."RéfFournisseur"
                LEFT JOIN "Fabricant" f3 ON p."RefFabricant" = f3."RefFabricant"
                WHERE p."Qtécommandée" <= 0
                 AND p."QtéenInventaire" < p."Qtéminimum"
                 AND p."Qtéminimum" > 0
                 AND p."Qtéminimum" IS NOT NULL
                 AND p."Qtéàcommander" > 0
            ''')

            result = []
            for row in rows:
                piece_dict = dict(row)

                fournisseur_principal = None
                if piece_dict.get("fournisseur_principal_nom"):
                    fournisseur_principal = {
                        "RéfFournisseur": piece_dict.get("RéfFournisseur"),
                        "NomFournisseur": safe_string(piece_dict.get("fournisseur_principal_nom", "")),
                    }

                autre_fournisseur = None
                if piece_dict.get("autre_fournisseur_nom"):
                    autre_fournisseur = {
                        "RéfFournisseur": piece_dict.get("RéfAutreFournisseur"),
                        "NomFournisseur": safe_string(piece_dict.get("autre_fournisseur_nom", "")),
                    }

                qty_a_commander = calculate_qty_to_order(
                    piece_dict.get("QtéenInventaire", 0),
                    piece_dict.get("Qtéminimum", 0),
                    piece_dict.get("Qtémax", 100)
                )

                commande = Commande(
                    RéfPièce=piece_dict["RéfPièce"],
                    Datecommande=piece_dict.get("Datecommande"),
                    NomPièce=safe_string(piece_dict.get("NomPièce", "")),
                    NumPièce=safe_string(piece_dict.get("NumPièce", "")),
                    NumPièceAutreFournisseur=safe_string(piece_dict.get("NumPièceAutreFournisseur", "")),
                    DescriptionPièce=safe_string(piece_dict.get("DescriptionPièce", "")),
                    RéfFournisseur=piece_dict.get("RéfFournisseur"),
                    RéfAutreFournisseur=piece_dict.get("RéfAutreFournisseur"),
                    QtéenInventaire=safe_int(piece_dict.get("QtéenInventaire", 0)),
                    Qtéminimum=safe_int(piece_dict.get("Qtéminimum", 0)),
                    Qtéàcommander=qty_a_commander,
                    Prix_unitaire=safe_float(piece_dict.get("Prix unitaire", 0)),
                    fournisseur_principal=fournisseur_principal,
                    autre_fournisseur=autre_fournisseur,
                    NomFabricant=safe_string(piece_dict.get("NomFabricant", "")),
                    Soumission_LD=safe_string(piece_dict.get("Soumission LD", "")),
                    SoumDem=safe_string(piece_dict.get("SoumDem", ""))
                )

                result.append(commande)

            return result
    except Exception as e:
        print(f"Erreur get_toorders: {e}")
        return []

@api_router.put("/ordersall/{piece_id}")
async def receive_all_order(piece_id: int):
    """Réception totale d'une commande"""
    try:
        pool = await get_db_connection()
        async with pool.acquire() as conn:
            query = '''
                UPDATE "Pièce"
                SET "QtéenInventaire" = "QtéenInventaire" + COALESCE("Qtécommandée", 0),
                    "Qtéreçue" = COALESCE("Qtécommandée", 0),
                    "Qtéarecevoir" = 0,
                    "Qtécommandée" = 0,
                    "Datecommande" = NULL,
                    "Cmd_info" = NULL,
                    "Modified" = $2
                WHERE "RéfPièce" = $1
            '''
            queryh = '''
                UPDATE public.historique
                SET 
                    "DateRecu" = '2025-10-12',
                    "Delais" = EXTRACT(DAY FROM ('2025-10-12'::date - "DateCMD"))
                WHERE "Opération" = 'Achat'
                    AND "RéfPièce" = '$1'
                ORDER by "id" decs 

                    UPDATE "historique"
                    SET "DateRecu" = datetime.utcnow,
                        "Delais" = "DateCMD" - datetime.utcnow
                    WHERE "RéfPièce" = $1 
                '''
            
            result = await conn.execute(query, piece_id, datetime.utcnow())
            if result == "UPDATE 0":
                raise HTTPException(status_code=404, detail="Pièce non trouvée")
            
            return {"message": "Réception totale effectuée", "piece_id": piece_id}
    except HTTPException:
        raise
    except Exception as e:
        print(f"Erreur receive_all_order: {e}")
        raise HTTPException(status_code=500, detail="Erreur lors de la réception")

@api_router.put("/orderspar/{piece_id}")
async def receive_partial_order(piece_id: int, quantity_received: int):
    """Réception partielle d'une commande"""
    try:
        pool = await get_db_connection()
        async with pool.acquire() as conn:
            query = '''
                UPDATE "Pièce"
                SET "QtéenInventaire" = "QtéenInventaire" + $2,
                    "Qtéreçue" = COALESCE("Qtéreçue", 0) + $2,
                    "Qtéarecevoir" = GREATEST(0, COALESCE("Qtéarecevoir", 0) - $2),
                    "Modified" = $3
                WHERE "RéfPièce" = $1
            '''
            
            result = await conn.execute(query, piece_id, quantity_received, datetime.utcnow())
            if result == "UPDATE 0":
                raise HTTPException(status_code=404, detail="Pièce non trouvée")
            
            return {"message": "Réception partielle effectuée", "piece_id": piece_id, "quantity": quantity_received}
    except HTTPException:
        raise
    except Exception as e:
        print(f"Erreur receive_partial_order: {e}")
        raise HTTPException(status_code=500, detail="Erreur lors de la réception partielle")


# Database startup
@app.on_event("startup")
async def startup():
    global connection_pool
    try:
        connection_pool = await asyncpg.create_pool(DATABASE_URL, min_size=5, max_size=20)
        print(f"✅ Connexion PostgreSQL réussie à {POSTGRES_HOST}")
        print(f"✅ Base de données: {POSTGRES_DB}")
        
        # Test de base
        async with connection_pool.acquire() as conn:
            count = await conn.fetchval('SELECT COUNT(*) FROM "Pièce"')
            print(f"✅ {count} pièces trouvées dans la base")
    except Exception as e:
        print(f"❌ Erreur connexion PostgreSQL: {e}")

@app.on_event("shutdown")
async def shutdown():
    global connection_pool
    if connection_pool:
        await connection_pool.close()

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("server:app", host="0.0.0.0", port=8000, reload=True)