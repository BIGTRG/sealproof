'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSessionWizard } from '@/lib/store';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import * as api from '@/lib/api';
import type { Session } from '@/types';
import { SessionVideo } from '@/components/session/SessionVideo';
import { SignaturePad } from '@/components/session/SignaturePad';
import { Shield, FileCheck, Stamp, FileText, PenLine, CheckCircle, ExternalLink } from 'lucide-react';

/**
 * Step 9 — Live Video Session
 * Signer-side view: joins the LiveKit room, follows the notary, and signs each
 * document on-platform while the notary watches. Advances when the notary
 * completes the session.
 */
export function StepLiveSession() {
  const wizard = useSessionWizard() as any;
  const { sessionId, nextStep } = wizard;
  const [token, setToken] = useState('');
  const [joinError, setJoinError] = useState('');
  const [session, setSession] = useState<Session | null>(null);
  const [signingDoc, setSigningDoc] = useState<string | null>(null);
  const [signError, setSignError] = useState('');
  const serverUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL || '';

  const refresh = useCallback(async () => {
    if (!sessionId) return null;
    const res = await api.getSession(sessionId);
    if (res.data?.session) setSession(res.data.session);
    return res.data?.session || null;
  }, [sessionId]);

  useEffect(() => {
    if (!sessionId) return;
    let cancelled = false;

    const join = async () => {
      try {
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
        const tok = (res.data as any)?.token || (res.data as any)?.data?.token;
        if (!cancelled && tok) setToken(tok);
        else if (!cancelled) setJoinError('Could not join the video session. Please refresh the page.');
      } catch {
        if (!cancelled) setJoinError('Could not join the video session. Please refresh the page.');
      }
    };
    join();
    refresh();

    const interval = setInterval(async () => {
      const sess = await refresh();
      if (sess?.status === 'completed') {
        clearInterval(interval);
        nextStep();
      }
    }, 4000);

    return () => { cancelled = true; clearInterval(interval); };
  }, [sessionId, nextStep, refresh]);

  const status = session?.status || 'matched_to_notary';
  const docs = session?.documents || [];
  const primary = session?.signers?.find((s) => s.isPrimary) || session?.signers?.[0];
  const signerName = primary?.name || wizard.data?.signers?.[0]?.name || 'Signer';
  const canSign = status === 'in_session';
  const allSigned = docs.length > 0 && docs.every((d) => d.status === 'signed' || d.status === 'sealed');
  const anySealed = docs.some((d) => d.status === 'sealed');

  const handleSign = async (docId: string, sig: { signaturePng?: string; typedName?: string }) => {
    if (!sessionId) return;
    setSignError('');
    const res = await api.signDocument(sessionId, docId, { ...sig, signerId: primary?.id });
    if (res.error) { setSignError(res.error); return; }
    setSigningDoc(null);
    await refresh();
  };

  return (
    <div className="max-w-5xl mx-auto">
      {/* Session header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className={`h-3 w-3 rounded-full ${status === 'in_session' ? 'bg-red-500 animate-pulse' : 'bg-amber-400'}`} />
          <span className="text-sm font-semibold text-navy-700">Live Session</span>
          <Badge variant="gold">{status.replace(/_/g, ' ').toUpperCase()}</Badge>
          {session?.notaryName && <span className="text-xs text-gray-500">with {session.notaryName}</span>}
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <Shield className="h-3.5 w-3.5" />
          <span>Encrypted and Recorded</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Video area */}
        <div className="lg:col-span-3">
          <Card className="!p-0 overflow-hidden bg-navy-800 aspect-video relative">
            {joinError ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <p className="text-sm text-red-400">{joinError}</p>
              </div>
            ) : (
              <SessionVideo token={token} serverUrl={serverUrl} className="absolute inset-0" />
            )}
            {status === 'matched_to_notary' && (
              <div className="absolute top-3 left-3 rounded-full bg-black/60 px-3 py-1 text-xs text-white">
                Waiting for your notary to start the session
              </div>
            )}
          </Card>

          {/* Session progress */}
          <div className="grid grid-cols-4 gap-4 mt-5">
            {[
              { icon: Shield, label: 'ID Verified', done: true },
              { icon: FileCheck, label: 'Session Started', done: status === 'in_session' || status === 'completed' },
              { icon: PenLine, label: 'Signatures Applied', done: allSigned },
              { icon: Stamp, label: 'Seal Applied', done: anySealed || status === 'completed' },
            ].map(({ icon: Icon, label, done }) => (
              <div key={label} className="flex items-center gap-2 text-xs">
                <div className={`flex h-6 w-6 items-center justify-center rounded-full ${done ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-100 text-gray-400'}`}>
                  <Icon className="h-3 w-3" />
                </div>
                <span className={done ? 'text-navy-700 font-medium' : 'text-gray-400'}>{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Documents + signing */}
        <div className="lg:col-span-2">
          <Card>
            <h3 className="text-sm font-semibold text-navy-700 mb-3 flex items-center gap-2">
              <FileText className="h-4 w-4 text-gold-500" /> Your documents
            </h3>
            {docs.length === 0 && <p className="text-xs text-gray-400">Loading documents...</p>}
            <div className="space-y-3">
              {docs.map((d) => {
                const signed = d.status === 'signed' || d.status === 'sealed';
                return (
                  <div key={d.id} className="rounded-lg border border-gray-200 p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-navy-700 truncate">{d.fileName}</div>
                        <div className="text-xs text-gray-400">{d.pageCount} page{d.pageCount === 1 ? '' : 's'}</div>
                      </div>
                      {signed ? (
                        <span className="flex items-center gap-1 text-xs text-emerald-600 whitespace-nowrap"><CheckCircle className="h-3.5 w-3.5" /> {d.status === 'sealed' ? 'Sealed' : 'Signed'}</span>
                      ) : (
                        <span className="text-xs text-amber-600 whitespace-nowrap">Awaiting signature</span>
                      )}
                    </div>
                    <div className="mt-2 flex items-center gap-3 text-xs">
                      <a
                        href={api.documentDownloadUrl(sessionId!, d.id!, signed ? 'signed' : 'original')}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1 text-gray-500 hover:text-navy-700"
                      >
                        <ExternalLink className="h-3 w-3" /> View
                      </a>
                      {!signed && canSign && signingDoc !== d.id && (
                        <button onClick={() => setSigningDoc(d.id!)} className="flex items-center gap-1 font-medium text-gold-600 hover:text-gold-700">
                          <PenLine className="h-3 w-3" /> Sign now
                        </button>
                      )}
                      {!signed && !canSign && (
                        <span className="text-gray-400">Signing opens when the notary starts the session</span>
                      )}
                    </div>
                    {signingDoc === d.id && (
                      <div className="mt-3 border-t border-gray-100 pt-3">
                        <SignaturePad signerName={signerName} onSign={(sig) => handleSign(d.id!, sig)} />
                        {signError && <p className="mt-2 text-xs text-red-600">{signError}</p>}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            {allSigned && status === 'in_session' && (
              <p className="mt-4 text-xs text-gray-500">All documents signed. The notary is applying the seal and completing the journal entry.</p>
            )}
          </Card>
        </div>
      </div>

      <p className="text-xs text-gray-400 text-center mt-6">
        The notary will guide you through each step. Please follow their instructions.
      </p>
    </div>
  );
}
