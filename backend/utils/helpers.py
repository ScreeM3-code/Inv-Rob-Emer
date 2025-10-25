"""Fonctions utilitaires réutilisables"""

def safe_string(value) -> str:
    """Convertit une valeur en string sûre"""
    return str(value) if value is not None else ""

def safe_int(value) -> int:
    """Convertit une valeur en int sûr"""
    try:
        return int(value) if value is not None else 0
    except (ValueError, TypeError):
        return 0

def safe_float(value) -> float:
    """Convertit une valeur en float sûr"""
    try:
        return float(value) if value is not None else 0.0
    except (ValueError, TypeError):
        return 0.0

def calculate_qty_to_order(qty_inventaire: int, qty_minimum: int, qty_max: int) -> int:
    """Calcule automatiquement la quantité à commander basée sur le stock critique"""
    qty_inventaire = safe_int(qty_inventaire)
    qty_minimum = safe_int(qty_minimum)
    qty_max = safe_int(qty_max)

    if qty_inventaire < qty_minimum and qty_minimum > 0:
        return qty_minimum - qty_inventaire
    return 0

def get_stock_status(qty_inventaire: int, qty_minimum: int) -> str:
    """Détermine le statut du stock"""
    qty_inventaire = safe_int(qty_inventaire)
    qty_minimum = safe_int(qty_minimum)

    if qty_inventaire < qty_minimum:
        return "critique"
    elif qty_inventaire == qty_minimum:
        return "faible"
    else:
        return "ok"

def extract_domain_from_email(email: str) -> str:
    """Extrait le domaine d'une adresse email"""
    if email and "@" in email:
        return email.split("@")[1].lower()
    return ""