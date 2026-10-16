"""
backend/app/config.py

Centralized application configuration using Pydantic Settings v2.
Loads environment variables from .env or system environment with strong typing.
"""

from functools import lru_cache
from typing import List, Optional
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    # Application
    APP_NAME: str = "Logistics Bottleneck Resolution Agent"
    APP_VERSION: str = "0.1.0"
    APP_ENV: str = Field(default="development", description="development | staging | production")
    LOG_LEVEL: str = Field(default="INFO", description="DEBUG | INFO | WARNING | ERROR | CRITICAL")
    API_V1_PREFIX: str = "/api/v1"

    # Database
    DATABASE_URL: str = Field(
        default="postgresql+asyncpg://postgres:postgres@localhost:5432/logistics_db",
        description="Async SQLAlchemy database connection URI",
    )

    # Evolus AI Platform Configuration
    EVOLUS_BASE_URL: str = Field(default="https://app.evolus.ai")
    EVOLUS_API_KEY: str = Field(default="")
    EVOLUS_APPLICATION_ID: str = Field(default="")
    EVOLUS_MODEL: str = Field(default="gemma4 31B-it")
    EVOLUS_WORKFLOW_ID: Optional[str] = Field(default=None)
    EVOLUS_TIMEOUT_SECONDS: float = Field(default=30.0)
    EVOLUS_MAX_RETRIES: int = Field(default=2)

    # Token Factory API / Fallback Configuration
    TOKEN_FACTORY_BASE_URL: str = Field(default="https://api.tokenfactory.nebius.com/v1")
    TOKEN_FACTORY_API_KEY: str = Field(default="")
    GEMMA_MODEL_NAME: str = Field(default="google/gemma-4-31b-it")

    # Document Processing & Storage
    DOCUMENT_STORAGE_DIR: str = Field(default="./data/documents")
    OCR_ENABLED: bool = Field(default=True)
    MAX_UPLOAD_SIZE_BYTES: int = Field(default=10 * 1024 * 1024)  # 10 MB

    # Notifications & External Providers
    NOTIFICATION_PROVIDER: str = Field(default="mock", description="mock | smtp | webhook")

    # CORS & Security
    CORS_ORIGINS: List[str] = Field(
        default_factory=lambda: [
            "http://localhost:5173",
            "http://127.0.0.1:5173",
            "http://localhost:3000",
        ]
    )

    @property
    def is_production(self) -> bool:
        return self.APP_ENV.lower() == "production"

    @property
    def has_evolus_credentials(self) -> bool:
        return bool(self.EVOLUS_API_KEY.strip() and self.EVOLUS_APPLICATION_ID.strip())


@lru_cache()
def get_settings() -> Settings:
    """Returns a cached singleton of application settings."""
    return Settings()
