from datetime import datetime
from decimal import Decimal
from typing import Literal, Optional

from pydantic import BaseModel, Field, field_validator


class ProjetoCreate(BaseModel):
    pronac: str = Field(min_length=1)
    nome: str = Field(min_length=1)
    proponente: str = Field(min_length=1)
    pacote_regulatorio: Literal["ROUANET", "FSA_ANCINE"]
    controller: Optional[str] = None
    banco_nome: Optional[str] = None
    agencia: Optional[str] = None
    conta: Optional[str] = None

    @field_validator("pronac", "nome", "proponente")
    @classmethod
    def required_text_is_trimmed_and_not_blank(cls, v, info):
        trimmed = v.strip()
        if not trimmed:
            raise ValueError(f"{info.field_name} não pode ser vazio")
        return trimmed


class ProjetoOut(BaseModel):
    id: str
    pronac: str
    nome: str
    proponente: Optional[str]
    pacote_regulatorio: Literal["ROUANET", "FSA_ANCINE"]
    status_processamento: Literal["EMPTY", "IMPORTING", "REVIEW", "READY"]
    banco: Optional[str] = None
    valor_captado: Optional[float] = None
    criado_em: datetime


class ImportacaoIniciarResponse(BaseModel):
    importacao_id: str
    projeto_id: str
    status: str
    progresso: int
    ws_url: str


class ImportacaoStatus(BaseModel):
    importacao_id: str
    projeto_id: str
    status: str
    progresso: int
    linhas_processadas: int
    linhas_total: Optional[int] = None
    linhas_ok: int
    linhas_erro: int
    linhas_alerta: int
    mensagem: Optional[str] = None


class ImportManifestFileItem(BaseModel):
    relative_path: str = Field(min_length=1)
    original_name: str = Field(min_length=1)
    browser_mime: Optional[str] = None
    size_bytes: int = Field(ge=0)
    sha256: str = Field(pattern=r"^[0-9a-f]{64}$")


class ImportManifestCreate(BaseModel):
    files: list[ImportManifestFileItem]


class ImportFileOut(BaseModel):
    id: str
    relative_path: str
    original_name: str
    storage_key: str
    size_bytes: int
    sha256: str
    status: str
    detected_type: Optional[str] = None
    error_code: Optional[str] = None
    error_message: Optional[str] = None


class ImportManifestResponse(BaseModel):
    importacao_id: str
    projeto_id: str
    status: str
    total_files: int
    files: list[ImportFileOut]


class ImportBatchStatusOut(BaseModel):
    importacao_id: str
    projeto_id: str
    status: str
    total_files: int
    uploaded_files: int
    processed_files: int
    failed_files: int
    declared_entries_count: int
    bank_movements_count: int


class ProjetoUpdate(BaseModel):
    nome: Optional[str] = Field(None, min_length=3, max_length=255)
    proponente: Optional[str] = Field(None, max_length=255)
    controller: Optional[str] = Field(None, max_length=255)
    banco: Optional[str] = Field(None, max_length=255)
    valor_captado: Optional[float] = Field(None, ge=0)

    @field_validator("nome")
    @classmethod
    def nome_not_empty(cls, v):
        if v is None:
            return v
        trimmed = v.strip()
        if len(trimmed) < 3:
            raise ValueError("Nome deve ter ao menos 3 caracteres")
        return trimmed

    @field_validator("proponente")
    @classmethod
    def proponente_not_blank(cls, v):
        if v is None or len(v.strip()) == 0:
            raise ValueError("Proponente não pode ser vazio")
        return v.strip()
