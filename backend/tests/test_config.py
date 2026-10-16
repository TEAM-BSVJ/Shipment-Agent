"""
backend/tests/test_config.py

Unit tests verifying configuration loading, defaults, and validation.
"""

import os
from backend.app.config import Settings, get_settings


def test_default_settings_instantiation():
    """Verify default configuration values without custom environment."""
    settings = Settings()

    assert settings.APP_NAME == "Logistics Bottleneck Resolution Agent"
    assert settings.APP_VERSION == "0.1.0"
    assert settings.API_V1_PREFIX == "/api/v1"
    assert settings.EVOLUS_MODEL == "gemma4 31B-it"
    assert settings.MAX_UPLOAD_SIZE_BYTES == 10 * 1024 * 1024
    assert not settings.is_production


def test_environment_override(monkeypatch):
    """Verify settings pick up environment variable overrides."""
    monkeypatch.setenv("APP_ENV", "production")
    monkeypatch.setenv("LOG_LEVEL", "DEBUG")
    monkeypatch.setenv("EVOLUS_API_KEY", "test_key_123")
    monkeypatch.setenv("EVOLUS_APPLICATION_ID", "test_app_456")

    custom_settings = Settings()

    assert custom_settings.APP_ENV == "production"
    assert custom_settings.is_production is True
    assert custom_settings.LOG_LEVEL == "DEBUG"
    assert custom_settings.EVOLUS_API_KEY == "test_key_123"
    assert custom_settings.has_evolus_credentials is True


def test_get_settings_cached():
    """Verify get_settings returns a singleton instance."""
    s1 = get_settings()
    s2 = get_settings()
    assert s1 is s2
