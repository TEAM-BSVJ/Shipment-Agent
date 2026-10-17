/**
 * frontend/src/types/index.ts
 *
 * Strict TypeScript interfaces and domain enums synchronized with backend Pydantic schemas
 * (backend/app/schemas/domain.py & backend/app/schemas/enums.py) per RULE-D01.
 */

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export type TransportMode = 'SEA' | 'AIR' | 'ROAD' | 'RAIL';

export type BusinessPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type ShipmentStatus =
  | 'BOOKED'
  | 'PICKED_UP'
  | 'IN_TRANSIT'
  | 'AT_WAREHOUSE'
  | 'CUSTOMS_HOLD'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'EXCEPTION'
  | 'CANCELLED';

export type MilestoneName =
  | 'BOOKING_CONFIRMED'
  | 'PICKUP_SCHEDULED'
  | 'PICKUP_COMPLETED'
  | 'WAREHOUSE_RECEIPT'
  | 'WAREHOUSE_DISPATCH'
  | 'PORT_ARRIVAL'
  | 'CUSTOMS_CLEARANCE'
  | 'VESSEL_DEPARTURE'
  | 'DESTINATION_ARRIVAL'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED';

export type DocumentType =
  | 'COMMERCIAL_INVOICE'
  | 'PACKING_LIST'
  | 'BILL_OF_LADING'
  | 'AIR_WAYBILL'
  | 'CERTIFICATE_OF_ORIGIN'
  | 'CUSTOMS_DECLARATION'
  | 'OTHER';

export type DocumentValidationStatus = 'PENDING' | 'VALIDATED' | 'FLAGGED' | 'REJECTED';

export type ExceptionType =
  | 'MISSING_DOCUMENT'
  | 'WEIGHT_MISMATCH'
  | 'CONSIGNEE_MISMATCH'
  | 'MILESTONE_OVERDUE'
  | 'CUSTOMS_REJECTION'
  | 'CARRIER_DELAY'
  | 'ADDRESS_ISSUE'
  | 'COMMUNICATION_BREAKDOWN';

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type ExceptionStatus =
  | 'OPEN'
  | 'INVESTIGATING'
  | 'IN_PROGRESS'
  | 'PENDING_APPROVAL'
  | 'RESOLVED'
  | 'DISMISSED';

export type ActionType =
  | 'REQUEST_DOCUMENT'
  | 'RESCHEDULE_MILESTONE'
  | 'SEND_NOTIFICATION'
  | 'TRIGGER_AUTOMATION'
  | 'ESCALATE_TO_HUMAN';

export type ActionStatus =
  | 'PENDING'
  | 'WAITING_APPROVAL'
  | 'EXECUTING'
  | 'COMPLETED'
  | 'FAILED'
  | 'REJECTED';

export type ApprovalDecision = 'PENDING' | 'APPROVED' | 'REJECTED';

export type NotificationChannel = 'EMAIL' | 'SMS' | 'WHATSAPP' | 'WEBHOOK';

export type NotificationStatus = 'QUEUED' | 'SENT' | 'FAILED' | 'DELIVERED';

export type ToolName =
  | 'get_shipment'
  | 'create_correction_task'
  | 'trigger_workflow'
  | 'send_notification'
  | 'reschedule_milestone'
  | 'escalate_to_human';

// ---------------------------------------------------------------------------
// Entity Interfaces
// ---------------------------------------------------------------------------

export interface ShipmentMilestone {
  id: string;
  shipment_id: string;
  milestone_name: MilestoneName;
  expected_at: string;
  completed_at?: string | null;
  is_completed: boolean;
  source: string;
  created_at?: string;
}

export interface DocumentExtractedFields {
  invoice_number?: string | null;
  issuer?: string | null;
  consignee?: string | null;
  total_weight_kg?: number | null;
  declared_value?: number | null;
  currency?: string | null;
  issue_date?: string | null;
  notes?: string | null;
  raw_text_snippet?: string | null;
}

