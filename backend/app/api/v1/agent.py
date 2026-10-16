"""
backend/app/api/v1/agent.py

FastAPI router for Agent Orchestration & Operational Copilot Chat (TASK-022, TASK-023).
Exposes endpoints for running structured Gemma 4 31B reasoning cycles and interactive Q&A.
"""

import logging
from typing import Any, Dict, List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.agents.orchestrator import (
    AgentOrchestrator,
    ShipmentNotFoundError,
)
from backend.app.db.session import get_db
from backend.app.integrations.evolus_client import EvolusClient
from backend.app.schemas.domain import (
    AgentAnalysisRequest,
    AgentAnalysisResponse,
    AgentChatRequest,
    AgentChatResponse,
)
from backend.app.tools.registry import registry

logger = logging.getLogger("backend.app.api.v1.agent")
router = APIRouter(prefix="/agent", tags=["Agent Orchestrator"])


def get_evolus_client() -> EvolusClient:
    """Dependency provider returning an EvolusClient instance."""
    return EvolusClient()


@router.post(
    "/analyze",
    response_model=AgentAnalysisResponse,
    summary="Trigger diagnostic reasoning and corrective action loop on a shipment",
)
async def analyze_shipment(
    request: AgentAnalysisRequest,
    db: AsyncSession = Depends(get_db),
    evolus_client: EvolusClient = Depends(get_evolus_client),
) -> AgentAnalysisResponse:
    """
    Assembles freight telemetry, prompts Google Gemma 4 31B via Evolus AI,
    dispatches allowlisted tool or routes to human approval gate,
    and returns structured diagnostic analysis.
    """
    orchestrator = AgentOrchestrator(db=db, evolus_client=evolus_client)
    try:
        response = await orchestrator.analyze_shipment(
            shipment_id=request.shipment_id,
            context_notes=request.context_notes,
        )
        return response
    except ShipmentNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        )
    except Exception as exc:
        logger.error("Error analyzing shipment %s: %s", request.shipment_id, exc, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Agent analysis failed: {exc}",
        )


@router.post(
    "/chat",
    response_model=AgentChatResponse,
    summary="Operational Copilot Q&A grounded in verified shipment evidence",
)
async def chat_copilot(
    request: AgentChatRequest,
    db: AsyncSession = Depends(get_db),
    evolus_client: EvolusClient = Depends(get_evolus_client),
) -> AgentChatResponse:
    """
    Answers operational freight inquiries without hallucination,
    grounding answers in verified database records, milestones, and exception logs.
    """
    orchestrator = AgentOrchestrator(db=db, evolus_client=evolus_client)
    try:
        response = await orchestrator.chat(
            message=request.message,
            shipment_id=request.shipment_id,
            conversation_history=request.conversation_history,
        )
        return response
    except Exception as exc:
        logger.error("Error in agent chat: %s", exc, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Agent chat failed: {exc}",
        )


@router.get(
    "/tools",
    response_model=List[Dict[str, Any]],
    summary="List all allowlisted tool schemas available to the agent",
)
async def list_agent_tools() -> List[Dict[str, Any]]:
    """Returns OpenAI/Evolus compatible function calling schemas for the 6 allowlisted tools."""
    return registry.get_schemas()
