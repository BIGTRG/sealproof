'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import * as api from '@/lib/api';
import type { VaultDocument } from '@/types';
import { FolderOpen, Download, Search, FileCheck, Scale } from 'lucide-react';

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<VaultDocument[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.listVaultDocuments().then((res) => {
      if (res.data) setDocuments(res.data.documents || []);
      setLoading(false);
    });
  }, []);

  const handleDownload = async (doc: VaultDocument) => {
    const url = await api.downloadDocument(doc.id);
    if (url) window.open(url, '_blank');
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-2xl font-semibold text-navy-700">My Documents</h1>
          <p className="text-sm text-gray-500 mt-1">Your notarized document vault. All sealed documents are archived securely.</p>
        </div>
      </div>

      {loading ? (
        <div className="py-20 text-center text-gray-400 text-sm">Loading documents...</div>
      ) : documents.length === 0 ? (
        <Card className="py-16 text-center">
          <Scale className="h-12 w-12 text-brand-200 mx-auto mb-4" />
          <h3 className="font-display text-lg font-semibold text-navy-700">No documents yet</h3>
          <p className="text-sm text-gray-500 mt-2 max-w-xs mx-auto">
            Completed notarization sessions will add sealed documents here automatically.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {documents.map((doc) => (
            <Card key={doc.id} hover className="flex flex-col">
              <div className="flex items-start gap-3 mb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-legal bg-brand-50 border border-brand-200 flex-shrink-0">
                  <FileCheck className="h-5 w-5 text-gold-500" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-medium text-navy-700 truncate">{doc.fileName}</h3>
                  <p className="text-xs text-gray-400 mt-0.5 capitalize">{doc.documentType.replace(/_/g, ' ')}</p>
                </div>
              </div>
              <div className="flex items-center justify-between text-xs text-gray-400 mb-4">
                <span>Notarized {new Date(doc.notarizedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                <span>{doc.pageCount} pages</span>
              </div>
              {doc.signerNames.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-4">
                  {doc.signerNames.map((name) => (
                    <Badge key={name} variant="navy">{name}</Badge>
                  ))}
                </div>
              )}
              <div className="mt-auto">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => handleDownload(doc)}
                >
                  <Download className="h-3.5 w-3.5" />
                  Download Sealed Document
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
