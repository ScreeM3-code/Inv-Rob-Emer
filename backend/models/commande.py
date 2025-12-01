"""Modèles Pydantic pour les commandes et stats"""
from pydantic import BaseModel
from typing import Optional
from datetime import date

class Commande(BaseModel):
    RéfPièce: int
    NomPièce: Optional[str] = ""
    DescriptionPièce: Optional[str] = ""
    NumPièce: Optional[str] = ""
    RéfFournisseur: Optional[int] = None
    RéfAutreFournisseur: Optional[int] = None
    RefFabricant: Optional[int] = None
    NumPièceAutreFournisseur: Optional[str] = ""
    Lieuentreposage: Optional[str] = ""
    QtéenInventaire: int = 0
    Qtéminimum: int = 0
    Qtémax: int = 100
    Qtécommandée: Optional[int] = 0
    Datecommande: Optional[date] = None
    Qtéreçue: Optional[int] = 0
    Qtéarecevoir: Optional[int] = 0
    Cmd_info: Optional[str] = ""
    Qtéàcommander: Optional[int] = 0
    Prix_unitaire: float = 0.0
    fournisseur_principal: Optional[dict] = None
    autre_fournisseur: Optional[dict] = None
    NomFabricant: Optional[str] = ""
    Soumission_LD: Optional[str] = ""
    SoumDem: Optional[bool] = False
    RTBS: Optional[int] = None
    NoFESTO: Optional[str] = ""

class StatsResponse(BaseModel):
    total_pieces: int
    stock_critique: int
    valeur_stock: float
    pieces_a_commander: int