"""Modèles Pydantic pour l'historique"""
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

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
        from_attributes = True