export interface ShipmentDocument {
  id: string;
  shipment_id: string;
  document_type: DocumentType;
  file_ref: string;
  extraction_id?: string | null;
  extracted_fields?: DocumentExtractedFields | null;
  confidence: number;
  validation_status: DocumentValidationStatus;
  validated_by?: string | null;
  expiry_date?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface Shipment {
  id: string;
  tracking_number: string;
  origin: string;
  destination: string;
  mode: TransportMode;
  carrier_id: string;
  promised_delivery_date: string;
  business_priority: BusinessPriority;
  status: ShipmentStatus;
  risk_score: number;
  risk_level: RiskLevel;
  tenant_id: string;
  created_at?: string;
  updated_at?: string;
  milestones: ShipmentMilestone[];
  documents: ShipmentDocument[];
}

export interface ShipmentEvent {
  id: string;
  shipment_id: string;
  event_type: string;
  event_data: Record<string, unknown>;
  source: string;
  event_at: string;
  idempotency_key: string;
}

export interface ShipmentException {
  id: string;
  shipment_id: string;
  exception_type: ExceptionType;
  risk_level: RiskLevel;
  status: ExceptionStatus;
  description: string;
  evidence: string[];
  root_cause?: string | null;
  detected_at?: string;
  resolved_at?: string | null;
  resolved_by?: string | null;
}

export interface CorrectiveAction {
  id: string;
  exception_id: string;
  action_type: ActionType;
  status: ActionStatus;
  tool_used: ToolName;
  input_data: Record<string, unknown>;
  output_data?: Record<string, unknown> | null;
  idempotency_key: string;
  created_at: string;
  executed_at?: string | null;
}

export interface ApprovalRequest {
  id: string;
  action_id: string;
  requested_at: string;
  reviewed_at?: string | null;
  reviewer_id?: string | null;
  decision: ApprovalDecision;
  reason?: string | null;
}

export interface ApprovalDecisionPayload {
  decision: 'APPROVED' | 'REJECTED';
  reviewer_id: string;
  reason: string;
}

export interface NotificationRecord {
  id: string;
  shipment_id: string;
  recipient: string;
  channel: NotificationChannel;
  template_id: string;
  content: string;
  status: NotificationStatus;
  idempotency_key: string;
  sent_at?: string | null;
}

export interface AuditLogEntry {
  id: string;
  entity_type: string;
  entity_id: string;
  action: string;
  actor_type: string;
  actor_id: string;
  details: Record<string, unknown>;
  created_at: string;
}

// ---------------------------------------------------------------------------
// AI Agent Diagnostic & Chat Interfaces
// ---------------------------------------------------------------------------

export interface AgentDiagnosticOutput {
  issue_type: string;
  root_cause: string;
  evidence: string[];
  recommended_action: string;
  tool_name: ToolName;
  tool_input: Record<string, unknown>;
  risk_level: RiskLevel;
  confidence: number;
}

export interface AgentAnalysisRequest {
  shipment_id: string;
  force_refresh?: boolean;
  context_notes?: string | null;
}

export interface AgentAnalysisResponse {
  shipment_id: string;
  diagnosis: AgentDiagnosticOutput;
  action_queued: boolean;
  requires_human_approval: boolean;
  execution_time_seconds: number;
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: string;
}

export interface AgentChatRequest {
  shipment_id?: string | null;
  message: string;
  conversation_history?: Array<{ role: string; content: string }>;
}

export interface AgentChatResponse {
  response: string;
  shipment_id?: string | null;
  grounded_facts: string[];
  recommended_action?: string | null;
}

// ---------------------------------------------------------------------------
// Query Filter Interfaces
// ---------------------------------------------------------------------------

export interface ShipmentFilters {
  status?: ShipmentStatus;
  business_priority?: BusinessPriority;
  risk_level?: RiskLevel;
  mode?: TransportMode;
  search?: string;
  skip?: number;
  limit?: number;
}

export interface ExceptionFilters {
  status?: ExceptionStatus;
  risk_level?: RiskLevel;
  shipment_id?: string;
  skip?: number;
  limit?: number;
}

export interface ApprovalFilters {
  decision?: ApprovalDecision;
  skip?: number;
  limit?: number;
}

export interface AuditFilters {
  entity_type?: string;
  entity_id?: string;
  actor_type?: string;
  action?: string;
  skip?: number;
  limit?: number;
}
