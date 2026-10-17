/**
 * frontend/src/services/approvalService.ts
 *
 * API service for querying pending Human-in-the-Loop approval requests (RULE-E06)
 * and submitting human authorizations/rejections.
 */

import { api, PaginatedResult } from './api';
import { ApprovalDecisionPayload, ApprovalFilters, ApprovalRequest } from '../types';

export const approvalService = {
  /**
   * Retrieves pending or reviewed human approval requests.
   */
  async getApprovals(filters?: ApprovalFilters): Promise<PaginatedResult<ApprovalRequest[]>> {
    return api.getPaginated<ApprovalRequest[]>('/approvals', {
      decision: filters?.decision,
      skip: filters?.skip ?? 0,
      limit: filters?.limit ?? 50,
    });
  },

  /**
   * Retrieves single approval record by UUID.
   */
  async getApprovalById(id: string): Promise<ApprovalRequest> {
    return api.get<ApprovalRequest>(`/approvals/${id}`);
  },

  /**
   * Submits human approval decision ('APPROVED' or 'REJECTED') with reason notes.
   */
  async decideApproval(id: string, payload: ApprovalDecisionPayload): Promise<ApprovalRequest> {
    return api.post<ApprovalRequest>(`/approvals/${id}/decide`, payload);
  },
};
