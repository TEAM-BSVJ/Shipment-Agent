"""
backend/tests/test_evolus_client.py

Unit tests for the Evolus AI integration client, verifying prompt sanitization,
JSON schema validation, retry policies, offline mock fallbacks, and automation triggers.
"""

import json
import uuid
import pytest
import httpx

from backend.app.integrations.evolus_client import (
    EvolusClient,
    EvolusConfig,
    build_diagnostic_prompt,
)
from backend.app.schemas.domain import AgentDiagnosticOutput
from backend.app.schemas.enums import RiskLevel, ToolName


def test_evolus_config_instantiation_from_settings():
    """Verify configuration loads properly from centralized app settings."""
    config = EvolusConfig(
        base_url="https://app.evolus.ai",
        api_key="test_api_key",
        application_id="test_app_id",
        model="gemma4 31B-it",
        mock_mode=True,
    )
    client = EvolusClient(config=config)

    assert client.config.base_url == "https://app.evolus.ai"
    assert client.headers["X-ApiKey"] == "test_api_key"
    assert client.headers["X-Application-Id"] == "test_app_id"
    assert client.config.model == "gemma4 31B-it"
    assert client.config.mock_mode is True


def test_build_diagnostic_prompt_sanitization():
    """Verify prompt wrapping untrusted evidence in <user_data> XML tags (RULE-F02)."""
    shipment_payload = {
        "id": str(uuid.uuid4()),
        "tracking_number": "SHP-TEST-101",
        "status": "AT_WAREHOUSE",
        "origin": "Mumbai Dock 4",
        "destination": "Rotterdam Terminal 1",
        "mode": "SEA",
        "risk_score": 65,
        "milestones": [
            {
                "name": "WAREHOUSE_DISPATCH",
                "status": "PENDING",
                "expected_at": "2026-10-16T12:00:00Z",
                "actual_at": None,
            }
        ],
        "documents": [
            {"document_type": "PACKING_LIST", "validation_status": "VALIDATED"}
        ],
        "exceptions": [
            {
                "type": "MILESTONE_OVERDUE",
                "status": "OPEN",
                "description": "Warehouse dispatch delayed by 4 hours",
            }
        ],
    }

    prompt = build_diagnostic_prompt(
        shipment_payload,
        context_notes="Driver reported gate queue congestion.",
    )

    # Prompt injection safety verification (RULE-F02)
    assert "<user_data>" in prompt
    assert "</user_data>" in prompt
    assert "UNTRUSTED DATA" in prompt
    assert "SHP-TEST-101" in prompt
    assert "Driver reported gate queue congestion." in prompt

    # Target token context bounds verification (approx 4 chars/token <= 1200 tokens)
    assert len(prompt) < 4800


@pytest.mark.asyncio
async def test_mock_diagnosis_weight_mismatch():
    """Verify mock mode returns high-risk weight mismatch diagnosis with create_correction_task."""
    client = EvolusClient(config=EvolusConfig(mock_mode=True))
    prompt = "Shipment SHP-101 has WEIGHT_MISMATCH between invoice (250 kg) and packing list (310 kg)."

    output = await client.run_gemma_diagnosis(prompt)

    assert isinstance(output, AgentDiagnosticOutput)
    assert output.issue_type == "WEIGHT_MISMATCH"
    assert output.tool_name == ToolName.CREATE_CORRECTION_TASK
    assert output.risk_level == RiskLevel.HIGH
    assert output.confidence >= 0.9
    assert len(output.evidence) > 0


@pytest.mark.asyncio
async def test_mock_diagnosis_milestone_overdue():
    """Verify mock mode returns milestone delay diagnosis with reschedule_milestone."""
    client = EvolusClient(config=EvolusConfig(mock_mode=True))
    prompt = "Shipment SHP-102 milestone WAREHOUSE_DISPATCH is overdue by 3.5 hours."

    output = await client.run_gemma_diagnosis(prompt)

    assert isinstance(output, AgentDiagnosticOutput)
    assert output.issue_type == "MILESTONE_OVERDUE"
    assert output.tool_name == ToolName.RESCHEDULE_MILESTONE
    assert output.risk_level == RiskLevel.MEDIUM


@pytest.mark.asyncio
async def test_mock_diagnosis_missing_document():
    """Verify mock mode returns missing document diagnosis with send_notification."""
    client = EvolusClient(config=EvolusConfig(mock_mode=True))
    prompt = "Missing commercial invoice for international sea shipment SHP-101."

    output = await client.run_gemma_diagnosis(prompt)

    assert isinstance(output, AgentDiagnosticOutput)
    assert output.issue_type == "MISSING_DOCUMENT"
    assert output.tool_name == ToolName.SEND_NOTIFICATION
    assert output.risk_level == RiskLevel.HIGH


