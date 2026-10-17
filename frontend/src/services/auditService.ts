/**
 * frontend/src/services/auditService.ts
 *
 * API client service for querying immutable audit trail records.
 */

import { api, PaginatedResult } from './api';
import { AuditFilters, AuditLogEntry } from '../types';

export const auditService = {
  /**
   * Retrieves chronological audit logs with entity, actor, and action filters.
   */
  async getAuditLogs(filters?: AuditFilters): Promise<PaginatedResult<AuditLogEntry[]>> {
    return api.getPaginated<AuditLogEntry[]>('/audit', {
      entity_type: filters?.entity_type,
      entity_id: filters?.entity_id,
      actor_type: filters?.actor_type,
      action: filters?.action,
      skip: filters?.skip ?? 0,
      limit: filters?.limit ?? 50,
    });
  },
};
