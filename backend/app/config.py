"""
backend/app/config.py

Centralized application configuration using Pydantic Settings v2.
Loads environment variables from .env or system environment with strong typing.
"""

import json
from functools import lru_cache
from typing import Any, List, Optional, Union
from pydantic import Field, field_validator
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
    EVOLUS_BASE_URL: str = Field(default="https://api.evolus.ai")
    EVOLUS_API_KEY: str = Field(default="")
    EVOLUS_APPLICATION_ID: str = Field(default="")
    EVOLUS_MODEL: str = Field(default="own/qwen3.8-27b")
    EVOLUS_WORKFLOW_ID: Optional[str] = Field(default=None)
    EVOLUS_TIMEOUT_SECONDS: float = Field(default=30.0)
    EVOLUS_MAX_RETRIES: int = Field(default=2)

    # Evolus Specialized Agent GUIDs
    EVOLUS_AGENT_BOTTLENECK_ID: Optional[str] = Field(default="d0dfc95d-a7e0-4e72-894c-38d097c1c982")
    EVOLUS_AGENT_CUSTOMS_ID: Optional[str] = Field(default="3c2d286a-3d6f-4f25-8a65-96a8f2906c43")
    EVOLUS_AGENT_COPILOT_ID: Optional[str] = Field(default="a135ef80-84d6-4444-a6ac-a738fd2c65e2")
    EVOLUS_AGENT_CARRIER_ID: Optional[str] = Field(default="efe61372-7c49-4d44-ab01-eada5d276da1")

    # Evolus Workflow GUIDs
    EVOLUS_WORKFLOW_MISSING_DOC_ID: Optional[str] = Field(default="02437050-10a5-489d-b24f-dd73f0d0485a")
    EVOLUS_WORKFLOW_DOC_RECONCILIATION_ID: Optional[str] = Field(default="7e1f9f19-1511-4859-ae9c-3b6a9249a6e7")
    EVOLUS_WORKFLOW_DISPATCH_DELAY_ID: Optional[str] = Field(default="fc199559-0161-442a-bad8-4f59dc081acd")

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
    CORS_ORIGINS: Union[List[str], str] = Field(
        default_factory=lambda: [
            "http://localhost:5173",
            "http://127.0.0.1:5173",
            "http://localhost:3000",
        ]
    )

    @field_validator("DATABASE_URL", mode="before")
    @classmethod
    def normalize_database_url(cls, v: Any) -> Any:
        """
        Normalize Render, Neon, Supabase or standard PostgreSQL URIs to use the asyncpg dialect.
        e.g., 'postgres://' or 'postgresql://' -> 'postgresql+asyncpg://'
        """
        if isinstance(v, str) and v.strip():
            url = v.strip()
            if url.startswith("postgres://"):
                return url.replace("postgres://", "postgresql+asyncpg://", 1)
            elif url.startswith("postgresql://") and not url.startswith("postgresql+asyncpg://"):
                return url.replace("postgresql://", "postgresql+asyncpg://", 1)
        return v

    @field_validator("CORS_ORIGINS", mode="after")
    @classmethod
    def parse_cors_origins(cls, v: Any) -> List[str]:
        """
        Parse comma-separated origins or JSON array strings into a List[str].
        Supports e.g., 'https://yourdomain.com,https://api.yourdomain.com' or '*'
        """
        if isinstance(v, list):
            return [str(item).strip() for item in v if str(item).strip()]
        if isinstance(v, str):
            clean = v.strip()
            if not clean:
                return []
            if clean == "*":
                return ["*"]
            if clean.startswith("[") and clean.endswith("]"):
                try:
                    parsed = json.loads(clean)
                    if isinstance(parsed, list):
                        return [str(item).strip() for item in parsed if str(item).strip()]
                except Exception:
                    pass
            return [origin.strip() for origin in clean.split(",") if origin.strip()]
        return []

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


settings: Settings = get_settings()
