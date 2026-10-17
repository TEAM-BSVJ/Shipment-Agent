import { useState } from 'react';
import {
  AlertTriangle,
  Bot,
  History,
  ShieldCheck,
  X,
} from 'lucide-react';
import { AppLayout, NavTab } from './components/layout';
import { StatusBadge } from './components/common';
import { Dashboard } from './pages/Dashboard';
import { ShipmentDetail } from './pages/ShipmentDetail';
import { Shipment } from './types';

export default function App() {
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [selectedShipment, setSelectedShipment] = useState<Shipment | null>(null);

  const handleSelectShipment = (shipment: Shipment) => {
    setSelectedShipment(shipment);
  };

  const handleAnalyzeShipment = (shipment: Shipment) => {
    setSelectedShipment(shipment);
    setIsChatOpen(true);
  };

  return (
    <AppLayout
      activeTab={activeTab}
      onTabChange={(tab) => {
        setActiveTab(tab);
        setSelectedShipment(null);
      }}
      exceptionCount={3}
      approvalCount={2}
      onOpenChat={() => setIsChatOpen(true)}
    >
      {/* Active Tab View */}
      {activeTab === 'dashboard' &&
        (selectedShipment ? (
          <ShipmentDetail
            shipmentId={selectedShipment.id}
            onBack={() => setSelectedShipment(null)}
            onOpenChat={(s) => {
              setSelectedShipment(s);
              setIsChatOpen(true);
            }}
          />
        ) : (
          <Dashboard
            onSelectShipment={handleSelectShipment}
            onAnalyzeShipment={handleAnalyzeShipment}
          />
        ))}

      {activeTab === 'exceptions' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-4 border-b border-slate-200">
            <div>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                Operational Exception Queue
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Triage identified logistics bottlenecks, missing paperwork, and overdue dispatch exceptions.
              </p>
            </div>
            <StatusBadge status="OPEN" />
          </div>

          <div className="bg-white border border-slate-200 rounded-md p-6 shadow-sm">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <AlertTriangle className="w-4 h-4 text-red-600" />
              <h3 className="text-sm font-bold text-slate-900">Active Freight Exceptions</h3>
            </div>
            <p className="text-xs text-slate-600 mt-3">
              Ready for Unit 6.6 Exception Queue & Human Approval Gate Modal.
            </p>
          </div>
        </div>
      )}

      {activeTab === 'approvals' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-4 border-b border-slate-200">
            <div>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                Human-in-the-Loop Approvals
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Review and authorize AI-recommended actions for consequential workflow steps (RULE-E06).
              </p>
            </div>
            <StatusBadge status="PENDING_APPROVAL" />
          </div>

          <div className="bg-white border border-slate-200 rounded-md p-6 shadow-sm">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <ShieldCheck className="w-4 h-4 text-amber-600" />
              <h3 className="text-sm font-bold text-slate-900">Pending Decision Gate</h3>
            </div>
            <p className="text-xs text-slate-600 mt-3">
              Ready for Unit 6.6 One-Click Approval & Rejection Modal.
            </p>
          </div>
        </div>
      )}

      {activeTab === 'audit' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-4 border-b border-slate-200">
            <div>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                Immutable Compliance Audit Trail
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Chronological log of autonomous agent inferences, tool executions, and user authorizations.
              </p>
            </div>
            <span className="text-xs font-mono bg-slate-100 text-slate-600 border border-slate-200 px-2 py-0.5 rounded">
              PostgreSQL Audit Log
            </span>
          </div>

          <div className="bg-white border border-slate-200 rounded-md p-6 shadow-sm">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <History className="w-4 h-4 text-slate-600" />
              <h3 className="text-sm font-bold text-slate-900">Compliance Log Stream</h3>
            </div>
            <p className="text-xs text-slate-600 mt-3">
              Ready for Unit 6.7 Chronological Audit Log Table.
            </p>
          </div>
        </div>
      )}

      {/* Selected Shipment Quick Peek Banner (shown when navigating away from dashboard) */}
      {selectedShipment && activeTab !== 'dashboard' && (
        <div className="fixed bottom-6 right-6 bg-slate-900 text-white rounded-md p-4 shadow-xl z-30 max-w-md border border-slate-800 animate-in fade-in slide-in-from-bottom-2">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-sm text-blue-400">
                  {selectedShipment.tracking_number}
                </span>
                <StatusBadge status={selectedShipment.risk_level} size="sm" />
              </div>
              <p className="text-xs text-slate-300 mt-1">
                {selectedShipment.origin} → {selectedShipment.destination} ({selectedShipment.mode})
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Carrier: {selectedShipment.carrier_id} | Promised: {selectedShipment.promised_delivery_date}
              </p>
            </div>
            <button
              onClick={() => setSelectedShipment(null)}
              className="text-slate-400 hover:text-white p-1 rounded"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Copilot Chat Slide-over Drawer */}
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
            {selectedShipment && (
              <div className="p-2.5 bg-blue-50 border border-blue-100 rounded text-blue-900 text-xs">
                <span className="font-semibold">Context Active:</span> {selectedShipment.tracking_number} ({selectedShipment.origin} → {selectedShipment.destination})
              </div>
            )}
            <div className="p-3 bg-violet-50 border border-violet-100 rounded-md">
              <p className="font-semibold text-violet-900">Evolus AI Reasoning Loop</p>
              <p className="text-violet-700 mt-1">
                Connected to <span className="font-mono font-medium">gemma4 31B-it</span>. Ask questions about shipment delays, document weight discrepancies, or overdue milestones.
              </p>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
