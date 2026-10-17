/**
 * frontend/src/services/exceptionService.ts
 *
 * API service for querying, prioritizing, and managing logistics exceptions.
 */

import { api, PaginatedResult } from './api';
import { ExceptionFilters, ExceptionStatus, ShipmentException } from '../types';

export const exceptionService = {
  /**
   * Retrieves active operational exceptions ordered by risk severity and date.
   */
  async getExceptions(filters?: ExceptionFilters): Promise<PaginatedResult<ShipmentException[]>> {
    return api.getPaginated<ShipmentException[]>('/exceptions', {
      status: filters?.status,
      risk_level: filters?.risk_level,
      shipment_id: filters?.shipment_id,
      skip: filters?.skip ?? 0,
      limit: filters?.limit ?? 50,
    });
  },

  /**
   * Retrieves single exception record by UUID.
   */
  async getExceptionById(id: string): Promise<ShipmentException> {
    return api.get<ShipmentException>(`/exceptions/${id}`);
  },

  /**
   * Manually updates exception status or root cause resolution.
   */
  async updateException(
    id: string,
    update: {
      status?: ExceptionStatus;
      root_cause?: string;
    }
  ): Promise<ShipmentException> {
    return api.put<ShipmentException>(`/exceptions/${id}`, update);
  },
};
