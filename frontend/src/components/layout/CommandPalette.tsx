import React, { useState, useEffect } from 'react';
import {
  Search,
  Package,
  AlertTriangle,
  Sparkles,
  RefreshCw,
  Compass,
  ArrowRight,
  X,
  FileCheck2,
} from 'lucide-react';
import { Shipment } from '../../types';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  shipments: Shipment[];
  onSelectShipment: (shipment: Shipment) => void;
  onOpenCopilot: () => void;
  onTriggerScan?: () => void;
  onNavigateTab?: (tab: any) => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  shipments,
  onSelectShipment,
  onOpenCopilot,
  onTriggerScan,
  onNavigateTab,
}) => {
  const [query, setQuery] = useState('');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (isOpen) {
          onClose();
        }
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const filteredShipments = shipments.filter(
    (s) =>
      s.tracking_number.toLowerCase().includes(query.toLowerCase()) ||
      s.origin.toLowerCase().includes(query.toLowerCase()) ||
      s.destination.toLowerCase().includes(query.toLowerCase()) ||
      s.carrier_id.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-navy-950/85 backdrop-blur-md transition-opacity"
        onClick={onClose}
      />

      {/* Palette Container */}
      <div className="relative bg-navy-850 border border-cyan-400/40 rounded-lg shadow-glow-cyan w-full max-w-xl overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-150">
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-navy-700 bg-navy-900">
          <Search className="w-4 h-4 text-cyan-400 shrink-0" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search tracking #, port, carrier, or execute command..."
            className="w-full bg-transparent text-sm text-slateText-primary placeholder-slateText-muted focus:outline-none font-mono"
          />
          <kbd className="px-1.5 py-0.5 text-[10px] font-mono text-slateText-muted bg-navy-800 border border-navy-700 rounded">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div className="max-h-80 overflow-y-auto p-2 space-y-1">
          {/* Quick Actions */}
          <div className="px-2 py-1 text-[10px] font-mono font-bold uppercase tracking-wider text-slateText-muted">
            Quick Actions
          </div>
          <button
            onClick={() => {
              onClose();
              onOpenCopilot();
            }}
            className="w-full flex items-center justify-between p-2 rounded hover:bg-navy-800 text-left text-xs text-slateText-primary group transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <Sparkles className="w-4 h-4 text-violet-400" />
              <span>Ask Evolus Copilot (Gemma 4 31B-it)</span>
            </div>
            <kbd className="text-[10px] font-mono text-violet-300 bg-navy-900 px-1 rounded">Cmd+J</kbd>
          </button>

          {onTriggerScan && (
            <button
              onClick={() => {
                onClose();
                onTriggerScan();
              }}
              className="w-full flex items-center justify-between p-2 rounded hover:bg-navy-800 text-left text-xs text-slateText-primary group transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <RefreshCw className="w-4 h-4 text-cyan-400" />
                <span>Run Periodic Milestone Health Evaluation</span>
              </div>
              <span className="text-[10px] font-mono text-cyan-300">APScheduler</span>
            </button>
          )}

          {/* Filtered Shipments */}
          <div className="px-2 pt-3 pb-1 text-[10px] font-mono font-bold uppercase tracking-wider text-slateText-muted">
            Shipments ({filteredShipments.length})
          </div>
          {filteredShipments.length === 0 ? (
            <div className="p-4 text-center text-xs text-slateText-muted font-mono">
              No matching freight records found.
            </div>
          ) : (
            filteredShipments.map((s) => (
              <button
                key={s.id}
                onClick={() => {
                  onSelectShipment(s);
                  onClose();
                }}
                className="w-full flex items-center justify-between p-2 rounded hover:bg-navy-800 text-left text-xs text-slateText-primary group transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <Package className="w-4 h-4 text-cyan-400" />
                  <div>
                    <span className="font-mono font-bold text-cyan-400 mr-2">
                      {s.tracking_number}
                    </span>
                    <span className="text-slateText-secondary">
                      {s.origin} → {s.destination} ({s.carrier_id})
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`font-mono text-[10px] px-1.5 py-0.5 rounded ${
                      s.risk_score >= 60
                        ? 'bg-coral-400/20 text-coral-400 font-bold'
                        : 'bg-mint-400/20 text-mint-400'
                    }`}
                  >
                    Risk: {s.risk_score}
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-slateText-muted group-hover:text-cyan-400 transition-colors" />
                </div>
              </button>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-2 border-t border-navy-700 bg-navy-900 flex items-center justify-between text-[11px] text-slateText-muted font-mono">
          <span>Navigate with [↑] [↓] • Select with [Enter]</span>
          <span>AETHERIS FREIGHT COMMAND</span>
        </div>
      </div>
    </div>
  );
};

