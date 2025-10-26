"""Export tous les routers"""
from .pieces import router as pieces_router
from .fournisseurs import router as fournisseurs_router
from .fabricants import router as fabricants_router
from .commandes import router as commandes_router
from .historique import router as historique_router

__all__ = [
    'pieces_router',
    'fournisseurs_router',
    'fabricants_router',
    'commandes_router',
    'historique_router'
]