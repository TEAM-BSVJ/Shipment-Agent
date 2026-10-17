import React from 'react';
import { Database, FileText, CheckCircle2, AlertTriangle, ShieldCheck } from 'lucide-react';

export interface EvidenceItem {
  label: string;
  value: string | number;
  highlightVariant?: 'neutral' | 'coral' | 'amber' | 'mint' | 'cyan' | 'violet';
  source?: string;
}

interface EvidenceCardProps {
  title?: string;
  subtitle?: string;
  items: EvidenceItem[];
  provenance?: string;
  verifiedAt?: string;
  className?: string;
}

export const EvidenceCard: React.FC<EvidenceCardProps> = ({
  title = 'Verified Operational Evidence',
  subtitle,
  items,
  provenance = 'Database Telemetry [shipments & milestones]',
  verifiedAt,
  className = '',
}) => {
  return (
    <div
      className={`bg-navy-850 border border-navy-700 rounded-md p-4 space-y-3 shadow-sm ${className}`}
    >
      <div className="flex items-center justify-between pb-2 border-b border-navy-700/60">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-cyan-400" />
          <div>
            <h4 className="text-xs font-semibold text-slateText-primary uppercase tracking-wider">
              {title}
            </h4>
            {subtitle && (
              <p className="text-[11px] text-slateText-secondary mt-0.5">{subtitle}</p>
            )}
          </div>
        </div>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-navy-800 text-cyan-400 border border-cyan-400/30">
          PROVENANCE GROUNDED
        </span>
      </div>

      {/* Structured Key-Value Fact Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
        {items.map((item, idx) => {
          let badgeStyles = 'bg-navy-800 text-slateText-primary border-navy-700';

          switch (item.highlightVariant) {
            case 'coral':
              badgeStyles = 'bg-coral-400/20 text-coral-400 border-coral-400/40 font-semibold';
              break;
            case 'amber':
              badgeStyles = 'bg-amber-400/20 text-amber-400 border-amber-400/40 font-semibold';
              break;
            case 'mint':
              badgeStyles = 'bg-mint-400/20 text-mint-400 border-mint-400/40 font-semibold';
              break;
            case 'cyan':
              badgeStyles = 'bg-cyan-400/20 text-cyan-400 border-cyan-400/40 font-semibold';
              break;
            case 'violet':
              badgeStyles = 'bg-violet-400/20 text-violet-300 border-violet-400/40 font-semibold';
              break;
          }

          return (
            <div
              key={idx}
              className="bg-navy-900 border border-navy-700/80 rounded p-2 flex flex-col justify-between"
            >
              <span className="text-[11px] text-slateText-muted uppercase tracking-wider mb-1">
                {item.label}
              </span>
              <div className="flex items-center justify-between">
                <span className={`px-2 py-0.5 rounded text-xs font-mono border ${badgeStyles}`}>
                  {item.value}
                </span>
                {item.source && (
                  <span className="text-[10px] text-slateText-disabled font-mono truncate ml-1">
                    {item.source}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Provenance Footer */}
      <div className="pt-2 border-t border-navy-700/50 flex items-center justify-between text-[11px] text-slateText-muted">
        <div className="flex items-center gap-1.5 truncate">
          <Database className="w-3 h-3 text-cyan-400/70" />
          <span className="truncate">Source: {provenance}</span>
        </div>
        {verifiedAt && (
          <span className="font-mono text-slateText-disabled shrink-0 ml-2">
            Verified {verifiedAt}
          </span>
        )}
      </div>
    </div>
  );
};

