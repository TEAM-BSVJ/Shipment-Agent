/**
 * frontend/src/services/shipmentService.ts
 *
 * API service for querying, creating, and updating shipments and milestones.
 */

import { api, PaginatedResult } from './api';
import { Shipment, ShipmentEvent, ShipmentFilters } from '../types';

export const shipmentService = {
  /**
   * Retrieves a paginated and filtered list of shipments with total count.
   */
  async getShipments(filters?: ShipmentFilters): Promise<PaginatedResult<Shipment[]>> {
    return api.getPaginated<Shipment[]>('/shipments', {
      status: filters?.status,
      business_priority: filters?.business_priority,
      risk_level: filters?.risk_level,
      mode: filters?.mode,
      search: filters?.search,
      skip: filters?.skip ?? 0,
      limit: filters?.limit ?? 50,
    });
  },

  /**
   * Retrieves detailed information for a single shipment by UUID.
   */
  async getShipmentById(id: string): Promise<Shipment> {
    return api.get<Shipment>(`/shipments/${id}`);
  },

  /**
   * Registers a new shipment with initial milestones.
   */
  async createShipment(payload: Partial<Shipment>): Promise<Shipment> {
    return api.post<Shipment>('/shipments', payload);
  },

  /**
   * Idempotently ingests tracking event telemetry from carrier or WMS.
   */
  async ingestEvent(
    shipmentId: string,
    eventData: {
      event_type: string;
      event_data?: Record<string, unknown>;
      source?: string;
      idempotency_key: string;
    }
  ): Promise<ShipmentEvent> {
    return api.post<ShipmentEvent>(`/shipments/${shipmentId}/events`, {
      shipment_id: shipmentId,
      event_type: eventData.event_type,
      event_data: eventData.event_data || {},
      source: eventData.source || 'MOCK_TELEMETRY',
      idempotency_key: eventData.idempotency_key,
    });
  },
};
