'use client';

import { useCallback } from 'react';
import { useSessionWizard } from '@/lib/store';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ProgressBar } from '@/components/ui/ProgressBar';
import * as api from '@/lib/api';
import { Upload, FileText, X, CheckCircle } from 'lucide-react';

export function StepUpload() {
  const { data, addDocument, removeDocument, updateDocumentProgress, sessionId, nextStep, prevStep } = useSessionWizard();

  const handleFiles = useCallback((files: FileList) => {
    Array.from(files).forEach((file) => {
      if (file.type !== 'application/pdf') return;

      const doc = {
        file,
        fileName: file.name,
        fileSize: file.size,
        pageCount: 0,
        documentType: data.documentType,
        description: '',
        uploadProgress: 0,
      };

      addDocument(doc);

      // Upload to backend if session exists
      if (sessionId) {
        const idx = data.documents.length;
        api.uploadDocument(sessionId, file, data.documentType, (pct) => {
          updateDocumentProgress(idx, pct);
        });
      }
    });
  }, [data.documentType, data.documents.length, sessionId, addDocument, updateDocumentProgress]);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files);
  };

  return (
    <div>
      <div className="text-center mb-8">
        <h2 className="font-display text-xl font-semibold text-navy-700">
          Upload your documents
        </h2>
        <p className="text-sm text-gray-500 mt-2">
          Upload the PDF documents that need to be notarized. Max 25 MB per file.
        </p>
      </div>

      {/* Drop zone */}
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        className="border-2 border-dashed border-gray-200 rounded-legal p-10 text-center hover:border-gold-300 transition-colors cursor-pointer"
        onClick={() => {
          const input = document.createElement('input');
          input.type = 'file';
          input.accept = '.pdf';
          input.multiple = true;
          input.onchange = (e) => {
            const files = (e.target as HTMLInputElement).files;
            if (files) handleFiles(files);
          };
          input.click();
        }}
      >
        <Upload className="h-8 w-8 text-brand-200 mx-auto mb-3" />
        <p className="text-sm font-medium text-navy-700">
          Drag and drop PDFs here, or click to browse
        </p>
        <p className="text-xs text-gray-400 mt-1">PDF format only</p>
      </div>

      {/* Uploaded files */}
      {data.documents.length > 0 && (
        <div className="mt-6 space-y-3">
          {data.documents.map((doc, i) => (
            <Card key={i} className="!p-4 flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-legal bg-brand-50 border border-brand-200 flex-shrink-0">
                <FileText className="h-4 w-4 text-gold-500" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-navy-700 truncate">{doc.fileName}</p>
                  <button onClick={() => removeDocument(i)} className="text-gray-400 hover:text-red-500 ml-2 flex-shrink-0">
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-gray-400">{(doc.fileSize / 1024 / 1024).toFixed(1)} MB</span>
                  {doc.uploadProgress >= 100 ? (
                    <span className="flex items-center gap-1 text-xs text-emerald-500">
                      <CheckCircle className="h-3 w-3" /> Uploaded
                    </span>
                  ) : doc.uploadProgress > 0 ? (
                    <ProgressBar value={doc.uploadProgress} className="flex-1 max-w-[120px]" />
                  ) : null}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between mt-8">
        <Button variant="ghost" onClick={prevStep}>Back</Button>
        <Button variant="gold" onClick={nextStep} disabled={data.documents.length === 0}>
          Continue
        </Button>
      </div>
    </div>
  );
}
