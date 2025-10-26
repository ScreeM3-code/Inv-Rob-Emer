"""Routes pour la gestion des fournisseurs"""
import asyncpg
from fastapi import APIRouter, Depends, HTTPException
from typing import List

from database import get_db_connection
from models import Fournisseur, FournisseurCreate, Contact, ContactCreate
from utils.helpers import safe_string, extract_domain_from_email

router = APIRouter(prefix="/fournisseurs", tags=["fournisseurs"])

@router.get("", response_model=List[Fournisseur])
async def get_fournisseurs(conn: asyncpg.Connection = Depends(get_db_connection)):
    """Récupère tous les fournisseurs avec leurs contacts"""
    try:
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
                ) for c in contacts
            ]

            result.append(Fournisseur(
                RéfFournisseur=f_dict["RéfFournisseur"],
                NomFournisseur=safe_string(f_dict.get("NomFournisseur", "")),
                Adresse=safe_string(f_dict.get("Adresse", "")),
                Ville=safe_string(f_dict.get("Ville", "")),
                CodePostal=safe_string(f_dict.get("CodePostal", "")),
                Pays=safe_string(f_dict.get("Pays", "")),
                NuméroTél=safe_string(f_dict.get("NuméroTél", "")),
                contacts=[c.model_dump() for c in contact_list],
                Domaine=safe_string(f_dict.get("Domaine", "")),
                Produit=safe_string(f_dict.get("Produit", "")),
                Marque=safe_string(f_dict.get("Marque", "")),
                NumSap=safe_string(f_dict.get("NumSap", ""))
            ))

        return result
    except Exception as e:
        print(f"❌ Erreur get_fournisseurs: {e}")
        return []


@router.post("", response_model=Fournisseur)
async def create_fournisseur(
    fournisseur: FournisseurCreate,
    conn: asyncpg.Connection = Depends(get_db_connection)
):
    """Crée un nouveau fournisseur"""
    query = '''
        INSERT INTO "Fournisseurs" (
            "NomFournisseur", "Adresse", "Ville", "CodePostal",
            "Pays", "NuméroTél", "Domaine", "Produit", "Marque", "NumSap"
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING "RéfFournisseur"
    '''

    fournisseur_id = await conn.fetchval(
        query,
        fournisseur.NomFournisseur,
        fournisseur.Adresse or "",
        fournisseur.Ville or "",
        fournisseur.CodePostal or "",
        fournisseur.Pays or "",
        fournisseur.NuméroTél or "",
        fournisseur.Domaine or "",
        fournisseur.Produit or "",
        fournisseur.Marque or "",
        fournisseur.NumSap or ""
    )

    created_fournisseur = await conn.fetchrow(
        'SELECT * FROM "Fournisseurs" WHERE "RéfFournisseur" = $1',
        fournisseur_id
    )
    
    f_dict = dict(created_fournisseur)
    return Fournisseur(
        RéfFournisseur=f_dict["RéfFournisseur"],
        NomFournisseur=safe_string(f_dict.get("NomFournisseur", "")),
        Adresse=safe_string(f_dict.get("Adresse", "")),
        Ville=safe_string(f_dict.get("Ville", "")),
        CodePostal=safe_string(f_dict.get("CodePostal", "")),
        Pays=safe_string(f_dict.get("Pays", "")),
        NuméroTél=safe_string(f_dict.get("NuméroTél", "")),
        Domaine=safe_string(f_dict.get("Domaine", "")),
        Produit=safe_string(f_dict.get("Produit", "")),
        Marque=safe_string(f_dict.get("Marque", "")),
        NumSap=safe_string(f_dict.get("NumSap", "")),
        contacts=[]
    )


