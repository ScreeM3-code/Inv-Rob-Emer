"""Modèles Pydantic pour les fournisseurs"""
from pydantic import BaseModel
from typing import Optional, List

class ContactBase(BaseModel):
    Nom: Optional[str] = ""
    Titre: Optional[str] = ""
    Email: Optional[str] = ""
    Telephone: Optional[str] = ""
    Cell: Optional[str] = ""
    RéfFournisseur: int

class ContactCreate(ContactBase):
    pass

class Contact(ContactBase):
    RéfContact: int

class FournisseurBase(BaseModel):
    RéfFournisseur: Optional[int] = None
    NomFournisseur: str
    Adresse: Optional[str] = ""
    Ville: Optional[str] = ""
    CodePostal: Optional[str] = ""
    Pays: Optional[str] = ""
    NuméroTél: Optional[str] = ""
    Domaine: Optional[str] = ""
    contacts: List[Contact] = []
    Produit: Optional[str] = ""
    Marque: Optional[str] = ""
    NumSap: Optional[str] = ""

class FournisseurCreate(FournisseurBase):
    pass

class Fournisseur(FournisseurBase):
    RéfFournisseur: Optional[int] = None