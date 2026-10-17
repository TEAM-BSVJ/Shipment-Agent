import React, { useState } from 'react';
import { AlertCircle, FileUp, Upload } from 'lucide-react';
import { DocumentType, ShipmentDocument } from '../../types';
import { documentService } from '../../services';
import { Button, Modal } from '../common';

interface DocumentUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  shipmentId: string;
  onUploadSuccess: (doc: ShipmentDocument) => void;
}

export const DocumentUploadModal: React.FC<DocumentUploadModalProps> = ({
  isOpen,
  onClose,
  shipmentId,
  onUploadSuccess,
}) => {
  const [documentType, setDocumentType] = useState<DocumentType>('COMMERCIAL_INVOICE');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const DISALLOWED_EXTENSIONS = ['.exe', '.sh', '.bat', '.cmd', '.ps1', '.msi'];
  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB per RULE-F05

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMessage(null);
    if (!e.target.files || e.target.files.length === 0) {
      setSelectedFile(null);
      return;
    }

    const file = e.target.files[0];
    const lowerName = file.name.toLowerCase();

    // Check disallowed executable extensions (RULE-F05)
    for (const ext of DISALLOWED_EXTENSIONS) {
      if (lowerName.endsWith(ext)) {
        setErrorMessage(`Security violation: Executable files (${ext}) are prohibited.`);
        setSelectedFile(null);
        e.target.value = '';
        return;
      }
    }

    // Check size limit
    if (file.size > MAX_FILE_SIZE) {
      setErrorMessage('File size exceeds the 10 MB limit.');
      setSelectedFile(null);
      e.target.value = '';
      return;
    }

    setSelectedFile(file);
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      setErrorMessage('Please select a valid document file to upload.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const doc = await documentService.uploadDocument(shipmentId, documentType, selectedFile);
      onUploadSuccess(doc);
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Upload failed. Please check file format.';
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Upload Shipping Paperwork"
      description="Upload digital PDF, PNG, or JPEG documents for automated extraction and cross-check (RULE-F05)."
      maxWidth="md"
    >
      <form onSubmit={handleUpload} className="space-y-4">
        {errorMessage && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md text-xs text-red-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Document Category
          </label>
          <select
            value={documentType}
            onChange={(e) => setDocumentType(e.target.value as DocumentType)}
            className="w-full text-xs bg-slate-50 border border-slate-200 rounded-md p-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          >
            <option value="COMMERCIAL_INVOICE">Commercial Invoice</option>
            <option value="PACKING_LIST">Packing List</option>
            <option value="BILL_OF_LADING">Bill of Lading</option>
            <option value="AIR_WAYBILL">Air Waybill</option>
            <option value="CERTIFICATE_OF_ORIGIN">Certificate of Origin</option>
            <option value="CUSTOMS_DECLARATION">Customs Declaration</option>
            <option value="OTHER">Other Freight Document</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            File Binary (PDF, PNG, JPEG ≤ 10MB)
          </label>
          <div className="border-2 border-dashed border-slate-200 rounded-md p-6 text-center hover:border-slate-300 transition-colors bg-slate-50/50">
            <input
              type="file"
              accept=".pdf,.png,.jpg,.jpeg"
              onChange={handleFileChange}
              className="hidden"
              id="file-upload-input"
            />
            <label
              htmlFor="file-upload-input"
              className="cursor-pointer flex flex-col items-center justify-center space-y-2"
            >
              <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                <FileUp className="w-5 h-5" />
              </div>
              <p className="text-xs font-medium text-slate-700">
                {selectedFile ? (
                  <span className="font-mono font-bold text-blue-600">{selectedFile.name}</span>
                ) : (
                  <>
                    <span className="text-blue-600 underline">Click to choose a file</span> or drag & drop
                  </>
                )}
              </p>
              <p className="text-[11px] text-slate-400">PDF, PNG, JPEG up to 10 MB</p>
            </label>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
          <Button variant="secondary" size="sm" type="button" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            type="submit"
            isLoading={isLoading}
            leftIcon={<Upload className="w-4 h-4" />}
          >
            Upload Document
          </Button>
        </div>
      </form>
    </Modal>
  );
};
