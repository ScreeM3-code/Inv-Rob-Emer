"""Modèles Pydantic pour les soumissions"""
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from typing import Optional, List, Dict

class PieceSoumission(BaseModel):
    RéfPièce: int
    NomPièce: str
    NumPièce: Optional[str] = ""
    NumPièceAutreFournisseur: Optional[str] = ""
    DescriptionPièce: Optional[str] = ""
    Quantite: int
    Prix_unitaire: Optional[float] = 0

class SoumissionCreate(BaseModel):
    RéfFournisseur: int
    EmailsDestinataires: str
    Sujet: str
    MessageCorps: str
    Pieces: List[PieceSoumission]
    User: Optional[str] = "Système"
    Notes: Optional[str] = ""

class Soumission(SoumissionCreate):
    RefSoumission: int
    DateEnvoi: datetime
    Created: datetime
    fournisseur_nom: Optional[str] = None
    Statut: Optional[str] = "Envoyée"
    DateReponse: Optional[datetime] = None
    DateRappel: Optional[datetime] = None
    NoteStatut: Optional[str] = None
    PieceJointe: Optional[str] = None
    prix_recus: Optional[List[Dict]] = []
