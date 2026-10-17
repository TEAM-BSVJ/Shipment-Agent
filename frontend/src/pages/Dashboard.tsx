import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Package,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
} from 'lucide-react';
import {
  RiskLevel,
  Shipment,
  ShipmentStatus,
  TransportMode,
} from '../types';
import { shipmentService } from '../services';
import { Button, MetricCard } from '../components/common';
import { ShipmentFiltersBar, ShipmentTable } from '../components/dashboard';

interface DashboardProps {
  onSelectShipment: (shipment: Shipment) => void;
  onAnalyzeShipment: (shipment: Shipment) => void;
}

// Fallback benchmark freight scenarios (SHP-101 to SHP-105 from seed_db.py)
const BENCHMARK_SHIPMENTS: Shipment[] = [
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
}) => {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<ShipmentStatus | ''>('');
  const [selectedRisk, setSelectedRisk] = useState<RiskLevel | ''>('');
  const [selectedMode, setSelectedMode] = useState<TransportMode | ''>('');

  const fetchShipments = async () => {
    try {
      setErrorMessage(null);
      const res = await shipmentService.getShipments({
        status: selectedStatus || undefined,
        risk_level: selectedRisk || undefined,
        mode: selectedMode || undefined,
        search: searchTerm || undefined,
      });

      if (res.data && res.data.length > 0) {
        setShipments(res.data);
      } else {
        // Use seeded benchmarks if the live DB has not been seeded yet
        setShipments(BENCHMARK_SHIPMENTS);
      }
    } catch {
      // Graceful fallback to seeded benchmark scenarios if FastAPI is offline
      setShipments(BENCHMARK_SHIPMENTS);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchShipments();
  }, [selectedStatus, selectedRisk, selectedMode]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchShipments();
  };

  const handleResetFilters = () => {
    setSearchTerm('');
    setSelectedStatus('');
    setSelectedRisk('');
    setSelectedMode('');
  };

  // Client-side search filtering over retrieved items
  const filteredShipments = useMemo(() => {
    return shipments.filter((item) => {
      if (searchTerm) {
        const query = searchTerm.toLowerCase();
        const matchesTracking = item.tracking_number.toLowerCase().includes(query);
        const matchesOrigin = item.origin.toLowerCase().includes(query);
        const matchesDest = item.destination.toLowerCase().includes(query);
        const matchesCarrier = (item.carrier_id || '').toLowerCase().includes(query);
        if (!matchesTracking && !matchesOrigin && !matchesDest && !matchesCarrier) {
          return false;
        }
      }
      if (selectedStatus && item.status !== selectedStatus) return false;
      if (selectedRisk && item.risk_level !== selectedRisk) return false;
      if (selectedMode && item.mode !== selectedMode) return false;
      return true;
    });
  }, [shipments, searchTerm, selectedStatus, selectedRisk, selectedMode]);

  // Dynamic KPI Metrics
  const metrics = useMemo(() => {
    const total = shipments.length;
    const critical = shipments.filter((s) => s.risk_level === 'CRITICAL' || s.risk_level === 'HIGH').length;
    const customsOrHold = shipments.filter(
      (s) => s.status === 'CUSTOMS_HOLD' || s.status === 'EXCEPTION' || s.status === 'AT_WAREHOUSE'
    ).length;
    const healthy = shipments.filter((s) => s.risk_level === 'LOW' || s.status === 'DELIVERED').length;

    return { total, critical, customsOrHold, healthy };
  }, [shipments]);

  return (
    <div className="space-y-6">
      {/* Top Title & Refresh Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              Shipments Operational Dashboard
            </h2>
            <span className="text-xs bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full font-mono font-semibold">
              {filteredShipments.length} Monitored
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Real-time status tracking, explainable risk scores, and autonomous bottleneck diagnosis.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            isLoading={isRefreshing}
            leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
            onClick={handleRefresh}
          >
            Refresh
          </Button>
        </div>
      </div>

      {errorMessage && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md text-xs text-red-700 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* KPI Summary Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Active Shipments"
          value={metrics.total}
          icon={<Package className="w-4 h-4 text-blue-600" />}
          subtext="Multi-modal freight corridors"
          alertVariant="neutral"
        />
        <MetricCard
          title="Elevated Risk"
          value={metrics.critical}
          icon={<ShieldAlert className="w-4 h-4 text-red-600" />}
          subtext="Critical & High risk bottlenecks"
          alertVariant="danger"
        />
        <MetricCard
          title="Exceptions & Holds"
          value={metrics.customsOrHold}
          icon={<ShieldCheck className="w-4 h-4 text-amber-600" />}
          subtext="Paperwork & dispatch delays"
          alertVariant="warning"
        />
        <MetricCard
          title="On-Schedule Baseline"
          value={metrics.healthy}
          icon={<CheckCircle2 className="w-4 h-4 text-emerald-600" />}
          subtext="Milestones operating normally"
          alertVariant="success"
        />
      </div>

      {/* Search & Filter Toolbar */}
      <ShipmentFiltersBar
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        selectedStatus={selectedStatus}
        onStatusChange={setSelectedStatus}
        selectedRisk={selectedRisk}
        onRiskChange={setSelectedRisk}
        selectedMode={selectedMode}
        onModeChange={setSelectedMode}
        onResetFilters={handleResetFilters}
      />

      {/* High-Density Shipment Table */}
      <ShipmentTable
        shipments={filteredShipments}
        isLoading={isLoading}
        onSelectShipment={onSelectShipment}
        onAnalyzeShipment={onAnalyzeShipment}
      />
    </div>
  );
};
