import { useState } from 'react';
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

  // Cross-document weight comparison between Commercial Invoice and Packing List
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
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div>
          <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <FileText className="w-4 h-4 text-blue-600" />
            Shipping Paperwork & Customs Filings
          </h4>
          <p className="text-xs text-slate-500 mt-0.5">
            Deterministic field extraction and cross-document reconciliation (0.5 kg tolerance).
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
        <div className="p-3.5 bg-red-50 border border-red-200 rounded-md text-xs text-red-800 space-y-1">
          <div className="flex items-center gap-2 font-bold text-red-900">
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
            <span>WEIGHT MISMATCH DISCREPANCY DETECTED</span>
          </div>
          <p className="text-[11px] text-red-700">
            Commercial Invoice declares <span className="font-mono font-bold">{invoiceWeight} kg</span>, but Packing List specifies <span className="font-mono font-bold">{packingWeight} kg</span> (discrepancy: <span className="font-mono font-bold">{weightDelta} kg</span>). This exceeds the 0.5 kg tolerance and causes customs clearance holds.
          </p>
        </div>
      )}

      {/* Document Cards List */}
      {documents.length === 0 ? (
        <div className="p-8 text-center bg-slate-50 border border-slate-200 rounded-md">
          <FileWarning className="w-8 h-8 text-slate-400 mx-auto mb-2" />
          <p className="text-xs font-semibold text-slate-700">No documents uploaded</p>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
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
                className="bg-white border border-slate-200 rounded-md p-4 shadow-xs space-y-3 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded bg-slate-100 flex items-center justify-center text-slate-600">
                        <FileCheck className="w-4 h-4" />
                      </div>
                      <div>
                        <h5 className="text-xs font-bold text-slate-900 font-sans">
                          {doc.document_type.replace(/_/g, ' ')}
                        </h5>
                        <p className="text-[10px] text-slate-400 font-mono truncate max-w-[180px]">
                          {doc.file_ref.split(/[/\\]/).pop()}
                        </p>
                      </div>
                    </div>

                    <StatusBadge status={doc.validation_status} size="sm" />
                  </div>

                  {/* Extracted Fields Metadata */}
                  {fields ? (
                    <div className="mt-3 pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-[11px]">
                      {fields.invoice_number && (
                        <div>
                          <span className="text-slate-400 block text-[10px]">Invoice #</span>
                          <span className="font-mono font-medium text-slate-800">
                            {fields.invoice_number}
                          </span>
                        </div>
                      )}

                      {fields.total_weight_kg !== undefined && fields.total_weight_kg !== null && (
                        <div>
                          <span className="text-slate-400 block text-[10px] flex items-center gap-1">
                            <Scale className="w-3 h-3 text-slate-400" /> Gross Weight
                          </span>
                          <span className="font-mono font-bold text-slate-900">
                            {fields.total_weight_kg} kg
                          </span>
                        </div>
                      )}

                      {fields.consignee && (
                        <div className="col-span-2">
                          <span className="text-slate-400 block text-[10px]">Consignee</span>
                          <span className="font-medium text-slate-800 truncate block">
                            {fields.consignee}
                          </span>
                        </div>
                      )}

                      {fields.declared_value !== undefined && fields.declared_value !== null && (
                        <div>
                          <span className="text-slate-400 block text-[10px]">Declared Value</span>
                          <span className="font-mono font-medium text-slate-800">
                            ${fields.declared_value} {fields.currency || 'USD'}
                          </span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="mt-3 pt-3 border-t border-slate-100 text-[11px] text-slate-400 italic">
                      No structured fields extracted yet.
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-[11px]">
                  <span className="text-slate-400 font-mono">
                    Confidence: {(doc.confidence * 100).toFixed(0)}%
                  </span>

                  <Button
                    variant="ghost"
                    size="sm"
                    isLoading={isExtracting}
                    leftIcon={<RefreshCw className="w-3 h-3" />}
                    onClick={() => handleExtract(doc.id)}
                    className="text-[11px] py-1 px-2 text-blue-600 hover:text-blue-800"
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
