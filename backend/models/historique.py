"""Modèles Pydantic pour l'historique"""
from pydantic import BaseModel, validator
from typing import Optional
from datetime import datetime
import dateutil.parser

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

    @validator("DateRecu", pre=True, always=True)
    def parse_daterecu(cls, v):
        if v is None:
            return None
        # already a datetime
        if isinstance(v, datetime):
            return v
        # bytes / memoryview -> str
        if isinstance(v, memoryview):
            v = v.tobytes().decode()
        if isinstance(v, (bytes, bytearray)):
            v = bytes(v).decode()
        # numeric timestamp
        if isinstance(v, (int, float)):
            try:
                return datetime.fromtimestamp(v)
            except Exception:
                raise ValueError(f"Invalid timestamp for DateRecu: {v!r}")
        # string: try isoformat then dateutil fallback
        if isinstance(v, str):
            try:
                return datetime.fromisoformat(v)
            except Exception:
                try:
                    return dateutil.parser.parse(v)
                except Exception:
                    raise ValueError(f"Invalid datetime string for DateRecu: {v!r}")
        raise ValueError(f"Unsupported type for DateRecu: {type(v)}")