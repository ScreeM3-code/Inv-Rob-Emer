
"""Modèles Pydantic pour les groupes de pièces"""
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class CategorieBase(BaseModel):
    NomCategorie: str
    Description: Optional[str] = ""

class CategorieCreate(CategorieBase):
    pass

class Categorie(CategorieBase):
    RefCategorie: int
    Created: Optional[datetime] = None
    Modified: Optional[datetime] = None

class GroupeBase(BaseModel):
    RefCategorie: int
    NomGroupe: str
    Description: Optional[str] = ""

class GroupeCreate(GroupeBase):
    pass

class Groupe(GroupeBase):
    RefGroupe: int
    Created: Optional[datetime] = None
    Modified: Optional[datetime] = None

class GroupePieceBase(BaseModel):
    RefGroupe: int
    RéfPièce: int
    Quantite: int = 1

class GroupePieceCreate(GroupePieceBase):
    pass

class GroupePiece(GroupePieceBase):
    id: int
    piece_info: Optional[dict] = None  # Infos de la pièce

class GroupeComplet(Groupe):
    """Groupe avec sa catégorie et ses pièces"""
    categorie: Optional[Categorie] = None
    pieces: List[GroupePiece] = []