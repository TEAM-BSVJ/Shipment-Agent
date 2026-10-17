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
    <div className="bg-white border border-slate-200 rounded-md p-4 shadow-sm space-y-3">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Search input */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by tracking #, origin, or destination..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-9 pr-8 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-sans"
          />
          {searchTerm && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Quick Risk Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mr-1 flex items-center gap-1">
            <Filter className="w-3 h-3" /> Risk:
          </span>
          {(['', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as const).map((risk) => {
            const isSelected = selectedRisk === risk;
            let label = risk || 'All';
            let activeColor = 'bg-blue-50 text-blue-700 border-blue-200';
            if (risk === 'CRITICAL') activeColor = 'bg-red-50 text-red-700 border-red-200';
            if (risk === 'HIGH') activeColor = 'bg-orange-50 text-orange-700 border-orange-200';
            if (risk === 'MEDIUM') activeColor = 'bg-amber-50 text-amber-700 border-amber-200';
            if (risk === 'LOW') activeColor = 'bg-emerald-50 text-emerald-700 border-emerald-200';

            return (
              <button
                key={risk}
                onClick={() => onRiskChange(risk)}
                className={`text-[11px] font-medium px-2 py-1 rounded border transition-all ${
                  isSelected
                    ? `${activeColor} font-bold shadow-xs`
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Secondary filter selectors (Mode & Status) */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 text-xs">
        <div className="flex flex-wrap items-center gap-3">
          {/* Transport Mode */}
          <div className="flex items-center gap-2">
            <label className="text-slate-500 font-medium">Mode:</label>
            <select
              value={selectedMode}
              onChange={(e) => onModeChange(e.target.value as TransportMode | '')}
              className="py-1 px-2 bg-slate-50 border border-slate-200 rounded text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs"
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
            <label className="text-slate-500 font-medium">Status:</label>
            <select
              value={selectedStatus}
              onChange={(e) => onStatusChange(e.target.value as ShipmentStatus | '')}
              className="py-1 px-2 bg-slate-50 border border-slate-200 rounded text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs"
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
            className="text-[11px] text-slate-500 hover:text-red-600 underline transition-colors flex items-center gap-1"
          >
            Clear all filters
          </button>
        )}
      </div>
    </div>
  );
};
