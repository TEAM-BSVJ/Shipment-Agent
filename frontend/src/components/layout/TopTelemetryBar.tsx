import React, { useEffect, useState } from 'react';
import {
  Compass,
  Radio,
  Search,
  Sparkles,
  Layers,
  Coins,
  Clock,
  AlertTriangle,
  Building2,
  Terminal,
} from 'lucide-react';
import { Button } from '../common/Button';

interface TopTelemetryBarProps {
  onOpenChat: () => void;
  onOpenSearch?: () => void;
  exceptionCount?: number;
  approvalCount?: number;
  onNavigateExceptions?: () => void;
}

export const TopTelemetryBar: React.FC<TopTelemetryBarProps> = ({
  onOpenChat,
  onOpenSearch,
  exceptionCount = 3,
  approvalCount = 2,
  onNavigateExceptions,
}) => {
  const [utcTime, setUtcTime] = useState<string>('');
  const [localTime, setLocalTime] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setUtcTime(
        now.toISOString().substring(11, 19) + ' UTC'
      );
      setLocalTime(
        now.toLocaleTimeString([], { hour12: false }) + ' LOC'
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="bg-navy-900 border-b border-navy-700 px-4 sm:px-6 py-2.5 flex items-center justify-between sticky top-0 z-30 shadow-md">
      {/* Brand Identity & System Telemetry */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded bg-cyan-400 flex items-center justify-center text-navy-950 font-bold shadow-glow-cyan shrink-0">
          <Compass className="w-5 h-5 animate-spin-slow" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-sm font-bold tracking-tight text-white flex items-center gap-1.5 font-mono">
              <span className="text-cyan-400">AETHERIS</span>
              <span className="text-slateText-primary font-sans font-semibold">FREIGHT COMMAND</span>
            </h1>
            <span className="text-[11px] px-2 py-0.5 rounded-full font-mono font-medium bg-mint-400/15 text-mint-400 border border-mint-400/30 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-mint-400 animate-pulse" />
              HEALTHY [5m Scheduler]
            </span>
          </div>
          <p className="text-[11px] text-slateText-muted hidden sm:block">
            Autonomous Milestones, Paperwork Verification & Human Governance
          </p>
        </div>
      </div>

      {/* Middle & Right Controls */}
      <div className="flex items-center gap-2.5">
        {/* Global Dual Clock */}
        <div className="hidden lg:flex items-center gap-2 px-2.5 py-1 rounded bg-navy-850 border border-navy-700 text-xs font-mono text-slateText-secondary">
          <Clock className="w-3.5 h-3.5 text-cyan-400" />
          <span className="text-cyan-300 font-semibold">{utcTime}</span>
          <span className="text-navy-700">|</span>
          <span className="text-slateText-muted">{localTime}</span>
        </div>

        {/* Evolus AI Platform Credit Meter */}
        <div className="hidden xl:flex items-center gap-2 px-2.5 py-1 rounded bg-navy-850 border border-navy-700 text-xs">
          <Coins className="w-3.5 h-3.5 text-violet-400" />
          <span className="text-slateText-muted font-mono">Evolus AI:</span>
          <span className="font-mono text-violet-300 font-semibold">48,250 Crd</span>
          <div className="w-12 h-1.5 rounded-full bg-navy-700 overflow-hidden ml-1">
            <div className="h-full bg-violet-400 rounded-full w-[96%]" />
          </div>
        </div>

        {/* Global Search Bar (Cmd+K) */}
        {onOpenSearch && (
          <button
            onClick={onOpenSearch}
            className="flex items-center gap-2 px-3 py-1.5 rounded bg-navy-850 border border-navy-700 hover:border-cyan-400/40 text-xs text-slateText-muted hover:text-slateText-primary transition-colors"
          >
            <Search className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden md:inline font-mono">Search (Cmd+K)</span>
          </button>
        )}

        {/* Active Exceptions Triage Pill */}
        {exceptionCount > 0 && (
          <button
            onClick={onNavigateExceptions}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-coral-400/15 text-coral-400 border border-coral-400/40 text-xs font-mono font-bold hover:bg-coral-400/25 transition-colors animate-pulse"
            title="View Active Bottlenecks"
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>{exceptionCount} Exceptions</span>
          </button>
        )}

        {/* Copilot Chat Trigger (Cmd+J) */}
        <Button
          variant="agent"
          size="sm"
          onClick={onOpenChat}
          leftIcon={<Sparkles className="w-3.5 h-3.5" />}
          className="font-mono"
        >
          Copilot (Cmd+J)
        </Button>
      </div>
    </header>
  );
};

