# Dans backend/models/historique.py, remplace le validator par celui-ci :

from pydantic import BaseModel, validator
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


class HistoriqueResponse(BaseModel):
    DateCMD: Optional[datetime]
    DateRecu: Optional[datetime]
    Opération: Optional[str]
    numpiece: Optional[str]
    description: Optional[str]
    qtécommande: Optional[str]
    QtéSortie: Optional[str]
    nompiece: Optional[str]
    RéfPièce: Optional[float]
    User: Optional[str]
    Delais: Optional[float]

    # ✅ NOUVEAU : Validator simplifié qui accepte None, string ISO, et datetime
    @validator("DateCMD", "DateRecu", pre=True, always=True)
    def parse_date(cls, v):
        if v is None:
            return None
        if isinstance(v, datetime):
            return v
        if isinstance(v, str):
            try:
                return datetime.fromisoformat(v.replace('Z', '+00:00'))
            except Exception:
                return None
        return None

    class Config:
        arbitrary_types_allowed = True