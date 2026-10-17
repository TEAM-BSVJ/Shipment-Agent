import React from 'react';
import {
  ArrowRight,
  Bot,
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
        return (
          <span title="Sea Freight">
            <Ship className="w-3.5 h-3.5 text-blue-600" />
          </span>
        );
      case 'AIR':
        return (
          <span title="Air Freight">
            <Plane className="w-3.5 h-3.5 text-sky-600" />
          </span>
        );
      case 'ROAD':
        return (
          <span title="Road Freight">
            <Truck className="w-3.5 h-3.5 text-emerald-600" />
          </span>
        );
      case 'RAIL':
        return (
          <span title="Rail Freight">
            <Train className="w-3.5 h-3.5 text-amber-600" />
          </span>
        );
      default:
        return <Truck className="w-3.5 h-3.5 text-slate-500" />;
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white border border-slate-200 rounded-md shadow-sm overflow-hidden p-4 space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-20" />
        </div>
        <Skeleton count={6} className="h-10 w-full mb-2" />
      </div>
    );
  }

  if (shipments.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-md shadow-sm p-12 text-center">
        <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400 mb-3">
          <PackageOpen className="w-6 h-6" />
        </div>
        <h4 className="text-sm font-bold text-slate-800">No shipments found</h4>
        <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
          No shipments matched your search criteria or active filters. Try resetting the filters above.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-md shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
              <th className="py-2.5 px-4">Tracking #</th>
              <th className="py-2.5 px-3">Mode</th>
              <th className="py-2.5 px-3">Origin → Destination</th>
              <th className="py-2.5 px-3">Status</th>
              <th className="py-2.5 px-3">Risk Assessment</th>
              <th className="py-2.5 px-3">Promised Delivery</th>
              <th className="py-2.5 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {shipments.map((shipment) => {
              const riskColor =
                shipment.risk_level === 'CRITICAL'
                  ? 'bg-red-500'
                  : shipment.risk_level === 'HIGH'
                  ? 'bg-orange-500'
                  : shipment.risk_level === 'MEDIUM'
                  ? 'bg-amber-500'
                  : 'bg-emerald-500';

              return (
                <tr
                  key={shipment.id}
                  className="hover:bg-slate-50/80 transition-colors group cursor-pointer"
                  onClick={() => onSelectShipment(shipment)}
                >
                  {/* Tracking Number */}
                  <td className="py-2.5 px-4 font-mono font-bold text-blue-600 group-hover:underline flex items-center gap-1.5 whitespace-nowrap">
                    {shipment.tracking_number}
                    <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </td>

                  {/* Transport Mode */}
                  <td className="py-2.5 px-3 whitespace-nowrap">
                    <div className="flex items-center gap-1.5 font-medium text-slate-700">
                      {getModeIcon(shipment.mode)}
                      <span className="capitalize text-[11px] font-sans">{shipment.mode.toLowerCase()}</span>
                    </div>
                  </td>

                  {/* Route */}
                  <td className="py-2.5 px-3 text-slate-700">
                    <div className="flex items-center gap-1.5 font-medium truncate max-w-xs">
                      <span className="truncate">{shipment.origin}</span>
                      <ArrowRight className="w-3 h-3 text-slate-400 shrink-0" />
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
                        <div className="w-12 h-1.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                          <div
                            className={`h-full ${riskColor}`}
                            style={{ width: `${Math.max(5, shipment.risk_score)}%` }}
                          />
                        </div>
                        <span className="text-slate-500 font-semibold">{shipment.risk_score}</span>
                      </div>
                    </div>
                  </td>

                  {/* Promised Delivery Date */}
                  <td className="py-2.5 px-3 text-slate-600 whitespace-nowrap">
                    <div className="flex items-center gap-1.5 font-mono text-[11px]">
                      <Calendar className="w-3 h-3 text-slate-400" />
                      <span>{shipment.promised_delivery_date}</span>
                    </div>
                  </td>

                  {/* Actions */}
                  <td className="py-2.5 px-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1.5">
                      <Button
                        variant="agent"
                        size="sm"
                        leftIcon={<Bot className="w-3.5 h-3.5" />}
                        onClick={() => onAnalyzeShipment(shipment)}
                        className="py-1 px-2 text-[11px]"
                      >
                        Diagnose
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onSelectShipment(shipment)}
                        className="py-1 px-1.5 text-slate-400 hover:text-slate-700"
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
