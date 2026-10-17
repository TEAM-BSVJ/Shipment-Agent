import React from 'react';

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  subtext?: string;
  deltaText?: string;
  deltaVariant?: 'positive' | 'negative' | 'neutral' | 'caution';
  alertVariant?: 'neutral' | 'danger' | 'warning' | 'success' | 'agent' | 'cyan';
  onClick?: () => void;
  className?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  icon,
  subtext,
  deltaText,
  deltaVariant = 'neutral',
  alertVariant = 'neutral',
  onClick,
  className = '',
}) => {
  let valueColor = 'text-slateText-primary';
  let badgeBg = 'bg-navy-800 text-slateText-secondary border-navy-700';
  let borderGlow = 'hover:border-navy-600';

  switch (alertVariant) {
    case 'danger':
      valueColor = 'text-coral-400';
      badgeBg = 'bg-coral-400/15 text-coral-400 border-coral-400/30';
      borderGlow = 'hover:border-coral-400/50 hover:shadow-glow-coral';
      break;
    case 'warning':
      valueColor = 'text-amber-400';
      badgeBg = 'bg-amber-400/15 text-amber-400 border-amber-400/30';
      borderGlow = 'hover:border-amber-400/50 hover:shadow-glow-amber';
      break;
    case 'success':
      valueColor = 'text-mint-400';
      badgeBg = 'bg-mint-400/15 text-mint-400 border-mint-400/30';
      borderGlow = 'hover:border-mint-400/50 hover:shadow-glow-mint';
      break;
    case 'agent':
      valueColor = 'text-violet-300';
      badgeBg = 'bg-violet-400/15 text-violet-300 border-violet-400/30';
      borderGlow = 'hover:border-violet-400/50 hover:shadow-glow-violet';
      break;
    case 'cyan':
      valueColor = 'text-cyan-400';
      badgeBg = 'bg-cyan-400/15 text-cyan-400 border-cyan-400/30';
      borderGlow = 'hover:border-cyan-400/50 hover:shadow-glow-cyan';
      break;
  }

  let deltaColor = 'text-slateText-muted';
  if (deltaVariant === 'positive') deltaColor = 'text-mint-400';
  if (deltaVariant === 'negative') deltaColor = 'text-coral-400';
  if (deltaVariant === 'caution') deltaColor = 'text-amber-400';

  const cursorClass = onClick
    ? 'cursor-pointer hover:bg-navy-850 active:scale-[0.99] transition-all'
    : '';

  return (
    <div
      onClick={onClick}
      className={`bg-navy-900 border border-navy-700 rounded-md p-4 flex flex-col justify-between shadow-sm transition-all duration-200 ${borderGlow} ${cursorClass} ${className}`}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-slateText-muted">
          {title}
        </span>
        <div className={`p-2 rounded-md border ${badgeBg}`}>{icon}</div>
      </div>
      <div className="mt-3">
        <p className={`text-2xl font-bold font-mono tracking-tight tabular-nums ${valueColor}`}>
          {value}
        </p>
        <div className="flex items-center justify-between mt-1 text-xs">
          {subtext && <p className="text-slateText-secondary truncate">{subtext}</p>}
          {deltaText && (
            <span className={`font-mono font-medium ${deltaColor} shrink-0 ml-2`}>
              {deltaText}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
