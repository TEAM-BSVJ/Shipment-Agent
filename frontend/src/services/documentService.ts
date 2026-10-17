/**
 * frontend/src/services/documentService.ts
 *
 * API client service for document uploads (RULE-F05), field extraction,
 * and automated cross-document reconciliation.
 */

import { api } from './api';
import { DocumentType, ShipmentDocument } from '../types';

export const documentService = {
  /**
   * Uploads and validates a shipping document binary (PDF/PNG/JPEG <= 10MB).
   */
  async uploadDocument(
    shipmentId: string,
    documentType: DocumentType,
    file: File
  ): Promise<ShipmentDocument> {
    const formData = new FormData();
    formData.append('shipment_id', shipmentId);
    formData.append('document_type', documentType);
    formData.append('file', file);

    return api.postForm<ShipmentDocument>('/documents/upload', formData);
  },

  /**
   * Triggers deterministic extraction and cross-document reconciliation.
   */
  async extractDocument(
    documentId: string,
    rawText?: string
  ): Promise<ShipmentDocument> {
    return api.post<ShipmentDocument>(`/documents/${documentId}/extract`, {
      raw_text: rawText,
    });
  },

  /**
   * Retrieves single document metadata and extracted fields.
   */
  async getDocument(documentId: string): Promise<ShipmentDocument> {
    return api.get<ShipmentDocument>(`/documents/${documentId}`);
  },

  /**
   * Retrieves all documents associated with a shipment.
   */
  async getShipmentDocuments(shipmentId: string): Promise<ShipmentDocument[]> {
    return api.get<ShipmentDocument[]>(`/shipments/${shipmentId}/documents`);
  },
};
