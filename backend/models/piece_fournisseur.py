"""Modèles pour la liaison Pièce-Fournisseur"""
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class PieceFournisseurBase(BaseModel):
    RéfPièce: int
    RéfFournisseur: int
    EstPrincipal: bool = False
    NumPièceFournisseur: Optional[str] = ""
    PrixUnitaire: Optional[float] = 0
    DelaiLivraison: Optional[str] = ""

class PieceFournisseurCreate(PieceFournisseurBase):
    pass

class PieceFournisseur(PieceFournisseurBase):
    id: int
    DateAjout: Optional[datetime] = None
    fournisseur_info: Optional[dict] = None
