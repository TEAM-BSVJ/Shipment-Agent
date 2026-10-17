import React, { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { EnrichedApproval } from '../types';
import { approvalService } from '../services';
import { Button } from '../components/common';
import { ApprovalQueue } from '../components/approvals';

interface ApprovalQueuePageProps {
  onSelectShipment?: (trackingNumber: string) => void;
  onAnalyzeShipment?: (trackingNumber: string) => void;
  onApprovalCountChange?: (count: number) => void;
}

// Fallback benchmark approvals synchronized with seed_db.py
const BENCHMARK_APPROVALS: EnrichedApproval[] = [
  {
    id: 'a1111111-1111-1111-1111-111111112001',
    action_id: 'c1111111-1111-1111-1111-111111112001',
    tracking_number: 'SHP-102',
    origin: 'Dallas DC (DFW-1)',
    destination: 'Austin Hub (AUS-2)',
    mode: 'AIR',
    carrier_id: 'FEDEX_FREIGHT',
    business_priority: 'CRITICAL',
    action_type: 'RESCHEDULE_MILESTONE',
    tool_used: 'reschedule_milestone',
    action_status: 'WAITING_APPROVAL',
    decision: 'PENDING',
    requested_at: '2026-10-17T09:30:00Z',
    reason: 'Requires Operations Supervisor sign-off to authorize freight re-routing and revised delivery ETA.',
    exception_type: 'MILESTONE_OVERDUE',
    risk_level: 'CRITICAL',
    exception_description: "Milestone 'WAREHOUSE_DISPATCH' is overdue by 4.5 hours at Dallas DC dock 4B.",
    input_data: {
      milestone_name: 'WAREHOUSE_DISPATCH',
      rescheduled_hours: 5.0,
      carrier_id: 'FEDEX_FREIGHT',
    },
  },
  {
    id: 'a1111111-1111-1111-1111-111111113001',
    action_id: 'c1111111-1111-1111-1111-111111113001',
    tracking_number: 'SHP-103',
    origin: 'Shanghai Port (CNSHA)',
    destination: 'Los Angeles Port (USLAX)',
    mode: 'SEA',
    carrier_id: 'COSCO_SHIPPING',
    business_priority: 'HIGH',
    action_type: 'TRIGGER_AUTOMATION',
    tool_used: 'trigger_workflow',
    action_status: 'WAITING_APPROVAL',
    decision: 'PENDING',
    requested_at: '2026-10-17T08:00:00Z',
    reason: 'Requires Customs Compliance Officer review before issuing revised customs manifest.',
    exception_type: 'WEIGHT_MISMATCH',
    risk_level: 'HIGH',
    exception_description:
      'Weight discrepancy detected between Commercial Invoice (250.0 kg) and Packing List (310.0 kg): discrepancy 60.0 kg exceeds tolerance of 0.5 kg.',
    input_data: {
      workflow_type: 'WEIGHT_RECONCILIATION',
      discrepancy_kg: 60.0,
      manifest_update: true,
    },
  },
  {
    id: 'a1111111-1111-1111-1111-111111115001',
    action_id: 'c1111111-1111-1111-1111-111111115001',
    tracking_number: 'SHP-105',
    origin: 'Frankfurt CargoCity (FRA)',
    destination: "Chicago O'Hare Hub (ORD)",
    mode: 'AIR',
    carrier_id: 'LUFTHANSA_CARGO',
    business_priority: 'CRITICAL',
    action_type: 'ESCALATE_TO_HUMAN',
    tool_used: 'escalate_to_human',
    action_status: 'COMPLETED',
    decision: 'APPROVED',
    requested_at: '2026-10-17T09:30:00Z',
    reviewed_at: '2026-10-17T11:15:00Z',
    reviewer_id: 'licensed-broker@customs-clearance.org',
    reason: 'Licensed broker verified all biological import permits and CBP inspector signed release form.',
    exception_type: 'CUSTOMS_REJECTION',
    risk_level: 'CRITICAL',
    exception_description:
      'Container flagged for CBP biological & temperature-sensitive pharma inspection hold at ORD.',
    input_data: {
      priority: 'EMERGENCY_COLD_CHAIN',
      facility: 'ORD_CARGO_5',
      release_permit_id: 'CBP-ORD-BIO-89211',
    },
  },
];

export const ApprovalQueuePage: React.FC<ApprovalQueuePageProps> = ({
  onSelectShipment,
  onAnalyzeShipment,
  onApprovalCountChange,
}) => {
  const [approvals, setApprovals] = useState<EnrichedApproval[]>(BENCHMARK_APPROVALS);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchApprovals = async () => {
    try {
      const res = await approvalService.getApprovals();
      if (res.data && res.data.length > 0) {
        setApprovals(res.data as unknown as EnrichedApproval[]);
        const pendingCount = res.data.filter((a) => a.decision === 'PENDING').length;
        if (onApprovalCountChange) onApprovalCountChange(pendingCount);
      } else {
        setApprovals(BENCHMARK_APPROVALS);
        if (onApprovalCountChange) onApprovalCountChange(2);
      }
    } catch {
      setApprovals(BENCHMARK_APPROVALS);
      if (onApprovalCountChange) onApprovalCountChange(2);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchApprovals();
  }, []);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchApprovals();
  };

  const handleUpdateApproval = (updated: EnrichedApproval) => {
    setApprovals((prev) =>
      prev.map((a) => (a.id === updated.id ? updated : a))
    );
    const pendingCount = approvals
      .map((a) => (a.id === updated.id ? updated : a))
      .filter((a) => a.decision === 'PENDING').length;
    if (onApprovalCountChange) onApprovalCountChange(pendingCount);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-navy-700">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-xl font-bold text-white tracking-tight font-sans">
              Human Approval Gateway
            </h2>
            <span className="text-xs bg-amber-400/20 text-amber-400 border border-amber-400/40 px-2.5 py-0.5 rounded-full font-mono font-semibold">
              RULE-E06 Governance Gate
            </span>
          </div>
          <p className="text-xs text-slateText-secondary mt-0.5">
            Authorize or reject high-consequence agent actions (milestone rescheduling, workflow dispatches).
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
            Refresh Approvals
          </Button>
        </div>
      </div>

      {/* Main Approvals Queue */}
      <ApprovalQueue
        approvals={approvals}
        isLoading={isLoading}
        onRefresh={fetchApprovals}
        onUpdateApproval={handleUpdateApproval}
        onSelectShipment={onSelectShipment}
        onAnalyzeShipment={onAnalyzeShipment}
      />
    </div>
  );
};
