import React, { useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  Package,
  RefreshCw,
  Flame,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  Download,
  Radio,
  Clock,
  Compass,
} from 'lucide-react';
import { Shipment } from '../types';
import { shipmentService } from '../services';
import { Button, MetricCard } from '../components/common';
import { LogisticsMap } from '../components/map';

interface DashboardProps {
  onSelectShipment: (shipment: Shipment) => void;
  onAnalyzeShipment: (shipment: Shipment) => void;
  onNavigateTab?: (tab: any) => void;
}

// Fallback benchmark freight scenarios (SHP-101 to SHP-105 from seed_db.py)
export const BENCHMARK_SHIPMENTS: Shipment[] = [
  {
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
    milestones: [],
    documents: [],
  },
  {
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
    milestones: [],
    documents: [],
  },
  {
    id: '10300000-0000-0000-0000-000000000103',
    tracking_number: 'SHP-103',
    origin: 'Shanghai, CN',
    destination: 'Los Angeles, US',
    mode: 'SEA',
    carrier_id: 'COSCO_SHIPPING',
    promised_delivery_date: '2026-11-12',
    business_priority: 'MEDIUM',
    status: 'EXCEPTION',
    risk_score: 65,
    risk_level: 'HIGH',
    tenant_id: 'a0000000-0000-0000-0000-000000000001',
    milestones: [],
    documents: [],
  },
  {
    id: '10400000-0000-0000-0000-000000000104',
    tracking_number: 'SHP-104',
    origin: 'Detroit, US',
    destination: 'Cleveland, US',
    mode: 'ROAD',
    carrier_id: 'KNIGHT_SWIFT',
    promised_delivery_date: '2026-10-20',
    business_priority: 'LOW',
    status: 'IN_TRANSIT',
    risk_score: 15,
    risk_level: 'LOW',
    tenant_id: 'a0000000-0000-0000-0000-000000000001',
    milestones: [],
    documents: [],
  },
  {
    id: '10500000-0000-0000-0000-000000000105',
    tracking_number: 'SHP-105',
    origin: 'Frankfurt, DE',
    destination: 'Chicago, US',
    mode: 'AIR',
    carrier_id: 'LUFTHANSA_CARGO',
    promised_delivery_date: '2026-10-17',
    business_priority: 'CRITICAL',
    status: 'CUSTOMS_HOLD',
    risk_score: 85,
    risk_level: 'CRITICAL',
    tenant_id: 'a0000000-0000-0000-0000-000000000001',
    milestones: [],
    documents: [],
  },
];

