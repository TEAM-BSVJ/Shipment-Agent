import { useState } from 'react';
import {
  AlertTriangle,
  Bot,
  CheckCircle2,
  History,
  Layers,
  Package,
  Plus,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
} from 'lucide-react';
import { AppLayout, NavTab } from './components/layout';
import { Button, MetricCard, StatusBadge } from './components/common';

export default function App() {
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [isChatOpen, setIsChatOpen] = useState(false);

  return (
    <AppLayout
      activeTab={activeTab}
      onTabChange={setActiveTab}
      exceptionCount={3}
      approvalCount={2}
      onOpenChat={() => setIsChatOpen(true)}
    >
      {/* Header with Title and Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 gap-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900 capitalize">
              {activeTab === 'dashboard'
                ? 'Shipments Dashboard'
                : activeTab === 'exceptions'
                ? 'Operational Exception Queue'
                : activeTab === 'approvals'
                ? 'Human-in-the-Loop Approvals'
                : 'Immutable Audit Trail'}
            </h2>
            <span className="text-xs bg-slate-100 text-slate-600 border border-slate-200 px-2 py-0.5 rounded-full font-mono">
              Live Feed
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {activeTab === 'dashboard'
              ? 'Real-time multi-modal freight monitoring, risk calculation, and milestone timelines.'
              : activeTab === 'exceptions'
              ? 'Triage identified logistics bottlenecks, missing paperwork, and overdue dispatch exceptions.'
              : activeTab === 'approvals'
              ? 'Review and authorize AI-recommended actions for consequential workflow steps (RULE-E06).'
              : 'Chronological compliance log of autonomous agent inferences, tool executions, and user decisions.'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
            onClick={() => {}}
          >
            Refresh
          </Button>

          {activeTab === 'dashboard' && (
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Plus className="w-4 h-4" />}
              onClick={() => {}}
            >
              New Shipment
            </Button>
          )}

          <Button
            variant="agent"
            size="sm"
            leftIcon={<Bot className="w-4 h-4" />}
            onClick={() => setIsChatOpen(true)}
          >
            Ask Copilot
          </Button>
        </div>
      </div>

      {/* KPI Overview Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 my-6">
        <MetricCard
          title="Active Shipments"
          value="5"
          icon={<Package className="w-4 h-4 text-blue-600" />}
          subtext="Across 4 transport modes"
          alertVariant="neutral"
          onClick={() => setActiveTab('dashboard')}
        />
        <MetricCard
          title="Critical Bottlenecks"
          value="2"
          icon={<ShieldAlert className="w-4 h-4 text-red-600" />}
          subtext="Requires operator attention"
          alertVariant="danger"
          onClick={() => setActiveTab('exceptions')}
        />
        <MetricCard
          title="Pending Approvals"
          value="2"
          icon={<ShieldCheck className="w-4 h-4 text-amber-600" />}
          subtext="Gated consequential actions"
          alertVariant="warning"
          onClick={() => setActiveTab('approvals')}
        />
        <MetricCard
          title="Healthy Operating"
          value="3"
          icon={<CheckCircle2 className="w-4 h-4 text-emerald-600" />}
          subtext="Milestones on schedule"
          alertVariant="success"
          onClick={() => setActiveTab('dashboard')}
        />
      </div>

      {/* Main Tab Content Viewport */}
      <div className="bg-white border border-slate-200 rounded-md p-6 shadow-sm">
        {activeTab === 'dashboard' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Layers className="w-4 h-4 text-blue-600" />
                Active Benchmark Freight Scenarios (SHP-101 to SHP-105)
              </h3>
              <span className="text-xs text-slate-400 font-mono">
                Ready for Unit 6.4 Table & Timeline View
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 border border-slate-200 rounded-md bg-slate-50 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-slate-900 text-sm">SHP-101</span>
                  <StatusBadge status="HIGH" size="sm" />
                </div>
                <p className="text-xs text-slate-600 font-medium">Mumbai, IN → Rotterdam, NL (Sea Freight)</p>
                <div className="flex items-center gap-2 pt-2 border-t border-slate-200 text-xs">
                  <StatusBadge status="CUSTOMS_HOLD" size="sm" />
                  <span className="text-slate-500">Missing Commercial Invoice</span>
                </div>
              </div>

              <div className="p-4 border border-slate-200 rounded-md bg-slate-50 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-slate-900 text-sm">SHP-102</span>
                  <StatusBadge status="CRITICAL" size="sm" />
                </div>
                <p className="text-xs text-slate-600 font-medium">Dallas, US → Austin, US (Air Freight)</p>
                <div className="flex items-center gap-2 pt-2 border-t border-slate-200 text-xs">
                  <StatusBadge status="AT_WAREHOUSE" size="sm" />
                  <span className="text-slate-500">Overdue Warehouse Dispatch (+4.5h)</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'exceptions' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-600" />
                Open Exception Triage Queue
              </h3>
              <StatusBadge status="OPEN" size="sm" />
            </div>
            <p className="text-xs text-slate-600">
              Exceptions identified by background monitoring and document reconciliation pipelines.
            </p>
          </div>
        )}

        {activeTab === 'approvals' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-amber-600" />
                Pending Human Approval Gates (RULE-E06)
              </h3>
              <StatusBadge status="PENDING_APPROVAL" size="sm" />
            </div>
            <p className="text-xs text-slate-600">
              Consequential autonomous actions paused until authorized by a human operator.
            </p>
          </div>
        )}

        {activeTab === 'audit' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <History className="w-4 h-4 text-slate-600" />
                Chronological Compliance Trail
              </h3>
              <span className="text-xs text-slate-500 font-mono">PostgreSQL Immutable Log</span>
            </div>
            <p className="text-xs text-slate-600">
              Full provenance of automated checks, Gemma 4 diagnoses, tool executions, and approvals.
            </p>
          </div>
        )}
      </div>

      {/* Mock Chat Slide-over Drawer Indicator */}
      {isChatOpen && (
        <div className="fixed inset-y-0 right-0 w-96 bg-white border-l border-slate-200 shadow-2xl z-40 flex flex-col">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
            <div className="flex items-center gap-2">
              <Bot className="w-4 h-4 text-violet-600" />
              <h4 className="text-sm font-bold text-slate-900">Gemma 4 Copilot</h4>
            </div>
            <button
              onClick={() => setIsChatOpen(false)}
              className="text-xs text-slate-500 hover:text-slate-800 font-medium px-2 py-1 rounded hover:bg-slate-200"
            >
              Close
            </button>
          </div>
          <div className="flex-1 p-4 text-xs text-slate-600 space-y-3 overflow-y-auto">
            <div className="p-3 bg-violet-50 border border-violet-100 rounded-md">
              <p className="font-semibold text-violet-900">Operational Assistant</p>
              <p className="text-violet-700 mt-1">
                I am connected to the Evolus AI Platform running Google Gemma 4 31B Instruct. Ask any operational freight question or trigger shipment diagnostics.
              </p>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
