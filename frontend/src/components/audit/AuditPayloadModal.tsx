import React, { useState } from 'react';
import {
  Bot,
  Check,
  Clock,
  Code,
  Copy,
  Database,
  ShieldCheck,
  User,
} from 'lucide-react';
import { Button, Modal } from '../common';
import { AuditLogEntry } from '../../types';

interface AuditPayloadModalProps {
  isOpen: boolean;
  onClose: () => void;
  entry: AuditLogEntry | null;
}

export const AuditPayloadModal: React.FC<AuditPayloadModalProps> = ({
  isOpen,
  onClose,
  entry,
}) => {
  const [copied, setCopied] = useState(false);

  if (!entry) return null;

  const handleCopyJson = () => {
    try {
      navigator.clipboard.writeText(JSON.stringify(entry, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  const formatTimestamp = (iso?: string) => {
    if (!iso) return 'Recent';
    try {
      const d = new Date(iso);
      return d.toUTCString();
    } catch {
      return iso;
    }
  };

  const isAgent = entry.actor_type.toUpperCase() === 'AGENT';
  const isUser = entry.actor_type.toUpperCase() === 'USER';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Immutable Audit Entry Inspection"
      description="Cryptographically referenced PostgreSQL audit log record (RULE-A04 compliance)."
      maxWidth="xl"
    >
      <div className="space-y-4">
        {/* Compliance Verification Pill */}
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-md flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-900">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Verified Append-Only PostgreSQL Log Entry</span>
          </div>
          <span className="text-[10px] font-mono bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded border border-emerald-300 font-bold">
            IMMUTABLE
          </span>
        </div>

        {/* Metadata Grid */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="bg-slate-50 p-2.5 rounded border border-slate-200">
            <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">
              Action Recorded
            </span>
            <span className="font-mono font-bold text-slate-900">{entry.action}</span>
          </div>

          <div className="bg-slate-50 p-2.5 rounded border border-slate-200">
            <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">
              Actor Identity
            </span>
            <div className="flex items-center gap-1.5 font-medium text-slate-800">
              {isAgent ? (
                <Bot className="w-3.5 h-3.5 text-violet-600" />
              ) : isUser ? (
                <User className="w-3.5 h-3.5 text-emerald-600" />
              ) : (
                <Database className="w-3.5 h-3.5 text-blue-600" />
              )}
              <span className="font-mono text-[11px] truncate">{entry.actor_id}</span>
              <span className="text-[10px] px-1 rounded bg-slate-200 text-slate-700">
                {entry.actor_type}
              </span>
            </div>
          </div>

          <div className="bg-slate-50 p-2.5 rounded border border-slate-200">
            <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">
              Target Entity
            </span>
            <div className="flex items-center gap-1.5 font-mono text-slate-800 text-[11px]">
              <span className="capitalize font-bold text-blue-700 bg-blue-50 px-1.5 py-0.2 rounded border border-blue-200 text-[10px]">
                {entry.entity_type}
              </span>
              <span className="truncate" title={entry.entity_id}>
                {entry.entity_id}
              </span>
            </div>
          </div>

          <div className="bg-slate-50 p-2.5 rounded border border-slate-200">
            <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">
              Committed Timestamp (UTC)
            </span>
            <span className="font-mono text-slate-800 text-[11px] flex items-center gap-1">
              <Clock className="w-3 h-3 text-slate-400" />
              {formatTimestamp(entry.created_at)}
            </span>
          </div>
        </div>

        {/* JSON Details Inspector */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Code className="w-3.5 h-3.5 text-slate-500" /> Structured Context Payload (JSON)
            </span>
            <button
              onClick={handleCopyJson}
              className="text-slate-500 hover:text-slate-800 flex items-center gap-1 text-[11px] font-medium"
            >
              {copied ? (
                <>
                  <Check className="w-3 h-3 text-emerald-600" />
                  <span className="text-emerald-700">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  <span>Copy Payload</span>
                </>
              )}
            </button>
          </div>

          <div className="bg-slate-900 rounded-md p-3.5 text-slate-200 font-mono text-[11px] overflow-x-auto max-h-72 border border-slate-800">
            <pre>{JSON.stringify(entry.details, null, 2)}</pre>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-100">
          <div className="text-[10px] text-slate-400 font-mono">
            UUID: {entry.id}
          </div>
          <Button variant="secondary" size="sm" onClick={onClose}>
            Close Inspection
          </Button>
        </div>
      </div>
    </Modal>
  );
};