@router.put("/{fournisseur_id}", response_model=Fournisseur)
async def update_fournisseur(
    fournisseur_id: int,
    fournisseur: FournisseurCreate,
    conn: asyncpg.Connection = Depends(get_db_connection)
):
    """Met à jour un fournisseur"""
    try:
        row = await conn.fetchrow(
            '''UPDATE "Fournisseurs"
               SET "NomFournisseur" = $1,
                   "Adresse" = $2,
                   "Ville" = $3,
                   "CodePostal" = $4,
                   "Pays" = $5,
                   "NuméroTél" = $6,
                   "Domaine" = $7,
                   "Produit" = $8,
                   "Marque" = $9,
                   "NumSap" = $10
               WHERE "RéfFournisseur" = $11
             RETURNING *''',
            fournisseur.NomFournisseur,
            fournisseur.Adresse or "",
            fournisseur.Ville or "",
            fournisseur.CodePostal or "",
            fournisseur.Pays or "",
            fournisseur.NuméroTél or "",
            fournisseur.Domaine or "",
            fournisseur.Produit or "",
            fournisseur.Marque or "",
            fournisseur.NumSap or "",
            fournisseur_id
        )
        if not row:
            raise HTTPException(status_code=404, detail="Fournisseur non trouvé")

        f_dict = dict(row)
        
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
            ) for c in contacts
        ]

        return Fournisseur(
            RéfFournisseur=f_dict["RéfFournisseur"],
            NomFournisseur=safe_string(f_dict.get("NomFournisseur", "")),
            Adresse=safe_string(f_dict.get("Adresse", "")),
            Ville=safe_string(f_dict.get("Ville", "")),
            CodePostal=safe_string(f_dict.get("CodePostal", "")),
            Pays=safe_string(f_dict.get("Pays", "")),
            NuméroTél=safe_string(f_dict.get("NuméroTél", "")),
            Domaine=safe_string(f_dict.get("Domaine", "")),
            Produit=safe_string(f_dict.get("Produit", "")),
            Marque=safe_string(f_dict.get("Marque", "")),
            NumSap=safe_string(f_dict.get("NumSap", "")),
            contacts=[c.model_dump() for c in contact_list]
        )
    except Exception as e:
        print(f"❌ Erreur update_fournisseur: {e}")
        raise HTTPException(status_code=500, detail="Erreur lors de la modification du fournisseur")


@router.delete("/{fournisseur_id}")
async def delete_fournisseur(
    fournisseur_id: int,
    conn: asyncpg.Connection = Depends(get_db_connection)
):
    """Supprime un fournisseur"""
    result = await conn.execute('DELETE FROM "Fournisseurs" WHERE "RéfFournisseur" = $1', fournisseur_id)
    if result == "DELETE 0":
        raise HTTPException(status_code=404, detail="Fournisseur non trouvé")
    return {"message": "Fournisseur supprimé"}


# Routes pour les contacts
@router.post("/contacts", response_model=Contact)
async def create_contact(
    contact: ContactCreate,
    conn: asyncpg.Connection = Depends(get_db_connection)
):
    """Crée un nouveau contact"""
    try:
        # Ajouter le contact
        row = await conn.fetchrow(
            '''INSERT INTO "Contact" 
            ("Nom", "Titre", "Email", "Telephone", "Cell", "RéfFournisseur")
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *''',
            contact.Nom, contact.Titre, contact.Email, contact.Telephone,
            contact.Cell, contact.RéfFournisseur
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
        print(f"❌ Erreur create_contact: {e}")
        raise HTTPException(status_code=500, detail="Erreur lors de l'ajout du contact")


@router.put("/contacts/{contact_id}", response_model=Contact)
async def update_contact(
    contact_id: int,
    contact: ContactCreate,
    conn: asyncpg.Connection = Depends(get_db_connection)
):
    """Met à jour un contact"""
    try:
        row = await conn.fetchrow(
            '''UPDATE "Contact"
               SET "Nom" = $1,
                   "Titre" = $2,
                   "Email" = $3,
                   "Telephone" = $4,
                   "Cell" = $5,
                   "RéfFournisseur" = $6
             WHERE "RéfContact" = $7
             RETURNING *''',
            contact.Nom, contact.Titre, contact.Email, contact.Telephone,
            contact.Cell, contact.RéfFournisseur, contact_id
        )
        if not row:
            raise HTTPException(status_code=404, detail="Contact non trouvé")
        return Contact(**dict(row))
    except Exception as e:
        print(f"❌ Erreur update_contact: {e}")
        raise HTTPException(status_code=500, detail="Erreur lors de la modification du contact")


@router.delete("/contacts/{contact_id}")
async def delete_contact(
    contact_id: int,
    conn: asyncpg.Connection = Depends(get_db_connection)
):
    """Supprime un contact"""
    try:
        await conn.execute('DELETE FROM "Contact" WHERE "RéfContact" = $1', contact_id)
        return {"message": "Contact supprimé"}
    except Exception as e:
        print(f"❌ Erreur delete_contact: {e}")
        raise HTTPException(status_code=500, detail="Erreur lors de la suppression du contact")