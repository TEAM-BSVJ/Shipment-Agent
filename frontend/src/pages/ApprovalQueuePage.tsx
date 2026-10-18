import React, { useEffect, useState, useMemo } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  FileCheck,
  FileText,
  RefreshCw,
  Scale,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import { EnrichedApproval, Shipment, ShipmentDocument } from '../types';
import { approvalService, documentService, shipmentService } from '../services';
import { Button, StatusBadge } from '../components/common';
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
  const [gatewayTab, setGatewayTab] = useState<'ACTIONS' | 'DOCUMENTS'>('ACTIONS');
  const [approvals, setApprovals] = useState<EnrichedApproval[]>(BENCHMARK_APPROVALS);
  const [documents, setDocuments] = useState<ShipmentDocument[]>([]);
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [docFilter, setDocFilter] = useState<'PENDING' | 'FLAGGED' | 'ALL'>('PENDING');
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [verifyingDocId, setVerifyingDocId] = useState<string | null>(null);

  // Map shipment_id -> tracking_number
  const shipmentMap = useMemo(() => {
    const map: Record<string, string> = {
      '10100000-0000-0000-0000-000000000101': 'SHP-101',
      '10200000-0000-0000-0000-000000000102': 'SHP-102',
      '10300000-0000-0000-0000-000000000103': 'SHP-103',
      '10400000-0000-0000-0000-000000000104': 'SHP-104',
      '10500000-0000-0000-0000-000000000105': 'SHP-105',
    };
    shipments.forEach((s) => {
      map[s.id] = s.tracking_number;
    });
    return map;
  }, [shipments]);

  const loadData = async () => {
    try {
      const [appRes, docRes, shipRes] = await Promise.allSettled([
        approvalService.getApprovals(),
        documentService.getDocuments(),
        shipmentService.getShipments(),
      ]);

      let pendingActions = 0;
      if (appRes.status === 'fulfilled' && appRes.value?.data && appRes.value.data.length > 0) {
        setApprovals(appRes.value.data as unknown as EnrichedApproval[]);
        pendingActions = appRes.value.data.filter((a) => a.decision === 'PENDING').length;
      } else {
        setApprovals(BENCHMARK_APPROVALS);
        pendingActions = BENCHMARK_APPROVALS.filter((a) => a.decision === 'PENDING').length;
      }

      let pendingDocs = 0;
      if (docRes.status === 'fulfilled' && Array.isArray(docRes.value)) {
        setDocuments(docRes.value);
        pendingDocs = docRes.value.filter((d) => d.validation_status === 'PENDING').length;
      }

      if (shipRes.status === 'fulfilled' && Array.isArray(shipRes.value)) {
        setShipments(shipRes.value);
      }

      if (onApprovalCountChange) {
        onApprovalCountChange(pendingActions + pendingDocs);
      }
    } catch (err) {
      console.error('Failed to load approval and document data:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadData();
  };

  const handleUpdateApproval = (updated: EnrichedApproval) => {
    setApprovals((prev) =>
      prev.map((a) => (a.id === updated.id ? updated : a))
    );
    const pendingActions = approvals
      .map((a) => (a.id === updated.id ? updated : a))
      .filter((a) => a.decision === 'PENDING').length;
    const pendingDocs = documents.filter((d) => d.validation_status === 'PENDING').length;
    if (onApprovalCountChange) onApprovalCountChange(pendingActions + pendingDocs);
  };

  const handleVerifyDoc = async (docId: string) => {
    setVerifyingDocId(docId);
    try {
      const updated = await documentService.updateDocument(docId, {
        validation_status: 'VALIDATED',
        confidence: 0.98,
      });
      setDocuments((prev) => prev.map((d) => (d.id === docId ? updated : d)));
      const pendingActions = approvals.filter((a) => a.decision === 'PENDING').length;
      const pendingDocs = documents
        .map((d) => (d.id === docId ? updated : d))
        .filter((d) => d.validation_status === 'PENDING').length;
      if (onApprovalCountChange) onApprovalCountChange(pendingActions + pendingDocs);
    } catch (err) {
      console.error('Failed to verify document:', err);
    } finally {
      setVerifyingDocId(null);
    }
  };

  const handleRejectDoc = async (docId: string) => {
    setVerifyingDocId(docId);
    try {
      const updated = await documentService.updateDocument(docId, {
        validation_status: 'REJECTED',
        rejection_reason: 'Rejected by compliance officer review.',
      });
      setDocuments((prev) => prev.map((d) => (d.id === docId ? updated : d)));
      const pendingActions = approvals.filter((a) => a.decision === 'PENDING').length;
      const pendingDocs = documents
        .map((d) => (d.id === docId ? updated : d))
        .filter((d) => d.validation_status === 'PENDING').length;
      if (onApprovalCountChange) onApprovalCountChange(pendingActions + pendingDocs);
    } catch (err) {
      console.error('Failed to reject document:', err);
    } finally {
      setVerifyingDocId(null);
    }
  };

  const pendingActionCount = useMemo(
    () => approvals.filter((a) => a.decision === 'PENDING').length,
    [approvals]
  );
  const pendingDocCount = useMemo(
    () => documents.filter((d) => d.validation_status === 'PENDING').length,
    [documents]
  );
  const flaggedDocCount = useMemo(
    () => documents.filter((d) => d.validation_status === 'FLAGGED').length,
    [documents]
  );

  const filteredDocs = useMemo(() => {
    return documents.filter((d) => {
      if (docFilter === 'PENDING') return d.validation_status === 'PENDING';
      if (docFilter === 'FLAGGED') return d.validation_status === 'FLAGGED';
      return true;
    });
  }, [documents, docFilter]);

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
            Authorize autonomous agent operational actions or verify pending shipping paperwork filings.
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
            Refresh Gateway
          </Button>
        </div>
      </div>

      {/* Gateway Segment Switcher */}
      <div className="flex items-center gap-2.5 pb-1">
        <button
          onClick={() => setGatewayTab('ACTIONS')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded text-xs font-mono font-bold transition-all ${
            gatewayTab === 'ACTIONS'
              ? 'bg-amber-400 text-navy-950 shadow-glow-amber'
              : 'bg-navy-850 text-slateText-secondary border border-navy-700 hover:text-white'
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Agent Actions (RULE-E06)</span>
          <span
            className={`px-1.5 py-0.2 rounded text-[10px] ${
              gatewayTab === 'ACTIONS'
                ? 'bg-navy-950 text-amber-400'
                : 'bg-navy-800 text-slateText-muted'
            }`}
          >
            {pendingActionCount}
          </span>
        </button>

        <button
          onClick={() => setGatewayTab('DOCUMENTS')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded text-xs font-mono font-bold transition-all ${
            gatewayTab === 'DOCUMENTS'
              ? 'bg-cyan-400 text-navy-950 shadow-glow-cyan'
              : 'bg-navy-850 text-slateText-secondary border border-navy-700 hover:text-white'
          }`}
        >
          <FileCheck className="w-3.5 h-3.5" />
          <span>Paperwork Verifications</span>
          <span
            className={`px-1.5 py-0.2 rounded text-[10px] ${
              gatewayTab === 'DOCUMENTS'
                ? 'bg-navy-950 text-cyan-400 font-bold'
                : 'bg-navy-800 text-slateText-muted'
            }`}
          >
            {pendingDocCount}
          </span>
        </button>
      </div>

      {/* 1. Agent Actions View */}
      {gatewayTab === 'ACTIONS' && (
        <ApprovalQueue
          approvals={approvals}
          isLoading={isLoading}
          onRefresh={loadData}
          onUpdateApproval={handleUpdateApproval}
          onSelectShipment={onSelectShipment}
          onAnalyzeShipment={onAnalyzeShipment}
        />
      )}

      {/* 2. Paperwork Verifications View */}
      {gatewayTab === 'DOCUMENTS' && (
        <div className="space-y-4 animate-in fade-in">
          {/* Informational Guidance Callout */}
          <div className="p-3 bg-navy-900 border border-cyan-400/30 rounded-md text-xs space-y-1">
            <div className="flex items-center gap-2 text-cyan-400 font-mono font-bold">
              <FileCheck className="w-4 h-4 text-cyan-400 shrink-0" />
              <span>CUSTOMS & PAPERWORK VERIFICATION GATEWAY</span>
            </div>
            <p className="text-[11px] text-slateText-secondary leading-relaxed">
              Documents in <span className="text-amber-400 font-mono font-semibold">PENDING</span> status await compliance verification or deterministic OCR extraction before release. Click <span className="text-mint-400 font-mono font-semibold">Verify & Authorize</span> to certify compliance, raise confidence to 98%, and create an immutable audit trail entry.
            </p>
          </div>

          {/* Sub-Filters */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setDocFilter('PENDING')}
              className={`px-3 py-1 rounded text-xs font-mono font-semibold transition-all ${
                docFilter === 'PENDING'
                  ? 'bg-amber-400/20 text-amber-300 border border-amber-400/50'
                  : 'bg-navy-850 text-slateText-muted border border-navy-700 hover:text-slateText-secondary'
              }`}
            >
              Pending Verification ({pendingDocCount})
            </button>
            <button
              onClick={() => setDocFilter('FLAGGED')}
              className={`px-3 py-1 rounded text-xs font-mono font-semibold transition-all ${
                docFilter === 'FLAGGED'
                  ? 'bg-coral-400/20 text-coral-300 border border-coral-400/50'
                  : 'bg-navy-850 text-slateText-muted border border-navy-700 hover:text-slateText-secondary'
              }`}
            >
              Flagged Discrepancies ({flaggedDocCount})
            </button>
            <button
              onClick={() => setDocFilter('ALL')}
              className={`px-3 py-1 rounded text-xs font-mono font-semibold transition-all ${
                docFilter === 'ALL'
                  ? 'bg-cyan-400/20 text-cyan-300 border border-cyan-400/50'
                  : 'bg-navy-850 text-slateText-muted border border-navy-700 hover:text-slateText-secondary'
              }`}
            >
              All Records ({documents.length})
            </button>
          </div>

          {/* Documents Grid / Empty State */}
          {filteredDocs.length === 0 ? (
            <div className="p-10 text-center bg-navy-900 border border-navy-700 rounded-md">
              <FileCheck className="w-9 h-9 text-mint-400/60 mx-auto mb-2" />
              <p className="text-sm font-semibold text-white">No Paperwork Awaiting Action</p>
              <p className="text-xs text-slateText-muted mt-1 max-w-md mx-auto">
                All shipping documents across active shipments have been validated or reconciled.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredDocs.map((doc) => {
                const trackingNumber =
                  shipmentMap[doc.shipment_id] || doc.shipment_id.slice(0, 8);
                const isPending = doc.validation_status === 'PENDING';
                const isFlagged = doc.validation_status === 'FLAGGED';
                const fields = doc.extracted_fields;

                return (
                  <div
                    key={doc.id}
                    className="bg-navy-850 border border-navy-700 rounded-md p-4 space-y-3 flex flex-col justify-between hover:border-navy-600 transition-all shadow-sm"
                  >
                    <div>
                      {/* Top Bar */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded bg-navy-900 border border-navy-700 flex items-center justify-center text-cyan-400 shrink-0">
                            <FileText className="w-4 h-4" />
                          </div>
                          <div>
                            <h4 className="text-xs font-bold text-white font-mono">
                              {doc.document_type.replace(/_/g, ' ')}
                            </h4>
                            <p className="text-[10px] text-slateText-muted font-mono truncate max-w-[200px]">
                              {doc.file_ref.split(/[/\\]/).pop()}
                            </p>
                          </div>
                        </div>

                        <StatusBadge status={doc.validation_status} size="sm" />
                      </div>

                      {/* Parent Shipment Tag */}
                      <div className="mt-3 flex items-center gap-2 text-xs">
                        <span className="text-[10px] font-mono text-slateText-muted">Shipment:</span>
                        <button
                          onClick={() => onSelectShipment && onSelectShipment(trackingNumber)}
                          className="font-mono font-bold text-xs text-cyan-400 hover:underline flex items-center gap-1"
                        >
                          {trackingNumber}
                          <ExternalLink className="w-3 h-3 text-slateText-muted" />
                        </button>
                      </div>

                      {/* Extracted Fields or Notice */}
                      {fields && (fields.invoice_number || fields.total_weight_kg) ? (
                        <div className="mt-2.5 pt-2.5 border-t border-navy-700/60 grid grid-cols-2 gap-2 text-[11px]">
                          {fields.invoice_number && (
                            <div>
                              <span className="text-slateText-muted block text-[10px] font-mono">Ref #</span>
                              <span className="font-mono text-slateText-primary font-medium">{fields.invoice_number}</span>
                            </div>
                          )}
                          {fields.total_weight_kg && (
                            <div>
                              <span className="text-slateText-muted block text-[10px] font-mono flex items-center gap-1">
                                <Scale className="w-3 h-3 text-cyan-400" /> Gross Wt
                              </span>
                              <span className="font-mono text-white font-bold">{fields.total_weight_kg} kg</span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="mt-2.5 pt-2.5 border-t border-navy-700/60 text-[11px] text-slateText-disabled italic font-mono">
                          Raw binary filing awaiting manual sign-off.
                        </div>
                      )}
                    </div>

                    {/* Bottom Action Footer */}
                    <div className="pt-3 border-t border-navy-700/60 flex items-center justify-between text-xs">
                      <span className="text-[11px] text-slateText-muted font-mono">
                        Confidence:{' '}
                        <span className="text-cyan-400 font-semibold">
                          {(doc.confidence * 100).toFixed(0)}%
                        </span>
                      </span>

                      <div className="flex items-center gap-2">
                        {(isPending || isFlagged) && (
                          <>
                            <Button
                              variant="danger"
                              size="sm"
                              isLoading={verifyingDocId === doc.id}
                              leftIcon={<XCircle className="w-3.5 h-3.5" />}
                              onClick={() => handleRejectDoc(doc.id)}
                              className="text-[11px] py-1 px-2.5"
                            >
                              Reject
                            </Button>
                            <Button
                              variant="mint"
                              size="sm"
                              isLoading={verifyingDocId === doc.id}
                              leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}
                              onClick={() => handleVerifyDoc(doc.id)}
                              className="text-[11px] py-1 px-2.5 shadow-glow-mint"
                            >
                              Verify & Authorize
                            </Button>
                          </>
                        )}
                        {!isPending && !isFlagged && (
                          <span className="text-xs text-mint-400 font-mono flex items-center gap-1 font-semibold">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Certified
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

