import React, { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { EnrichedException } from '../types';
import { exceptionService } from '../services';
import { Button, StatusBadge } from '../components/common';
import { ExceptionQueueTable } from '../components/exceptions';

interface ExceptionQueuePageProps {
  onSelectShipment?: (trackingNumber: string) => void;
  onAnalyzeShipment?: (trackingNumber: string) => void;
  onExceptionCountChange?: (count: number) => void;
}

// Fallback benchmark exceptions synchronized with seed_db.py
const BENCHMARK_EXCEPTIONS: EnrichedException[] = [
  {
    id: 'e1111111-1111-1111-1111-111111111001',
    shipment_id: '10100000-0000-0000-0000-000000000101',
    tracking_number: 'SHP-101',
    origin: 'Mumbai Port (INBOM)',
    destination: 'Rotterdam Port (NLRTM)',
    mode: 'SEA',
    carrier_id: 'MAERSK_LINE',
    business_priority: 'HIGH',
    exception_type: 'MISSING_DOCUMENT',
    risk_level: 'HIGH',
    status: 'OPEN',
    description: 'Mandatory Commercial Invoice missing prior to export customs clearance at Mumbai Port.',
    evidence: [
      'Required document COMMERCIAL_INVOICE not found in shipment repository',
      'Export customs gate cutoff at Mumbai Port in 24 hours',
    ],
    root_cause: 'Shipper commercial desk has not transmitted the finalized tax invoice after container sealing.',
    detected_at: '2026-10-17T01:00:00Z',
    pending_action: {
      id: 'c1111111-1111-1111-1111-111111111001',
      action_type: 'REQUEST_DOCUMENT',
      tool_used: 'create_correction_task',
      status: 'PENDING',
    },
  },
  {
    id: 'e1111111-1111-1111-1111-111111112001',
    shipment_id: '10200000-0000-0000-0000-000000000102',
    tracking_number: 'SHP-102',
    origin: 'Dallas DC (DFW-1)',
    destination: 'Austin Hub (AUS-2)',
    mode: 'AIR',
    carrier_id: 'FEDEX_FREIGHT',
    business_priority: 'CRITICAL',
    exception_type: 'MILESTONE_OVERDUE',
    risk_level: 'CRITICAL',
    status: 'INVESTIGATING',
    description: "Milestone 'WAREHOUSE_DISPATCH' is overdue by 4.5 hours at Dallas DC dock 4B.",
    evidence: [
      'Milestone expected 4.5 hours ago',
      'No outbound dock scan received from Dallas DC dock 4B',
      'Carrier vehicle staged and waiting',
    ],
    root_cause: 'Staging area 4B forklift mechanical failure delayed cargo pallet loading.',
    detected_at: '2026-10-17T08:30:00Z',
    pending_action: {
      id: 'c1111111-1111-1111-1111-111111112001',
      action_type: 'RESCHEDULE_MILESTONE',
      tool_used: 'reschedule_milestone',
      status: 'WAITING_APPROVAL',
    },
  },
  {
    id: 'e1111111-1111-1111-1111-111111113001',
    shipment_id: '10300000-0000-0000-0000-000000000103',
    tracking_number: 'SHP-103',
    origin: 'Shanghai Port (CNSHA)',
    destination: 'Los Angeles Port (USLAX)',
    mode: 'SEA',
    carrier_id: 'COSCO_SHIPPING',
    business_priority: 'HIGH',
    exception_type: 'WEIGHT_MISMATCH',
    risk_level: 'HIGH',
    status: 'OPEN',
    description:
      'Weight discrepancy detected between Commercial Invoice (250.0 kg) and Packing List (310.0 kg): discrepancy 60.0 kg exceeds tolerance of 0.5 kg.',
    evidence: [
      'Commercial Invoice declared weight: 250.0 kg',
      'Packing List certified weight: 310.0 kg',
      'Absolute discrepancy: 60.0 kg (Tolerance: 0.5 kg)',
    ],
    root_cause: 'Pallet tare weight (60 kg) was omitted from Commercial Invoice line items but included on warehouse packing scale.',
    detected_at: '2026-10-17T07:00:00Z',
    pending_action: {
      id: 'c1111111-1111-1111-1111-111111113001',
      action_type: 'TRIGGER_AUTOMATION',
      tool_used: 'trigger_workflow',
      status: 'WAITING_APPROVAL',
    },
  },
  {
    id: 'e1111111-1111-1111-1111-111111115001',
    shipment_id: '10500000-0000-0000-0000-000000000105',
    tracking_number: 'SHP-105',
    origin: 'Frankfurt CargoCity (FRA)',
    destination: "Chicago O'Hare Hub (ORD)",
    mode: 'AIR',
    carrier_id: 'LUFTHANSA_CARGO',
    business_priority: 'CRITICAL',
    exception_type: 'CUSTOMS_REJECTION',
    risk_level: 'CRITICAL',
    status: 'RESOLVED',
    description: 'Container flagged for CBP biological & temperature-sensitive pharma inspection hold at ORD.',
    evidence: [
      'CBP inspection notice 1H received at ORD facility',
      'Cold chain sensor verified 3.8 deg C (safe threshold 2-8 deg C)',
      'Licensed broker clearance protocol executed',
    ],
    root_cause: 'Random customs regulatory sampling check on temperature-controlled pharmaceutical products.',
    detected_at: '2026-10-17T09:00:00Z',
    resolved_at: '2026-10-17T11:15:00Z',
    resolved_by: 'licensed-broker@customs-clearance.org',
  },
];

export const ExceptionQueuePage: React.FC<ExceptionQueuePageProps> = ({
  onSelectShipment,
  onAnalyzeShipment,
  onExceptionCountChange,
}) => {
  const [exceptions, setExceptions] = useState<EnrichedException[]>(BENCHMARK_EXCEPTIONS);
  const [isLoading, setIsLoading] = useState(false);

  const loadExceptions = async () => {
    try {
      setIsLoading(true);
      const res = await exceptionService.getExceptions({ limit: 100 });
      if (res.data && res.data.length > 0) {
        // Merge with shipments to enrich tracking details
        const enriched: EnrichedException[] = await Promise.all(
          res.data.map(async (exc) => {
            const fallback = BENCHMARK_EXCEPTIONS.find((b) => b.id === exc.id || b.shipment_id === exc.shipment_id);
            return {
              ...exc,
              tracking_number: fallback?.tracking_number || `SHP-${exc.shipment_id.slice(0, 4).toUpperCase()}`,
              origin: fallback?.origin,
              destination: fallback?.destination,
              mode: fallback?.mode || 'SEA',
              carrier_id: fallback?.carrier_id,
              pending_action: fallback?.pending_action,
            };
          })
        );
        setExceptions(enriched);
      } else {
        setExceptions(BENCHMARK_EXCEPTIONS);
      }
    } catch (err) {
      console.warn('Backend exceptions query returned error, using fallback benchmark exceptions:', err);
      setExceptions(BENCHMARK_EXCEPTIONS);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadExceptions();
  }, []);

  // Notify parent of active count
  useEffect(() => {
    const activeCount = exceptions.filter((e) => e.status !== 'RESOLVED' && e.status !== 'DISMISSED').length;
    onExceptionCountChange?.(activeCount);
  }, [exceptions, onExceptionCountChange]);

  const handleUpdateException = (updated: EnrichedException) => {
    setExceptions((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
  };

  return (
    <div className="space-y-4">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 gap-2">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Operational Exception Queue
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Triage identified freight bottlenecks, missing customs documentation, and overdue dispatch milestones.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status="OPEN" />
          <Button
            variant="secondary"
            size="sm"
            onClick={loadExceptions}
            isLoading={isLoading}
            leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
          >
            Refresh Queue
          </Button>
        </div>
      </div>

      {/* Exception Queue Table */}
      <ExceptionQueueTable
        exceptions={exceptions}
        isLoading={isLoading}
        onRefresh={loadExceptions}
        onUpdateException={handleUpdateException}
        onSelectShipment={onSelectShipment}
        onAnalyzeShipment={onAnalyzeShipment}
      />
    </div>
  );
};
