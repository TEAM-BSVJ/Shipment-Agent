import React from 'react';
import { Copy, Check, Terminal, Database, Clock, User, ShieldCheck } from 'lucide-react';
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
  const [copied, setCopied] = React.useState(false);

  if (!entry) return null;

  const jsonString = JSON.stringify(entry.details || {}, null, 2);

  const handleCopy = () => {
    navigator.clipboard.writeText(jsonString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

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

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Audit Event Details & Payload"
      description="Cryptographically tracked immutable event log entry."
      maxWidth="xl"
    >
      <div className="space-y-4">
        {/* Event Header Summary */}
        <div className="p-3.5 bg-navy-900 border border-navy-700 rounded-md grid grid-cols-2 gap-2 text-xs font-mono">
          <div>
            <span className="text-[10px] text-slateText-muted uppercase block">Action Name</span>
            <span className="font-bold text-white">{entry.action}</span>
          </div>

          <div>
            <span className="text-[10px] text-slateText-muted uppercase block">Actor Entity</span>
            <span className={`inline-block px-1.5 py-0.5 rounded border text-[10px] font-bold ${getActorBadge(entry.actor_type)}`}>
              {entry.actor_type}: {entry.actor_id}
            </span>
          </div>

          <div>
            <span className="text-[10px] text-slateText-muted uppercase block">Target Entity</span>
            <span className="text-cyan-400 font-semibold">{entry.entity_type}</span>
            <span className="text-slateText-muted ml-1 text-[10px]">({entry.entity_id})</span>
          </div>

          <div>
            <span className="text-[10px] text-slateText-muted uppercase block">Timestamp (UTC)</span>
            <span className="text-slateText-primary">{entry.created_at}</span>
          </div>
        </div>

        {/* JSON Payload Inspector */}
        <div>
          <div className="flex items-center justify-between pb-1.5 mb-1 border-b border-navy-700">
            <span className="text-xs font-bold text-slateText-muted font-mono uppercase flex items-center gap-1.5">
              <Terminal className="w-3.5 h-3.5 text-cyan-400" /> Event Payload JSON
            </span>
            <Button
              variant="secondary"
              size="sm"
              leftIcon={copied ? <Check className="w-3.5 h-3.5 text-mint-400" /> : <Copy className="w-3.5 h-3.5" />}
              onClick={handleCopy}
              className="py-1 px-2 text-[11px]"
            >
              {copied ? 'Copied' : 'Copy JSON'}
            </Button>
          </div>

          <pre className="p-3.5 rounded bg-navy-950 border border-navy-800 text-cyan-300 overflow-x-auto text-xs font-mono max-h-72 leading-relaxed">
            {jsonString}
          </pre>
        </div>

        <div className="flex items-center justify-end pt-2 border-t border-navy-700/60">
          <Button variant="secondary" size="sm" onClick={onClose}>
            Close Inspector
          </Button>
        </div>
      </div>
    </Modal>
  );
};
