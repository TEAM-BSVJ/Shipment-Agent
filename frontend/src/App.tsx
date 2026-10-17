import { useState } from 'react';
import {
  Bot,
  History,
  X,
} from 'lucide-react';
import { AppLayout, NavTab } from './components/layout';
import { StatusBadge } from './components/common';
import { Dashboard } from './pages/Dashboard';
import { ShipmentDetail } from './pages/ShipmentDetail';
import { ExceptionQueuePage } from './pages/ExceptionQueuePage';
import { ApprovalQueuePage } from './pages/ApprovalQueuePage';
import { Shipment } from './types';
import { shipmentService } from './services';

const TRACKING_TO_ID: Record<string, string> = {
  'SHP-101': '10100000-0000-0000-0000-000000000101',
  'SHP-102': '10200000-0000-0000-0000-000000000102',
  'SHP-103': '10300000-0000-0000-0000-000000000103',
  'SHP-104': '10400000-0000-0000-0000-000000000104',
  'SHP-105': '10500000-0000-0000-0000-000000000105',
};

export default function App() {
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [selectedShipment, setSelectedShipment] = useState<Shipment | null>(null);
  const [exceptionCount, setExceptionCount] = useState<number>(3);
  const [approvalCount, setApprovalCount] = useState<number>(2);

  const handleSelectShipment = (shipment: Shipment) => {
    setSelectedShipment(shipment);
  };

  const handleAnalyzeShipment = (shipment: Shipment) => {
    setSelectedShipment(shipment);
    setIsChatOpen(true);
  };

  const handleSelectByTrackingNumber = async (trackingNumber: string) => {
    try {
      const res = await shipmentService.getShipments({ search: trackingNumber });
      if (res.data && res.data.length > 0) {
        setSelectedShipment(res.data[0]);
        setActiveTab('dashboard');
        return;
      }
    } catch {
      // Use fallback mapping below
    }

    const fallbackId = TRACKING_TO_ID[trackingNumber] || '10100000-0000-0000-0000-000000000101';
    setSelectedShipment({
      id: fallbackId,
      tracking_number: trackingNumber,
      origin:
        trackingNumber === 'SHP-102'
          ? 'Dallas, US'
          : trackingNumber === 'SHP-103'
          ? 'Shanghai, CN'
          : trackingNumber === 'SHP-105'
          ? 'Frankfurt, DE'
          : 'Mumbai, IN',
      destination:
        trackingNumber === 'SHP-102'
          ? 'Austin, US'
          : trackingNumber === 'SHP-103'
          ? 'Los Angeles, US'
          : trackingNumber === 'SHP-105'
          ? 'Chicago, US'
          : 'Rotterdam, NL',
      mode: trackingNumber === 'SHP-102' || trackingNumber === 'SHP-105' ? 'AIR' : 'SEA',
      carrier_id:
        trackingNumber === 'SHP-102'
          ? 'FEDEX_EXPRESS'
          : trackingNumber === 'SHP-103'
          ? 'COSCO_SHIPPING'
          : trackingNumber === 'SHP-105'
          ? 'LUFTHANSA_CARGO'
          : 'MAERSK_01',
      promised_delivery_date: '2026-11-05',
      business_priority: 'HIGH',
      status:
        trackingNumber === 'SHP-102'
          ? 'AT_WAREHOUSE'
          : trackingNumber === 'SHP-103'
          ? 'EXCEPTION'
          : 'CUSTOMS_HOLD',
      risk_score: 75,
      risk_level: 'HIGH',
      tenant_id: 'a0000000-0000-0000-0000-000000000001',
      milestones: [],
      documents: [],
    });
    setActiveTab('dashboard');
  };

  const handleAnalyzeByTrackingNumber = async (trackingNumber: string) => {
    await handleSelectByTrackingNumber(trackingNumber);
    setIsChatOpen(true);
  };

  return (
    <AppLayout
      activeTab={activeTab}
      onTabChange={(tab) => {
        setActiveTab(tab);
        setSelectedShipment(null);
      }}
      exceptionCount={exceptionCount}
      approvalCount={approvalCount}
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
        <ExceptionQueuePage
          onSelectShipment={handleSelectByTrackingNumber}
          onAnalyzeShipment={handleAnalyzeByTrackingNumber}
          onExceptionCountChange={setExceptionCount}
        />
      )}

      {activeTab === 'approvals' && (
        <ApprovalQueuePage
          onSelectShipment={handleSelectByTrackingNumber}
          onAnalyzeShipment={handleAnalyzeByTrackingNumber}
          onApprovalCountChange={setApprovalCount}
        />
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
