"""Gestion de la connexion à la base de données"""
import asyncpg
import logging
from contextlib import asynccontextmanager
from typing import AsyncGenerator
from fastapi import Request

from config import DATABASE_URL

logger = logging.getLogger("Inventaire-Robot")

@asynccontextmanager
async def lifespan(app):
    """Gestion du cycle de vie de l'application (startup/shutdown)"""
    # STARTUP
    try:
        app.state.pool = await asyncpg.create_pool(
            DATABASE_URL,
            min_size=1,
            max_size=10
        )
        logger.info(f"✅ Connexion PostgreSQL réussie")

        async with app.state.pool.acquire() as conn:
            try:
                c = await conn.fetchval('SELECT COUNT(*) FROM "devices"')
                logger.info(f"✅ {c} équipements trouvés")
            except Exception:
                logger.info("⚠️ Table 'devices' introuvable")
    except Exception as e:
        logger.exception("❌ Erreur connexion PostgreSQL: %s", e)
        app.state.pool = None

    yield

    # SHUTDOWN
    if hasattr(app.state, 'pool') and app.state.pool:
        await app.state.pool.close()
        logger.info("Pool PostgreSQL fermé.")


async def get_db_connection(request: Request) -> AsyncGenerator[asyncpg.Connection, None]:
    """Dependency pour obtenir une connexion DB"""
    pool = request.app.state.pool
    async with pool.acquire() as conn:
        yield conn