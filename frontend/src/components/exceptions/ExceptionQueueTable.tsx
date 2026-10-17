import React, { useState, useMemo } from 'react';
import {
  AlertTriangle,
  Bot,
  CheckCircle2,
  Clock,
  ExternalLink,
  Eye,
  FileText,
  Filter,
  Layers,
  MapPin,
  RefreshCw,
  Scale,
  Search,
  ShieldAlert,
  ShieldCheck,
  Truck,
} from 'lucide-react';
import {
  EnrichedException,
  ExceptionType,
} from '../../types';
import { Button, StatusBadge } from '../common';
import { ResolveExceptionModal } from './ResolveExceptionModal';

interface ExceptionQueueTableProps {
  exceptions: EnrichedException[];
  isLoading?: boolean;
  onRefresh?: () => void;
  onUpdateException: (updated: EnrichedException) => void;
  onSelectShipment?: (trackingNumber: string) => void;
  onAnalyzeShipment?: (trackingNumber: string) => void;
}

export const ExceptionQueueTable: React.FC<ExceptionQueueTableProps> = ({
  exceptions,
  isLoading = false,
  onRefresh,
  onUpdateException,
  onSelectShipment,
  onAnalyzeShipment,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('ALL');
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [activeModalException, setActiveModalException] = useState<EnrichedException | null>(null);

  // Filter exceptions
  const filteredExceptions = useMemo(() => {
    return exceptions.filter((exc) => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTracking = (exc.tracking_number || '').toLowerCase().includes(q);
        const matchesDesc = (exc.description || '').toLowerCase().includes(q);
        const matchesRoot = (exc.root_cause || '').toLowerCase().includes(q);
        const matchesType = (exc.exception_type || '').toLowerCase().includes(q);
        if (!matchesTracking && !matchesDesc && !matchesRoot && !matchesType) {
          return false;
        }
      }

      // Status
      if (selectedStatus !== 'ALL') {
        if (selectedStatus === 'ACTIVE') {
          if (exc.status === 'RESOLVED' || exc.status === 'DISMISSED') return false;
        } else if (exc.status !== selectedStatus) {
          return false;
        }
      }

      // Severity
      if (selectedSeverity !== 'ALL' && exc.risk_level !== selectedSeverity) {
        return false;
      }

      // Type
      if (selectedType !== 'ALL' && exc.exception_type !== selectedType) {
        return false;
      }

      return true;
    });
  }, [exceptions, searchQuery, selectedStatus, selectedSeverity, selectedType]);

  // Aggregate Stats
  const stats = useMemo(() => {
    const total = exceptions.length;
    const critical = exceptions.filter((e) => e.risk_level === 'CRITICAL' || e.risk_level === 'HIGH').length;
    const open = exceptions.filter((e) => e.status === 'OPEN' || e.status === 'INVESTIGATING').length;
    const resolved = exceptions.filter((e) => e.status === 'RESOLVED').length;
    return { total, critical, open, resolved };
  }, [exceptions]);

  // Format timestamp
  const formatTime = (iso?: string) => {
    if (!iso) return 'Recent';
    try {
      const d = new Date(iso);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' });
    } catch {
      return iso;
    }
  };

  const getExceptionIcon = (type: ExceptionType) => {
    switch (type) {
      case 'MISSING_DOCUMENT':
        return <FileText className="w-4 h-4 text-amber-600" />;
      case 'WEIGHT_MISMATCH':
        return <Scale className="w-4 h-4 text-orange-600" />;
      case 'MILESTONE_OVERDUE':
        return <Clock className="w-4 h-4 text-red-600" />;
      case 'CUSTOMS_REJECTION':
        return <ShieldAlert className="w-4 h-4 text-rose-600" />;
      case 'CARRIER_DELAY':
        return <Truck className="w-4 h-4 text-blue-600" />;
      default:
        return <AlertTriangle className="w-4 h-4 text-slate-600" />;
    }
  };

  return (
    <div className="space-y-4">
      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white border border-slate-200 rounded-md p-3.5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Tracked</span>
            <Layers className="w-4 h-4 text-slate-400" />
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-1">{stats.total}</p>
          <span className="text-[11px] text-slate-400">All registered anomalies</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-md p-3.5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-red-600 uppercase tracking-wider">High & Critical</span>
            <ShieldAlert className="w-4 h-4 text-red-500" />
          </div>
          <p className="text-2xl font-bold text-red-600 mt-1">{stats.critical}</p>
          <span className="text-[11px] text-slate-400">Urgent operational impact</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-md p-3.5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-600 uppercase tracking-wider">Open / Triage</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-bold text-amber-700 mt-1">{stats.open}</p>
          <span className="text-[11px] text-slate-400">Awaiting corrective actions</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-md p-3.5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">Resolved</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-bold text-emerald-700 mt-1">{stats.resolved}</p>
          <span className="text-[11px] text-slate-400">Closed with audit sign-off</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-slate-200 rounded-md p-3 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search exceptions by tracking number, description, or root cause..."
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

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 text-xs">
          <span className="text-slate-400 font-semibold uppercase text-[10px] tracking-wider flex items-center gap-1">
            <Filter className="w-3 h-3" /> Filters:
          </span>

          {/* Status Select */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="text-xs py-1 px-2.5 bg-slate-50 border border-slate-200 rounded text-slate-700 font-medium focus:outline-none focus:border-blue-500"
          >
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">Active Only (Open / Triage)</option>
            <option value="OPEN">OPEN</option>
            <option value="INVESTIGATING">INVESTIGATING</option>
            <option value="IN_PROGRESS">IN_PROGRESS</option>
            <option value="PENDING_APPROVAL">PENDING_APPROVAL</option>
            <option value="RESOLVED">RESOLVED</option>
            <option value="DISMISSED">DISMISSED</option>
          </select>

          {/* Severity Select */}
          <select
            value={selectedSeverity}
            onChange={(e) => setSelectedSeverity(e.target.value)}
            className="text-xs py-1 px-2.5 bg-slate-50 border border-slate-200 rounded text-slate-700 font-medium focus:outline-none focus:border-blue-500"
          >
            <option value="ALL">All Severities</option>
            <option value="CRITICAL">Critical Risk</option>
            <option value="HIGH">High Risk</option>
            <option value="MEDIUM">Medium Risk</option>
            <option value="LOW">Low Risk</option>
          </select>

          {/* Type Select */}
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="text-xs py-1 px-2.5 bg-slate-50 border border-slate-200 rounded text-slate-700 font-medium focus:outline-none focus:border-blue-500"
          >
            <option value="ALL">All Exception Types</option>
            <option value="MISSING_DOCUMENT">Missing Document</option>
            <option value="WEIGHT_MISMATCH">Weight Mismatch</option>
            <option value="MILESTONE_OVERDUE">Milestone Overdue</option>
            <option value="CUSTOMS_REJECTION">Customs Rejection</option>
            <option value="CONSIGNEE_MISMATCH">Consignee Mismatch</option>
            <option value="CARRIER_DELAY">Carrier Delay</option>
          </select>

          {(selectedStatus !== 'ALL' || selectedSeverity !== 'ALL' || selectedType !== 'ALL' || searchQuery) && (
            <button
              onClick={() => {
                setSelectedStatus('ALL');
                setSelectedSeverity('ALL');
                setSelectedType('ALL');
                setSearchQuery('');
              }}
              className="text-blue-600 hover:text-blue-800 text-[11px] font-medium underline ml-auto"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Exception Cards List */}
      <div className="space-y-3">
        {filteredExceptions.length === 0 ? (
          <div className="p-12 text-center bg-white border border-slate-200 rounded-md">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
            <h4 className="text-sm font-bold text-slate-800 mt-2">No matching exceptions found</h4>
            <p className="text-xs text-slate-500 mt-1">
              Try adjusting your search query or reset the filters above.
            </p>
          </div>
        ) : (
          filteredExceptions.map((exc) => {
            const isResolved = exc.status === 'RESOLVED';
            const isCritical = exc.risk_level === 'CRITICAL' || exc.risk_level === 'HIGH';

            return (
              <div
                key={exc.id}
                className={`bg-white border rounded-md p-4 shadow-sm transition-all hover:shadow-md ${
                  isCritical && !isResolved
                    ? 'border-red-200 bg-red-50/10'
                    : isResolved
                    ? 'border-slate-200 opacity-90'
                    : 'border-slate-200'
                }`}
              >
                {/* Header Row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <div className="w-8 h-8 rounded bg-slate-50 border border-slate-200 flex items-center justify-center shrink-0">
                      {getExceptionIcon(exc.exception_type)}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        {exc.tracking_number && (
                          <button
                            onClick={() => onSelectShipment?.(exc.tracking_number!)}
                            className="font-mono font-bold text-xs text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1 bg-blue-50 px-2 py-0.5 rounded border border-blue-100"
                            title="View shipment details"
                          >
                            <span>{exc.tracking_number}</span>
                            <ExternalLink className="w-3 h-3" />
                          </button>
                        )}
                        <h4 className="text-xs font-bold text-slate-900 tracking-tight">
                          {exc.exception_type.replace(/_/g, ' ')}
                        </h4>
                      </div>

                      {exc.origin && exc.destination && (
                        <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3 text-slate-400" />
                          {exc.origin} → {exc.destination} ({exc.mode || 'FREIGHT'})
                          {exc.carrier_id && <span className="text-slate-400">| Carrier: {exc.carrier_id}</span>}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 self-start sm:self-center">
                    <StatusBadge status={exc.risk_level} size="sm" />
                    <StatusBadge status={exc.status} size="sm" />
                    <span className="text-[11px] text-slate-400 ml-1 font-mono">
                      {formatTime(exc.detected_at)}
                    </span>
                  </div>
                </div>

                {/* Body Content */}
                <div className="py-3 space-y-2.5 text-xs">
                  {/* Description */}
                  <p className="text-slate-800 font-medium leading-relaxed">{exc.description}</p>

                  {/* Root cause analysis */}
                  {exc.root_cause && (
                    <div className="p-2.5 bg-slate-50 border border-slate-200 rounded text-xs text-slate-700">
                      <span className="font-semibold text-slate-900 mr-1.5">Root Cause Diagnosis:</span>
                      <span>{exc.root_cause}</span>
                    </div>
                  )}

                  {/* Grounded Evidence Pills */}
                  {exc.evidence && exc.evidence.length > 0 && (
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                        Grounded Telemetry & Document Evidence:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {exc.evidence.map((ev, i) => (
                          <span
                            key={i}
                            className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 border border-slate-200 text-slate-700 rounded text-[11px]"
                          >
                            <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                            {ev}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Pending Action Tag (if any) */}
                  {exc.pending_action && (
                    <div className="flex items-center gap-2 pt-1">
                      <span className="text-[11px] font-medium text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded flex items-center gap-1">
                        <Clock className="w-3 h-3 text-amber-600" />
                        Queued Action: {exc.pending_action.action_type.replace(/_/g, ' ')} (Tool: {exc.pending_action.tool_used})
                      </span>
                    </div>
                  )}
                </div>

                {/* Action Footer */}
                <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                  <div className="text-[11px] text-slate-400 font-mono">
                    ID: {exc.id.slice(0, 13)}...
                    {exc.resolved_by && (
                      <span className="ml-2 text-emerald-700 font-sans">
                        • Resolved by {exc.resolved_by}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Copilot Diagnosis */}
                    {exc.tracking_number && onAnalyzeShipment && (
                      <Button
                        variant="agent"
                        size="sm"
                        onClick={() => onAnalyzeShipment(exc.tracking_number!)}
                        leftIcon={<Bot className="w-3.5 h-3.5" />}
                      >
                        Copilot Reason
                      </Button>
                    )}

                    {/* View Shipment */}
                    {exc.tracking_number && onSelectShipment && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => onSelectShipment(exc.tracking_number!)}
                        leftIcon={<Eye className="w-3.5 h-3.5" />}
                      >
                        Shipment
                      </Button>
                    )}

                    {/* Resolve / Update */}
                    <Button
                      variant={isResolved ? 'secondary' : 'primary'}
                      size="sm"
                      onClick={() => setActiveModalException(exc)}
                      leftIcon={isResolved ? <RefreshCw className="w-3.5 h-3.5" /> : <ShieldCheck className="w-3.5 h-3.5" />}
                    >
                      {isResolved ? 'Re-open / Edit' : 'Triage & Resolve'}
                    </Button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal for resolving exception */}
      <ResolveExceptionModal
        isOpen={Boolean(activeModalException)}
        onClose={() => setActiveModalException(null)}
        exception={activeModalException}
        onSuccess={(updated) => {
          onUpdateException(updated);
          setActiveModalException(null);
        }}
      />
    </div>
  );
};
