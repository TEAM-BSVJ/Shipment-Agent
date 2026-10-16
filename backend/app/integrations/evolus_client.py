"""
backend/app/integrations/evolus_client.py

Asynchronous integration client for Evolus AI Platform (https://app.evolus.ai/).
Executes model inferences with gemma4 31B-it, triggers automations,
and interacts with specialized agents using the required headers:
  - X-ApiKey: API Key from Evolus settings
  - X-Application-Id: Application ID header
"""

import os
import logging
from typing import Any, Dict, List, Optional
import httpx
from pydantic import BaseModel, Field
from dotenv import load_dotenv
load_dotenv()

logger = logging.getLogger(__name__)

class EvolusConfig(BaseModel):
    base_url: str = Field(default_factory=lambda: os.getenv("EVOLUS_BASE_URL", "https://app.evolus.ai"))
    api_key: str = Field(default_factory=lambda: os.getenv("EVOLUS_API_KEY", ""))
    application_id: str = Field(default_factory=lambda: os.getenv("EVOLUS_APPLICATION_ID", ""))
    model: str = Field(default_factory=lambda: os.getenv("EVOLUS_MODEL", "gemma4 31B-it"))
    timeout_seconds: float = Field(default=30.0)
    max_retries: int = Field(default=2)

class AgentDiagnosticOutput(BaseModel):
    issue_type: str
    root_cause: str
    evidence: List[str]
    recommended_action: str
    tool_name: str
    tool_input: Dict[str, Any]
    risk_level: str
    confidence: float

class EvolusClient:
    """Production client for Evolus AI Automations, Agents, and Gemma 4 inference."""

    def __init__(self, config: Optional[EvolusConfig] = None):
        self.config = config or EvolusConfig()
        if not self.config.api_key or not self.config.application_id:
            logger.warning(
                "Evolus credentials missing: Please ensure EVOLUS_API_KEY and "
                "EVOLUS_APPLICATION_ID are set in your environment or .env file."
            )
        self.headers = {
            "X-ApiKey": self.config.api_key,
            "X-Application-Id": self.config.application_id,
            "Content-Type": "application/json",
            "Accept": "application/json",
        }

    async def run_gemma_diagnosis(self, prompt_context: str) -> AgentDiagnosticOutput:
        """
        Sends structured prompt context to Evolus AI running gemma4 31B-it.
        Validates response strictly against AgentDiagnosticOutput schema.
        """
        system_instruction = (
            "You are the primary diagnostic engine for an autonomous logistics resolution system. "
            "Analyze the shipment evidence and respond strictly in valid JSON adhering to schema:\n"
            "{\n"
            '  "issue_type": "string",\n'
            '  "root_cause": "string",\n'
            '  "evidence": ["string"],\n'
            '  "recommended_action": "string",\n'
            '  "tool_name": "get_shipment|create_correction_task|trigger_workflow|send_notification|reschedule_milestone|escalate_to_human",\n'
            '  "tool_input": {},\n'
            '  "risk_level": "LOW|MEDIUM|HIGH|CRITICAL",\n'
            '  "confidence": 0.95\n'
            "}"
        )

        payload = {
            "model": self.config.model,
            "messages": [
                {"role": "system", "content": system_instruction},
                {"role": "user", "content": prompt_context},
            ],
            "temperature": 0.1,
            "max_tokens": 1536,
            "response_format": {"type": "json_object"},
        }

        async with httpx.AsyncClient(timeout=self.config.timeout_seconds) as client:
            for attempt in range(1, self.config.max_retries + 2):
                try:
                    logger.info("Executing Evolus inference attempt %d with model %s", attempt, self.config.model)
                    response = await client.post(
                        f"{self.config.base_url.rstrip('/')}/api/v1/chat/completions",
                        headers=self.headers,
                        json=payload,
                    )
                    response.raise_for_status()
                    data = response.json()
                    
                    raw_content = data["choices"][0]["message"]["content"]
                    validated_output = AgentDiagnosticOutput.model_validate_json(raw_content)
                    return validated_output

                except (httpx.HTTPError, KeyError) as exc:
                    logger.warning("Evolus API call failed on attempt %d: %s", attempt, exc)
                    if attempt > self.config.max_retries:
                        logger.error("Exhausted Evolus retries. Entering degraded mode.")
                        raise

    async def trigger_automation(self, automation_id: str, trigger_payload: Dict[str, Any]) -> Dict[str, Any]:
        """
        Triggers an Evolus Automation workflow by ID with contextual payload.
        """
        url = f"{self.config.base_url.rstrip('/')}/api/v1/automations/{automation_id}/trigger"
        async with httpx.AsyncClient(timeout=self.config.timeout_seconds) as client:
            response = await client.post(url, headers=self.headers, json=trigger_payload)
            response.raise_for_status()
            return response.json()

    async def resume_automation_step(self, run_id: str, step_id: str, decision_payload: Dict[str, Any]) -> Dict[str, Any]:
        """
        Resumes an automation waiting at an Approval Gate or Human Step.
        """
        url = f"{self.config.base_url.rstrip('/')}/api/v1/automations/runs/{run_id}/steps/{step_id}/resume"
        async with httpx.AsyncClient(timeout=self.config.timeout_seconds) as client:
            response = await client.post(url, headers=self.headers, json=decision_payload)
            response.raise_for_status()
            return response.json()
