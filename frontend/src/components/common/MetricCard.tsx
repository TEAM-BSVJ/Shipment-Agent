import React from 'react';

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  subtext?: string;
  alertVariant?: 'neutral' | 'danger' | 'warning' | 'success' | 'agent';
  onClick?: () => void;
  className?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  icon,
  subtext,
  alertVariant = 'neutral',
  onClick,
  className = '',
}) => {
  let valueColor = 'text-slate-900';
  let badgeBg = 'bg-slate-100 text-slate-600';

  switch (alertVariant) {
    case 'danger':
      valueColor = 'text-red-700';
      badgeBg = 'bg-red-50 text-red-700';
      break;
    case 'warning':
      valueColor = 'text-amber-700';
      badgeBg = 'bg-amber-50 text-amber-700';
      break;
    case 'success':
      valueColor = 'text-emerald-700';
      badgeBg = 'bg-emerald-50 text-emerald-700';
      break;
    case 'agent':
      valueColor = 'text-violet-700';
      badgeBg = 'bg-violet-50 text-violet-700';
      break;
  }

  const cursorClass = onClick ? 'cursor-pointer hover:border-slate-300 transition-all shadow-hover' : '';

  return (
    <div
      onClick={onClick}
      className={`bg-white border border-slate-200 rounded-md p-4 shadow-sm flex flex-col justify-between ${cursorClass} ${className}`}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-slate-500 tracking-tight">{title}</span>
        <div className={`p-2 rounded-md ${badgeBg}`}>{icon}</div>
      </div>
      <div className="mt-2">
        <p className={`text-2xl font-bold font-mono tracking-tight ${valueColor}`}>{value}</p>
        {subtext && <p className="text-xs text-slate-500 mt-1 truncate">{subtext}</p>}
      </div>
    </div>
  );
};
