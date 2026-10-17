import React from 'react';
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  Clock,
  Radio,
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
      <div className="p-8 text-center bg-slate-50 border border-slate-200 rounded-md">
        <Clock className="w-8 h-8 text-slate-400 mx-auto mb-2" />
        <p className="text-xs text-slate-500">No milestones registered for this shipment corridor.</p>
      </div>
    );
  }

  // Sort milestones chronologically by expected_at or completed_at
  const sortedMilestones = [...milestones].sort((a, b) => {
    const dateA = new Date(a.completed_at || a.expected_at).getTime();
    const dateB = new Date(b.completed_at || b.expected_at).getTime();
    return dateA - dateB;
  });

  const now = new Date();

  return (
    <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-200">
      {sortedMilestones.map((m, index) => {
        const isCompleted = m.is_completed;
        const expectedDate = new Date(m.expected_at);
        const isOverdue = !isCompleted && expectedDate < now;
        const delayHours = isOverdue
          ? Math.max(1, Math.round((now.getTime() - expectedDate.getTime()) / (1000 * 60 * 60)))
          : 0;

        let iconNode = <Clock className="w-3.5 h-3.5 text-slate-400" />;
        let dotStyle = 'bg-slate-100 border-slate-300 text-slate-500';
        let cardStyle = 'border-slate-200 bg-white hover:border-slate-300';

        if (isCompleted) {
          iconNode = <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />;
          dotStyle = 'bg-emerald-50 border-emerald-500 text-emerald-600';
          cardStyle = 'border-slate-200 bg-white';
        } else if (isOverdue) {
          iconNode = <AlertCircle className="w-3.5 h-3.5 text-red-600" />;
          dotStyle = 'bg-red-50 border-red-500 text-red-600 animate-pulse';
          cardStyle = 'border-red-200 bg-red-50/40';
        } else if (index === 0 || sortedMilestones[index - 1]?.is_completed) {
          // Next in line / In progress
          iconNode = <Radio className="w-3.5 h-3.5 text-blue-600 animate-pulse" />;
          dotStyle = 'bg-blue-50 border-blue-500 text-blue-600 ring-4 ring-blue-100';
          cardStyle = 'border-blue-200 bg-blue-50/20';
        }

        return (
          <div
            key={m.id || index}
            className="relative flex items-start gap-4 group cursor-pointer"
            onClick={() => onMilestoneClick && onMilestoneClick(m)}
          >
            {/* Timeline Node Dot */}
            <div
              className={`absolute -left-6 top-1 w-6 h-6 rounded-full border-2 flex items-center justify-center bg-white shadow-xs z-10 transition-transform group-hover:scale-110 ${dotStyle}`}
            >
              {iconNode}
            </div>

            {/* Milestone Card */}
            <div className={`flex-1 border rounded-md p-3.5 shadow-xs transition-all ${cardStyle}`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-bold text-slate-900 tracking-tight">
                    {formatMilestoneTitle(m.milestone_name)}
                  </h4>
                  {isOverdue && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 font-mono">
                      +{delayHours}h DELAY
                    </span>
                  )}
                  {isCompleted && (
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Completed
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 text-[11px] font-mono text-slate-500">
                  <span className="px-1.5 py-0.5 bg-slate-100 rounded text-slate-600 uppercase text-[10px] font-semibold">
                    {m.source || 'TMS'}
                  </span>
                </div>
              </div>

              {/* Timestamps */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2 pt-2 border-t border-slate-100 text-[11px] text-slate-600">
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span className="text-slate-500">Expected:</span>
                  <span className="font-mono font-medium text-slate-800">
                    {formatTimestamp(m.expected_at)}
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span className="text-slate-500">Completed:</span>
                  <span
                    className={`font-mono font-medium ${
                      isCompleted ? 'text-emerald-700 font-semibold' : 'text-slate-400'
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
