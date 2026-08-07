'use client';

import { useState, useEffect } from 'react';
import { useSessionWizard } from '@/lib/store';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import * as api from '@/lib/api';
import { SessionVideo } from '@/components/session/SessionVideo';
import { Shield, FileCheck, Stamp } from 'lucide-react';

/**
 * Step 9 — Live Video Session
 * Customer-side view of the notarization session.
 * Joins the LiveKit room for this session; the notary controls the workflow.
 */
export function StepLiveSession() {
  const wizard = useSessionWizard() as any;
  const { sessionId, nextStep } = wizard;
  const [token, setToken] = useState('');
  const [joinError, setJoinError] = useState('');
  const [sessionStatus, setSessionStatus] = useState('in_progress');
  const serverUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL || '';

  useEffect(() => {
    if (!sessionId) return;
    let cancelled = false;

    const join = async () => {
      try {
        // Ensure the room exists (idempotent; 409 means already created)
        await api.createLivekitRoom(sessionId).catch(() => undefined);
        const signerName =
          wizard.data?.signers?.find((s: any) => s.isPrimary)?.name ||
          wizard.data?.signers?.[0]?.name ||
          'Signer';
        const res = await api.getLivekitToken(sessionId, {
          identity: `customer-${sessionId}`,
          name: signerName,
          role: 'customer',
        });
        const tok = (res.data as any)?.data?.token || (res.data as any)?.token;
        if (!cancelled && tok) {
          setToken(tok);
        } else if (!cancelled) {
          setJoinError('Could not join the video session. Please refresh the page.');
        }
      } catch {
        if (!cancelled) setJoinError('Could not join the video session. Please refresh the page.');
      }
    };
    join();

    // Poll session status; the notary drives the workflow to completion
    const interval = setInterval(async () => {
      const res = await api.getSession(sessionId);
      const sess = (res.data as any)?.session || (res.data as any)?.data?.session;
      if (sess) {
        setSessionStatus(sess.status);
        if (sess.status === 'completed') {
          clearInterval(interval);
          nextStep();
        }
      }
    }, 5000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [sessionId, nextStep]);

  return (
    <div className="max-w-4xl mx-auto">
      {/* Session header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="h-3 w-3 rounded-full bg-red-500 animate-pulse" />
          <span className="text-sm font-semibold text-navy-700">Live Session</span>
          <Badge variant="gold">{sessionStatus.replace(/_/g, ' ').toUpperCase()}</Badge>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <Shield className="h-3.5 w-3.5" />
          <span>Encrypted and Recorded</span>
        </div>
      </div>

      {/* Video area */}
      <Card className="!p-0 overflow-hidden bg-navy-800 aspect-video relative">
        {joinError ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="text-sm text-red-400">{joinError}</p>
          </div>
        ) : (
          <SessionVideo token={token} serverUrl={serverUrl} className="absolute inset-0" />
        )}
      </Card>

      {/* Session progress */}
      <div className="grid grid-cols-4 gap-4 mt-6">
        {[
          { icon: Shield, label: 'ID Verified', done: true },
          { icon: FileCheck, label: 'Documents Reviewed', done: sessionStatus !== 'in_progress' },
          { icon: FileCheck, label: 'Signatures Applied', done: ['sealing', 'completed'].includes(sessionStatus) },
          { icon: Stamp, label: 'Seal Applied', done: sessionStatus === 'completed' },
        ].map(({ icon: Icon, label, done }) => (
          <div key={label} className="flex items-center gap-2 text-xs">
            <div className={`flex h-6 w-6 items-center justify-center rounded-full ${
              done ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-100 text-gray-400'
            }`}>
              <Icon className="h-3 w-3" />
            </div>
            <span className={done ? 'text-navy-700 font-medium' : 'text-gray-400'}>{label}</span>
          </div>
        ))}
      </div>

      <p className="text-xs text-gray-400 text-center mt-6">
        The notary will guide you through each step. Please follow their instructions.
      </p>
    </div>
  );
}