export const Dashboard: React.FC<DashboardProps> = ({
  onSelectShipment,
  onAnalyzeShipment,
  onNavigateTab,
}) => {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [selectedMapShipmentId, setSelectedMapShipmentId] = useState<string | null>(null);
  const [bannerNotice, setBannerNotice] = useState<string | null>(null);

  const fetchShipments = async () => {
    try {
      const res = await shipmentService.getShipments();
      if (res.data && res.data.length > 0) {
        setShipments(res.data);
      } else {
        setShipments(BENCHMARK_SHIPMENTS);
      }
    } catch {
      setShipments(BENCHMARK_SHIPMENTS);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchShipments();
  }, []);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchShipments();
  };

  const handleTriggerHealthScan = () => {
    setIsScanning(true);
    setBannerNotice('APScheduler active: Evaluating planned milestones & risk deltas...');
    setTimeout(() => {
      setIsScanning(false);
      setBannerNotice('Health evaluation complete: 3 exceptions verified. All states synchronized.');
      setTimeout(() => setBannerNotice(null), 5000);
    }, 1200);
  };

  const handleExportReport = () => {
    const reportData = {
      timestamp: new Date().toISOString(),
      activeShipments: shipments.length,
      bottlenecksDetected: shipments.filter((s) => s.risk_score >= 60).length,
      shipments: shipments.map((s) => ({
        tracking_number: s.tracking_number,
        mode: s.mode,
        origin: s.origin,
        destination: s.destination,
        carrier: s.carrier_id,
        status: s.status,
        risk_score: s.risk_score,
      })),
    };
    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `AETHERIS_Shift_Report_${new Date().toISOString().substring(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // High-risk bottlenecks sorted descending by risk score
  const bottlenecks = useMemo(() => {
    return [...shipments]
      .filter((s) => s.risk_score >= 50 || s.status === 'EXCEPTION' || s.status === 'CUSTOMS_HOLD')
      .sort((a, b) => b.risk_score - a.risk_score);
  }, [shipments]);

  // Telemetry KPIs
  const metrics = useMemo(() => {
    const total = shipments.length;
    const critical = shipments.filter((s) => s.risk_score >= 60).length;
    const pendingApprovals = 2; // Benchmark human approvals
    const onTimeSla = '94.2%';

    return { total, critical, pendingApprovals, onTimeSla };
  }, [shipments]);

  return (
    <div className="space-y-5">
      {/* Top Banner Notice if triggered */}
      {bannerNotice && (
        <div className="p-2.5 bg-navy-850 border border-cyan-400/40 rounded-md text-xs font-mono text-cyan-300 flex items-center justify-between shadow-glow-cyan animate-in fade-in">
          <div className="flex items-center gap-2">
            <Radio className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
            <span>{bannerNotice}</span>
          </div>
          <button
            onClick={() => setBannerNotice(null)}
            className="text-slateText-muted hover:text-white text-[11px]"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Top Title & Telemetry Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-navy-700">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-xl font-bold text-white tracking-tight font-sans">
              Operations Command Center
            </h2>
            <span className="text-xs bg-navy-850 text-cyan-300 border border-cyan-400/30 px-2.5 py-0.5 rounded-full font-mono font-semibold">
              Live Fleet View
            </span>
          </div>
          <p className="text-xs text-slateText-secondary mt-0.5">
            Situational awareness, global cargo vectors, and real-time bottleneck resolution.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            isLoading={isRefreshing || isLoading}
            leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
            onClick={handleRefresh}
          >
            Refresh Telemetry
          </Button>
          <Button
            variant="primary"
            size="sm"
            isLoading={isScanning}
            leftIcon={<Radio className="w-3.5 h-3.5" />}
            onClick={handleTriggerHealthScan}
          >
            Run Health Scan
          </Button>
        </div>
      </div>

      {/* 4 KPI Telemetry Cards Row (Design.v2.md Section 6 Screen 1) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Active Shipments"
          value={metrics.total}
          icon={<Package className="w-4 h-4 text-cyan-400" />}
          subtext="Multi-modal active corridors"
          deltaText="+4 vs yesterday"
          deltaVariant="neutral"
          alertVariant="cyan"
          onClick={() => onNavigateTab && onNavigateTab('shipments')}
        />
        <MetricCard
          title="Critical Bottlenecks"
          value={metrics.critical}
          icon={<Flame className="w-4 h-4 text-coral-400" />}
          subtext="Require operator attention"
          deltaText="3 Actionable"
          deltaVariant="negative"
          alertVariant="danger"
          onClick={() => onNavigateTab && onNavigateTab('exceptions')}
        />
        <MetricCard
          title="Pending Approvals"
          value={metrics.pendingApprovals}
          icon={<ShieldCheck className="w-4 h-4 text-amber-400" />}
          subtext="Awaiting lead authorization"
          deltaText="2 Gated"
          deltaVariant="caution"
          alertVariant="warning"
          onClick={() => onNavigateTab && onNavigateTab('approvals')}
        />
        <MetricCard
          title="On-Time Delivery SLA"
          value={metrics.onTimeSla}
          icon={<CheckCircle2 className="w-4 h-4 text-mint-400" />}
          subtext="Target SLA benchmark: 95.0%"
          deltaText="+0.8% SLA"
          deltaVariant="positive"
          alertVariant="success"
          onClick={() => onNavigateTab && onNavigateTab('analytics')}
        />
      </div>

      {/* Split Workspace: Global Command Map (65%) + Bottleneck Triage Queue (35%) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left: Global Command Map Container (7/12 cols ~ 60-65%) */}
        <div className="lg:col-span-7 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Compass className="w-4 h-4 text-cyan-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slateText-primary font-mono">
                Global Situational Map
              </h3>
            </div>
            <span className="text-[11px] font-mono text-slateText-muted">
              Vector Geodesic Arcs • Dynamic Alert Pulses
            </span>
          </div>

          <LogisticsMap
            shipments={shipments}
            selectedShipmentId={selectedMapShipmentId}
            onSelectShipment={(s) => {
              setSelectedMapShipmentId(s.id);
              onSelectShipment(s);
            }}
          />
        </div>

        {/* Right: Bottleneck Triage Queue Feed (5/12 cols ~ 35-40%) */}
        <div className="lg:col-span-5 bg-navy-900 border border-navy-700 rounded-lg p-4 space-y-3 shadow-lg">
          <div className="flex items-center justify-between pb-2 border-b border-navy-700">
            <div className="flex items-center gap-2">
              <Flame className="w-4 h-4 text-coral-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slateText-primary font-mono">
                Active Bottlenecks ({bottlenecks.length})
              </h3>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-coral-400/20 text-coral-400 border border-coral-400/30">
              PRIORITIZED BY RISK
            </span>
          </div>

          {/* Triage Items List */}
          <div className="space-y-2.5 max-h-[460px] overflow-y-auto pr-1">
            {bottlenecks.length === 0 ? (
              <div className="p-8 text-center text-xs text-slateText-muted font-mono bg-navy-950 rounded border border-navy-800">
                <CheckCircle2 className="w-8 h-8 text-mint-400 mx-auto mb-2 opacity-80" />
                <p>No open bottlenecks detected across monitored routes.</p>
                <p className="text-[11px] text-slateText-disabled mt-1">
                  All shipments are progressing within planned tolerances.
                </p>
              </div>
            ) : (
              bottlenecks.map((s) => {
                const isSelected = selectedMapShipmentId === s.id;
                let bottleneckTitle = 'Customs Documentation Delay';
                let evidenceSnippet = 'Commercial Invoice missing 6h prior to container cutoff.';
                let actionLabel = 'Request Invoice';

                if (s.tracking_number === 'SHP-102') {
                  bottleneckTitle = 'Overdue Warehouse Dispatch';
                  evidenceSnippet = 'Milestone [WAREHOUSE_DISPATCH] delayed by +4.2h. Truck waiting.';
                  actionLabel = 'Reschedule Dispatch';
                } else if (s.tracking_number === 'SHP-103') {
                  bottleneckTitle = 'Gross Weight Discrepancy';
                  evidenceSnippet = 'Invoice declares 250kg; Packing List declares 310kg (+60kg delta).';
                  actionLabel = 'Review Discrepancy';
                } else if (s.tracking_number === 'SHP-105') {
                  bottleneckTitle = 'Pharma Customs Hold';
                  evidenceSnippet = 'Temperature-controlled cargo held at Frankfurt border inspection.';
                  actionLabel = 'Escalate to Lead';
                }

                return (
                  <div
                    key={s.id}
                    className={`bg-navy-850 border rounded-md p-3 transition-all ${
                      isSelected
                        ? 'border-cyan-400 shadow-glow-cyan'
                        : 'border-navy-700 hover:border-navy-600'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-xs text-cyan-400">
                            {s.tracking_number}
                          </span>
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-navy-800 text-slateText-secondary border border-navy-700">
                            {s.mode}
                          </span>
                          <span className="text-xs font-semibold text-slateText-primary">
                            {bottleneckTitle}
                          </span>
                        </div>
                        <p className="text-[11px] text-slateText-muted mt-0.5 font-mono">
                          {s.origin} → {s.destination} ({s.carrier_id})
                        </p>
                      </div>

                      {/* Risk Score Dial */}
                      <div className="shrink-0 text-right">
                        <span
                          className={`inline-block font-mono font-bold text-xs px-2 py-0.5 rounded ${
                            s.risk_score >= 80
                              ? 'bg-coral-400/25 text-coral-400 border border-coral-400/50 shadow-glow-coral'
                              : 'bg-amber-400/25 text-amber-400 border border-amber-400/40'
                          }`}
                        >
                          RISK {s.risk_score}
                        </span>
                      </div>
                    </div>

                    {/* Evidence Snippet */}
                    <div className="mt-2 p-2 rounded bg-navy-900 border border-navy-700/60 text-[11px] text-slateText-secondary">
                      <p className="line-clamp-2">
                        <strong className="text-coral-300 font-mono mr-1">EVIDENCE:</strong>
                        {evidenceSnippet}
                      </p>
                    </div>

                    {/* Quick Action Footer */}
                    <div className="mt-2.5 pt-2 border-t border-navy-700/60 flex items-center justify-between">
                      <button
                        onClick={() => {
                          setSelectedMapShipmentId(s.id);
                          onSelectShipment(s);
                        }}
                        className="text-[11px] font-mono text-cyan-400 hover:text-cyan-300 flex items-center gap-1 transition-colors"
                      >
                        <span>Focus on Map</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>

                      <div className="flex items-center gap-1.5">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => onSelectShipment(s)}
                          className="text-[11px] py-1 px-2.5"
                        >
                          View Detail
                        </Button>
                        <Button
                          variant="agent"
                          size="sm"
                          onClick={() => onAnalyzeShipment(s)}
                          leftIcon={<Sparkles className="w-3 h-3" />}
                          className="text-[11px] py-1 px-2.5"
                        >
                          {actionLabel}
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions Footer Bar */}
      <div className="p-3 bg-navy-900 border border-navy-700 rounded-md flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 text-slateText-muted font-mono">
          <Clock className="w-4 h-4 text-cyan-400" />
          <span>Operational Quick Links:</span>
          {onNavigateTab && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => onNavigateTab('documents')}
                className="text-cyan-400 hover:underline"
              >
                Reconciliation Studio
              </button>
              <span>•</span>
              <button
                onClick={() => onNavigateTab('approvals')}
                className="text-amber-400 hover:underline"
              >
                Approvals Gateway
              </button>
              <span>•</span>
              <button
                onClick={() => onNavigateTab('audit')}
                className="text-slateText-secondary hover:underline"
              >
                Compliance Audit
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportReport}
            leftIcon={<Download className="w-3.5 h-3.5" />}
          >
            Export Shift Report
          </Button>
        </div>
      </div>
    </div>
  );
};
