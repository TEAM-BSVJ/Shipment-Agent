import React, { useState, useMemo } from 'react';
import {
  Bot,
  CheckCircle2,
  ExternalLink,
  Eye,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldAlert,
  ShieldCheck,
  X,
  XCircle,
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
      // Tab filter
      if (activeTab !== 'ALL' && item.decision !== activeTab) {
        return false;
      }

      // Search query
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

  // Counts
  const stats = useMemo(() => {
    const pending = approvals.filter((a) => a.decision === 'PENDING').length;
    const approved = approvals.filter((a) => a.decision === 'APPROVED').length;
    const rejected = approvals.filter((a) => a.decision === 'REJECTED').length;
    const total = approvals.length;
    return { pending, approved, rejected, total };
  }, [approvals]);

  const handleOpenModal = (approval: EnrichedApproval, decision: 'APPROVED' | 'REJECTED') => {
    setActiveModalApproval(approval);
    setModalInitialDecision(decision);
  };

  const formatTime = (iso?: string | null) => {
    if (!iso) return 'Recent';
    try {
      const d = new Date(iso);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' });
    } catch {
      return iso;
    }
  };

  return (
    <div className="space-y-4">
      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white border border-slate-200 rounded-md p-3.5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-700 uppercase tracking-wider">
              Pending Authorization
            </span>
            <ShieldAlert className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-2xl font-bold text-amber-800 mt-1">{stats.pending}</p>
          <span className="text-[11px] text-slate-400">Action blocked until signed off</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-md p-3.5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">
              Executed & Approved
            </span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-bold text-emerald-700 mt-1">{stats.approved}</p>
          <span className="text-[11px] text-slate-400">Remediations executed</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-md p-3.5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
              Rejected / Declined
            </span>
            <XCircle className="w-4 h-4 text-slate-500" />
          </div>
          <p className="text-2xl font-bold text-slate-700 mt-1">{stats.rejected}</p>
          <span className="text-[11px] text-slate-400">Prevented unsafe changes</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-md p-3.5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Decision Audits
            </span>
            <ShieldCheck className="w-4 h-4 text-slate-400" />
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-1">{stats.total}</p>
          <span className="text-[11px] text-slate-400">RULE-E06 compliance logs</span>
        </div>
      </div>

      {/* Filter and Tab Navigation Bar */}
      <div className="bg-white border border-slate-200 rounded-md p-3 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between">
          {/* Navigation Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-md text-xs font-medium">
            <button
              onClick={() => setActiveTab('PENDING')}
              className={`px-3 py-1.5 rounded transition-all flex items-center gap-1.5 ${
                activeTab === 'PENDING'
                  ? 'bg-white text-slate-900 font-bold shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>Pending Action</span>
              {stats.pending > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-white font-bold text-[10px]">
                  {stats.pending}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('APPROVED')}
              className={`px-3 py-1.5 rounded transition-all flex items-center gap-1.5 ${
                activeTab === 'APPROVED'
                  ? 'bg-white text-slate-900 font-bold shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>Approved</span>
              <span className="text-slate-400 text-[11px]">({stats.approved})</span>
            </button>

            <button
              onClick={() => setActiveTab('REJECTED')}
              className={`px-3 py-1.5 rounded transition-all flex items-center gap-1.5 ${
                activeTab === 'REJECTED'
                  ? 'bg-white text-slate-900 font-bold shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>Rejected</span>
              <span className="text-slate-400 text-[11px]">({stats.rejected})</span>
            </button>

            <button
              onClick={() => setActiveTab('ALL')}
              className={`px-3 py-1.5 rounded transition-all ${
                activeTab === 'ALL'
                  ? 'bg-white text-slate-900 font-bold shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Records
            </button>
          </div>

          {/* Quick Refresh */}
          {onRefresh && (
            <Button
              variant="secondary"
              size="sm"
              onClick={onRefresh}
              isLoading={isLoading}
              leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
            >
              Refresh
            </Button>
          )}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search approvals by tracking number, tool name, or reason..."
            className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 placeholder:text-slate-400 text-slate-800"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Approvals Cards Stream */}
      <div className="space-y-3">
        {filteredApprovals.length === 0 ? (
          <div className="p-12 text-center bg-white border border-slate-200 rounded-md">
            <ShieldCheck className="w-8 h-8 text-slate-400 mx-auto" />
            <h4 className="text-sm font-bold text-slate-800 mt-2">No approvals in this queue</h4>
            <p className="text-xs text-slate-500 mt-1">
              {activeTab === 'PENDING'
                ? 'All autonomous remediation steps are currently authorized or none require gating.'
                : 'No historical approval records matching the selected tab.'}
            </p>
          </div>
        ) : (
          filteredApprovals.map((item) => {
            const isPending = item.decision === 'PENDING';
            const isApproved = item.decision === 'APPROVED';

            return (
              <div
                key={item.id}
                className={`bg-white border rounded-md p-4 shadow-sm transition-all hover:shadow-md ${
                  isPending
                    ? 'border-amber-300 bg-amber-50/15'
                    : isApproved
                    ? 'border-slate-200'
                    : 'border-slate-200 opacity-80'
                }`}
              >
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <div
                      className={`w-8 h-8 rounded border flex items-center justify-center shrink-0 ${
                        isPending
                          ? 'bg-amber-100 text-amber-800 border-amber-200'
                          : isApproved
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                          : 'bg-slate-100 text-slate-700 border-slate-200'
                      }`}
                    >
                      {isPending ? (
                        <ShieldAlert className="w-4 h-4" />
                      ) : isApproved ? (
                        <CheckCircle2 className="w-4 h-4" />
                      ) : (
                        <XCircle className="w-4 h-4" />
                      )}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        {item.tracking_number && (
                          <button
                            onClick={() => onSelectShipment?.(item.tracking_number!)}
                            className="font-mono font-bold text-xs text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1 bg-blue-50 px-2 py-0.5 rounded border border-blue-100"
                            title="View shipment details"
                          >
                            <span>{item.tracking_number}</span>
                            <ExternalLink className="w-3 h-3" />
                          </button>
                        )}
                        <h4 className="text-xs font-bold text-slate-900 tracking-tight">
                          {item.action_type?.replace(/_/g, ' ') || 'REMEDIATION ACTION'}
                        </h4>
                        <span className="text-[11px] font-mono bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200 font-medium">
                          Tool: {item.tool_used || 'system'}
                        </span>
                      </div>

                      {item.origin && item.destination && (
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Route: {item.origin} → {item.destination} ({item.mode}) | Carrier:{' '}
                          {item.carrier_id || 'Carrier EDI'}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 self-start sm:self-center">
                    <StatusBadge status={item.decision} size="sm" />
                    <span className="text-[11px] text-slate-400 ml-1 font-mono">
                      {formatTime(item.requested_at)}
                    </span>
                  </div>
                </div>

                {/* Body Content */}
                <div className="py-3 space-y-2.5 text-xs">
                  {/* Action Parameters Table/Pills */}
                  {item.input_data && Object.keys(item.input_data).length > 0 && (
                    <div className="p-2.5 bg-slate-50 border border-slate-200 rounded space-y-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                        Proposed Remediation Parameters:
                      </span>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px] font-mono">
                        {Object.entries(item.input_data).map(([k, v]) => (
                          <div key={k} className="bg-white p-1.5 rounded border border-slate-200">
                            <span className="text-slate-400 block text-[10px] uppercase">{k}</span>
                            <span className="text-slate-800 font-bold">{String(v)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Trigger Exception Info */}
                  {item.exception_description && (
                    <div className="text-xs text-slate-700">
                      <span className="font-semibold text-slate-900">Trigger Exception:</span>{' '}
                      {item.exception_description}
                    </div>
                  )}

                  {/* Policy Gate Reason */}
                  {item.reason && (
                    <div
                      className={`p-2.5 rounded text-xs leading-relaxed ${
                        isPending
                          ? 'bg-amber-50/70 border border-amber-200 text-amber-900'
                          : isApproved
                          ? 'bg-emerald-50/70 border border-emerald-200 text-emerald-900'
                          : 'bg-slate-50 border border-slate-200 text-slate-700'
                      }`}
                    >
                      <span className="font-semibold not-italic">
                        {isPending ? 'Governance Policy Trigger:' : 'Authorized Rationale:'}
                      </span>{' '}
                      {item.reason}
                    </div>
                  )}

                  {/* Review Audit Details (when already decided) */}
                  {!isPending && item.reviewed_at && (
                    <div className="flex items-center gap-3 text-[11px] text-slate-500 pt-1 font-mono">
                      <span>Reviewed: {formatTime(item.reviewed_at)}</span>
                      {item.reviewer_id && <span>Reviewer: {item.reviewer_id}</span>}
                      <span>Action Status: {item.action_status || 'CLOSED'}</span>
                    </div>
                  )}
                </div>

                {/* Footer Controls */}
                <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                  <div className="text-[11px] text-slate-400 font-mono">
                    Approval UUID: {item.id.slice(0, 13)}...
                  </div>

                  <div className="flex items-center gap-2">
                    {/* View Shipment */}
                    {item.tracking_number && onSelectShipment && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => onSelectShipment(item.tracking_number!)}
                        leftIcon={<Eye className="w-3.5 h-3.5" />}
                      >
                        Shipment
                      </Button>
                    )}

                    {/* Copilot Reason */}
                    {item.tracking_number && onAnalyzeShipment && (
                      <Button
                        variant="agent"
                        size="sm"
                        onClick={() => onAnalyzeShipment(item.tracking_number!)}
                        leftIcon={<Bot className="w-3.5 h-3.5" />}
                      >
                        Copilot
                      </Button>
                    )}

                    {/* If pending: One-Click Approve and Reject Buttons */}
                    {isPending ? (
                      <>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => handleOpenModal(item, 'REJECTED')}
                          leftIcon={<X className="w-3.5 h-3.5" />}
                        >
                          Reject
                        </Button>
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => handleOpenModal(item, 'APPROVED')}
                          leftIcon={<ShieldCheck className="w-3.5 h-3.5 text-white" />}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white"
                        >
                          One-Click Approve
                        </Button>
                      </>
                    ) : (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleOpenModal(item, item.decision === 'APPROVED' ? 'APPROVED' : 'REJECTED')}
                        leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
                      >
                        Review Audit Record
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Decision Modal */}
      <ApprovalDecisionModal
        isOpen={Boolean(activeModalApproval)}
        onClose={() => setActiveModalApproval(null)}
        approval={activeModalApproval}
        initialDecision={modalInitialDecision}
        onSuccess={(updated) => {
          onUpdateApproval(updated);
          setActiveModalApproval(null);
        }}
      />
    </div>
  );
};
