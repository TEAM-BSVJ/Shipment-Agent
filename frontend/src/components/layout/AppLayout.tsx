import React from 'react';
import { Navbar } from './Navbar';
import { NavTab, Sidebar } from './Sidebar';

interface AppLayoutProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  exceptionCount?: number;
  approvalCount?: number;
  onOpenChat: () => void;
  children: React.ReactNode;
}

export const AppLayout: React.FC<AppLayoutProps> = ({
  activeTab,
  onTabChange,
  exceptionCount = 0,
  approvalCount = 0,
  onOpenChat,
  children,
}) => {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <Navbar onOpenChat={onOpenChat} />
      <div className="flex flex-1">
        <Sidebar
          activeTab={activeTab}
          onTabChange={onTabChange}
          exceptionCount={exceptionCount}
          approvalCount={approvalCount}
        />
        <main className="flex-1 p-6 max-w-7xl w-full mx-auto overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
};