@pytest.mark.asyncio
async def test_live_inference_with_mock_transport():
    """Verify full HTTP chat completion lifecycle, dual-header passing, and JSON parsing."""
    expected_response_payload = {
        "id": "chatcmpl-test-123",
        "object": "chat.completion",
        "choices": [
            {
                "index": 0,
                "message": {
                    "role": "assistant",
                    "content": json.dumps(
                        {
                            "issue_type": "WEIGHT_MISMATCH",
                            "root_cause": "Invoice weight differs from packing list.",
                            "evidence": ["Invoice weight: 250kg", "Packing list: 310kg"],
                            "recommended_action": "Request revised commercial invoice",
                            "tool_name": "create_correction_task",
                            "tool_input": {
                                "shipment_id": str(uuid.uuid4()),
                                "description": "Revise commercial invoice",
                            },
                            "risk_level": "HIGH",
                            "confidence": 0.96,
                        }
                    ),
                },
                "finish_reason": "stop",
            }
        ],
    }

    async def mock_handler(request: httpx.Request):
        assert request.url.path == "/api/v1/chat/completions"
        assert request.headers["X-ApiKey"] == "evo_test_key"
        assert request.headers["X-Application-Id"] == "evo_app_123"
        return httpx.Response(200, json=expected_response_payload)

    transport = httpx.MockTransport(mock_handler)
    async with httpx.AsyncClient(transport=transport) as mock_http_client:
        client = EvolusClient(
            config=EvolusConfig(
                api_key="evo_test_key",
                application_id="evo_app_123",
                mock_mode=False,
            ),
            http_client=mock_http_client,
        )

        output = await client.run_gemma_diagnosis("Analyze shipment evidence...")

        assert isinstance(output, AgentDiagnosticOutput)
        assert output.issue_type == "WEIGHT_MISMATCH"
        assert output.tool_name == ToolName.CREATE_CORRECTION_TASK
        assert output.risk_level == RiskLevel.HIGH


@pytest.mark.asyncio
async def test_live_inference_retry_on_server_error():
    """Verify client attempts retry on transient 500 error before succeeding on second attempt."""
    attempts = 0

    async def retry_handler(request: httpx.Request):
        nonlocal attempts
        attempts += 1
        if attempts == 1:
            return httpx.Response(500, text="Internal Server Error")
        
        return httpx.Response(
            200,
            json={
                "choices": [
                    {
                        "message": {
                            "content": json.dumps(
                                {
                                    "issue_type": "MILESTONE_OVERDUE",
                                    "root_cause": "Vessel delayed",
                                    "evidence": ["Delayed 24h"],
                                    "recommended_action": "Reschedule ETA",
                                    "tool_name": "reschedule_milestone",
                                    "tool_input": {},
                                    "risk_level": "MEDIUM",
                                    "confidence": 0.90,
                                }
                            )
                        }
                    }
                ]
            },
        )

    transport = httpx.MockTransport(retry_handler)
    async with httpx.AsyncClient(transport=transport) as mock_http_client:
        client = EvolusClient(
            config=EvolusConfig(
                api_key="evo_key",
                application_id="evo_app",
                max_retries=2,
                mock_mode=False,
            ),
            http_client=mock_http_client,
        )

        output = await client.run_gemma_diagnosis("Test prompt")
        assert attempts == 2
        assert output.issue_type == "MILESTONE_OVERDUE"


@pytest.mark.asyncio
async def test_live_inference_exhausted_retries_raises_runtime_error():
    """Verify persistent network failures raise RuntimeError after exhausting retry budget."""
    async def always_fail_handler(request: httpx.Request):
        return httpx.Response(503, text="Service Unavailable")

    transport = httpx.MockTransport(always_fail_handler)
    async with httpx.AsyncClient(transport=transport) as mock_http_client:
        client = EvolusClient(
            config=EvolusConfig(
                api_key="evo_key",
                application_id="evo_app",
                max_retries=1,
                mock_mode=False,
            ),
            http_client=mock_http_client,
        )

        with pytest.raises(RuntimeError) as exc_info:
            await client.run_gemma_diagnosis("Test prompt")
        assert "Evolus AI inference failed after 2 attempts" in str(exc_info.value)


@pytest.mark.asyncio
async def test_trigger_automation_mock_and_live():
    """Verify trigger_automation execution in mock mode and simulated HTTP mode."""
    # Mock mode
    mock_client = EvolusClient(config=EvolusConfig(mock_mode=True))
    res_mock = await mock_client.trigger_automation("auto-123", {"order_id": "ORD-1"})
    assert res_mock["status"] == "QUEUED"
    assert res_mock["mock"] is True

    # HTTP Transport mode
    async def auto_handler(request: httpx.Request):
        assert "/api/v1/automations/auto-456/trigger" in request.url.path
        return httpx.Response(200, json={"execution_id": "exec-789", "status": "STARTED"})

    async with httpx.AsyncClient(transport=httpx.MockTransport(auto_handler)) as http_client:
        live_client = EvolusClient(
            config=EvolusConfig(api_key="k", application_id="a", mock_mode=False),
            http_client=http_client,
        )
        res_live = await live_client.trigger_automation("auto-456", {})
        assert res_live["execution_id"] == "exec-789"
        assert res_live["status"] == "STARTED"


@pytest.mark.asyncio
async def test_resume_automation_step_mock_and_live():
    """Verify resume_automation_step execution in mock mode and simulated HTTP mode."""
    # Mock mode
    mock_client = EvolusClient(config=EvolusConfig(mock_mode=True))
    res_mock = await mock_client.resume_automation_step("run-1", "step-2", {"decision": "APPROVED"})
    assert res_mock["status"] == "RESUMED"
    assert res_mock["decision"]["decision"] == "APPROVED"

    # HTTP Transport mode
    async def resume_handler(request: httpx.Request):
        assert "/api/v1/automations/runs/run-99/steps/step-88/resume" in request.url.path
        return httpx.Response(200, json={"status": "RESUMED", "run_id": "run-99"})

    async with httpx.AsyncClient(transport=httpx.MockTransport(resume_handler)) as http_client:
        live_client = EvolusClient(
            config=EvolusConfig(api_key="k", application_id="a", mock_mode=False),
            http_client=http_client,
        )
        res_live = await live_client.resume_automation_step("run-99", "step-88", {"approved": True})
        assert res_live["status"] == "RESUMED"

