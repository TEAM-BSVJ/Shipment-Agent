import React from 'react';
import { Filter, Search, X } from 'lucide-react';
import { RiskLevel, ShipmentStatus, TransportMode } from '../../types';

interface ShipmentFiltersBarProps {
  searchTerm: string;
  onSearchChange: (val: string) => void;
  selectedStatus?: ShipmentStatus | '';
  onStatusChange: (status: ShipmentStatus | '') => void;
  selectedRisk?: RiskLevel | '';
  onRiskChange: (risk: RiskLevel | '') => void;
  selectedMode?: TransportMode | '';
  onModeChange: (mode: TransportMode | '') => void;
  onResetFilters: () => void;
}

export const ShipmentFiltersBar: React.FC<ShipmentFiltersBarProps> = ({
  searchTerm,
  onSearchChange,
  selectedStatus,
  onStatusChange,
  selectedRisk,
  onRiskChange,
  selectedMode,
  onModeChange,
  onResetFilters,
}) => {
  const hasActiveFilters = Boolean(searchTerm || selectedStatus || selectedRisk || selectedMode);

  return (
    <div className="bg-navy-900 border border-navy-700 rounded-md p-4 space-y-3 shadow-md">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Search input */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-cyan-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by tracking #, origin, destination, container, or carrier..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-9 pr-8 py-2 text-xs bg-navy-950 border border-navy-700 rounded text-slateText-primary placeholder-slateText-muted focus:outline-none focus:ring-1 focus:ring-cyan-400/40 focus:border-cyan-400 transition-all font-mono"
          />
          {searchTerm && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slateText-muted hover:text-slateText-primary"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Quick Risk Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <span className="text-[11px] font-semibold text-slateText-muted uppercase tracking-wider mr-1 flex items-center gap-1 font-mono">
            <Filter className="w-3 h-3 text-cyan-400" /> Risk:
          </span>
          {(['', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as const).map((risk) => {
            const isSelected = selectedRisk === risk;
            let label = risk || 'All';
            let activeColor = 'bg-cyan-400 text-navy-950 border-cyan-400 font-bold shadow-glow-cyan';
            if (risk === 'CRITICAL') activeColor = 'bg-coral-400/25 text-coral-400 border-coral-400 shadow-glow-coral font-bold';
            if (risk === 'HIGH') activeColor = 'bg-coral-400/20 text-coral-300 border-coral-400/60 font-bold';
            if (risk === 'MEDIUM') activeColor = 'bg-amber-400/20 text-amber-400 border-amber-400/60 font-bold';
            if (risk === 'LOW') activeColor = 'bg-mint-400/20 text-mint-400 border-mint-400/60 font-bold';

            return (
              <button
                key={risk}
                onClick={() => onRiskChange(risk)}
                className={`text-[11px] font-mono px-2.5 py-1 rounded border transition-all ${
                  isSelected
                    ? activeColor
                    : 'bg-navy-850 text-slateText-secondary border-navy-700 hover:bg-navy-800 hover:text-slateText-primary'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Secondary filter selectors (Mode & Status) */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-navy-700/60 text-xs">
        <div className="flex flex-wrap items-center gap-3">
          {/* Transport Mode */}
          <div className="flex items-center gap-2">
            <label className="text-slateText-muted font-medium font-mono text-[11px]">Mode:</label>
            <select
              value={selectedMode}
              onChange={(e) => onModeChange(e.target.value as TransportMode | '')}
              className="py-1 px-2.5 bg-navy-850 border border-navy-700 rounded text-slateText-primary focus:outline-none focus:border-cyan-400 text-xs font-mono"
            >
              <option value="">All Modes</option>
              <option value="SEA">Sea Freight</option>
              <option value="AIR">Air Freight</option>
              <option value="ROAD">Road Freight</option>
              <option value="RAIL">Rail Freight</option>
            </select>
          </div>

          {/* Shipment Status */}
          <div className="flex items-center gap-2">
            <label className="text-slateText-muted font-medium font-mono text-[11px]">Status:</label>
            <select
              value={selectedStatus}
              onChange={(e) => onStatusChange(e.target.value as ShipmentStatus | '')}
              className="py-1 px-2.5 bg-navy-850 border border-navy-700 rounded text-slateText-primary focus:outline-none focus:border-cyan-400 text-xs font-mono"
            >
              <option value="">All Statuses</option>
              <option value="BOOKED">Booked</option>
              <option value="IN_TRANSIT">In Transit</option>
              <option value="AT_WAREHOUSE">At Warehouse</option>
              <option value="CUSTOMS_HOLD">Customs Hold</option>
              <option value="EXCEPTION">Exception</option>
              <option value="DELIVERED">Delivered</option>
            </select>
          </div>
        </div>

        {hasActiveFilters && (
          <button
            onClick={onResetFilters}
            className="text-[11px] font-mono text-cyan-400 hover:text-cyan-300 underline transition-colors flex items-center gap-1"
          >
            Clear all filters
          </button>
        )}
      </div>
    </div>
  );
};
