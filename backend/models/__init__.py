"""Export tous les modèles Pydantic"""
from .piece import PieceBase, PieceCreate, PieceUpdate, Piece, ImageUrlRequest
from .fournisseur import FournisseurBase, FournisseurCreate, Fournisseur, Contact, ContactCreate, ContactBase
from .fabricant import FabricantBase, FabricantCreate
from .historique import HistoriqueCreate, HistoriqueResponse
from .commande import Commande, StatsResponse, ApprobationRequest
from .soumission import SoumissionCreate, Soumission, PieceSoumission
from .soumission_prix import SoumissionPrixBase, SoumissionPrixCreate, SoumissionPrix
from .user import (
    LoginRequest, CreateUserRequest, UserResponse,
    ForgotPasswordRequest, ResetPasswordRequest,
    UpdateUserRequest, CreateGroupRequest, UpdateGroupRequest,
    NotifPrefsRequest,
)
from .groupe import (
    CategorieBase, CategorieCreate, Categorie,
    GroupeBase, GroupeCreate, Groupe,
    GroupePieceBase, GroupePieceCreate, GroupePiece,
    GroupeComplet
)

__all__ = [
    'PieceBase', 'PieceCreate', 'PieceUpdate', 'Piece', 'ImageUrlRequest',
    'FournisseurBase', 'FournisseurCreate', 'Fournisseur', 'Contact', 'ContactCreate', 'ContactBase',
    'FabricantBase', 'FabricantCreate',
    'HistoriqueCreate', 'HistoriqueResponse',
    'Commande', 'StatsResponse', 'ApprobationRequest',
    'CategorieBase', 'CategorieCreate', 'Categorie',
    'GroupeBase', 'GroupeCreate', 'Groupe',
    'GroupePieceBase', 'GroupePieceCreate', 'GroupePiece',
    'GroupeComplet',
    'SoumissionCreate', 'Soumission', 'PieceSoumission',
    'SoumissionPrixBase', 'SoumissionPrixCreate', 'SoumissionPrix',
    'LoginRequest', 'CreateUserRequest', 'UserResponse',
    'ForgotPasswordRequest', 'ResetPasswordRequest',
    'UpdateUserRequest', 'CreateGroupRequest', 'UpdateGroupRequest',
    'NotifPrefsRequest',
]