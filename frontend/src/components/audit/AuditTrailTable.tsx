import React, { useState, useMemo } from 'react';
import {
  Bot,
  Database,
  Eye,
  Filter,
  History,
  RefreshCw,
  Search,
  User,
  Zap,
} from 'lucide-react';
import { AuditLogEntry } from '../../types';
import { Button } from '../common';
import { AuditPayloadModal } from './AuditPayloadModal';

interface AuditTrailTableProps {
  logs: AuditLogEntry[];
  isLoading?: boolean;
  onRefresh?: () => void;
}

export const AuditTrailTable: React.FC<AuditTrailTableProps> = ({
  logs,
  isLoading = false,
  onRefresh,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedActorType, setSelectedActorType] = useState<string>('ALL');
  const [selectedEntityType, setSelectedEntityType] = useState<string>('ALL');
  const [activeModalEntry, setActiveModalEntry] = useState<AuditLogEntry | null>(null);

  // Filtered logs
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesAction = (log.action || '').toLowerCase().includes(q);
        const matchesActor = (log.actor_id || '').toLowerCase().includes(q);
        const matchesEntityId = (log.entity_id || '').toLowerCase().includes(q);
        const matchesEntityType = (log.entity_type || '').toLowerCase().includes(q);
        const matchesDetails = JSON.stringify(log.details || {}).toLowerCase().includes(q);
        if (
          !matchesAction &&
          !matchesActor &&
          !matchesEntityId &&
          !matchesEntityType &&
          !matchesDetails
        ) {
          return false;
        }
      }

      // Actor type
      if (selectedActorType !== 'ALL' && log.actor_type.toUpperCase() !== selectedActorType) {
        return false;
      }

      // Entity type
      if (
        selectedEntityType !== 'ALL' &&
        log.entity_type.toLowerCase() !== selectedEntityType.toLowerCase()
      ) {
        return false;
      }

      return true;
    });
  }, [logs, searchQuery, selectedActorType, selectedEntityType]);

  // Aggregate stats
  const stats = useMemo(() => {
    const total = logs.length;
    const userActions = logs.filter((l) => l.actor_type.toUpperCase() === 'USER').length;
    const agentInferences = logs.filter((l) => l.actor_type.toUpperCase() === 'AGENT').length;
    const systemEvents = logs.filter(
      (l) => l.actor_type.toUpperCase() === 'SYSTEM' || l.actor_type.toUpperCase() === 'PIPELINE'
    ).length;
    return { total, userActions, agentInferences, systemEvents };
  }, [logs]);

  const formatTimestamp = (iso?: string): { date: string; time: string } => {
    if (!iso) return { date: 'Recent', time: '' };
    try {
      const d = new Date(iso);
      return {
        date: d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }),
        time: d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      };
    } catch {
      return { date: iso, time: '' };
    }
  };

  const getActorIcon = (actorType: string) => {
    switch (actorType.toUpperCase()) {
      case 'AGENT':
        return <Bot className="w-3.5 h-3.5 text-violet-600" />;
      case 'USER':
        return <User className="w-3.5 h-3.5 text-emerald-600" />;
      case 'PIPELINE':
        return <Zap className="w-3.5 h-3.5 text-amber-600" />;
      default:
        return <Database className="w-3.5 h-3.5 text-blue-600" />;
    }
  };

  const getActionBadgeColor = (action: string) => {
    const upper = action.toUpperCase();
    if (upper.includes('APPROVED')) return 'bg-emerald-50 text-emerald-800 border-emerald-200';
    if (upper.includes('REJECTED')) return 'bg-red-50 text-red-800 border-red-200';
    if (upper.includes('DIAGNOSIS') || upper.includes('AGENT'))
      return 'bg-violet-50 text-violet-800 border-violet-200';
    if (upper.includes('SEED')) return 'bg-slate-100 text-slate-700 border-slate-200';
    if (upper.includes('EXCEPTION')) return 'bg-amber-50 text-amber-800 border-amber-200';
    return 'bg-blue-50 text-blue-800 border-blue-200';
  };

  return (
    <div className="space-y-4">
      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white border border-slate-200 rounded-md p-3.5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Log Entries
            </span>
            <History className="w-4 h-4 text-slate-400" />
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-1">{stats.total}</p>
          <span className="text-[11px] text-slate-400">Append-only compliance log</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-md p-3.5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">
              Human Authorizations
            </span>
            <User className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-bold text-emerald-700 mt-1">{stats.userActions}</p>
          <span className="text-[11px] text-slate-400">Operator review decisions</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-md p-3.5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-violet-700 uppercase tracking-wider">
              AI Agent Inferences
            </span>
            <Bot className="w-4 h-4 text-violet-600" />
          </div>
          <p className="text-2xl font-bold text-violet-700 mt-1">{stats.agentInferences}</p>
          <span className="text-[11px] text-slate-400">Gemma 4 reasoning runs</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-md p-3.5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-blue-700 uppercase tracking-wider">
              Pipelines & Telemetry
            </span>
            <Zap className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-2xl font-bold text-blue-700 mt-1">{stats.systemEvents}</p>
          <span className="text-[11px] text-slate-400">Automated sensor & WMS scans</span>
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
              placeholder="Search audit trail by action, actor, entity ID, or keyword..."
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
              Refresh Logs
            </Button>
          )}
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 text-xs">
          <span className="text-slate-400 font-semibold uppercase text-[10px] tracking-wider flex items-center gap-1">
            <Filter className="w-3 h-3" /> Filter Log Stream:
          </span>

          {/* Actor Select */}
          <select
            value={selectedActorType}
            onChange={(e) => setSelectedActorType(e.target.value)}
            className="text-xs py-1 px-2.5 bg-slate-50 border border-slate-200 rounded text-slate-700 font-medium focus:outline-none focus:border-blue-500"
          >
            <option value="ALL">All Actors</option>
            <option value="AGENT">AGENT (Evolus Gemma 4)</option>
            <option value="USER">USER (Human Reviewer)</option>
            <option value="SYSTEM">SYSTEM (Seeder / Scheduler)</option>
            <option value="PIPELINE">PIPELINE (OCR / Document)</option>
            <option value="TELEMETRY">TELEMETRY (GPS / EDI)</option>
          </select>

          {/* Entity Select */}
          <select
            value={selectedEntityType}
            onChange={(e) => setSelectedEntityType(e.target.value)}
            className="text-xs py-1 px-2.5 bg-slate-50 border border-slate-200 rounded text-slate-700 font-medium focus:outline-none focus:border-blue-500"
          >
            <option value="ALL">All Entities</option>
            <option value="shipment">Shipment</option>
            <option value="approval">Approval</option>
            <option value="exception">Exception</option>
            <option value="document">Document</option>
          </select>

          {(selectedActorType !== 'ALL' || selectedEntityType !== 'ALL' || searchQuery) && (
            <button
              onClick={() => {
                setSelectedActorType('ALL');
                setSelectedEntityType('ALL');
                setSearchQuery('');
              }}
              className="text-blue-600 hover:text-blue-800 text-[11px] font-medium underline ml-auto"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-white border border-slate-200 rounded-md shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] uppercase tracking-wider text-slate-500 font-bold">
                <th className="py-3 px-4">Committed Timestamp</th>
                <th className="py-3 px-4">Actor</th>
                <th className="py-3 px-4">Action Recorded</th>
                <th className="py-3 px-4">Target Entity</th>
                <th className="py-3 px-4">Context Summary</th>
                <th className="py-3 px-4 text-right">Payload Inspection</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    <History className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="font-bold text-slate-700">No audit log records found</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Try clearing the active search or actor filters.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => {
                  const ts = formatTimestamp(log.created_at);

                  // Extract concise details string
                  const detailsSnippet =
                    typeof log.details === 'object' && log.details !== null
                      ? Object.entries(log.details)
                          .map(([k, v]) => `${k}: ${String(v)}`)
                          .slice(0, 3)
                          .join(' | ')
                      : 'N/A';

                  return (
                    <tr
                      key={log.id}
                      className="hover:bg-slate-50/60 transition-colors group"
                    >
                      {/* Timestamp */}
                      <td className="py-3 px-4 font-mono text-[11px] whitespace-nowrap text-slate-700">
                        <div className="font-semibold">{ts.date}</div>
                        <div className="text-[10px] text-slate-400">{ts.time} UTC</div>
                      </td>

                      {/* Actor */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          {getActorIcon(log.actor_type)}
                          <div>
                            <p className="font-mono text-xs font-bold text-slate-800 truncate max-w-[140px]" title={log.actor_id}>
                              {log.actor_id}
                            </p>
                            <span className="text-[10px] px-1 py-0.2 rounded bg-slate-100 text-slate-500 font-medium">
                              {log.actor_type}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Action */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className={`font-mono font-bold text-[11px] px-2 py-0.5 rounded border inline-block ${getActionBadgeColor(
                            log.action
                          )}`}
                        >
                          {log.action}
                        </span>
                      </td>

                      {/* Entity */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-mono text-[11px]">
                          <span className="capitalize text-slate-700 font-semibold bg-slate-100 px-1.5 py-0.5 rounded mr-1">
                            {log.entity_type}
                          </span>
                          <span className="text-slate-400 text-[10px]" title={log.entity_id}>
                            {log.entity_id.slice(0, 8)}...
                          </span>
                        </div>
                      </td>

                      {/* Summary */}
                      <td className="py-3 px-4 text-slate-600 text-xs max-w-xs truncate" title={detailsSnippet}>
                        {detailsSnippet}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setActiveModalEntry(log)}
                          leftIcon={<Eye className="w-3.5 h-3.5 text-slate-500" />}
                          className="hover:bg-slate-200/60"
                        >
                          Inspect
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Payload Modal */}
      <AuditPayloadModal
        isOpen={Boolean(activeModalEntry)}
        onClose={() => setActiveModalEntry(null)}
        entry={activeModalEntry}
      />
    </div>
  );
};
