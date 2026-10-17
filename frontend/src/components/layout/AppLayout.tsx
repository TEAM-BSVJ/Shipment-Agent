import React from 'react';
import { TopTelemetryBar } from './TopTelemetryBar';
import { NavRail, NavTab } from './NavRail';

interface AppLayoutProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  exceptionCount?: number;
  approvalCount?: number;
  onOpenChat: () => void;
  onOpenSearch?: () => void;
  onNavigateExceptions?: () => void;
  children: React.ReactNode;
}

export const AppLayout: React.FC<AppLayoutProps> = ({
  activeTab,
  onTabChange,
  exceptionCount = 0,
  approvalCount = 0,
  onOpenChat,
  onOpenSearch,
  onNavigateExceptions,
  children,
}) => {
  return (
    <div className="min-h-screen bg-navy-950 text-slateText-primary flex flex-col font-sans select-none">
      {/* Fixed Top Telemetry Bar */}
      <TopTelemetryBar
        onOpenChat={onOpenChat}
        onOpenSearch={onOpenSearch}
        exceptionCount={exceptionCount}
        approvalCount={approvalCount}
        onNavigateExceptions={onNavigateExceptions}
      />

      {/* Main Workspace Frame */}
      <div className="flex flex-1 overflow-hidden">
        {/* Collapsible Left Command Rail */}
        <NavRail
          activeTab={activeTab}
          onTabChange={onTabChange}
          exceptionCount={exceptionCount}
          approvalCount={approvalCount}
        />

        {/* Dynamic Operational Viewport */}
        <main className="flex-1 p-4 sm:p-6 w-full max-w-[1720px] mx-auto overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
};
