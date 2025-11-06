## Architecture & Points d'intégration clés

API FastAPI + SPA React, où le backend sert aussi le frontend compilé depuis `backend/build/`.

Points d'intégration critiques :
- Frontend build -> Backend : compiler avec `cd frontend && yarn build`, copier dans `backend/build/`
- Backend -> DB : pool asyncpg dans `app.state.pool`, routes utilisent `Depends(get_db_connection)`
- Validation DB -> API : conversion obligatoire des types natifs asyncpg via `row_to_dict` (voir `routes/historique.py`)

## Conventions de code essentielles

1. Routes & Modèles :
```python
# backend/routes/pieces.py
@router.get('/pieces')
async def get_pieces(conn=Depends(get_db_connection)):
    rows = await conn.fetch('SELECT * FROM "Pièce"')  # Attention aux accents/casse
    return [PieceResponse(**row_to_dict(row)) for row in rows]
```

2. Validation de données :
```python
# backend/models/historique.py
class HistoriqueResponse(BaseModel):
    DateRecu: Optional[datetime]
    
    @validator("DateRecu", pre=True)
    def parse_date(cls, v):
        if isinstance(v, (memoryview, bytes)): v = v.decode()
        return dateutil.parser.parse(v) if v else None
```

## Workflows développeur

1. Lancement backend :
   ```bash
   # Dev (avec reload)
   python backend/server.py --dev
   # ou: uvicorn backend.server:app --reload --host 0.0.0.0
   
   # Prod
   python backend/server.py
   ```

2. Variables d'environnement requises (dans `backend/.env`) :
   ```
   POSTGRES_HOST=
   POSTGRES_USER=
   POSTGRES_PASSWORD=
   POSTGRES_DB=
   ```

## Points d'attention

- Colonnes DB : toujours utiliser des guillemets et respecter accents/casse (`"Pièce"`, `"RéfPièce"`)
- Types DB : convertir (memoryview, Decimal) avant création des modèles Pydantic
- Chemins : utiliser `config.BASE_DIR` comme racine (support PyInstaller)
- Logs : tout est dans `InvRob.log`, utile pour debug
