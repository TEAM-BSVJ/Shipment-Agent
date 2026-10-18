import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  Sparkles,
  Calendar,
  Clock,
  FileText,
  MapPin,
  RefreshCw,
  Flame,
  Truck,
  ShieldCheck,
} from 'lucide-react';
import {
  AgentAnalysisResponse,
  Shipment,
} from '../types';
import { agentService, shipmentService } from '../services';
import { Button, MetricCard, StatusBadge, EvidenceCard } from '../components/common';
import { DocumentPanel, MilestoneTimeline } from '../components/shipment';
import { BENCHMARK_SHIPMENTS } from './Dashboard';

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
        const fallback = DETAILED_BENCHMARK_SHIPMENTS[shipmentId] || BENCHMARK_SHIPMENTS.find(s => s.id === shipmentId) || null;
        setShipment(fallback);
      }
    } catch {
      const fallback = DETAILED_BENCHMARK_SHIPMENTS[shipmentId] || BENCHMARK_SHIPMENTS.find(s => s.id === shipmentId) || null;
      setShipment(fallback);
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
      <div className="p-8 text-center bg-navy-900 border border-navy-700 rounded-md">
        <RefreshCw className="w-6 h-6 animate-spin text-cyan-400 mx-auto mb-2" />
        <p className="text-xs text-slateText-secondary font-mono">
          Loading shipment telemetry, milestone timeline, and paperwork...
        </p>
      </div>
    );
  }

  if (!shipment) {
    return (
      <div className="p-8 text-center bg-navy-900 border border-navy-700 rounded-md">
        <AlertTriangle className="w-8 h-8 text-coral-400 mx-auto mb-2" />
        <h4 className="text-sm font-bold text-white font-mono">Shipment Record Not Found</h4>
        <p className="text-xs text-slateText-secondary mt-1">
          The requested shipment UUID could not be resolved in the database.
        </p>
        <Button variant="secondary" size="sm" onClick={onBack} className="mt-4">
          Return to Dashboard
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Top Navigation & Header HUD Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-navy-700">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            leftIcon={<ArrowLeft className="w-4 h-4" />}
            onClick={onBack}
            className="text-slateText-muted hover:text-cyan-400 font-mono"
          >
            Back
          </Button>
          <div className="h-4 w-px bg-navy-700" />
          <div className="flex items-center gap-2.5">
            <h2 className="text-xl font-bold font-mono text-cyan-400 tracking-tight">
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
            Analyze with Evolus AI
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onOpenChat(shipment)}
          >
            Open Copilot
          </Button>
        </div>
      </div>

      {/* Corridor Overview HUD Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Transport Corridor"
          value={`${shipment.origin.split(',')[0]} → ${shipment.destination.split(',')[0]}`}
          icon={<MapPin className="w-4 h-4 text-cyan-400" />}
          subtext={`${shipment.mode} Freight | ${shipment.carrier_id}`}
          alertVariant="cyan"
        />
        <MetricCard
          title="Calculated Risk Score"
          value={`${shipment.risk_score} / 100`}
          icon={<Flame className="w-4 h-4 text-coral-400" />}
          subtext={`Tier: ${shipment.risk_level}`}
          deltaText={shipment.risk_score >= 60 ? 'CRITICAL DELTA' : 'NOMINAL'}
          deltaVariant={shipment.risk_score >= 60 ? 'negative' : 'positive'}
          alertVariant={shipment.risk_score >= 60 ? 'danger' : 'warning'}
        />
        <MetricCard
          title="Promised Delivery"
          value={shipment.promised_delivery_date}
          icon={<Calendar className="w-4 h-4 text-slateText-muted" />}
          subtext="Contractual SLA target"
          alertVariant="neutral"
        />
        <MetricCard
          title="Business Priority"
          value={shipment.business_priority}
          icon={<Clock className="w-4 h-4 text-violet-400" />}
          subtext="Multi-tenant isolation active"
          alertVariant="agent"
        />
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex border-b border-navy-700 bg-navy-900 rounded-t-md px-2">
        <button
          onClick={() => setActiveTab('journey')}
          className={`py-3 px-4 text-xs font-semibold border-b-2 transition-colors flex items-center gap-2 font-mono ${
            activeTab === 'journey'
              ? 'border-cyan-400 text-cyan-400 font-bold'
              : 'border-transparent text-slateText-secondary hover:text-white'
          }`}
        >
          <Truck className="w-3.5 h-3.5" />
          Milestone Timeline ({shipment.milestones?.length || 0})
        </button>

        <button
          onClick={() => setActiveTab('documents')}
          className={`py-3 px-4 text-xs font-semibold border-b-2 transition-colors flex items-center gap-2 font-mono ${
            activeTab === 'documents'
              ? 'border-cyan-400 text-cyan-400 font-bold'
              : 'border-transparent text-slateText-secondary hover:text-white'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          Shipping Paperwork ({shipment.documents?.length || 0})
        </button>

        <button
          onClick={() => setActiveTab('diagnosis')}
          className={`py-3 px-4 text-xs font-semibold border-b-2 transition-colors flex items-center gap-2 font-mono ${
            activeTab === 'diagnosis'
              ? 'border-violet-400 text-violet-300 font-bold shadow-glow-violet'
              : 'border-transparent text-slateText-secondary hover:text-white'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-violet-400" />
          AI Diagnostic Reasoner
          {latestAnalysis && (
            <span className="w-2 h-2 rounded-full bg-violet-400 animate-pulse" />
          )}
        </button>
      </div>

      {/* Tab Panels */}
      <div className="bg-navy-900 border border-navy-700 rounded-b-md p-6 shadow-md">
        {activeTab === 'journey' && (
          <div className="space-y-4">
            <div className="pb-3 border-b border-navy-700/60 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white font-mono">
                  Milestone Execution Telemetry
                </h3>
                <p className="text-xs text-slateText-secondary">
                  Actual timestamp scans versus promised SLA cutoffs.
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
            <div className="flex items-center justify-between pb-3 border-b border-navy-700/60">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-md bg-navy-850 border border-violet-400/40 text-violet-300 flex items-center justify-center font-bold">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white font-mono">
                    AI Diagnostic Inference
                  </h3>
                  <p className="text-xs text-slateText-secondary">
                    Structured root cause analysis, evidence provenance, and allowlisted remediation.
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
                <div className="p-4 bg-navy-850 border border-violet-400/40 rounded-md space-y-2 shadow-glow-violet">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold font-mono text-violet-300 uppercase tracking-wider">
                      Issue Identified: {latestAnalysis.diagnosis.issue_type}
                    </span>
                    <StatusBadge status={latestAnalysis.diagnosis.risk_level} size="sm" />
                  </div>
                  <p className="text-xs text-slateText-primary font-medium leading-relaxed">
                    {latestAnalysis.diagnosis.root_cause}
                  </p>
                </div>

                {/* Grounded Evidence Card */}
                <EvidenceCard
                  title="Empirical Grounded Evidence"
                  items={latestAnalysis.diagnosis.evidence.map((ev, i) => ({
                    label: `Evidence Fact #${i + 1}`,
                    value: ev,
                    highlightVariant: i === 0 ? 'coral' : 'cyan',
                    source: 'AI Evaluator',
                  }))}
                  provenance="ShipRAG AI Intelligence Engine"
                  verifiedAt={new Date().toLocaleTimeString()}
                />

                {/* Recommended Remediation Action */}
                <div className="p-4 bg-navy-850 border border-navy-700 rounded-md space-y-3">
                  <h4 className="text-xs font-bold text-slateText-muted uppercase tracking-wider font-mono">
                    Autonomous Remediation Proposal
                  </h4>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-cyan-400" />
                      <span className="text-xs font-mono font-bold text-cyan-400">
                        {latestAnalysis.diagnosis.tool_name}
                      </span>
                    </div>
                    <span className="text-[11px] font-mono text-slateText-muted">
                      Confidence: {(latestAnalysis.diagnosis.confidence * 100).toFixed(0)}%
                    </span>
                  </div>
                  <p className="text-xs text-slateText-secondary">
                    {latestAnalysis.diagnosis.recommended_action}
                  </p>

                  <div className="pt-2 flex items-center justify-end gap-2">
                    <Button
                      variant="agent"
                      size="sm"
                      onClick={() => onOpenChat(shipment)}
                    >
                      Authorize via Copilot
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-8 text-center bg-navy-850 border border-navy-700 rounded-md">
                <Sparkles className="w-8 h-8 text-violet-400/80 mx-auto mb-2" />
                <h4 className="text-xs font-bold text-white font-mono">
                  No Diagnosis Cached for This Shipment
                </h4>
                <p className="text-xs text-slateText-secondary mt-1 max-w-sm mx-auto">
                  Click the button below to run an AI diagnosis for root causes and recovery workflows.
                </p>
                <Button
                  variant="agent"
                  size="sm"
                  isLoading={isAnalyzing}
                  leftIcon={<Sparkles className="w-3.5 h-3.5" />}
                  onClick={handleRunDiagnosis}
                  className="mt-3"
                >
                  Run AI Diagnostic
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
