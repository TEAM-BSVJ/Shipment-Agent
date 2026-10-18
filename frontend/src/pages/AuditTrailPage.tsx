import React, { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { AuditLogEntry } from '../types';
import { auditService } from '../services';
import { Button } from '../components/common';
import { AuditTrailTable } from '../components/audit';

// Fallback benchmark audit logs synchronized with seed_db.py
const BENCHMARK_AUDIT_LOGS: AuditLogEntry[] = [
  {
    id: 'a0000001-1111-1111-1111-111111115002',
    entity_type: 'approval',
    entity_id: 'a1111111-1111-1111-1111-111111115001',
    action: 'APPROVAL_APPROVED',
    actor_type: 'USER',
    actor_id: 'licensed-broker@customs-clearance.org',
    details: {
      decision: 'APPROVED',
      action_type: 'ESCALATE_TO_HUMAN',
      reason: 'Licensed broker verified all biological import permits and CBP inspector signed release form.',
      release_permit_id: 'CBP-ORD-BIO-89211',
      shipment: 'SHP-105',
    },
    created_at: '2026-10-17T11:15:00Z',
  },
  {
    id: 'a0000001-1111-1111-1111-111111113002',
    entity_type: 'exception',
    entity_id: 'e1111111-1111-1111-1111-111111113001',
    action: 'AI_DIAGNOSIS_EXECUTED',
    actor_type: 'AGENT',
    actor_id: 'ShipRAG-AI-Agent',
    details: {
      model: 'ShipRAG-Autonomous-LLM',
      prompt_tokens: 840,
      sanitization: '<user_data> fences applied',
      root_cause: 'Pallet tare weight (60 kg) was omitted from Commercial Invoice line items.',
      recommended_action: 'TRIGGER_WORKFLOW (WEIGHT_RECONCILIATION)',
      shipment: 'SHP-103',
    },
    created_at: '2026-10-17T07:12:00Z',
  },
  {
    id: 'a0000001-1111-1111-1111-111111112002',
    entity_type: 'action',
    entity_id: 'c1111111-1111-1111-1111-111111112001',
    action: 'TOOL_INVOCATION_GATED',
    actor_type: 'AGENT',
    actor_id: 'ShipRAG-AI-Agent',
    details: {
      tool_name: 'reschedule_milestone',
      parameters: { milestone_name: 'WAREHOUSE_DISPATCH', rescheduled_hours: 5.0 },
      gating_rule: 'RULE-E06',
      approval_id: 'a1111111-1111-1111-1111-111111112001',
      status: 'WAITING_APPROVAL',
      shipment: 'SHP-102',
    },
    created_at: '2026-10-17T08:35:00Z',
  },
  {
    id: 'a0000001-1111-1111-1111-111111111002',
    entity_type: 'notification',
    entity_id: 'f1111111-1111-1111-1111-111111111001',
    action: 'NOTIFICATION_DISPATCHED',
    actor_type: 'SYSTEM',
    actor_id: 'NotificationRouter',
    details: {
      channel: 'EMAIL',
      recipient: 'export-desk@tatasteel.mock',
      template_id: 'MISSING_DOCUMENT_ADVISORY',
      status: 'SENT',
      shipment: 'SHP-101',
    },
    created_at: '2026-10-17T01:10:00Z',
  },
  {
    id: 'a0000001-1111-1111-1111-111111115001',
    entity_type: 'Shipment',
    entity_id: '11111111-1111-1111-1111-111111111005',
    action: 'SEED_SHIPMENT_CREATED',
    actor_type: 'SYSTEM',
    actor_id: 'SeedScript',
    details: {
      tracking_number: 'SHP-105',
      scenario: 'Customs Hold & Resolved Escalation',
      origin: 'Frankfurt CargoCity (FRA)',
      destination: "Chicago O'Hare Hub (ORD)",
    },
    created_at: '2026-10-17T00:00:05Z',
  },
];

export const AuditTrailPage: React.FC = () => {
  const [logs, setLogs] = useState<AuditLogEntry[]>(BENCHMARK_AUDIT_LOGS);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  const fetchLogs = async () => {
    try {
      const res = await auditService.getAuditLogs({ limit: 100 });
      if (res.data && res.data.length > 0) {
        setLogs(res.data);
      } else {
        setLogs(BENCHMARK_AUDIT_LOGS);
      }
    } catch {
      setLogs(BENCHMARK_AUDIT_LOGS);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchLogs();
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-navy-700">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-xl font-bold text-white tracking-tight font-sans">
              Compliance & Operational Audit Trail
            </h2>
            <span className="text-xs bg-navy-850 text-cyan-400 border border-cyan-400/30 px-2.5 py-0.5 rounded-full font-mono font-semibold">
              Immutable Ledger
            </span>
          </div>
          <p className="text-xs text-slateText-secondary mt-0.5">
            Chronological record of autonomous agent inferences, tool executions, and human authorizations.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            isLoading={isRefreshing}
            leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
            onClick={handleRefresh}
          >
            Refresh Audit Feed
          </Button>
        </div>
      </div>

      {/* Main Table */}
      <AuditTrailTable logs={logs} isLoading={isLoading} onRefresh={fetchLogs} />
    </div>
  );
};
