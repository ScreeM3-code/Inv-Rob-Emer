"""Export tous les modèles Pydantic"""
from .piece import PieceBase, PieceCreate, PieceUpdate, Piece
from .fournisseur import FournisseurBase, FournisseurCreate, Fournisseur, Contact, ContactCreate, ContactBase
from .fabricant import FabricantBase, FabricantCreate
from .historique import HistoriqueCreate, HistoriqueResponse
from .commande import Commande, StatsResponse

__all__ = [
    'PieceBase', 'PieceCreate', 'PieceUpdate', 'Piece',
    'FournisseurBase', 'FournisseurCreate', 'Fournisseur', 'Contact', 'ContactCreate', 'ContactBase',
    'FabricantBase', 'FabricantCreate',
    'HistoriqueCreate', 'HistoriqueResponse',
    'Commande', 'StatsResponse'
]