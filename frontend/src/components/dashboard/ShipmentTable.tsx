import React from 'react';
import {
  ArrowRight,
  Sparkles,
  Calendar,
  ChevronRight,
  ExternalLink,
  PackageOpen,
  Plane,
  Ship,
  Train,
  Truck,
} from 'lucide-react';
import { Shipment, TransportMode } from '../../types';
import { Button, Skeleton, StatusBadge } from '../common';

interface ShipmentTableProps {
  shipments: Shipment[];
  isLoading: boolean;
  onSelectShipment: (shipment: Shipment) => void;
  onAnalyzeShipment: (shipment: Shipment) => void;
}

export const ShipmentTable: React.FC<ShipmentTableProps> = ({
  shipments,
  isLoading,
  onSelectShipment,
  onAnalyzeShipment,
}) => {
  const getModeIcon = (mode: TransportMode) => {
    switch (mode) {
      case 'SEA':
        return <Ship className="w-3.5 h-3.5 text-cyan-400" />;
      case 'AIR':
        return <Plane className="w-3.5 h-3.5 text-sky-400" />;
      case 'ROAD':
        return <Truck className="w-3.5 h-3.5 text-mint-400" />;
      case 'RAIL':
        return <Train className="w-3.5 h-3.5 text-amber-400" />;
      default:
        return <Truck className="w-3.5 h-3.5 text-slateText-muted" />;
    }
  };

  if (isLoading) {
    return (
      <div className="bg-navy-900 border border-navy-700 rounded-md shadow-sm overflow-hidden p-4 space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-navy-800">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-20" />
        </div>
        <Skeleton count={6} className="h-10 w-full mb-2" />
      </div>
    );
  }

  if (shipments.length === 0) {
    return (
      <div className="bg-navy-900 border border-navy-700 rounded-md shadow-sm p-12 text-center">
        <div className="w-12 h-12 rounded-full bg-navy-850 border border-navy-700 flex items-center justify-center mx-auto text-slateText-muted mb-3">
          <PackageOpen className="w-6 h-6 text-cyan-400" />
        </div>
        <h4 className="text-sm font-bold text-slateText-primary">No freight records found</h4>
        <p className="text-xs text-slateText-secondary max-w-sm mx-auto mt-1">
          No active shipments matched your search criteria or active filters. Try clearing or adjusting the filters above.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-navy-900 border border-navy-700 rounded-md shadow-md overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-navy-800/90 border-b border-navy-700 text-slateText-muted font-mono font-semibold uppercase tracking-wider text-[11px]">
              <th className="py-2.5 px-4">Tracking #</th>
              <th className="py-2.5 px-3">Mode</th>
              <th className="py-2.5 px-3">Origin → Destination</th>
              <th className="py-2.5 px-3">Status</th>
              <th className="py-2.5 px-3">Risk Assessment</th>
              <th className="py-2.5 px-3">Promised Delivery</th>
              <th className="py-2.5 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-navy-700/60 font-sans">
            {shipments.map((shipment) => {
              const isCritical = shipment.risk_score >= 60;
              const isWarning = shipment.risk_score >= 31 && shipment.risk_score < 60;
              const riskBarColor = isCritical ? 'bg-coral-400' : isWarning ? 'bg-amber-400' : 'bg-mint-400';

              return (
                <tr
                  key={shipment.id}
                  className="hover:bg-navy-850 transition-colors group cursor-pointer"
                  onClick={() => onSelectShipment(shipment)}
                >
                  {/* Tracking Number */}
                  <td className="py-2.5 px-4 font-mono font-bold text-cyan-400 group-hover:text-cyan-300 group-hover:underline flex items-center gap-1.5 whitespace-nowrap">
                    {shipment.tracking_number}
                    <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </td>

                  {/* Transport Mode */}
                  <td className="py-2.5 px-3 whitespace-nowrap">
                    <div className="flex items-center gap-1.5 font-medium text-slateText-primary font-mono">
                      {getModeIcon(shipment.mode)}
                      <span className="capitalize text-[11px]">{shipment.mode}</span>
                    </div>
                  </td>

                  {/* Route */}
                  <td className="py-2.5 px-3 text-slateText-secondary font-mono">
                    <div className="flex items-center gap-1.5 font-medium truncate max-w-xs">
                      <span className="truncate">{shipment.origin}</span>
                      <ArrowRight className="w-3 h-3 text-cyan-400/60 shrink-0" />
                      <span className="truncate">{shipment.destination}</span>
                    </div>
                  </td>

                  {/* Status */}
                  <td className="py-2.5 px-3 whitespace-nowrap">
                    <StatusBadge status={shipment.status} size="sm" />
                  </td>

                  {/* Risk Score & Progress */}
                  <td className="py-2.5 px-3 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <StatusBadge status={shipment.risk_level} size="sm" />
                      <div className="flex items-center gap-1 font-mono text-[11px]">
                        <div className="w-12 h-1.5 bg-navy-950 rounded-full overflow-hidden border border-navy-700">
                          <div
                            className={`h-full ${riskBarColor}`}
                            style={{ width: `${Math.max(5, shipment.risk_score)}%` }}
                          />
                        </div>
                        <span className={`font-semibold tabular-nums ${isCritical ? 'text-coral-400' : 'text-slateText-secondary'}`}>
                          {shipment.risk_score}
                        </span>
                      </div>
                    </div>
                  </td>

                  {/* Promised Delivery Date */}
                  <td className="py-2.5 px-3 text-slateText-secondary whitespace-nowrap">
                    <div className="flex items-center gap-1.5 font-mono text-[11px]">
                      <Calendar className="w-3 h-3 text-slateText-muted" />
                      <span>{shipment.promised_delivery_date}</span>
                    </div>
                  </td>

                  {/* Actions */}
                  <td className="py-2.5 px-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1.5">
                      <Button
                        variant="agent"
                        size="sm"
                        leftIcon={<Sparkles className="w-3 h-3" />}
                        onClick={() => onAnalyzeShipment(shipment)}
                        className="py-1 px-2 text-[11px]"
                      >
                        Diagnose
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onSelectShipment(shipment)}
                        className="py-1 px-1.5 text-slateText-muted hover:text-cyan-400"
                        title="View Details"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
