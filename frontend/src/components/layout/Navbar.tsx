import React from 'react';
import {
  Bot,
  Building2,
  Layers,
  MessageSquare,
  Radio,
} from 'lucide-react';
import { Button } from '../common/Button';

interface NavbarProps {
  onOpenChat?: () => void;
  activeShipmentCount?: number;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenChat }) => {
  return (
    <header className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between sticky top-0 z-30 shadow-sm">
      {/* Brand Identity */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-md bg-blue-600 flex items-center justify-center text-white font-bold shadow-sm">
          <Layers className="w-5 h-5" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base font-bold text-slate-900 tracking-tight">
              Logistics Bottleneck Resolution Agent
            </h1>
            <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live Control Tower
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Autonomous Milestones, Paperwork Verification & Human-Gated Remediation
          </p>
        </div>
      </div>

      {/* System Status Indicators & Copilot Trigger */}
      <div className="flex items-center gap-3">
        <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-md bg-slate-100 border border-slate-200 text-xs font-medium text-slate-700">
          <Bot className="w-3.5 h-3.5 text-violet-600" />
          <span>Reasoning LLM:</span>
          <span className="font-mono text-slate-900 font-semibold">gemma4 31B-it (Evolus)</span>
        </div>

        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-md bg-slate-100 border border-slate-200 text-xs font-medium text-slate-700">
          <Radio className="w-3.5 h-3.5 text-emerald-600" />
          <span>API:</span>
          <span className="font-mono text-emerald-700 font-semibold">:8000/api/v1</span>
        </div>

        <div className="hidden xl:flex items-center gap-2 px-3 py-1.5 rounded-md bg-slate-100 border border-slate-200 text-xs font-medium text-slate-700">
          <Building2 className="w-3.5 h-3.5 text-blue-600" />
          <span>Tenant:</span>
          <span className="font-mono text-slate-900 font-semibold">DEFAULT_TENANT</span>
        </div>

        {onOpenChat && (
          <Button
            variant="agent"
            size="sm"
            onClick={onOpenChat}
            leftIcon={<MessageSquare className="w-4 h-4" />}
          >
            Copilot Chat
          </Button>
        )}
      </div>
    </header>
  );
};
