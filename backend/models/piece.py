"""Modèles Pydantic pour les pièces"""
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class PieceBase(BaseModel):
    RéfPièce: Optional[int] = None
    NomPièce: Optional[str] = ""
    DescriptionPièce: Optional[str] = ""
    NumPièce: Optional[str] = ""
    RefFabricant: Optional[int] = None
    Lieuentreposage: Optional[str] = ""
    QtéenInventaire: Optional[int] = 0
    Qtéminimum: Optional[int] = 0
    Qtécommandée: Optional[int] = 0
    Datecommande: Optional[datetime] = None
    Qtémax: Optional[int] = 100
    statut_stock: Optional[str] = None
    Prix_unitaire: Optional[float] = 0.0
    Soumission_LD: Optional[str] = ""
    SoumDem: Optional[bool] = False
    RTBS: Optional[int] = None
    NoFESTO: Optional[str] = ""
    Discontinué: Optional[str] = ""

class PieceCreate(BaseModel):
    NomPièce: Optional[str] = ""
    DescriptionPièce: Optional[str] = ""
    NumPièce: Optional[str] = ""
    RefFabricant: Optional[int] = None
    Lieuentreposage: Optional[str] = ""
    QtéenInventaire: Optional[int] = 0
    Qtéminimum: Optional[int] = 0
    Qtémax: Optional[int] = 100
    Qtécommandée: Optional[int] = 0
    statut_stock: Optional[str] = None
    Prix_unitaire: Optional[float] = 0.0
    Soumission_LD: Optional[str] = ""
    SoumDem: Optional[bool] = False
    RTBS: Optional[int] = None
    NoFESTO: Optional[str] = ""

class PieceUpdate(BaseModel):
    NomPièce: Optional[str] = None
    DescriptionPièce: Optional[str] = None
    NumPièce: Optional[str] = None
    RefFabricant: Optional[int] = None
    Lieuentreposage: Optional[str] = None
    QtéenInventaire: Optional[int] = None
    Qtéminimum: Optional[int] = None
    Qtémax: Optional[int] = None
    Qtécommandée: Optional[int] = 0
    Qtéarecevoir: Optional[int] = None
    statut_stock: Optional[str] = None
    Prix_unitaire: Optional[float] = None
    Soumission_LD: Optional[str] = None
    SoumDem: Optional[bool] = False
    RTBS: Optional[int] = None
    NoFESTO: Optional[str] = ""
    Cmd_info: Optional[str] = None
    Datecommande: Optional[str] = None

class Piece(PieceBase):
    Created: Optional[datetime] = None
    Modified: Optional[datetime] = None
    # Nouveau : liste unifiée des fournisseurs (principal en premier, EstPrincipal=True)
    fournisseurs: Optional[List[dict]] = []
    # Raccourcis pratiques calculés depuis fournisseurs
    fournisseur_principal: Optional[dict] = None
    NomFabricant: Optional[str] = ""
    Qtéàcommander: Optional[int] = 0
    Qtéarecevoir: Optional[int] = 0