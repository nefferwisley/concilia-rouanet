import os
from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "postgresql://rouanet:rouanet_dev_password@localhost:5432/rouanet_concilia"
    supabase_jwt_secret: str = "dev-secret-key-min-32-chars-long-!!!"
    supabase_url: str = ""     # https://xxxx.supabase.co
    supabase_service_role_key: str = ""  # Service role key pra bypassar RLS no Storage
    google_api_key: str = ""
    # Ambiente: "dev" habilita o login de demonstração SEM autenticação
    # (routes/dev_demo.py); qualquer outro valor desabilita a rota.
    app_env: str = "dev"
    # Backend de leitura automática de documentos (P4): "" (auto: Gemini se
    # houver chave, Ollama local caso contrário), "gemini" ou "ollama".
    ocr_backend: str = ""
    cors_origins: str = "*"
    max_upload_mb: int = 25
    ocr_max_pages_per_doc: int = 10
    batch_worker_concurrency: int = 10

    @model_validator(mode="after")
    def resolve_aliases(self) -> "Settings":
        if not self.google_api_key:
            self.google_api_key = os.environ.get("GEMINI_API_KEY", "") or os.environ.get("GOOGLE_API_KEY", "")
        if not self.supabase_service_role_key:
            self.supabase_service_role_key = (
                os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
                or os.environ.get("SUPABASE_KEY", "")
            )
        if not self.supabase_url:
            self.supabase_url = os.environ.get("SUPABASE_URL", "")
        return self


settings = Settings()

