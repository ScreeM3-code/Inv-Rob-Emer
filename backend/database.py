# backend/database.py - REMPLACE TOUT LE FICHIER

import asyncpg
import logging
import os
from typing import AsyncGenerator
from fastapi import Request

# Variables d'environnement AWS Lambda
DATABASE_URL = os.getenv(
    'DATABASE_URL',
    f"postgresql://{os.getenv('POSTGRES_USER')}:{os.getenv('POSTGRES_PASSWORD')}@"
    f"{os.getenv('POSTGRES_HOST')}:{os.getenv('POSTGRES_PORT', '5432')}/{os.getenv('POSTGRES_DB')}"
)

logger = logging.getLogger("Inventaire-Robot")

# ✅ POOL GLOBAL (partagé entre invocations Lambda)
_pool = None

async def get_pool():
    """Retourne ou crée le pool de connexions"""
    global _pool
    if _pool is None:
        try:
            _pool = await asyncpg.create_pool(
                DATABASE_URL,
                min_size=1,
                max_size=5,  # Lambda a des limites de connexions
                command_timeout=60
            )
            logger.info("✅ Pool PostgreSQL créé pour Lambda")
        except Exception as e:
            logger.error(f"❌ Erreur création pool: {e}")
            raise
    return _pool

async def get_db_connection(request: Request = None) -> AsyncGenerator[asyncpg.Connection, None]:
    """Dependency pour obtenir une connexion DB"""
    pool = await get_pool()
    async with pool.acquire() as conn:
        yield conn

# Fonction de cleanup (optionnelle, pour tests locaux)
async def close_pool():
    global _pool
    if _pool:
        await _pool.close()
        _pool = None
        logger.info("Pool fermé")