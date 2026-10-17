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
  Flame,
  ShieldCheck,
  Truck,
  Sparkles,
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

  const formatTime = (iso?: string) => {
    if (!iso) return 'Recent';
    try {
      const d = new Date(iso);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) + ' UTC';
    } catch {
      return iso;
    }
  };

  const getExceptionIcon = (type: ExceptionType | string) => {
    switch (type) {
      case 'MISSING_DOCUMENT':
        return <FileText className="w-4 h-4 text-coral-400" />;
      case 'WEIGHT_MISMATCH':
        return <Scale className="w-4 h-4 text-coral-400" />;
      case 'MILESTONE_OVERDUE':
        return <Clock className="w-4 h-4 text-amber-400" />;
      case 'CUSTOMS_REJECTION':
        return <Flame className="w-4 h-4 text-coral-400" />;
      default:
        return <AlertTriangle className="w-4 h-4 text-coral-400" />;
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Telemetry Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div
          onClick={() => {
            setSelectedStatus('ALL');
            setSelectedSeverity('ALL');
          }}
          className={`p-3 rounded-md border cursor-pointer transition-all ${
            selectedStatus === 'ALL' && selectedSeverity === 'ALL'
              ? 'bg-navy-850 border-cyan-400 shadow-glow-cyan'
              : 'bg-navy-900 border-navy-700 hover:border-navy-600'
          }`}
        >
          <span className="text-[11px] font-semibold text-slateText-muted uppercase tracking-wider block font-mono">
            Total Bottlenecks
          </span>
          <p className="text-xl font-bold font-mono text-white mt-1">{stats.total}</p>
        </div>

        <div
          onClick={() => {
            setSelectedSeverity('CRITICAL');
            setSelectedStatus('ACTIVE');
          }}
          className={`p-3 rounded-md border cursor-pointer transition-all ${
            selectedSeverity === 'CRITICAL'
              ? 'bg-navy-850 border-coral-400 shadow-glow-coral'
              : 'bg-navy-900 border-navy-700 hover:border-navy-600'
          }`}
        >
          <span className="text-[11px] font-semibold text-coral-400 uppercase tracking-wider block font-mono flex items-center gap-1">
            <Flame className="w-3.5 h-3.5" /> High / Critical
          </span>
          <p className="text-xl font-bold font-mono text-coral-400 mt-1">{stats.critical}</p>
        </div>

        <div
          onClick={() => {
            setSelectedStatus('ACTIVE');
            setSelectedSeverity('ALL');
          }}
          className={`p-3 rounded-md border cursor-pointer transition-all ${
            selectedStatus === 'ACTIVE' && selectedSeverity === 'ALL'
              ? 'bg-navy-850 border-amber-400 shadow-glow-amber'
              : 'bg-navy-900 border-navy-700 hover:border-navy-600'
          }`}
        >
          <span className="text-[11px] font-semibold text-amber-400 uppercase tracking-wider block font-mono">
            Active Triage
          </span>
          <p className="text-xl font-bold font-mono text-amber-400 mt-1">{stats.open}</p>
        </div>

        <div
          onClick={() => {
            setSelectedStatus('RESOLVED');
            setSelectedSeverity('ALL');
          }}
          className={`p-3 rounded-md border cursor-pointer transition-all ${
            selectedStatus === 'RESOLVED'
              ? 'bg-navy-850 border-mint-400 shadow-glow-mint'
              : 'bg-navy-900 border-navy-700 hover:border-navy-600'
          }`}
        >
          <span className="text-[11px] font-semibold text-mint-400 uppercase tracking-wider block font-mono">
            Resolved Log
          </span>
          <p className="text-xl font-bold font-mono text-mint-400 mt-1">{stats.resolved}</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-navy-900 border border-navy-700 rounded-md p-3.5 space-y-3 shadow-md">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Search box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-cyan-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search exceptions by tracking #, root cause, or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-navy-950 border border-navy-700 rounded text-slateText-primary placeholder-slateText-muted focus:outline-none focus:border-cyan-400 font-mono"
            />
          </div>

          {/* Quick Severity Buttons */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-semibold text-slateText-muted uppercase tracking-wider font-mono mr-1">
              Tier:
            </span>
            {['ALL', 'CRITICAL', 'HIGH', 'MEDIUM'].map((sev) => (
              <button
                key={sev}
                onClick={() => setSelectedSeverity(sev)}
                className={`text-[11px] font-mono px-2 py-1 rounded border transition-all ${
                  selectedSeverity === sev
                    ? 'bg-cyan-400 text-navy-950 border-cyan-400 font-bold shadow-glow-cyan'
                    : 'bg-navy-850 text-slateText-secondary border-navy-700 hover:bg-navy-800 hover:text-white'
                }`}
              >
                {sev}
              </button>
            ))}
          </div>
        </div>

        {/* Status and Type Selectors */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-navy-700/60 text-xs">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <label className="text-slateText-muted font-mono text-[11px]">Status:</label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="py-1 px-2.5 bg-navy-850 border border-navy-700 rounded text-slateText-primary focus:outline-none focus:border-cyan-400 text-xs font-mono"
              >
                <option value="ALL">All Statuses</option>
                <option value="ACTIVE">Active (Open & Investigating)</option>
                <option value="OPEN">Open</option>
                <option value="INVESTIGATING">Investigating</option>
                <option value="PENDING_APPROVAL">Pending Human Approval</option>
                <option value="RESOLVED">Resolved</option>
                <option value="DISMISSED">Dismissed</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-slateText-muted font-mono text-[11px]">Type:</label>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="py-1 px-2.5 bg-navy-850 border border-navy-700 rounded text-slateText-primary focus:outline-none focus:border-cyan-400 text-xs font-mono"
              >
                <option value="ALL">All Bottleneck Types</option>
                <option value="MISSING_DOCUMENT">Missing Document</option>
                <option value="WEIGHT_MISMATCH">Weight Mismatch</option>
                <option value="MILESTONE_OVERDUE">Milestone Overdue</option>
                <option value="CUSTOMS_REJECTION">Customs Hold</option>
              </select>
            </div>
          </div>

          {(searchQuery || selectedStatus !== 'ALL' || selectedSeverity !== 'ALL' || selectedType !== 'ALL') && (
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedStatus('ALL');
                setSelectedSeverity('ALL');
                setSelectedType('ALL');
              }}
              className="text-[11px] font-mono text-cyan-400 hover:text-cyan-300 underline"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Exception Items List */}
      <div className="space-y-3">
        {filteredExceptions.length === 0 ? (
          <div className="p-12 text-center bg-navy-900 border border-navy-700 rounded-md">
            <CheckCircle2 className="w-10 h-10 text-mint-400 mx-auto mb-2 opacity-80" />
            <h4 className="text-sm font-bold text-white font-mono">No Active Exceptions Match Filters</h4>
            <p className="text-xs text-slateText-secondary max-w-sm mx-auto mt-1">
              All monitored shipments are operating within operational thresholds for the chosen filters.
            </p>
          </div>
        ) : (
          filteredExceptions.map((exc) => {
            const isCritical = exc.risk_level === 'CRITICAL' || exc.risk_level === 'HIGH';

            return (
              <div
                key={exc.id}
                className={`bg-navy-850 border rounded-md p-4 transition-all shadow-sm ${
                  isCritical
                    ? 'border-coral-400/50 hover:border-coral-400 hover:shadow-glow-coral'
                    : 'border-navy-700 hover:border-navy-600'
                }`}
              >
                {/* Header row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-navy-700/60">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="p-1.5 rounded bg-navy-900 border border-navy-700">
                      {getExceptionIcon(exc.exception_type)}
                    </span>
                    <button
                      onClick={() => onSelectShipment && onSelectShipment(exc.tracking_number || '')}
                      className="font-mono font-bold text-xs text-cyan-400 hover:underline flex items-center gap-1"
                    >
                      {exc.tracking_number}
                      <ExternalLink className="w-3 h-3 text-slateText-muted" />
                    </button>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-navy-900 text-slateText-secondary border border-navy-700">
                      {exc.mode} Freight
                    </span>
                    <span className="text-xs font-bold text-white font-mono">
                      {exc.exception_type.replace(/_/g, ' ')}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <StatusBadge status={exc.risk_level} size="sm" />
                    <StatusBadge status={exc.status} size="sm" />
                  </div>
                </div>

                {/* Description & Route */}
                <div className="mt-3 space-y-2">
                  <div className="flex items-center gap-2 text-xs text-slateText-muted font-mono">
                    <MapPin className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                    <span>
                      {exc.origin} → {exc.destination} ({exc.carrier_id})
                    </span>
                    <span className="text-navy-700">•</span>
                    <span>Detected {formatTime(exc.detected_at)}</span>
                  </div>

                  <p className="text-xs text-slateText-primary leading-relaxed font-sans">
                    {exc.description}
                  </p>
                </div>

                {/* Empirical Evidence Badges */}
                {exc.evidence && exc.evidence.length > 0 && (
                  <div className="mt-3 pt-2.5 border-t border-navy-700/60">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slateText-muted font-mono block mb-1.5">
                      Verified Empirical Evidence:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {exc.evidence.map((ev, idx) => (
                        <span
                          key={idx}
                          className="px-2.5 py-1 rounded bg-navy-900 border border-navy-700 text-[11px] font-mono text-cyan-300"
                        >
                          • {ev}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* AI Root Cause & Recommendation */}
                {exc.root_cause && (
                  <div className="mt-3 p-3 rounded bg-navy-900 border border-violet-400/30 text-xs space-y-1">
                    <div className="flex items-center gap-1.5 text-violet-300 font-bold font-mono">
                      <Sparkles className="w-3.5 h-3.5 text-violet-400" />
                      <span>Evolus AI Root-Cause Diagnosis (Gemma 4 31B-it):</span>
                    </div>
                    <p className="text-slateText-secondary leading-relaxed font-sans">
                      {exc.root_cause}
                    </p>
                  </div>
                )}

                {/* Actions Footer */}
                <div className="mt-3.5 pt-2.5 border-t border-navy-700/60 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-xs font-mono">
                    {exc.pending_action && (
                      <span className="text-amber-400 text-[11px] flex items-center gap-1 font-semibold">
                        <Clock className="w-3.5 h-3.5" />
                        Pending Action: {exc.pending_action.action_type} ({exc.pending_action.status})
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setActiveModalException(exc)}
                      leftIcon={<Eye className="w-3.5 h-3.5" />}
                    >
                      Update Status
                    </Button>
                    <Button
                      variant="agent"
                      size="sm"
                      onClick={() => onAnalyzeShipment && onAnalyzeShipment(exc.tracking_number || '')}
                      leftIcon={<Sparkles className="w-3.5 h-3.5" />}
                    >
                      Triage with Copilot
                    </Button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Resolution Modal */}
      {activeModalException && (
        <ResolveExceptionModal
          isOpen={Boolean(activeModalException)}
          onClose={() => setActiveModalException(null)}
          exception={activeModalException}
          onSuccess={(updated) => {
            onUpdateException(updated);
            if (onRefresh) onRefresh();
          }}
        />
      )}
    </div>
  );
};
