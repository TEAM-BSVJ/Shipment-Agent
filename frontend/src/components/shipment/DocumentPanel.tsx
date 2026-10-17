import React, { useState } from 'react';
import {
  AlertTriangle,
  FileCheck,
  FileText,
  FileWarning,
  Plus,
  RefreshCw,
  Scale,
} from 'lucide-react';
import { ShipmentDocument } from '../../types';
import { documentService } from '../../services';
import { Button, StatusBadge } from '../common';
import { DocumentUploadModal } from './DocumentUploadModal';

interface DocumentPanelProps {
  shipmentId: string;
  documents: ShipmentDocument[];
  onDocumentAdded: (doc: ShipmentDocument) => void;
  onRefresh: () => void;
}

export const DocumentPanel: React.FC<DocumentPanelProps> = ({
  shipmentId,
  documents,
  onDocumentAdded,
  onRefresh,
}) => {
  const [isUploadOpen, setIsUploadOpen] = useState<boolean>(false);
  const [extractingId, setExtractingId] = useState<string | null>(null);

  const handleExtract = async (docId: string) => {
    setExtractingId(docId);
    try {
      await documentService.extractDocument(docId);
      onRefresh();
    } catch (err) {
      console.error('Document extraction failed:', err);
    } finally {
      setExtractingId(null);
    }
  };

  // Cross-document weight comparison
  const invoiceDoc = documents.find((d) => d.document_type === 'COMMERCIAL_INVOICE');
  const packingDoc = documents.find((d) => d.document_type === 'PACKING_LIST');
  const invoiceWeight = invoiceDoc?.extracted_fields?.total_weight_kg;
  const packingWeight = packingDoc?.extracted_fields?.total_weight_kg;

  const hasWeightDiscrepancy =
    invoiceWeight !== undefined &&
    invoiceWeight !== null &&
    packingWeight !== undefined &&
    packingWeight !== null &&
    Math.abs(invoiceWeight - packingWeight) > 0.5;

  const weightDelta =
    hasWeightDiscrepancy && invoiceWeight && packingWeight
      ? (invoiceWeight - packingWeight).toFixed(2)
      : null;

  return (
    <div className="space-y-4">
      {/* Header with Upload Action */}
      <div className="flex items-center justify-between pb-3 border-b border-navy-700">
        <div>
          <h4 className="text-sm font-bold text-white flex items-center gap-2 font-mono">
            <FileText className="w-4 h-4 text-cyan-400" />
            Shipping Paperwork & Customs Filings
          </h4>
          <p className="text-xs text-slateText-secondary mt-0.5">
            Deterministic field extraction and cross-document reconciliation (0.5 kg threshold).
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          leftIcon={<Plus className="w-3.5 h-3.5" />}
          onClick={() => setIsUploadOpen(true)}
        >
          Upload Document
        </Button>
      </div>

      {/* Discrepancy Alert Banner */}
      {hasWeightDiscrepancy && (
        <div className="p-3.5 bg-coral-400/20 border border-coral-400/50 rounded-md text-xs text-coral-300 space-y-1 shadow-glow-coral animate-in fade-in">
          <div className="flex items-center gap-2 font-bold text-coral-400 font-mono">
            <AlertTriangle className="w-4 h-4 text-coral-400 shrink-0" />
            <span>WEIGHT MISMATCH DISCREPANCY DETECTED</span>
          </div>
          <p className="text-[11px] text-coral-200">
            Commercial Invoice declares <span className="font-mono font-bold text-white">{invoiceWeight} kg</span>, but Packing List specifies <span className="font-mono font-bold text-white">{packingWeight} kg</span> (discrepancy delta: <span className="font-mono font-bold text-coral-400">{weightDelta} kg</span>). This exceeds the 0.5 kg tolerance and causes customs clearance holds.
          </p>
        </div>
      )}

      {/* Document Cards List */}
      {documents.length === 0 ? (
        <div className="p-8 text-center bg-navy-900 border border-navy-700 rounded-md">
          <FileWarning className="w-8 h-8 text-slateText-muted mx-auto mb-2" />
          <p className="text-xs font-semibold text-slateText-primary">No documents uploaded</p>
          <p className="text-xs text-slateText-secondary mt-1 max-w-sm mx-auto">
            Mandatory documents (Commercial Invoice, Packing List) are required before customs inspection cutoffs.
          </p>
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<Plus className="w-3.5 h-3.5" />}
            onClick={() => setIsUploadOpen(true)}
            className="mt-3"
          >
            Upload Now
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {documents.map((doc) => {
            const isExtracting = extractingId === doc.id;
            const fields = doc.extracted_fields;

            return (
              <div
                key={doc.id}
                className="bg-navy-850 border border-navy-700 rounded-md p-4 shadow-sm space-y-3 flex flex-col justify-between hover:border-navy-600 transition-all"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded bg-navy-900 border border-navy-700 flex items-center justify-center text-cyan-400 shrink-0">
                        <FileCheck className="w-4 h-4" />
                      </div>
                      <div>
                        <h5 className="text-xs font-bold text-white font-mono">
                          {doc.document_type.replace(/_/g, ' ')}
                        </h5>
                        <p className="text-[10px] text-slateText-muted font-mono truncate max-w-[170px]">
                          {doc.file_ref.split(/[/\\]/).pop()}
                        </p>
                      </div>
                    </div>

                    <StatusBadge status={doc.validation_status} size="sm" />
                  </div>

                  {/* Extracted Fields Metadata */}
                  {fields ? (
                    <div className="mt-3 pt-3 border-t border-navy-700/60 grid grid-cols-2 gap-2 text-[11px]">
                      {fields.invoice_number && (
                        <div>
                          <span className="text-slateText-muted block text-[10px] font-mono">Invoice #</span>
                          <span className="font-mono font-medium text-slateText-primary">
                            {fields.invoice_number}
                          </span>
                        </div>
                      )}

                      {fields.total_weight_kg !== undefined && fields.total_weight_kg !== null && (
                        <div>
                          <span className="text-slateText-muted block text-[10px] font-mono flex items-center gap-1">
                            <Scale className="w-3 h-3 text-cyan-400" /> Gross Wt
                          </span>
                          <span className="font-mono font-bold text-white">
                            {fields.total_weight_kg} kg
                          </span>
                        </div>
                      )}

                      {fields.consignee && (
                        <div className="col-span-2">
                          <span className="text-slateText-muted block text-[10px] font-mono">Consignee</span>
                          <span className="font-medium text-slateText-secondary truncate block">
                            {fields.consignee}
                          </span>
                        </div>
                      )}

                      {fields.declared_value !== undefined && fields.declared_value !== null && (
                        <div>
                          <span className="text-slateText-muted block text-[10px] font-mono">Declared Value</span>
                          <span className="font-mono font-medium text-mint-400">
                            ${fields.declared_value} {fields.currency || 'USD'}
                          </span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="mt-3 pt-3 border-t border-navy-700/60 text-[11px] text-slateText-disabled italic font-mono">
                      No structured fields extracted yet.
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-navy-700/60 text-[11px]">
                  <span className="text-slateText-muted font-mono">
                    Confidence: <span className="text-cyan-400 font-semibold">{(doc.confidence * 100).toFixed(0)}%</span>
                  </span>

                  <Button
                    variant="ghost"
                    size="sm"
                    isLoading={isExtracting}
                    leftIcon={<RefreshCw className="w-3 h-3 text-cyan-400" />}
                    onClick={() => handleExtract(doc.id)}
                    className="text-[11px] py-1 px-2 text-cyan-400 hover:text-cyan-300"
                  >
                    Re-Extract
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Upload Modal */}
      <DocumentUploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        shipmentId={shipmentId}
        onUploadSuccess={(newDoc) => {
          onDocumentAdded(newDoc);
          onRefresh();
        }}
      />
    </div>
  );
};
