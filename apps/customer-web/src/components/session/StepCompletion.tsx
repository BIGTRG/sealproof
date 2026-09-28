'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useSessionWizard } from '@/lib/store';
import * as api from '@/lib/api';
import type { Session } from '@/types';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { CheckCircle, Download, ArrowRight, Scale } from 'lucide-react';

/**
 * Step 10 — Completion
 * Session is done. Sealed document ready for download.
 */
export function StepCompletion() {
  const { data, reset, sessionId } = useSessionWizard();
  const [session, setSession] = useState<Session | null>(null);
  useEffect(() => {
    if (sessionId) api.getSession(sessionId).then((r) => r.data && setSession(r.data.session));
  }, [sessionId]);
  const sealedDocs = (session?.documents || []).filter((d) => d.status === 'sealed' || d.status === 'signed');

  return (
    <Card className="text-center py-16 max-w-lg mx-auto">
      <div className="seal-stamp inline-flex h-16 w-16 items-center justify-center mx-auto mb-6">
        <CheckCircle className="h-8 w-8 text-gold-300" />
      </div>
      <h2 className="font-display text-2xl font-semibold text-navy-700">
        Notarization Complete
      </h2>
      <p className="text-sm text-gray-500 mt-3 max-w-sm mx-auto leading-relaxed">
        Your <span className="capitalize font-medium text-navy-700">{data.documentType.replace(/_/g, ' ')}</span> has been
        notarized, sealed, and recorded in compliance with state law.
      </p>

      <div className="divider-gold my-8 max-w-xs mx-auto" />

      <div className="space-y-3 max-w-xs mx-auto">
        {sealedDocs.length > 0 ? sealedDocs.map((d) => (
          <a key={d.id} href={api.documentDownloadUrl(sessionId!, d.id!, d.status === 'sealed' ? 'sealed' : 'signed')} target="_blank" rel="noreferrer" className="block">
            <Button variant="gold" className="w-full">
              <Download className="h-4 w-4" />
              Download {sealedDocs.length > 1 ? d.fileName : 'Sealed Document'}
            </Button>
          </a>
        )) : (
          <Button variant="gold" className="w-full" disabled>
            <Download className="h-4 w-4" />
            Preparing sealed document...
          </Button>
        )}
        <Link href="/dashboard/documents" className="block">
          <Button variant="outline" className="w-full">
            View in Document Vault
          </Button>
        </Link>
        <Link href="/dashboard" className="block" onClick={reset}>
          <Button variant="ghost" className="w-full">
            Return to Dashboard
            <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </div>

      <p className="text-xs text-gray-400 mt-8 max-w-sm mx-auto leading-relaxed">
        Your session recording and journal entry are securely archived.
        You can access your sealed documents at any time from your account.
      </p>
    </Card>
  );
}
