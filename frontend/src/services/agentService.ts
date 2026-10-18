/**
 * frontend/src/services/agentService.ts
 *
 * API client service for ShipRAG autonomous reasoning loops
 * and interactive Operational Copilot chat over Evolus AI Platform.
 */

import { api } from './api';
import {
  AgentAnalysisRequest,
  AgentAnalysisResponse,
  AgentChatRequest,
  AgentChatResponse,
} from '../types';

export const agentService = {
  /**
   * Triggers an end-to-end autonomous reasoning cycle on a shipment.
   * Assembles freight telemetry, prompts reasoning LLM, dispatches allowlisted tools,
   * routes to human approvals if consequential, and returns structured diagnosis.
   */
  async analyzeShipment(payload: AgentAnalysisRequest): Promise<AgentAnalysisResponse> {
    return api.post<AgentAnalysisResponse>('/agent/analyze', payload);
  },

  /**
   * Submits an interactive query to the Operational Copilot chat loop.
   * Answers are strictly grounded in verified freight records (RULE-E05).
   */
  async sendCopilotMessage(payload: AgentChatRequest): Promise<AgentChatResponse> {
    return api.post<AgentChatResponse>('/agent/chat', payload);
  },

  /**
   * Retrieves the 6 allowlisted function-calling tool definitions.
   */
  async getAllowlistedTools(): Promise<Array<Record<string, unknown>>> {
    return api.get<Array<Record<string, unknown>>>('/agent/tools');
  },
};
