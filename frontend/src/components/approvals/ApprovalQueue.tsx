import React, { useState, useMemo } from 'react';
import {
  CheckCircle2,
  ExternalLink,
  Eye,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  X,
  XCircle,
  Clock,
  Sparkles,
} from 'lucide-react';
import { EnrichedApproval } from '../../types';
import { Button, StatusBadge } from '../common';
import { ApprovalDecisionModal } from './ApprovalDecisionModal';

interface ApprovalQueueProps {
  approvals: EnrichedApproval[];
  isLoading?: boolean;
  onRefresh?: () => void;
  onUpdateApproval: (updated: EnrichedApproval) => void;
  onSelectShipment?: (trackingNumber: string) => void;
  onAnalyzeShipment?: (trackingNumber: string) => void;
}

export const ApprovalQueue: React.FC<ApprovalQueueProps> = ({
  approvals,
  isLoading = false,
  onRefresh,
  onUpdateApproval,
  onSelectShipment,
  onAnalyzeShipment,
}) => {
  const [activeTab, setActiveTab] = useState<'PENDING' | 'APPROVED' | 'REJECTED' | 'ALL'>('PENDING');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeModalApproval, setActiveModalApproval] = useState<EnrichedApproval | null>(null);
  const [modalInitialDecision, setModalInitialDecision] = useState<'APPROVED' | 'REJECTED'>('APPROVED');

  // Filtered approvals
  const filteredApprovals = useMemo(() => {
    return approvals.filter((item) => {
      if (activeTab !== 'ALL' && item.decision !== activeTab) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTracking = (item.tracking_number || '').toLowerCase().includes(q);
        const matchesAction = (item.action_type || '').toLowerCase().includes(q);
        const matchesTool = (item.tool_used || '').toLowerCase().includes(q);
        const matchesReason = (item.reason || '').toLowerCase().includes(q);
        if (!matchesTracking && !matchesAction && !matchesTool && !matchesReason) {
          return false;
        }
      }
      return true;
    });
  }, [approvals, activeTab, searchQuery]);

  // Aggregate Counters
  const counts = useMemo(() => {
    const pending = approvals.filter((a) => a.decision === 'PENDING').length;
    const approved = approvals.filter((a) => a.decision === 'APPROVED').length;
    const rejected = approvals.filter((a) => a.decision === 'REJECTED').length;
    return { pending, approved, rejected, total: approvals.length };
  }, [approvals]);

  const formatTime = (iso?: string) => {
    if (!iso) return '—';
    try {
      const d = new Date(iso);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) + ' UTC';
    } catch {
      return iso;
    }
  };

  const handleOpenDecision = (item: EnrichedApproval, initialDec: 'APPROVED' | 'REJECTED') => {
    setActiveModalApproval(item);
    setModalInitialDecision(initialDec);
  };

  return (
    <div className="space-y-4">
      {/* Top Counters & Filter Bar */}
      <div className="bg-navy-900 border border-navy-700 rounded-md p-3.5 space-y-3 shadow-md">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Status Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            <button
              onClick={() => setActiveTab('PENDING')}
              className={`px-3 py-1.5 rounded text-xs font-mono font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'PENDING'
                  ? 'bg-amber-400 text-navy-950 shadow-glow-amber'
                  : 'bg-navy-850 text-slateText-secondary border border-navy-700 hover:text-white'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Pending Review ({counts.pending})</span>
            </button>

            <button
              onClick={() => setActiveTab('APPROVED')}
              className={`px-3 py-1.5 rounded text-xs font-mono font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'APPROVED'
                  ? 'bg-mint-400 text-navy-950 shadow-glow-mint'
                  : 'bg-navy-850 text-slateText-secondary border border-navy-700 hover:text-white'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Authorized ({counts.approved})</span>
            </button>

            <button
              onClick={() => setActiveTab('REJECTED')}
              className={`px-3 py-1.5 rounded text-xs font-mono font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'REJECTED'
                  ? 'bg-coral-400 text-white shadow-glow-coral'
                  : 'bg-navy-850 text-slateText-secondary border border-navy-700 hover:text-white'
              }`}
            >
              <XCircle className="w-3.5 h-3.5" />
              <span>Rejected ({counts.rejected})</span>
            </button>

            <button
              onClick={() => setActiveTab('ALL')}
              className={`px-3 py-1.5 rounded text-xs font-mono font-medium transition-all ${
                activeTab === 'ALL'
                  ? 'bg-cyan-400 text-navy-950 font-bold shadow-glow-cyan'
                  : 'bg-navy-850 text-slateText-secondary border border-navy-700 hover:text-white'
              }`}
            >
              All Records ({counts.total})
            </button>
          </div>

          {/* Search box */}
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-cyan-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search action or tracking #..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-navy-950 border border-navy-700 rounded text-slateText-primary placeholder-slateText-muted focus:outline-none focus:border-cyan-400 font-mono"
            />
          </div>
        </div>
      </div>

      {/* Approvals List */}
      <div className="space-y-3">
        {filteredApprovals.length === 0 ? (
          <div className="p-12 text-center bg-navy-900 border border-navy-700 rounded-md">
            <ShieldCheck className="w-10 h-10 text-cyan-400 mx-auto mb-2 opacity-80" />
            <h4 className="text-sm font-bold text-white font-mono">No Approvals Awaiting Action</h4>
            <p className="text-xs text-slateText-secondary max-w-sm mx-auto mt-1">
              All agent-proposed consequential actions have been authorized or reviewed.
            </p>
          </div>
        ) : (
          filteredApprovals.map((app) => {
            const isPending = app.decision === 'PENDING';
            const isCritical = app.risk_level === 'CRITICAL';

            return (
              <div
                key={app.id}
                className={`bg-navy-850 border rounded-md p-4 transition-all shadow-sm ${
                  isPending && isCritical
                    ? 'border-coral-400/50 hover:border-coral-400 hover:shadow-glow-coral'
                    : isPending
                    ? 'border-amber-400/40 hover:border-amber-400'
                    : 'border-navy-700 opacity-90'
                }`}
              >
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-navy-700/60">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="p-1 rounded bg-navy-900 border border-navy-700 text-cyan-400 font-mono text-xs">
                      {app.action_type}
                    </span>
                    <button
                      onClick={() => onSelectShipment && onSelectShipment(app.tracking_number || '')}
                      className="font-mono font-bold text-xs text-cyan-400 hover:underline flex items-center gap-1"
                    >
                      {app.tracking_number}
                      <ExternalLink className="w-3 h-3 text-slateText-muted" />
                    </button>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-navy-900 text-slateText-secondary border border-navy-700">
                      Tool: {app.tool_used}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <StatusBadge status={app.risk_level || 'HIGH'} size="sm" />
                    <StatusBadge status={app.decision} size="sm" />
                  </div>
                </div>

                {/* Body Content */}
                <div className="mt-3 space-y-2">
                  <p className="text-xs font-semibold text-white">
                    {app.reason}
                  </p>

                  {app.exception_description && (
                    <div className="p-2.5 rounded bg-navy-900 border border-navy-700 text-xs text-slateText-secondary font-mono">
                      <strong className="text-amber-400 mr-1.5">Underlying Bottleneck:</strong>
                      {app.exception_description}
                    </div>
                  )}

                  {/* Input Data payload */}
                  {app.input_data && (
                    <div className="text-[11px] font-mono text-slateText-muted">
                      <span className="text-slateText-muted uppercase block text-[10px] mb-0.5">
                        Proposed Execution Payload:
                      </span>
                      <pre className="p-2 rounded bg-navy-950 border border-navy-800 text-cyan-300 overflow-x-auto text-[10px]">
                        {JSON.stringify(app.input_data, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>

                {/* Footer Controls */}
                <div className="mt-3.5 pt-2.5 border-t border-navy-700/60 flex flex-wrap items-center justify-between gap-2">
                  <div className="text-[11px] font-mono text-slateText-muted">
                    <span>Requested {formatTime(app.requested_at)}</span>
                    {app.reviewed_at && (
                      <span className="ml-2">
                        • Reviewed {formatTime(app.reviewed_at)} by <span className="text-white">{app.reviewer_id}</span>
                      </span>
                    )}
                  </div>

                  {isPending ? (
                    <div className="flex items-center gap-2">
                      <Button
                        variant="danger"
                        size="sm"
                        leftIcon={<XCircle className="w-3.5 h-3.5" />}
                        onClick={() => handleOpenDecision(app, 'REJECTED')}
                      >
                        Reject Action
                      </Button>
                      <Button
                        variant="mint"
                        size="sm"
                        leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}
                        onClick={() => handleOpenDecision(app, 'APPROVED')}
                      >
                        Authorize & Execute
                      </Button>
                    </div>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleOpenDecision(app, app.decision === 'APPROVED' ? 'APPROVED' : 'REJECTED')}
                      leftIcon={<Eye className="w-3.5 h-3.5" />}
                    >
                      View Audit Details
                    </Button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Decision Modal */}
      {activeModalApproval && (
        <ApprovalDecisionModal
          isOpen={Boolean(activeModalApproval)}
          onClose={() => setActiveModalApproval(null)}
          approval={activeModalApproval}
          initialDecision={modalInitialDecision}
          onSuccess={(updated) => {
            onUpdateApproval(updated);
            if (onRefresh) onRefresh();
          }}
        />
      )}
    </div>
  );
};
