"""Export tous les routers"""
from .pieces import router as pieces_router
from .fournisseurs import router as fournisseurs_router
from .fabricants import router as fabricants_router
from .commandes import router as commandes_router
from .historique import router as historique_router
from .groupes import router as groupes_router
from .soumissions import router as soumissions_router
from .piece_images import router as piece_images_router
from .uploads import router as uploads_router

__all__ = [
    'pieces_router',
    'piece_images_router',
    'fournisseurs_router',
    'fabricants_router',
    'commandes_router',
    'historique_router',
    'groupes_router',
    'soumissions_router',
    'uploads_router'
]