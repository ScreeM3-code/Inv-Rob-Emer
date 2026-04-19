from pydantic import BaseModel, Field
from typing import Optional, Dict, Any

class FeaturesConfig(BaseModel):
    bon_de_commande: bool = True
    ereq_sap: bool = True
    approbation: bool = True
    code_barre: bool = True
    groupes: bool = True
    export_excel: bool = True

class AppSettingsRequest(BaseModel):
    site_name: Optional[str] = None
    site_description: Optional[str] = None
    piece_label: Optional[str] = None
    bc_prefix: Optional[str] = None
    bc_format: Optional[str] = None
    bc_next_sequence: Optional[int] = None
    email_host: Optional[str] = None
    email_port: Optional[int] = None
    email_from: Optional[str] = None
    email_user: Optional[str] = None
    email_password: Optional[str] = None
    email_tls: Optional[bool] = None
    email_ssl: Optional[bool] = None
    features: Optional[FeaturesConfig] = None

class AppSettingsResponse(BaseModel):
    site_name: str
    site_description: str
    piece_label: str
    bc_prefix: str
    bc_format: str
    bc_next_sequence: int
    email_host: str
    email_port: int
    email_from: str
    email_user: str
    email_password: str
    email_tls: bool
    email_ssl: bool
    features: Dict[str, Any] = Field(default_factory=dict)
