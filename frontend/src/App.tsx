import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { AppLayout, NavTab, CommandPalette } from './components/layout';
import { StatusBadge } from './components/common';
import {
  Dashboard,
  ShipmentDetail,
  ShipmentsPage,
  ExceptionQueuePage,
  DocumentReconcileStudio,
  ApprovalQueuePage,
  RecoveryPlannerPage,
  AnalyticsPage,
  AuditTrailPage,
  SettingsPage,
} from './pages';
import { BENCHMARK_SHIPMENTS } from './pages/Dashboard';
import { ChatDrawer } from './components/chat';
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
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [selectedShipment, setSelectedShipment] = useState<Shipment | null>(null);
  const [exceptionCount, setExceptionCount] = useState<number>(3);
  const [approvalCount, setApprovalCount] = useState<number>(2);
  const [shipmentsList, setShipmentsList] = useState<Shipment[]>(BENCHMARK_SHIPMENTS);

  useEffect(() => {
    // Attempt to load fresh live shipments from backend API
    const loadShipments = async () => {
      try {
        const res = await shipmentService.getShipments();
        if (res.data && res.data.length > 0) {
          setShipmentsList(res.data);
        }
      } catch {
        // Retain BENCHMARK_SHIPMENTS
      }
    };
    loadShipments();
  }, []);

  // Global hotkey: Cmd+K / Ctrl+K for Omnibox search, Cmd+J / Ctrl+J for Copilot
  useEffect(() => {
    const handleGlobalHotkeys = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'j') {
        e.preventDefault();
        setIsChatOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleGlobalHotkeys);
    return () => window.removeEventListener('keydown', handleGlobalHotkeys);
  }, []);

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
    const benchmarkMatch = BENCHMARK_SHIPMENTS.find((s) => s.tracking_number === trackingNumber);

    if (benchmarkMatch) {
      setSelectedShipment(benchmarkMatch);
    } else {
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
    }
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
      onOpenSearch={() => setIsCommandPaletteOpen(true)}
      onNavigateExceptions={() => {
        setActiveTab('exceptions');
        setSelectedShipment(null);
      }}
    >
      {/* 1. Command Center / Dashboard Tab */}
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

      {/* 2. Shipment Explorer Registry Tab */}
      {activeTab === 'shipments' &&
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
          <ShipmentsPage
            onSelectShipment={handleSelectShipment}
            onAnalyzeShipment={handleAnalyzeShipment}
          />
        ))}

      {/* 3. Exception Triage Center Tab */}
      {activeTab === 'exceptions' && (
        <ExceptionQueuePage
          onSelectShipment={handleSelectByTrackingNumber}
          onAnalyzeShipment={handleAnalyzeByTrackingNumber}
          onExceptionCountChange={setExceptionCount}
        />
      )}

      {/* 4. Document Validation & Reconciliation Studio Tab */}
      {activeTab === 'documents' && <DocumentReconcileStudio />}

      {/* 5. Human Approval Gateway Tab */}
      {activeTab === 'approvals' && (
        <ApprovalQueuePage
          onSelectShipment={handleSelectByTrackingNumber}
          onAnalyzeShipment={handleAnalyzeByTrackingNumber}
          onApprovalCountChange={setApprovalCount}
        />
      )}

      {/* 6. Recovery Planner & Scenario Simulator Tab */}
      {activeTab === 'recovery' && <RecoveryPlannerPage />}

      {/* 7. Operational Trends & Bottleneck Analytics Tab */}
      {activeTab === 'analytics' && <AnalyticsPage />}

      {/* 8. Compliance Audit Trail Tab */}
      {activeTab === 'audit' && <AuditTrailPage />}

      {/* 9. System Configuration & Telemetry Hub Tab */}
      {activeTab === 'settings' && <SettingsPage />}

      {/* Floating Selected Shipment Quick Peek Banner (shown when navigating across tabs with an active selection) */}
      {selectedShipment && activeTab !== 'dashboard' && activeTab !== 'shipments' && (
        <div className="fixed bottom-6 right-6 bg-navy-850 text-white rounded-md p-4 shadow-xl z-30 max-w-md border border-cyan-400/40 shadow-glow-cyan animate-in fade-in slide-in-from-bottom-2">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-sm text-cyan-400">
                  {selectedShipment.tracking_number}
                </span>
                <StatusBadge status={selectedShipment.risk_level} size="sm" />
              </div>
              <p className="text-xs text-slateText-secondary mt-1">
                {selectedShipment.origin} → {selectedShipment.destination} ({selectedShipment.mode})
              </p>
              <p className="text-[11px] text-slateText-muted mt-0.5 font-mono">
                Carrier: {selectedShipment.carrier_id} | Promised: {selectedShipment.promised_delivery_date}
              </p>
            </div>
            <button
              onClick={() => setSelectedShipment(null)}
              className="text-slateText-muted hover:text-white p-1 rounded transition-colors"
              title="Clear selection"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Omnibox Command Palette Modal */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        shipments={shipmentsList}
        onSelectShipment={(shipment) => {
          setSelectedShipment(shipment);
          setActiveTab('dashboard');
        }}
        onOpenCopilot={() => setIsChatOpen(true)}
        onTriggerScan={() => {
          setActiveTab('exceptions');
        }}
        onNavigateTab={(tab) => {
          setActiveTab(tab);
          setSelectedShipment(null);
        }}
      />

      {/* Interactive Copilot Chat Slide-over Drawer (ShipRAG AI Copilot) */}
      <ChatDrawer
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        selectedShipment={selectedShipment}
        onClearShipmentContext={() => setSelectedShipment(null)}
        onNavigateTab={(tab) => {
          setActiveTab(tab);
          if (tab !== 'dashboard' && tab !== 'shipments') {
            setSelectedShipment(null);
          }
        }}
      />
    </AppLayout>
  );
}
