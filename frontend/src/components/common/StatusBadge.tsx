import React from 'react';
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Compass,
  FileCheck,
  FileWarning,
  Flame,
  HelpCircle,
  Package,
  PackageCheck,
  Sparkles,
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

  let styles = 'bg-navy-800 text-slateText-secondary border-navy-700';
  let icon: React.ReactNode = <HelpCircle className="w-3 h-3 text-slateText-muted" />;
  let label: string = status;

  switch (normStatus) {
    // Risk Levels (Design.v2.md Section 7.2)
    case 'CRITICAL':
      styles = 'bg-coral-400/20 text-coral-400 border-coral-400/50 shadow-[0_0_8px_rgba(255,93,115,0.2)]';
      icon = <Flame className="w-3 h-3 text-coral-400 animate-pulse" />;
      label = 'Critical Risk';
      break;
    case 'HIGH':
      styles = 'bg-coral-400/15 text-coral-300 border-coral-400/40';
      icon = <AlertTriangle className="w-3 h-3 text-coral-300" />;
      label = 'High Risk';
      break;
    case 'MEDIUM':
      styles = 'bg-amber-400/15 text-amber-400 border-amber-400/40';
      icon = <Clock className="w-3 h-3 text-amber-400" />;
      label = 'Medium Risk';
      break;
    case 'LOW':
      styles = 'bg-mint-400/15 text-mint-400 border-mint-400/40';
      icon = <CheckCircle2 className="w-3 h-3 text-mint-400" />;
      label = 'Low Risk';
      break;

    // Shipment Statuses
    case 'BOOKED':
      styles = 'bg-cyan-400/15 text-cyan-400 border-cyan-400/30';
      icon = <Package className="w-3 h-3 text-cyan-400" />;
      label = 'Booked';
      break;
    case 'PICKED_UP':
    case 'IN_TRANSIT':
    case 'OUT_FOR_DELIVERY':
      styles = 'bg-cyan-400/20 text-cyan-300 border-cyan-400/40';
      icon = <Compass className="w-3 h-3 text-cyan-300 animate-spin-slow" />;
      label = normStatus.replace(/_/g, ' ');
      break;
    case 'AT_WAREHOUSE':
      styles = 'bg-violet-400/15 text-violet-300 border-violet-400/30';
      icon = <Clock className="w-3 h-3 text-violet-300" />;
      label = 'At Warehouse';
      break;
    case 'CUSTOMS_HOLD':
    case 'EXCEPTION':
      styles = 'bg-coral-400/20 text-coral-400 border-coral-400/50';
      icon = <AlertCircle className="w-3 h-3 text-coral-400" />;
      label = normStatus.replace(/_/g, ' ');
      break;
    case 'DELIVERED':
    case 'APPROVED':
    case 'RESOLVED':
    case 'VALIDATED':
      styles = 'bg-mint-400/20 text-mint-400 border-mint-400/40';
      icon = <PackageCheck className="w-3 h-3 text-mint-400" />;
      label =
        normStatus === 'APPROVED'
          ? 'Approved'
          : normStatus === 'RESOLVED'
          ? 'Resolved'
          : normStatus === 'VALIDATED'
          ? 'Validated'
          : 'Delivered';
      break;
    case 'CANCELLED':
    case 'DISMISSED':
    case 'REJECTED':
      styles = 'bg-navy-800 text-slateText-disabled border-navy-700';
      icon = <XCircle className="w-3 h-3 text-slateText-disabled" />;
      label =
        normStatus === 'REJECTED'
          ? 'Rejected'
          : normStatus === 'DISMISSED'
          ? 'Dismissed'
          : 'Cancelled';
      break;
    case 'OPEN':
      styles = 'bg-coral-400/25 text-coral-400 border-coral-400/60 animate-pulse';
      icon = <AlertCircle className="w-3 h-3 text-coral-400" />;
      label = 'Open Bottleneck';
      break;
    case 'PENDING':
    case 'PENDING_APPROVAL':
    case 'INVESTIGATING':
    case 'IN_PROGRESS':
      styles = 'bg-amber-400/15 text-amber-400 border-amber-400/30';
      icon = <Clock className="w-3 h-3 text-amber-400" />;
      label = normStatus.replace(/_/g, ' ');
      break;
    case 'FLAGGED':
      styles = 'bg-coral-400/15 text-coral-300 border-coral-400/40';
      icon = <FileWarning className="w-3 h-3 text-coral-300" />;
      label = 'Discrepancy Flagged';
      break;
    case 'AI_DIAGNOSED':
      styles = 'bg-violet-400/20 text-violet-300 border-violet-400/40 shadow-[0_0_8px_rgba(185,160,255,0.25)]';
      icon = <Sparkles className="w-3 h-3 text-violet-300" />;
      label = 'AI Diagnosed';
      break;
    default:
      label = normStatus.replace(/_/g, ' ');
      icon = <FileCheck className="w-3 h-3 text-slateText-muted" />;
  }

  const sizeClasses =
    size === 'sm'
      ? 'text-[11px] px-2 py-0.5 gap-1'
      : 'text-xs px-2.5 py-1 gap-1.5 font-medium';

  return (
    <span
      className={`inline-flex items-center rounded-full border ${sizeClasses} ${styles} font-medium tracking-tight whitespace-nowrap transition-colors ${className}`}
    >
      {showIcon && icon}
      <span>{label}</span>
    </span>
  );
};
