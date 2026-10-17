import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  Bot,
  Calendar,
  CheckCircle2,
  Clock,
  FileText,
  MapPin,
  RefreshCw,
  ShieldAlert,
  Sparkles,
  Truck,
} from 'lucide-react';
import {
  AgentAnalysisResponse,
  Shipment,
} from '../types';
import { agentService, shipmentService } from '../services';
import { Button, MetricCard, StatusBadge } from '../components/common';
import { DocumentPanel, MilestoneTimeline } from '../components/shipment';

interface ShipmentDetailProps {
  shipmentId: string;
  onBack: () => void;
  onOpenChat: (shipment: Shipment) => void;
}

// Fallback scenarios with comprehensive milestone timelines and paperwork
const DETAILED_BENCHMARK_SHIPMENTS: Record<string, Shipment> = {
  '10100000-0000-0000-0000-000000000101': {
    id: '10100000-0000-0000-0000-000000000101',
    tracking_number: 'SHP-101',
    origin: 'Mumbai, IN',
    destination: 'Rotterdam, NL',
    mode: 'SEA',
    carrier_id: 'MAERSK_01',
    promised_delivery_date: '2026-11-05',
    business_priority: 'HIGH',
    status: 'CUSTOMS_HOLD',
    risk_score: 75,
    risk_level: 'HIGH',
    tenant_id: 'a0000000-0000-0000-0000-000000000001',
    milestones: [
      {
        id: 'm101-1',
        shipment_id: '10100000-0000-0000-0000-000000000101',
        milestone_name: 'BOOKING_CONFIRMED',
        expected_at: '2026-10-10T08:00:00Z',
        completed_at: '2026-10-10T08:30:00Z',
        is_completed: true,
        source: 'INTERNAL_TMS',
      },
      {
        id: 'm101-2',
        shipment_id: '10100000-0000-0000-0000-000000000101',
        milestone_name: 'PICKUP_COMPLETED',
        expected_at: '2026-10-12T14:00:00Z',
        completed_at: '2026-10-12T13:45:00Z',
        is_completed: true,
        source: 'CARRIER_MOCK',
      },
      {
        id: 'm101-3',
        shipment_id: '10100000-0000-0000-0000-000000000101',
        milestone_name: 'PORT_ARRIVAL',
        expected_at: '2026-10-15T18:00:00Z',
        completed_at: '2026-10-15T19:10:00Z',
        is_completed: true,
        source: 'PORT_SYSTEM',
      },
      {
        id: 'm101-4',
        shipment_id: '10100000-0000-0000-0000-000000000101',
        milestone_name: 'CUSTOMS_CLEARANCE',
        expected_at: '2026-10-16T12:00:00Z',
        completed_at: null,
        is_completed: false,
        source: 'CUSTOMS_EDI',
      },
      {
        id: 'm101-5',
        shipment_id: '10100000-0000-0000-0000-000000000101',
        milestone_name: 'VESSEL_DEPARTURE',
        expected_at: '2026-10-18T06:00:00Z',
        completed_at: null,
        is_completed: false,
        source: 'CARRIER_MOCK',
      },
    ],
    documents: [
      {
        id: 'd101-1',
        shipment_id: '10100000-0000-0000-0000-000000000101',
        document_type: 'BILL_OF_LADING',
        file_ref: '/data/documents/SHP-101-BOL.pdf',
        confidence: 0.95,
        validation_status: 'VALIDATED',
        extracted_fields: {
          invoice_number: 'BOL-MAERSK-9921',
          total_weight_kg: 4200.0,
          declared_value: 84000.0,
          currency: 'USD',
          consignee: 'EuroLogistics BV, Rotterdam',
        },
      },
    ],
  },
  '10200000-0000-0000-0000-000000000102': {
    id: '10200000-0000-0000-0000-000000000102',
    tracking_number: 'SHP-102',
    origin: 'Dallas, US',
    destination: 'Austin, US',
    mode: 'AIR',
    carrier_id: 'FEDEX_EXPRESS',
    promised_delivery_date: '2026-10-18',
    business_priority: 'CRITICAL',
    status: 'AT_WAREHOUSE',
    risk_score: 95,
    risk_level: 'CRITICAL',
    tenant_id: 'a0000000-0000-0000-0000-000000000001',
    milestones: [
      {
        id: 'm102-1',
        shipment_id: '10200000-0000-0000-0000-000000000102',
        milestone_name: 'BOOKING_CONFIRMED',
        expected_at: '2026-10-16T09:00:00Z',
        completed_at: '2026-10-16T09:15:00Z',
        is_completed: true,
        source: 'INTERNAL_TMS',
      },
      {
        id: 'm102-2',
        shipment_id: '10200000-0000-0000-0000-000000000102',
        milestone_name: 'WAREHOUSE_RECEIPT',
        expected_at: '2026-10-16T15:00:00Z',
        completed_at: '2026-10-16T15:30:00Z',
        is_completed: true,
        source: 'WMS_SCANNER',
      },
      {
        id: 'm102-3',
        shipment_id: '10200000-0000-0000-0000-000000000102',
        milestone_name: 'WAREHOUSE_DISPATCH',
        expected_at: '2026-10-17T06:00:00Z',
        completed_at: null,
        is_completed: false,
        source: 'WMS_SCANNER',
      },
      {
        id: 'm102-4',
        shipment_id: '10200000-0000-0000-0000-000000000102',
        milestone_name: 'DESTINATION_ARRIVAL',
        expected_at: '2026-10-17T18:00:00Z',
        completed_at: null,
        is_completed: false,
        source: 'AIRPORT_FBO',
      },
    ],
    documents: [
      {
        id: 'd102-1',
        shipment_id: '10200000-0000-0000-0000-000000000102',
        document_type: 'AIR_WAYBILL',
        file_ref: '/data/documents/SHP-102-AWB.pdf',
        confidence: 0.98,
        validation_status: 'VALIDATED',
        extracted_fields: {
          invoice_number: 'AWB-FDX-7718',
          total_weight_kg: 340.5,
          declared_value: 125000.0,
          currency: 'USD',
          consignee: 'Texas Medical Center, Austin',
        },
      },
    ],
  },
};

