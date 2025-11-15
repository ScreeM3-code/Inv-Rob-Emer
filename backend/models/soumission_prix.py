"""Modèles pour les prix de soumissions"""
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class SoumissionPrixBase(BaseModel):
    RefSoumission: int
    RéfPièce: int
    PrixUnitaire: float
    DelaiLivraison: Optional[str] = ""
    Commentaire: Optional[str] = ""

class SoumissionPrixCreate(SoumissionPrixBase):
    pass

class SoumissionPrix(SoumissionPrixBase):
    id: int
    DateSaisie: datetime