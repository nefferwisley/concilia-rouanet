import os
from urllib.parse import quote, urlsplit, urlunsplit
from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "postgresql://rouanet:rouanet_dev_password@localhost:5432/rouanet_concilia"
    # Em provedores como Render, URLs com senha embutida podem ser
    # mascaradas/regravadas pela tela de variáveis. Mantemos a senha como
    # segredo separado e só a inserimos na URI em memória no processo.
    database_password: str = ""
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
    batch_worker_interval_seconds: int = 5

    @model_validator(mode="after")
    def resolve_aliases(self) -> "Settings":
        if self.database_password:
            parsed = urlsplit(self.database_url)
            if parsed.scheme and parsed.hostname:
                username = parsed.username or "postgres"
                hostname = parsed.hostname
                if parsed.port:
                    hostname = f"{hostname}:{parsed.port}"
                self.database_url = urlunsplit(
                    (
                        parsed.scheme,
                        f"{quote(username, safe='')}:"
                        f"{quote(self.database_password, safe='')}@{hostname}",
                        parsed.path,
                        parsed.query,
                        parsed.fragment,
                    )
                )
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