export const ShipmentDetail: React.FC<ShipmentDetailProps> = ({
  shipmentId,
  onBack,
  onOpenChat,
}) => {
  const [shipment, setShipment] = useState<Shipment | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'journey' | 'documents' | 'diagnosis'>('journey');
  const [latestAnalysis, setLatestAnalysis] = useState<AgentAnalysisResponse | null>(null);

  const loadShipmentData = async () => {
    try {
      const res = await shipmentService.getShipmentById(shipmentId);
      if (res) {
        setShipment(res);
      } else {
        setShipment(DETAILED_BENCHMARK_SHIPMENTS[shipmentId] || null);
      }
    } catch {
      setShipment(DETAILED_BENCHMARK_SHIPMENTS[shipmentId] || null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadShipmentData();
  }, [shipmentId]);

  const handleRunDiagnosis = async () => {
    if (!shipment) return;
    setIsAnalyzing(true);
    try {
      const result = await agentService.analyzeShipment({
        shipment_id: shipment.id,
        force_refresh: true,
      });
      setLatestAnalysis(result);
      setActiveTab('diagnosis');
      loadShipmentData();
    } catch (err) {
      console.error('Diagnosis failed:', err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-8 text-center bg-white border border-slate-200 rounded-md">
        <RefreshCw className="w-6 h-6 animate-spin text-blue-600 mx-auto mb-2" />
        <p className="text-xs text-slate-500">Loading shipment corridors and milestone records...</p>
      </div>
    );
  }

  if (!shipment) {
    return (
      <div className="p-8 text-center bg-white border border-slate-200 rounded-md">
        <AlertTriangle className="w-8 h-8 text-red-500 mx-auto mb-2" />
        <h4 className="text-sm font-bold text-slate-800">Shipment Not Found</h4>
        <p className="text-xs text-slate-500 mt-1">The requested shipment UUID could not be resolved.</p>
        <Button variant="secondary" size="sm" onClick={onBack} className="mt-4">
          Return to Dashboard
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Navigation & Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            leftIcon={<ArrowLeft className="w-4 h-4" />}
            onClick={onBack}
            className="text-slate-600 hover:text-slate-900"
          >
            Dashboard
          </Button>
          <div className="h-4 w-px bg-slate-300" />
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold font-mono text-slate-900 tracking-tight">
              {shipment.tracking_number}
            </h2>
            <StatusBadge status={shipment.status} />
            <StatusBadge status={shipment.risk_level} />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="agent"
            size="sm"
            isLoading={isAnalyzing}
            leftIcon={<Sparkles className="w-4 h-4" />}
            onClick={handleRunDiagnosis}
          >
            Analyze with Agent (Gemma 4)
          </Button>
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<Bot className="w-4 h-4 text-violet-600" />}
            onClick={() => onOpenChat(shipment)}
          >
            Open Copilot
          </Button>
        </div>
      </div>

      {/* Corridor Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Transport Corridor"
          value={`${shipment.origin.split(',')[0]} → ${shipment.destination.split(',')[0]}`}
          icon={<MapPin className="w-4 h-4 text-blue-600" />}
          subtext={`${shipment.mode} Freight | ${shipment.carrier_id}`}
        />
        <MetricCard
          title="Calculated Risk Score"
          value={`${shipment.risk_score} / 100`}
          icon={<ShieldAlert className="w-4 h-4 text-red-600" />}
          subtext={`Tier: ${shipment.risk_level}`}
          alertVariant={shipment.risk_level === 'CRITICAL' ? 'danger' : 'warning'}
        />
        <MetricCard
          title="Promised Delivery"
          value={shipment.promised_delivery_date}
          icon={<Calendar className="w-4 h-4 text-slate-600" />}
          subtext="Contractual SLA target"
        />
        <MetricCard
          title="Priority Classification"
          value={shipment.business_priority}
          icon={<Clock className="w-4 h-4 text-violet-600" />}
          subtext="Multi-tenant isolation active"
          alertVariant="agent"
        />
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab('journey')}
          className={`py-2.5 px-4 text-xs font-semibold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'journey'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Truck className="w-3.5 h-3.5" />
          Milestone Timeline ({shipment.milestones?.length || 0})
        </button>

        <button
          onClick={() => setActiveTab('documents')}
          className={`py-2.5 px-4 text-xs font-semibold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'documents'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          Shipping Paperwork ({shipment.documents?.length || 0})
        </button>

        <button
          onClick={() => setActiveTab('diagnosis')}
          className={`py-2.5 px-4 text-xs font-semibold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'diagnosis'
              ? 'border-violet-600 text-violet-600 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Bot className="w-3.5 h-3.5 text-violet-600" />
          Gemma 4 Diagnostic Reasoner
          {latestAnalysis && (
            <span className="w-2 h-2 rounded-full bg-violet-600 animate-pulse" />
          )}
        </button>
      </div>

      {/* Tab Panels */}
      <div className="bg-white border border-slate-200 rounded-md p-6 shadow-sm">
        {activeTab === 'journey' && (
          <div className="space-y-4">
            <div className="pb-3 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Milestone Execution Progress</h3>
                <p className="text-xs text-slate-500">
                  Actual scans versus promised SLA cutoffs.
                </p>
              </div>
            </div>
            <MilestoneTimeline milestones={shipment.milestones || []} />
          </div>
        )}

        {activeTab === 'documents' && (
          <DocumentPanel
            shipmentId={shipment.id}
            documents={shipment.documents || []}
            onDocumentAdded={(newDoc) => {
              setShipment((prev) =>
                prev ? { ...prev, documents: [...prev.documents, newDoc] } : null
              );
            }}
            onRefresh={loadShipmentData}
          />
        )}

        {activeTab === 'diagnosis' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-md bg-violet-50 text-violet-600 flex items-center justify-center font-bold">
                  <Bot className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Google Gemma 4 31B Instruct Diagnosis
                  </h3>
                  <p className="text-xs text-slate-500">
                    Structured root cause analysis, evidence pills, and allowlisted remediation.
                  </p>
                </div>
              </div>

              <Button
                variant="agent"
                size="sm"
                isLoading={isAnalyzing}
                leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
                onClick={handleRunDiagnosis}
              >
                Re-Run Analysis
              </Button>
            </div>

            {latestAnalysis ? (
              <div className="space-y-4">
                {/* Issue & Root Cause Box */}
                <div className="p-4 bg-violet-50/50 border border-violet-100 rounded-md space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-violet-900 uppercase tracking-wider">
                      Issue Identified: {latestAnalysis.diagnosis.issue_type}
                    </span>
                    <StatusBadge status={latestAnalysis.diagnosis.risk_level} size="sm" />
                  </div>
                  <p className="text-xs text-slate-700 font-medium">
                    {latestAnalysis.diagnosis.root_cause}
                  </p>
                </div>

                {/* Grounded Evidence Pills */}
                <div>
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    Verified Grounded Evidence
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {latestAnalysis.diagnosis.evidence.map((item, idx) => (
                      <span
                        key={idx}
                        className="px-2.5 py-1 bg-slate-100 border border-slate-200 text-slate-700 rounded text-xs font-medium flex items-center gap-1.5"
                      >
                        <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                        {item}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Recommended Remediation Action */}
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-md space-y-2">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Recommended Corrective Action
                  </h4>
                  <p className="text-xs text-slate-700 font-medium">
                    {latestAnalysis.diagnosis.recommended_action}
                  </p>
                  <div className="flex items-center gap-3 pt-2 text-xs">
                    <span className="font-mono bg-white px-2 py-0.5 border border-slate-200 rounded text-slate-800 font-bold">
                      Tool: {latestAnalysis.diagnosis.tool_name}
                    </span>
                    {latestAnalysis.requires_human_approval && (
                      <span className="text-xs px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 font-semibold flex items-center gap-1">
                        <Clock className="w-3 h-3" /> Requires Human Sign-Off (RULE-E06)
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-8 text-center bg-slate-50 border border-slate-200 rounded-md space-y-3">
                <Bot className="w-8 h-8 text-violet-500 mx-auto" />
                <h4 className="text-xs font-bold text-slate-800">No active diagnosis recorded</h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Click the button below to invoke Google Gemma 4 31B Instruct via the Evolus AI Platform to evaluate shipment milestones and paperwork.
                </p>
                <Button
                  variant="agent"
                  size="sm"
                  isLoading={isAnalyzing}
                  leftIcon={<Sparkles className="w-4 h-4" />}
                  onClick={handleRunDiagnosis}
                >
                  Run Agent Diagnosis Now
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
