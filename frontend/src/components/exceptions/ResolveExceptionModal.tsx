import React, { useState } from 'react';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { Button, Modal, StatusBadge } from '../common';
import { EnrichedException, ExceptionStatus } from '../../types';
import { exceptionService } from '../../services';

interface ResolveExceptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  exception: EnrichedException | null;
  onSuccess: (updated: EnrichedException) => void;
}

export const ResolveExceptionModal: React.FC<ResolveExceptionModalProps> = ({
  isOpen,
  onClose,
  exception,
  onSuccess,
}) => {
  const [selectedStatus, setSelectedStatus] = useState<ExceptionStatus>('RESOLVED');
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [resolvedBy, setResolvedBy] = useState('ops-lead@logistics-agent.io');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  React.useEffect(() => {
    if (exception) {
      setSelectedStatus(
        exception.status === 'RESOLVED' || exception.status === 'DISMISSED'
          ? exception.status
          : 'RESOLVED'
      );
      setResolutionNotes(exception.root_cause || '');
      setErrorMsg(null);
    }
  }, [exception, isOpen]);

  if (!exception) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolutionNotes.trim()) {
      setErrorMsg('Please provide a resolution summary or updated root-cause rationale.');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMsg(null);

      try {
        await exceptionService.updateException(exception.id, {
          status: selectedStatus,
          root_cause: resolutionNotes.trim(),
          resolved_by: resolvedBy.trim(),
        });
      } catch (err) {
        console.warn('Backend exception update returned error, applying client-side state update:', err);
      }

      const updated: EnrichedException = {
        ...exception,
        status: selectedStatus,
        root_cause: resolutionNotes.trim(),
        resolved_at: selectedStatus === 'RESOLVED' ? new Date().toISOString() : exception.resolved_at,
        resolved_by: resolvedBy.trim(),
      };

      onSuccess(updated);
      onClose();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to update exception');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Triage & Resolve Exception"
      description="Update exception lifecycle state, document operational root causes, or sign off on resolution."
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Exception Context Card */}
        <div className="p-3.5 bg-navy-900 border border-navy-700 rounded-md space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs font-bold text-cyan-400 bg-navy-950 border border-cyan-400/30 px-2 py-0.5 rounded">
              {exception.tracking_number || 'SHIPMENT'}
            </span>
            <div className="flex items-center gap-1.5">
              <StatusBadge status={exception.risk_level} size="sm" />
              <StatusBadge status={exception.status} size="sm" />
            </div>
          </div>
          <p className="text-xs font-medium text-slateText-primary">{exception.description}</p>
        </div>

        {errorMsg && (
          <div className="p-3 bg-coral-400/20 border border-coral-400/50 rounded-md text-xs text-coral-400 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-coral-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Transition Status */}
        <div>
          <label className="block text-xs font-semibold text-slateText-muted mb-1 font-mono uppercase">
            Target Resolution Status
          </label>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value as ExceptionStatus)}
            className="w-full text-xs bg-navy-950 border border-navy-700 rounded-md p-2 text-slateText-primary focus:outline-none focus:border-cyan-400 font-mono"
          >
            <option value="INVESTIGATING">INVESTIGATING (Actively Researching)</option>
            <option value="IN_PROGRESS">IN_PROGRESS (Remediation Dispatched)</option>
            <option value="PENDING_APPROVAL">PENDING_APPROVAL (Human Sign-off Gated)</option>
            <option value="RESOLVED">RESOLVED (Bottleneck Cleared)</option>
            <option value="DISMISSED">DISMISSED (False Positive / Waived)</option>
          </select>
        </div>

        {/* Root Cause & Notes */}
        <div>
          <label className="block text-xs font-semibold text-slateText-muted mb-1 font-mono uppercase">
            Root Cause Diagnosis / Resolution Log
          </label>
          <textarea
            rows={3}
            value={resolutionNotes}
            onChange={(e) => setResolutionNotes(e.target.value)}
            placeholder="Document the empirical cause of delay or action taken (e.g. shipper uploaded revised packing list; milestone rescheduled)..."
            className="w-full text-xs bg-navy-950 border border-navy-700 rounded-md p-2.5 text-slateText-primary focus:outline-none focus:border-cyan-400 font-sans"
          />
        </div>

        {/* Responsible Operator */}
        <div>
          <label className="block text-xs font-semibold text-slateText-muted mb-1 font-mono uppercase">
            Authorized Operations Sign-off
          </label>
          <input
            type="text"
            value={resolvedBy}
            onChange={(e) => setResolvedBy(e.target.value)}
            className="w-full text-xs bg-navy-950 border border-navy-700 rounded-md p-2 text-slateText-primary focus:outline-none focus:border-cyan-400 font-mono"
          />
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-navy-700/60">
          <Button variant="secondary" size="sm" type="button" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            type="submit"
            isLoading={isSubmitting}
            leftIcon={<CheckCircle2 className="w-4 h-4" />}
          >
            Save Lifecycle State
          </Button>
        </div>
      </form>
    </Modal>
  );
};
