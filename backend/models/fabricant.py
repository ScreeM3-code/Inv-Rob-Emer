"""Modèles Pydantic pour les fabricants"""
from pydantic import BaseModel
from typing import Optional

class FabricantBase(BaseModel):
    NomFabricant: str
    Domaine: Optional[str] = ""
    NomContact: Optional[str] = ""
    TitreContact: Optional[str] = ""
    Email: Optional[str] = ""

class FabricantCreate(FabricantBase):
    pass