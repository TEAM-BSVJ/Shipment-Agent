import React, { useState, useMemo } from 'react';
import {
  Sparkles,
  Database,
  Eye,
  Filter,
  History,
  RefreshCw,
  Search,
  User,
  Radio,
  FileCheck2,
  Download,
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

      if (selectedActorType !== 'ALL' && log.actor_type.toUpperCase() !== selectedActorType) {
        return false;
      }

      if (selectedEntityType !== 'ALL' && log.entity_type.toLowerCase() !== selectedEntityType.toLowerCase()) {
        return false;
      }

      return true;
    });
  }, [logs, searchQuery, selectedActorType, selectedEntityType]);

  const getActorBadge = (actorType: string) => {
    switch (actorType.toUpperCase()) {
      case 'AGENT':
        return 'bg-violet-400/20 text-violet-300 border-violet-400/40';
      case 'USER':
        return 'bg-mint-400/20 text-mint-400 border-mint-400/40';
      case 'SYSTEM':
        return 'bg-cyan-400/20 text-cyan-400 border-cyan-400/40';
      default:
        return 'bg-amber-400/20 text-amber-400 border-amber-400/40';
    }
  };

  const formatTimestamp = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }) + ' UTC';
    } catch {
      return iso;
    }
  };

  const handleExportCsv = () => {
    const headers = ['Timestamp', 'Actor Type', 'Actor ID', 'Action', 'Entity Type', 'Entity ID', 'Details'];
    const rows = filteredLogs.map((l) => [
      l.created_at,
      l.actor_type,
      `"${l.actor_id}"`,
      l.action,
      l.entity_type,
      l.entity_id,
      `"${JSON.stringify(l.details || {}).replace(/"/g, '""')}"`,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `ShipRAG_Compliance_Audit_${new Date().toISOString().substring(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4">
      {/* Search and Filters Bar */}
      <div className="bg-navy-900 border border-navy-700 rounded-md p-3.5 space-y-3 shadow-md">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-cyan-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search audit trail by action, actor, entity ID, or payload details..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-navy-950 border border-navy-700 rounded text-slateText-primary placeholder-slateText-muted focus:outline-none focus:border-cyan-400 font-mono"
            />
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Download className="w-3.5 h-3.5" />}
              onClick={handleExportCsv}
            >
              Export CSV
            </Button>
          </div>
        </div>

        {/* Actor and Entity Filters */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-navy-700/60 text-xs font-mono">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <label className="text-slateText-muted text-[11px]">Actor Type:</label>
              <select
                value={selectedActorType}
                onChange={(e) => setSelectedActorType(e.target.value)}
                className="py-1 px-2.5 bg-navy-850 border border-navy-700 rounded text-slateText-primary focus:outline-none focus:border-cyan-400 text-xs"
              >
                <option value="ALL">All Actors</option>
                <option value="AGENT">AGENT (Autonomous AI)</option>
                <option value="USER">USER (Operations Lead)</option>
                <option value="SYSTEM">SYSTEM (Scheduler / Ingestion)</option>
                <option value="TOOL">TOOL (Allowlisted Handlers)</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-slateText-muted text-[11px]">Entity:</label>
              <select
                value={selectedEntityType}
                onChange={(e) => setSelectedEntityType(e.target.value)}
                className="py-1 px-2.5 bg-navy-850 border border-navy-700 rounded text-slateText-primary focus:outline-none focus:border-cyan-400 text-xs"
              >
                <option value="ALL">All Entities</option>
                <option value="shipment">Shipment</option>
                <option value="exception">Exception</option>
                <option value="approval">Approval</option>
                <option value="document">Document</option>
                <option value="notification">Notification</option>
              </select>
            </div>
          </div>

          <span className="text-slateText-muted text-[11px]">
            Showing <strong className="text-white">{filteredLogs.length}</strong> of {logs.length} audit entries
          </span>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-navy-900 border border-navy-700 rounded-md shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs font-mono">
            <thead>
              <tr className="bg-navy-800 border-b border-navy-700 text-slateText-muted uppercase text-[11px]">
                <th className="py-2.5 px-4">Timestamp (UTC)</th>
                <th className="py-2.5 px-3">Actor</th>
                <th className="py-2.5 px-3">Action Name</th>
                <th className="py-2.5 px-3">Target Entity</th>
                <th className="py-2.5 px-3">Summary Details</th>
                <th className="py-2.5 px-4 text-right">Payload</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-navy-700/60">
              {filteredLogs.map((log) => (
                <tr
                  key={log.id}
                  onClick={() => setActiveModalEntry(log)}
                  className="hover:bg-navy-850 transition-colors cursor-pointer group"
                >
                  <td className="py-2.5 px-4 text-slateText-muted whitespace-nowrap">
                    {formatTimestamp(log.created_at)}
                  </td>
                  <td className="py-2.5 px-3 whitespace-nowrap">
                    <span className={`px-2 py-0.5 rounded border text-[10px] font-bold ${getActorBadge(log.actor_type)}`}>
                      {log.actor_type}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 font-bold text-white whitespace-nowrap">
                    {log.action}
                  </td>
                  <td className="py-2.5 px-3 text-cyan-400 whitespace-nowrap">
                    {log.entity_type}
                    <span className="text-slateText-muted text-[10px] ml-1">
                      ({log.entity_id.substring(0, 8)}...)
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-slateText-secondary truncate max-w-xs font-sans">
                    {String(log.details?.reason || log.details?.scenario || log.details?.root_cause || (log.details ? JSON.stringify(log.details) : '—'))}
                  </td>
                  <td className="py-2.5 px-4 text-right whitespace-nowrap">
                    <button className="px-2 py-1 bg-navy-850 border border-navy-700 rounded text-cyan-400 group-hover:bg-cyan-400 group-hover:text-navy-950 transition-colors text-[11px]">
                      View Diff
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Payload Modal */}
      {activeModalEntry && (
        <AuditPayloadModal
          isOpen={Boolean(activeModalEntry)}
          onClose={() => setActiveModalEntry(null)}
          entry={activeModalEntry}
        />
      )}
    </div>
  );
};
