"""
backend/tests/test_health.py

Asynchronous integration tests for core system endpoints (/health, /).
"""

import pytest
from httpx import ASGITransport, AsyncClient
from backend.app.main import app


@pytest.mark.asyncio
async def test_health_check_returns_ok():
    """Verify that GET /health returns status 200 and expected payload."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.get("/health")

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert "app" in data
    assert "version" in data
    assert "environment" in data
    assert "evolus_configured" in data


@pytest.mark.asyncio
async def test_root_endpoint_returns_metadata():
    """Verify that GET / returns service information and docs links."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.get("/")

    assert response.status_code == 200
    data = response.json()
    assert data["message"] == "Logistics Bottleneck Resolution Agent API"
    assert data["docs"] == "/docs"
    assert data["health"] == "/health"


@pytest.mark.asyncio
async def test_cors_preflight_headers():
    """Verify CORS preflight request responds with permitted origin."""
    headers = {
        "Origin": "http://localhost:5173",
        "Access-Control-Request-Method": "GET",
    }
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.options("/health", headers=headers)

    assert response.status_code == 200
    assert response.headers.get("access-control-allow-origin") == "http://localhost:5173"
