'use client';

import { useState, useEffect } from 'react';
import { useSessionWizard } from '@/lib/store';
import { Card } from '@/components/ui/Card';
import * as api from '@/lib/api';
import { Clock, Users, Loader2 } from 'lucide-react';

/**
 * Step 8 — Queue / Matching
 * Polls session status until a notary is matched and session starts.
 */
export function StepQueue() {
  const { sessionId, nextStep, data } = useSessionWizard();
  const [status, setStatus] = useState('queued');
  const [position, setPosition] = useState<number | null>(null);

  useEffect(() => {
    if (!sessionId) return;

    const interval = setInterval(async () => {
      const res = await api.getSession(sessionId);
      if (res.data?.session) {
        const s = res.data.session.status;
        setStatus(s);
        if (s === 'in_progress' || s === 'signing') {
          clearInterval(interval);
          nextStep();
        }
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [sessionId, nextStep]);

  return (
    <Card className="text-center py-16 max-w-lg mx-auto">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-50 border border-brand-200 mx-auto mb-6">
        <Loader2 className="h-7 w-7 text-gold-500 animate-spin" />
      </div>
      <h2 className="font-display text-xl font-semibold text-navy-700">
        {status === 'matched' ? 'Notary Found' : 'Finding Your Notary'}
      </h2>
      <p className="text-sm text-gray-500 mt-2 max-w-sm mx-auto">
        {status === 'matched'
          ? 'A notary has been assigned. Your session will begin momentarily.'
          : data.serviceLevel === 'rush'
            ? 'You are in the priority queue. Matching with the first available notary.'
            : 'Matching you with the next available commissioned notary. Please stay on this page.'
        }
      </p>

      <div className="flex items-center justify-center gap-6 mt-8 text-sm text-gray-400">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4" />
          <span>Typically under 2 minutes</span>
        </div>
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4" />
          <span>Notaries standing by</span>
        </div>
      </div>
    </Card>
  );
}
