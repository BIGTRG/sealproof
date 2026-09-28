'use client';

import { useCallback, useState, useRef } from 'react';
import { useSessionWizard } from '@/lib/store';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ProgressBar } from '@/components/ui/ProgressBar';
import * as api from '@/lib/api';
import { Upload, FileText, X, CheckCircle } from 'lucide-react';

export function StepUpload() {
  const { data, addDocument, removeDocument, updateDocumentProgress, updateDocument, sessionId, nextStep, prevStep } = useSessionWizard();
  const [error, setError] = useState<string | null>(null);

  const handleFiles = useCallback((files: FileList) => {
    if (!sessionId) { setError('Session not started yet. Go back one step and continue again.'); return; }
    setError(null);
    Array.from(files).forEach((file, offset) => {
      if (file.type !== 'application/pdf' && !/\.pdf$/i.test(file.name)) { setError(`${file.name}: only PDF files are accepted.`); return; }
      if (file.size > 25 * 1024 * 1024) { setError(`${file.name}: larger than 25 MB.`); return; }

      const idx = useSessionWizard.getState().data.documents.length;
      addDocument({
        file,
        fileName: file.name,
        fileSize: file.size,
        pageCount: 0,
        documentType: data.documentType,
        description: '',
        uploadProgress: 1,
      });

      api.uploadDocument(sessionId, file, data.documentType, (pct) => {
        updateDocumentProgress(idx, Math.max(1, Math.min(pct, 99)));
      }).then((res) => {
        if (res.error || !res.data) {
          setError(`${file.name}: ${res.error || 'upload failed'}`);
          removeDocument(idx);
          return;
        }
        updateDocument(idx, { id: res.data.document.id, pageCount: res.data.document.pageCount, uploadProgress: 100, uploadedUrl: res.data.document.uploadUrl });
      });
    });
  }, [data.documentType, sessionId, addDocument, removeDocument, updateDocument, updateDocumentProgress]);

  const allUploaded = data.documents.length > 0 && data.documents.every((d) => d.uploadProgress >= 100);
  const fileInput = useRef<HTMLInputElement>(null);

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
        onClick={() => fileInput.current?.click()}
      >
        <input
          ref={fileInput}
          type="file"
          accept=".pdf,application/pdf"
          multiple
          className="hidden"
          onChange={(e) => { if (e.target.files) handleFiles(e.target.files); e.target.value = ''; }}
        />
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

      {error && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <div className="flex items-center justify-between mt-8">
        <Button variant="ghost" onClick={prevStep}>Back</Button>
        <Button variant="gold" onClick={nextStep} disabled={!allUploaded}>
          Continue
        </Button>
      </div>
    </div>
  );
}
