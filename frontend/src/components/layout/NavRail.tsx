import React, { useState } from 'react';
import {
  AlertTriangle,
  History,
  LayoutDashboard,
  Package,
  ShieldCheck,
  FileCheck2,
  Navigation,
  TrendingUp,
  Settings,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

export type NavTab =
  | 'dashboard'
  | 'shipments'
  | 'exceptions'
  | 'documents'
  | 'approvals'
  | 'recovery'
  | 'analytics'
  | 'audit'
  | 'settings';

interface NavRailProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  exceptionCount?: number;
  approvalCount?: number;
}

export const NavRail: React.FC<NavRailProps> = ({
  activeTab,
  onTabChange,
  exceptionCount = 0,
  approvalCount = 0,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const navItems = [
    {
      id: 'dashboard' as NavTab,
      label: 'Command Center',
      shortcut: 'G D',
      icon: <LayoutDashboard className="w-4 h-4" />,
      badge: null,
    },
    {
      id: 'shipments' as NavTab,
      label: 'Shipment Explorer',
      shortcut: 'G S',
      icon: <Package className="w-4 h-4" />,
      badge: null,
    },
    {
      id: 'exceptions' as NavTab,
      label: 'Exception Center',
      shortcut: 'G E',
      icon: <AlertTriangle className="w-4 h-4" />,
      badge: exceptionCount > 0 ? exceptionCount : null,
      badgeColor: 'bg-coral-400/20 text-coral-400 border border-coral-400/40',
    },
    {
      id: 'documents' as NavTab,
      label: 'Document Studio',
      shortcut: 'G V',
      icon: <FileCheck2 className="w-4 h-4" />,
      badge: null,
    },
    {
      id: 'approvals' as NavTab,
      label: 'Approvals Queue',
      shortcut: 'G A',
      icon: <ShieldCheck className="w-4 h-4" />,
      badge: approvalCount > 0 ? approvalCount : null,
      badgeColor: 'bg-amber-400/20 text-amber-400 border border-amber-400/40',
    },
    {
      id: 'recovery' as NavTab,
      label: 'Recovery Planner',
      shortcut: 'SIM',
      icon: <Navigation className="w-4 h-4" />,
      badge: 'FUTURE',
      badgeColor: 'bg-violet-400/15 text-violet-300 border border-violet-400/30 text-[9px]',
    },
    {
      id: 'analytics' as NavTab,
      label: 'Operational Trends',
      shortcut: 'G T',
      icon: <TrendingUp className="w-4 h-4" />,
      badge: null,
    },
    {
      id: 'audit' as NavTab,
      label: 'Compliance Audit',
      shortcut: 'G L',
      icon: <History className="w-4 h-4" />,
      badge: null,
    },
    {
      id: 'settings' as NavTab,
      label: 'System Config',
      shortcut: 'G C',
      icon: <Settings className="w-4 h-4" />,
      badge: null,
    },
  ];

  return (
    <aside
      className={`bg-navy-900 border-r border-navy-700 flex flex-col shrink-0 min-h-[calc(100vh-57px)] transition-all duration-200 ${
        isCollapsed ? 'w-16' : 'w-56'
      }`}
    >
      {/* Navigation List */}
      <div className="p-2 space-y-1">
        {!isCollapsed && (
          <p className="text-[10px] font-bold uppercase tracking-wider text-slateText-muted px-3 py-1 mb-1 font-mono">
            Navigation Rail
          </p>
        )}
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              title={`${item.label} (${item.shortcut})`}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-sm text-xs font-medium transition-all ${
                isActive
                  ? 'bg-navy-850 text-cyan-400 border-l-2 border-cyan-400 shadow-sm font-semibold'
                  : 'text-slateText-secondary hover:bg-navy-800 hover:text-slateText-primary'
              }`}
            >
              <div className="flex items-center gap-2.5 truncate">
                <span className={isActive ? 'text-cyan-400' : 'text-slateText-muted'}>
                  {item.icon}
                </span>
                {!isCollapsed && <span className="truncate">{item.label}</span>}
              </div>
              {!isCollapsed && item.badge !== null && (
                <span
                  className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                    item.badgeColor || 'bg-navy-800 text-slateText-muted'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Footer: Operational Safeguards & Collapse Toggle */}
      <div className="mt-auto p-2 border-t border-navy-700/60">
        {!isCollapsed && (
          <div className="bg-navy-950 border border-navy-700/80 rounded p-2.5 text-[11px] mb-2 font-mono">
            <p className="font-bold text-cyan-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
              SAFETY GUARDS ACTIVE
            </p>
            <ul className="text-slateText-muted mt-1 space-y-0.5 text-[10px] list-none">
              <li>• Max 5 tool recursions</li>
              <li>• Consequential tools gated</li>
              <li>• Prompt injection fenced</li>
            </ul>
          </div>
        )}

        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="w-full flex items-center justify-center p-1.5 rounded text-slateText-muted hover:text-slateText-primary hover:bg-navy-800 transition-colors"
          title={isCollapsed ? 'Expand Navigation Rail' : 'Collapse Navigation Rail'}
          aria-label="Toggle rail collapse"
        >
          {isCollapsed ? (
            <ChevronRight className="w-4 h-4 text-cyan-400" />
          ) : (
            <div className="flex items-center gap-1.5 text-xs">
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Collapse Rail</span>
            </div>
          )}
        </button>
      </div>
    </aside>
  );
};

