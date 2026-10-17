import React from 'react';
import {
  AlertTriangle,
  History,
  LayoutDashboard,
  ShieldCheck,
} from 'lucide-react';

export type NavTab = 'dashboard' | 'exceptions' | 'approvals' | 'audit';

interface SidebarProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  exceptionCount?: number;
  approvalCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabChange,
  exceptionCount = 0,
  approvalCount = 0,
}) => {
  const navItems = [
    {
      id: 'dashboard' as NavTab,
      label: 'Shipments Dashboard',
      icon: <LayoutDashboard className="w-4 h-4" />,
      badge: null,
    },
    {
      id: 'exceptions' as NavTab,
      label: 'Exception Queue',
      icon: <AlertTriangle className="w-4 h-4" />,
      badge: exceptionCount > 0 ? exceptionCount : null,
      badgeColor: 'bg-red-100 text-red-700',
    },
    {
      id: 'approvals' as NavTab,
      label: 'Human Approvals',
      icon: <ShieldCheck className="w-4 h-4" />,
      badge: approvalCount > 0 ? approvalCount : null,
      badgeColor: 'bg-amber-100 text-amber-800',
    },
    {
      id: 'audit' as NavTab,
      label: 'Audit Trail',
      icon: <History className="w-4 h-4" />,
      badge: null,
    },
  ];

  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col shrink-0 min-h-[calc(100vh-61px)]">
      <div className="p-4 space-y-1">
        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-3 mb-2">
          Operations
        </p>
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-xs font-medium transition-colors ${
                isActive
                  ? 'bg-blue-50 text-blue-700 font-semibold shadow-sm'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span className={isActive ? 'text-blue-600' : 'text-slate-400'}>
                  {item.icon}
                </span>
                <span>{item.label}</span>
              </div>
              {item.badge !== null && (
                <span
                  className={`text-[11px] font-mono font-bold px-1.5 py-0.5 rounded-full ${
                    item.badgeColor || 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-auto p-4 border-t border-slate-100">
        <div className="bg-slate-50 border border-slate-200 rounded-md p-3 text-xs">
          <p className="font-semibold text-slate-800">Operational Invariants</p>
          <ul className="text-[11px] text-slate-500 mt-1 space-y-1 list-disc list-inside">
            <li>Max 5 tool recursions</li>
            <li>Consequential tools gated</li>
            <li>Prompt injection fenced</li>
          </ul>
        </div>
      </div>
    </aside>
  );
};
