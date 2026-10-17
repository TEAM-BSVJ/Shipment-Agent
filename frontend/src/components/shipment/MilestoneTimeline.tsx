import React from 'react';
import {
  Calendar,
  CheckCircle2,
  Clock,
  Radio,
  Flame,
} from 'lucide-react';
import { MilestoneName, ShipmentMilestone } from '../../types';

interface MilestoneTimelineProps {
  milestones: ShipmentMilestone[];
  onMilestoneClick?: (milestone: ShipmentMilestone) => void;
}

const formatMilestoneTitle = (name: MilestoneName | string): string => {
  return (name || '')
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
};

const formatTimestamp = (dateString?: string | null): string => {
  if (!dateString) return '—';
  try {
    const d = new Date(dateString);
    return d.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short',
    });
  } catch {
    return dateString;
  }
};

export const MilestoneTimeline: React.FC<MilestoneTimelineProps> = ({
  milestones,
  onMilestoneClick,
}) => {
  if (!milestones || milestones.length === 0) {
    return (
      <div className="p-8 text-center bg-navy-900 border border-navy-700 rounded-md">
        <Clock className="w-8 h-8 text-slateText-muted mx-auto mb-2" />
        <p className="text-xs text-slateText-secondary font-mono">
          No planned milestones registered for this freight movement.
        </p>
      </div>
    );
  }

  // Sort milestones chronologically
  const sortedMilestones = [...milestones].sort((a, b) => {
    const dateA = new Date(a.completed_at || a.expected_at).getTime();
    const dateB = new Date(b.completed_at || b.expected_at).getTime();
    return dateA - dateB;
  });

  const now = new Date();

  return (
    <div className="relative pl-6 space-y-5 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-navy-700">
      {sortedMilestones.map((m, index) => {
        const isCompleted = m.is_completed;
        const expectedDate = new Date(m.expected_at);
        const isOverdue = !isCompleted && expectedDate < now;
        const delayHours = isOverdue
          ? Math.max(1, Math.round((now.getTime() - expectedDate.getTime()) / (1000 * 60 * 60)))
          : 0;

        let iconNode = <Clock className="w-3.5 h-3.5 text-slateText-muted" />;
        let dotStyle = 'bg-navy-850 border-navy-700 text-slateText-muted';
        let cardStyle = 'border-navy-700 bg-navy-850 hover:border-navy-600';

        if (isCompleted) {
          iconNode = <CheckCircle2 className="w-3.5 h-3.5 text-mint-400" />;
          dotStyle = 'bg-mint-400/15 border-mint-400 text-mint-400 shadow-glow-mint';
          cardStyle = 'border-navy-700 bg-navy-850';
        } else if (isOverdue) {
          iconNode = <Flame className="w-3.5 h-3.5 text-coral-400" />;
          dotStyle = 'bg-coral-400/20 border-coral-400 text-coral-400 animate-pulse shadow-glow-coral';
          cardStyle = 'border-coral-400/50 bg-navy-850 shadow-[0_0_12px_rgba(255,93,115,0.15)]';
        } else if (index === 0 || sortedMilestones[index - 1]?.is_completed) {
          // Next in line / In progress
          iconNode = <Radio className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />;
          dotStyle = 'bg-cyan-400/20 border-cyan-400 text-cyan-400 ring-4 ring-cyan-400/20 shadow-glow-cyan';
          cardStyle = 'border-cyan-400/50 bg-navy-850';
        }

        return (
          <div
            key={m.id || index}
            className="relative flex items-start gap-4 group cursor-pointer"
            onClick={() => onMilestoneClick && onMilestoneClick(m)}
          >
            {/* Timeline Node Dot */}
            <div
              className={`absolute -left-6 top-1 w-6 h-6 rounded-full border-2 flex items-center justify-center z-10 transition-transform group-hover:scale-110 ${dotStyle}`}
            >
              {iconNode}
            </div>

            {/* Milestone Card */}
            <div className={`flex-1 border rounded-md p-3.5 shadow-sm transition-all ${cardStyle}`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-bold text-white tracking-tight font-sans">
                    {formatMilestoneTitle(m.milestone_name)}
                  </h4>
                  {isOverdue && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-coral-400/25 text-coral-400 border border-coral-400/50 font-mono animate-pulse">
                      +{delayHours}h OVERDUE
                    </span>
                  )}
                  {isCompleted && (
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-mint-400/15 text-mint-400 border border-mint-400/30 font-mono">
                      Completed
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 text-[11px] font-mono text-slateText-muted">
                  <span className="px-1.5 py-0.5 bg-navy-950 border border-navy-700 rounded text-cyan-400 uppercase text-[10px] font-semibold">
                    {m.source || 'TMS_TELEMETRY'}
                  </span>
                </div>
              </div>

              {/* Timestamps */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2 pt-2 border-t border-navy-700/60 text-[11px]">
                <div className="flex items-center gap-1.5 text-slateText-secondary font-mono">
                  <Calendar className="w-3.5 h-3.5 text-cyan-400/70" />
                  <span className="text-slateText-muted">Planned:</span>
                  <span className="text-slateText-primary font-medium">
                    {formatTimestamp(m.expected_at)}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 text-slateText-secondary font-mono">
                  <Clock className="w-3.5 h-3.5 text-slateText-muted" />
                  <span className="text-slateText-muted">Actual / Clear:</span>
                  <span
                    className={`font-medium ${
                      isCompleted ? 'text-mint-400 font-semibold' : 'text-slateText-disabled'
                    }`}
                  >
                    {formatTimestamp(m.completed_at)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
