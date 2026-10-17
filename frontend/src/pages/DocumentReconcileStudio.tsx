import React, { useState } from 'react';
import {
  FileCheck2,
  Scale,
  CheckCircle2,
  FileText,
  Send,
  Upload,
} from 'lucide-react';
import { Button } from '../components/common';
import { DocumentUploadModal } from '../components/shipment/DocumentUploadModal';

interface ReconciliationField {
  name: string;
  docAValue: string;
  docBValue: string;
  isMatch: boolean;
  delta?: string;
  notes?: string;
}

export const DocumentReconcileStudio: React.FC = () => {
  const [selectedShipment, setSelectedShipment] = useState<'SHP-101' | 'SHP-103'>('SHP-103');
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [overrideNotice, setOverrideNotice] = useState<string | null>(null);

  // Field reconciliation rows for SHP-103 (Weight Mismatch scenario)
  const shp103Fields: ReconciliationField[] = [
    {
      name: 'Invoice / Ref #',
      docAValue: 'CI-8812',
      docBValue: 'CI-8812 (Ref)',
      isMatch: true,
    },
    {
      name: 'Declared Consignee',
      docAValue: 'Global Logistics GmbH, Frankfurt',
      docBValue: 'Global Logistics GmbH, Frankfurt',
      isMatch: true,
    },
    {
      name: 'Total Gross Weight',
      docAValue: '250.0 kg',
      docBValue: '310.0 kg',
      isMatch: false,
      delta: '+60.0 kg Delta',
      notes: 'Exceeds legal customs tolerance of 0.5 kg (Pallet tare weight omitted from invoice)',
    },
    {
      name: 'Declared Item Count',
      docAValue: '12 Cartons',
      docBValue: '12 Cartons',
      isMatch: true,
    },
    {
      name: 'HS Tariff Classification',
      docAValue: '8471.30.01 (Data Processing)',
      docBValue: '8471.30.01 (Data Processing)',
      isMatch: true,
    },
    {
      name: 'Total Declared Value',
      docAValue: '$48,200.00 USD',
      docBValue: 'N/A (Non-Commercial Packing List)',
      isMatch: true,
      notes: 'Packing list excludes commercial valuation by convention',
    },
  ];

  // Field reconciliation rows for SHP-101 (Missing Invoice scenario)
  const shp101Fields: ReconciliationField[] = [
    {
      name: 'Bill of Lading #',
      docAValue: 'BOL-MAERSK-9921',
      docBValue: 'BOL-MAERSK-9921',
      isMatch: true,
    },
    {
      name: 'Commercial Invoice',
      docAValue: 'MISSING (NOT UPLOADED)',
      docBValue: 'N/A',
      isMatch: false,
      delta: 'CRITICAL OMISSION',
      notes: 'Required for export customs clearance at Mumbai Port within 24 hours',
    },
    {
      name: 'Certified Weight',
      docAValue: '4,200.0 kg',
      docBValue: '4,200.0 kg',
      isMatch: true,
    },
  ];

  const activeFields = selectedShipment === 'SHP-103' ? shp103Fields : shp101Fields;

  const handleRequestRevised = () => {
    setOverrideNotice(
      `Dispatched automated notification to shipper for ${selectedShipment}: Requested revised Packing List reflecting 250.0 kg net cargo weight.`
    );
    setTimeout(() => setOverrideNotice(null), 6000);
  };

  const handleManualOverride = () => {
    setOverrideNotice(
      `Manual Override Applied for ${selectedShipment}: Certified tare scale weight accepted. Logged in audit trail with operations lead credentials.`
    );
    setTimeout(() => setOverrideNotice(null), 6000);
  };

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-navy-700">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-xl font-bold text-white tracking-tight font-sans">
              Document Validation & Cross-Reconciliation Studio
            </h2>
            <span className="text-xs bg-navy-850 text-cyan-400 border border-cyan-400/30 px-2.5 py-0.5 rounded-full font-mono font-semibold">
              0.5 kg Tolerance Pipeline
            </span>
          </div>
          <p className="text-xs text-slateText-secondary mt-0.5">
            Automated OCR field extraction, Commercial Invoice vs. Packing List reconciliation, and discrepancy detection.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="primary"
            size="sm"
            leftIcon={<Upload className="w-3.5 h-3.5" />}
            onClick={() => setIsUploadOpen(true)}
          >
            Upload Paperwork
          </Button>
        </div>
      </div>

      {overrideNotice && (
        <div className="p-3 bg-navy-850 border border-cyan-400/40 rounded-md text-xs font-mono text-cyan-300 flex items-center justify-between shadow-glow-cyan animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-mint-400" />
            <span>{overrideNotice}</span>
          </div>
          <button
            onClick={() => setOverrideNotice(null)}
            className="text-slateText-muted hover:text-white"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Shipment Selector Bar */}
      <div className="bg-navy-900 border border-navy-700 rounded-md p-3 flex flex-wrap items-center justify-between gap-3 shadow-md">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono font-bold text-slateText-muted uppercase">
            Select Active Scenario:
          </span>
          <button
            onClick={() => setSelectedShipment('SHP-103')}
            className={`px-3 py-1.5 rounded text-xs font-mono font-bold transition-all ${
              selectedShipment === 'SHP-103'
                ? 'bg-coral-400/25 text-coral-400 border border-coral-400 shadow-glow-coral'
                : 'bg-navy-850 text-slateText-secondary border border-navy-700 hover:text-white'
            }`}
          >
            SHP-103 (Weight Mismatch Discrepancy)
          </button>
          <button
            onClick={() => setSelectedShipment('SHP-101')}
            className={`px-3 py-1.5 rounded text-xs font-mono font-bold transition-all ${
              selectedShipment === 'SHP-101'
                ? 'bg-amber-400/25 text-amber-400 border border-amber-400 shadow-glow-amber'
                : 'bg-navy-850 text-slateText-secondary border border-navy-700 hover:text-white'
            }`}
          >
            SHP-101 (Missing Commercial Invoice)
          </button>
        </div>

        <div className="text-xs font-mono text-slateText-muted">
          Reconciliation Engine: <span className="text-cyan-400">Pydantic Validator (v2)</span>
        </div>
      </div>

      {/* Side-by-Side Dual Document Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Document A */}
        <div className="bg-navy-850 border border-navy-700 rounded-md p-4 space-y-3 shadow-sm">
          <div className="flex items-center justify-between pb-2 border-b border-navy-700/60">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-cyan-400" />
              <h4 className="text-xs font-bold text-white font-mono uppercase">
                Document A: Commercial Invoice (CI-8812)
              </h4>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-mint-400/15 text-mint-400 border border-mint-400/30">
              Confidence: 94.2%
            </span>
          </div>

          <div className="p-3 rounded bg-navy-900 border border-navy-700/60 space-y-1.5 font-mono text-xs">
            <div className="flex justify-between">
              <span className="text-slateText-muted">File:</span>
              <span className="text-white">commercial_invoice_shp103.pdf</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slateText-muted">Issuer:</span>
              <span className="text-slateText-secondary">Shenzhen Electronics Corp</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slateText-muted">Declared Gross Wt:</span>
              <span className="text-cyan-400 font-bold">250.0 kg</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slateText-muted">Invoice Total:</span>
              <span className="text-mint-400 font-bold">$48,200.00 USD</span>
            </div>
          </div>
        </div>

        {/* Document B */}
        <div className="bg-navy-850 border border-navy-700 rounded-md p-4 space-y-3 shadow-sm">
          <div className="flex items-center justify-between pb-2 border-b border-navy-700/60">
            <div className="flex items-center gap-2">
              <FileCheck2 className="w-4 h-4 text-cyan-400" />
              <h4 className="text-xs font-bold text-white font-mono uppercase">
                Document B: Certified Packing List (PL-8812)
              </h4>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-mint-400/15 text-mint-400 border border-mint-400/30">
              Confidence: 91.8%
            </span>
          </div>

          <div className="p-3 rounded bg-navy-900 border border-navy-700/60 space-y-1.5 font-mono text-xs">
            <div className="flex justify-between">
              <span className="text-slateText-muted">File:</span>
              <span className="text-white">packing_list_shp103.pdf</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slateText-muted">Issuer:</span>
              <span className="text-slateText-secondary">Shenzhen Port Cargo Terminal</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slateText-muted">Certified Scale Wt:</span>
              <span className="text-coral-400 font-bold">310.0 kg</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slateText-muted">Package Units:</span>
              <span className="text-slateText-secondary">12 Palletized Cartons</span>
            </div>
          </div>
        </div>
      </div>

      {/* Field-by-Field Cross Reconciliation Diff Table */}
      <div className="bg-navy-900 border border-navy-700 rounded-md shadow-md overflow-hidden space-y-2 p-4">
        <div className="flex items-center justify-between pb-2 border-b border-navy-700">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-white font-mono flex items-center gap-2">
              <Scale className="w-4 h-4 text-cyan-400" />
              Field-by-Field Cross-Document Consistency Matrix
            </h3>
            <p className="text-[11px] text-slateText-secondary mt-0.5 font-sans">
              Automated reconciliation flags discrepancies when absolute delta exceeds 0.5 kg or consignee strings differ.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs font-mono">
            <thead>
              <tr className="bg-navy-800 border-b border-navy-700 text-slateText-muted uppercase text-[11px]">
                <th className="py-2.5 px-3">Field Name</th>
                <th className="py-2.5 px-3">Document A Value</th>
                <th className="py-2.5 px-3">Document B Value</th>
                <th className="py-2.5 px-3">Reconciliation Status</th>
                <th className="py-2.5 px-3">Discrepancy / Root Cause Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-navy-700/60 font-mono">
              {activeFields.map((field, idx) => (
                <tr
                  key={idx}
                  className={`transition-colors ${
                    !field.isMatch ? 'bg-coral-400/10 hover:bg-coral-400/15' : 'hover:bg-navy-850'
                  }`}
                >
                  <td className="py-2.5 px-3 font-bold text-white">{field.name}</td>
                  <td className="py-2.5 px-3 text-cyan-300">{field.docAValue}</td>
                  <td className="py-2.5 px-3 text-slateText-primary">{field.docBValue}</td>
                  <td className="py-2.5 px-3">
                    {field.isMatch ? (
                      <span className="px-2 py-0.5 rounded bg-mint-400/15 text-mint-400 border border-mint-400/30 text-[10px] font-bold">
                        MATCH: VALID
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded bg-coral-400/25 text-coral-400 border border-coral-400/50 text-[10px] font-bold shadow-glow-coral">
                        MISMATCH: {field.delta}
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 px-3 text-[11px] text-slateText-secondary font-sans">
                    {field.notes || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Action Controls Footer */}
        <div className="pt-3 border-t border-navy-700/60 flex flex-wrap items-center justify-between gap-3">
          <span className="text-xs text-slateText-muted font-mono">
            Requires operations coordinator verification before filing with customs.
          </span>

          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleManualOverride}
            >
              Manual Scale Weight Override
            </Button>
            <Button
              variant="agent"
              size="sm"
              onClick={handleRequestRevised}
              leftIcon={<Send className="w-3.5 h-3.5" />}
            >
              Request Revised Paperwork
            </Button>
          </div>
        </div>
      </div>

      {/* Upload Modal */}
      <DocumentUploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        shipmentId="10300000-0000-0000-0000-000000000103"
        onUploadSuccess={() => {
          setOverrideNotice('New document uploaded and queued for automated field extraction.');
        }}
      />
    </div>
  );
};
