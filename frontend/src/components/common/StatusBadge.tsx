import React from 'react';
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Clock,
  FileCheck,
  FileWarning,
  HelpCircle,
  Package,
  ShieldAlert,
  Truck,
  XCircle,
} from 'lucide-react';
import {
  ApprovalDecision,
  DocumentValidationStatus,
  ExceptionStatus,
  RiskLevel,
  ShipmentStatus,
} from '../../types';

interface StatusBadgeProps {
  status:
    | RiskLevel
    | ShipmentStatus
    | ExceptionStatus
    | ApprovalDecision
    | DocumentValidationStatus
    | string;
  size?: 'sm' | 'md';
  className?: string;
  showIcon?: boolean;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  size = 'md',
  className = '',
  showIcon = true,
}) => {
  const normStatus = (status || '').toUpperCase();

  let styles = 'bg-slate-100 text-slate-700 border-slate-200';
  let icon: React.ReactNode = <HelpCircle className="w-3 h-3" />;
  let label: string = status;

  switch (normStatus) {
    // Risk Levels
    case 'CRITICAL':
      styles = 'bg-red-50 text-red-700 border-red-200';
      icon = <ShieldAlert className="w-3 h-3 text-red-600" />;
      label = 'Critical Risk';
      break;
    case 'HIGH':
      styles = 'bg-orange-50 text-orange-700 border-orange-200';
      icon = <AlertTriangle className="w-3 h-3 text-orange-600" />;
      label = 'High Risk';
      break;
    case 'MEDIUM':
      styles = 'bg-amber-50 text-amber-700 border-amber-200';
      icon = <Clock className="w-3 h-3 text-amber-600" />;
      label = 'Medium Risk';
      break;
    case 'LOW':
      styles = 'bg-emerald-50 text-emerald-700 border-emerald-200';
      icon = <CheckCircle2 className="w-3 h-3 text-emerald-600" />;
      label = 'Low Risk';
      break;

    // Shipment Statuses
    case 'BOOKED':
      styles = 'bg-blue-50 text-blue-700 border-blue-200';
      icon = <Package className="w-3 h-3 text-blue-600" />;
      label = 'Booked';
      break;
    case 'PICKED_UP':
    case 'IN_TRANSIT':
    case 'OUT_FOR_DELIVERY':
      styles = 'bg-sky-50 text-sky-700 border-sky-200';
      icon = <Truck className="w-3 h-3 text-sky-600" />;
      label = normStatus.replace(/_/g, ' ');
      break;
    case 'AT_WAREHOUSE':
      styles = 'bg-indigo-50 text-indigo-700 border-indigo-200';
      icon = <Clock className="w-3 h-3 text-indigo-600" />;
      label = 'At Warehouse';
      break;
    case 'CUSTOMS_HOLD':
    case 'EXCEPTION':
      styles = 'bg-red-50 text-red-700 border-red-200';
      icon = <AlertCircle className="w-3 h-3 text-red-600" />;
      label = normStatus.replace(/_/g, ' ');
      break;
    case 'DELIVERED':
    case 'APPROVED':
    case 'RESOLVED':
    case 'VALIDATED':
      styles = 'bg-emerald-50 text-emerald-700 border-emerald-200';
      icon = <CheckCircle2 className="w-3 h-3 text-emerald-600" />;
      label = normStatus === 'APPROVED' ? 'Approved' : normStatus === 'RESOLVED' ? 'Resolved' : normStatus === 'VALIDATED' ? 'Validated' : 'Delivered';
      break;
    case 'CANCELLED':
    case 'DISMISSED':
    case 'REJECTED':
      styles = 'bg-slate-100 text-slate-600 border-slate-300';
      icon = <XCircle className="w-3 h-3 text-slate-500" />;
      label = normStatus === 'REJECTED' ? 'Rejected' : normStatus === 'DISMISSED' ? 'Dismissed' : 'Cancelled';
      break;
    case 'OPEN':
      styles = 'bg-red-50 text-red-700 border-red-200 animate-pulse';
      icon = <AlertCircle className="w-3 h-3 text-red-600" />;
      label = 'Open';
      break;
    case 'PENDING':
    case 'PENDING_APPROVAL':
    case 'INVESTIGATING':
    case 'IN_PROGRESS':
      styles = 'bg-amber-50 text-amber-700 border-amber-200';
      icon = <Clock className="w-3 h-3 text-amber-600" />;
      label = normStatus.replace(/_/g, ' ');
      break;
    case 'FLAGGED':
      styles = 'bg-rose-50 text-rose-700 border-rose-200';
      icon = <FileWarning className="w-3 h-3 text-rose-600" />;
      label = 'Flagged';
      break;
    default:
      label = normStatus.replace(/_/g, ' ');
      icon = <FileCheck className="w-3 h-3 text-slate-500" />;
  }

  const sizeClasses =
    size === 'sm'
      ? 'text-[11px] px-2 py-0.5 gap-1'
      : 'text-xs px-2.5 py-1 gap-1.5 font-medium';

  return (
    <span
      className={`inline-flex items-center rounded-full border ${sizeClasses} ${styles} font-medium tracking-tight whitespace-nowrap ${className}`}
    >
      {showIcon && icon}
      <span className="capitalize">{label}</span>
    </span>
  );
};
