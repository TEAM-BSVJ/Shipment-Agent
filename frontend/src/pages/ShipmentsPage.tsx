import React, { useState, useMemo, useEffect } from 'react';
import {
  Download,
  RefreshCw,
  Ship,
  Plane,
  Truck,
  Flame,
} from 'lucide-react';
import {
  RiskLevel,
  Shipment,
  ShipmentStatus,
  TransportMode,
} from '../types';
import { shipmentService } from '../services';
import { Button } from '../components/common';
import { ShipmentFiltersBar, ShipmentTable } from '../components/dashboard';
import { BENCHMARK_SHIPMENTS } from './Dashboard';

interface ShipmentsPageProps {
  onSelectShipment: (shipment: Shipment) => void;
  onAnalyzeShipment: (shipment: Shipment) => void;
}

export const ShipmentsPage: React.FC<ShipmentsPageProps> = ({
  onSelectShipment,
  onAnalyzeShipment,
}) => {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Filters
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<ShipmentStatus | ''>('');
  const [selectedRisk, setSelectedRisk] = useState<RiskLevel | ''>('');
  const [selectedMode, setSelectedMode] = useState<TransportMode | ''>('');

  const fetchShipments = async () => {
    try {
      const res = await shipmentService.getShipments({
        status: selectedStatus || undefined,
        risk_level: selectedRisk || undefined,
        mode: selectedMode || undefined,
        search: searchTerm || undefined,
      });

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

  const handleExportCsv = () => {
    const headers = ['Tracking #', 'Mode', 'Origin', 'Destination', 'Carrier', 'Status', 'Risk Score', 'Promised Delivery'];
    const rows = filteredShipments.map((s) => [
      s.tracking_number,
      s.mode,
      `"${s.origin}"`,
      `"${s.destination}"`,
      s.carrier_id,
      s.status,
      s.risk_score,
      s.promised_delivery_date,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `AETHERIS_Shipments_Export_${new Date().toISOString().substring(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-navy-700">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-white tracking-tight font-sans">
              Shipment Explorer & Freight Inventory
            </h2>
            <span className="text-xs bg-navy-850 text-cyan-400 border border-cyan-400/30 px-2 py-0.5 rounded-full font-mono font-semibold">
              {filteredShipments.length} Active Corridors
            </span>
          </div>
          <p className="text-xs text-slateText-secondary mt-0.5">
            Searchable data grid across all international and domestic transportation modes.
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
          <Button
            variant="outline"
            size="sm"
            leftIcon={<Download className="w-3.5 h-3.5" />}
            onClick={handleExportCsv}
          >
            Export CSV
          </Button>
        </div>
      </div>

      {/* Quick Filter Counts */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-navy-900 border border-navy-700 rounded p-3 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-mono text-slateText-muted uppercase">Ocean Corridors</span>
            <p className="text-lg font-bold font-mono text-cyan-400">
              {shipments.filter((s) => s.mode === 'SEA').length} Sea
            </p>
          </div>
          <Ship className="w-5 h-5 text-cyan-400/60" />
        </div>
        <div className="bg-navy-900 border border-navy-700 rounded p-3 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-mono text-slateText-muted uppercase">Air Expedites</span>
            <p className="text-lg font-bold font-mono text-sky-400">
              {shipments.filter((s) => s.mode === 'AIR').length} Air
            </p>
          </div>
          <Plane className="w-5 h-5 text-sky-400/60" />
        </div>
        <div className="bg-navy-900 border border-navy-700 rounded p-3 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-mono text-slateText-muted uppercase">Road Logistics</span>
            <p className="text-lg font-bold font-mono text-mint-400">
              {shipments.filter((s) => s.mode === 'ROAD').length} Road
            </p>
          </div>
          <Truck className="w-5 h-5 text-mint-400/60" />
        </div>
        <div className="bg-navy-900 border border-navy-700 rounded p-3 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-mono text-slateText-muted uppercase">Critical Attention</span>
            <p className="text-lg font-bold font-mono text-coral-400">
              {shipments.filter((s) => s.risk_score >= 60).length} Blocked
            </p>
          </div>
          <Flame className="w-5 h-5 text-coral-400/70" />
        </div>
      </div>

      {/* Multi-Dimensional Filter Toolbar */}
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

      {/* Data Table */}
      <ShipmentTable
        shipments={filteredShipments}
        isLoading={isLoading}
        onSelectShipment={onSelectShipment}
        onAnalyzeShipment={onAnalyzeShipment}
      />
    </div>
  );
};
