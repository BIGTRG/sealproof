'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import * as api from '@/lib/api';
import { SessionVideo } from '@/components/session/SessionVideo';
import {
  ShieldCheck, FileText, PenTool, Stamp, BookOpen, CheckCircle,
  ChevronRight, Circle, Square, ExternalLink, AlertTriangle, Play,
} from 'lucide-react';

const WORKFLOW_STEPS = [
  { id: 'verify',     label: 'Verify Identity',     icon: ShieldCheck },
  { id: 'review',     label: 'Review Documents',     icon: FileText },
  { id: 'signatures', label: 'Capture Signatures',   icon: PenTool },
  { id: 'seal',       label: 'Apply Seal',           icon: Stamp },
  { id: 'journal',    label: 'Confirm Journal',      icon: BookOpen },
  { id: 'complete',   label: 'Complete Session',     icon: CheckCircle },
];

const ACT_TYPES = [
  { value: 'acknowledgment', label: 'Acknowledgment' },
  { value: 'jurat', label: 'Jurat (oath or affirmation)' },
  { value: 'verification_on_oath', label: 'Verification on oath' },
  { value: 'copy_certification', label: 'Copy certification' },
];

export default function ActiveSessionPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.id as string;
  const [currentStep, setCurrentStep] = useState(0);
  const [session, setSession] = useState<any>(null);
  const [token, setToken] = useState('');
  const [joinError, setJoinError] = useState('');
  const [recording, setRecording] = useState(false);
  const [recordingBusy, setRecordingBusy] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [actType, setActType] = useState('acknowledgment');
  const [sealResult, setSealResult] = useState<any>(null);
  const [journalEntry, setJournalEntry] = useState<any>(null);
  const serverUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL || '';

  const refresh = useCallback(async () => {
    try {
      const r: any = await api.getSessionById(sessionId);
      const s = r?.data ?? r;
      setSession(s);
      return s;
    } catch (e: any) {
      setError(e.message);
      return null;
    }
  }, [sessionId]);

  // Load session + join video
  useEffect(() => {
    refresh();
    let cancelled = false;
    const join = async () => {
      try {
        await api.createLivekitRoom(sessionId).catch(() => undefined);
        const me: any = await api.getMyProfile().then((r: any) => r?.data ?? r).catch(() => null);
        const res = await api.getLivekitToken(sessionId, {
          identity: `notary-${sessionId}`,
          name: me?.display_name || me?.full_legal_name || 'Notary',
          role: 'notary',
        });
        if (!cancelled && res?.data?.token) setToken(res.data.token);
        else if (!cancelled) setJoinError('Could not join the video room. Refresh to retry.');
      } catch {
        if (!cancelled) setJoinError('Could not join the video room. Refresh to retry.');
      }
    };
    join();
    return () => { cancelled = true; };
  }, [sessionId, refresh]);

  // Poll for signer activity (signatures land from the customer side)
  useEffect(() => {
    const t = setInterval(refresh, 4000);
    return () => clearInterval(t);
  }, [refresh]);

  const docs: any[] = session?.documents || [];
  const signers: any[] = session?.signers || [];
  const allSigned = docs.length > 0 && docs.every((d) => d.esign_status === 'signed' || d.status === 'signed' || d.sealed_document_url);
  const allSealed = docs.length > 0 && docs.every((d) => d.sealed_document_url);
  const kycPassed = signers.length > 0 && signers.every((s) => s.kyc_result === 'passed');
  const status: string = session?.status || 'matched_to_notary';

  const toggleRecording = useCallback(async () => {
    if (recordingBusy) return;
    setRecordingBusy(true);
    try {
      if (recording) { await api.stopSessionRecording(sessionId); setRecording(false); }
      else { await api.startSessionRecording(sessionId); setRecording(true); }
    } catch (e: any) {
      setError(`Recording: ${e.message}`);
    } finally {
      setRecordingBusy(false);
    }
  }, [recording, recordingBusy, sessionId]);

  const startSession = async () => {
    setBusy(true); setError('');
    try {
      await api.advanceSession(sessionId, 'in_session');
      if (!recording) await api.startSessionRecording(sessionId).then(() => setRecording(true)).catch(() => undefined);
      await refresh();
    } catch (e: any) { setError(e.message); }
    setBusy(false);
  };

  const advanceStep = async () => {
    setBusy(true); setError('');
    try {
      if (currentStep === 3 && !sealResult) {
        const r = await api.applySeal(sessionId, actType);
        setSealResult(r);
        await refresh();
        setBusy(false);
        return; // show the confirmation; next click continues
      }
      if (currentStep === 4 && !journalEntry) {
        const r = await api.confirmJournalEntry(sessionId, { notarial_act_type: actType });
        setJournalEntry(r);
        setBusy(false);
        return;
      }
      if (currentStep === 5) {
        if (recording) await api.stopSessionRecording(sessionId).catch(() => undefined);
        await api.completeSession(sessionId);
        router.push(`/dashboard?completed=${sessionId}`);
        return;
      }
      await refresh();
      setCurrentStep(Math.min(currentStep + 1, WORKFLOW_STEPS.length - 1));
    } catch (e: any) {
      setError(e.message);
    }
    setBusy(false);
  };

  const canAdvance = useMemo(() => {
    if (status !== 'in_session') return false;
    switch (currentStep) {
      case 0: return kycPassed;
      case 2: return allSigned;
      case 3: return allSigned;
      case 5: return allSealed && !!journalEntry;
      default: return true;
    }
  }, [status, currentStep, kycPassed, allSigned, allSealed, journalEntry]);

  const nextLabel = currentStep === 3 ? (sealResult ? 'Continue to Confirm Journal' : 'Apply Seal')
    : currentStep === 4 ? (journalEntry ? 'Continue to Complete Session' : 'Write Journal Entry')
    : currentStep === 5 ? 'Finalize Session'
    : `Continue to ${WORKFLOW_STEPS[currentStep + 1]?.label}`;

  const renderStepBody = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="space-y-2">
            {signers.map((s) => (
              <div key={s.id} className="rounded-legal border border-gray-200 p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-navy-700">{s.full_legal_name}</div>
                    <div className="text-xs text-gray-400">{s.email}{s.signer_role === 'primary' ? '  |  primary signer' : ''}</div>
                  </div>
                  <span className={`text-xs font-medium ${s.kyc_result === 'passed' ? 'text-emerald-600' : 'text-amber-600'}`}>
                    {s.kyc_result === 'passed' ? 'ID verified' : s.kyc_result || 'pending'}
                  </span>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2 text-[11px] text-gray-500">
                  <div>Credential analysis: <span className="text-gray-800">{session?.kyc_provider === 'sandbox' ? 'sandbox' : 'passed'}</span></div>
                  <div>KBA: <span className="text-gray-800">{session?.kba_status || 'not required'}</span></div>
                  <div>State of act: <span className="text-gray-800">{session?.state_of_act}</span></div>
                  <div>Service: <span className="text-gray-800 capitalize">{session?.ron_session_type}</span></div>
                </div>
              </div>
            ))}
            <p className="text-xs text-gray-500 pt-1">Confirm on camera that the person matches the verified credential before continuing.</p>
          </div>
        );
      case 1:
        return (
          <div className="space-y-2">
            {docs.map((d) => (
              <a key={d.id} href={api.documentUrl(sessionId, d.id, 'original')} target="_blank" rel="noreferrer" className="flex items-center justify-between rounded-legal border border-gray-200 p-3 hover:border-gold-300">
                <div className="min-w-0">
                  <div className="text-sm font-medium text-navy-700 truncate">{d.document_name}</div>
                  <div className="text-xs text-gray-400">{d.page_count} page{d.page_count === 1 ? '' : 's'}  |  {d.document_type}</div>
                </div>
                <ExternalLink className="h-4 w-4 text-gray-400" />
              </a>
            ))}
            {docs.length === 0 && <p className="text-xs text-amber-600">No documents on this session.</p>}
          </div>
        );
      case 2:
        return (
          <div className="space-y-2">
            {docs.map((d) => {
              const signed = d.esign_status === 'signed' || d.status === 'signed' || d.sealed_document_url;
              return (
                <div key={d.id} className="flex items-center justify-between rounded-legal border border-gray-200 p-3">
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-navy-700 truncate">{d.document_name}</div>
                    <div className="text-xs text-gray-400">{signed ? 'Signed by signer in session' : 'Waiting for signer'}</div>
                  </div>
                  {signed ? <CheckCircle className="h-4 w-4 text-emerald-500" /> : <span className="h-2.5 w-2.5 rounded-full bg-amber-400 animate-pulse" />}
                </div>
              );
            })}
            <p className="text-xs text-gray-500 pt-1">Ask the signer to sign each document on their screen. This list updates automatically.</p>
          </div>
        );
      case 3:
        return (
          <div className="space-y-3">
            <label className="block text-xs font-medium text-gray-500">Notarial act</label>
            <select value={actType} onChange={(e) => setActType(e.target.value)} className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm">
              {ACT_TYPES.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
            </select>
            <p className="text-xs text-gray-500">The seal and certificate page are generated for {session?.state_of_act} and stamped on every signed document with a tamper-evident hash and trusted timestamp.</p>
            {sealResult && (
              <div className="rounded-legal border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800">
                Seal applied to {sealResult.documents_sealed ?? sealResult.sealed_documents?.length ?? docs.length} document(s).
              </div>
            )}
          </div>
        );
      case 4:
        return (
          <div className="space-y-2 text-xs">
            <div className="rounded-legal border border-gray-200 p-3 space-y-1.5">
              <Row k="Signer" v={signers.map((s) => s.full_legal_name).join(', ')} />
              <Row k="Document" v={docs.map((d) => d.document_name).join(', ')} />
              <Row k="Act" v={ACT_TYPES.find((a) => a.value === actType)?.label || actType} />
              <Row k="Fee" v={`$${((session?.customer_paid_cents || 0) / 100).toFixed(2)}`} />
              <Row k="ID method" v={session?.kyc_provider === 'sandbox' ? 'Credential analysis (sandbox) + KBA' : 'Credential analysis + KBA'} />
              <Row k="Recording" v={recording ? 'In progress' : 'Stopped'} />
            </div>
            {journalEntry ? (
              <div className="rounded-legal border border-emerald-200 bg-emerald-50 p-3 text-emerald-800">
                Entry #{journalEntry.entry_sequence_number} written. Hash {String(journalEntry.entry_hash || '').slice(0, 16)}...
              </div>
            ) : (
              <p className="text-gray-500">Writing the entry appends it to your hash-chained electronic journal. It cannot be edited afterwards.</p>
            )}
          </div>
        );
      case 5:
        return (
          <div className="space-y-2 text-xs text-gray-600">
            <Check ok={kycPassed} label="Identity verified" />
            <Check ok={allSigned} label="All documents signed" />
            <Check ok={allSealed} label="Seal applied" />
            <Check ok={!!journalEntry} label="Journal entry written" />
            <p className="pt-1">Finalizing captures the fee, releases the sealed documents to the signer, and ends the recording.</p>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-navy-800 text-white">
      {/* Session header */}
      <header className="flex items-center justify-between px-6 py-3 bg-navy-700 border-b border-navy-600">
        <div className="flex items-center gap-3">
          <div className={`h-3 w-3 rounded-full ${status === 'in_session' ? 'bg-red-500 animate-pulse' : 'bg-amber-400'}`} />
          <span className="text-sm font-semibold">Live Session</span>
          <Badge variant="gold">{session?.document_type?.replace(/_/g, ' ') || 'Session'}</Badge>
          <span className="text-xs text-gray-300">{signers[0]?.full_legal_name}{signers.length > 1 ? ` +${signers.length - 1}` : ''}  |  {session?.state_of_act}</span>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={toggleRecording}
            disabled={recordingBusy || !token || status !== 'in_session'}
            className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium transition-all disabled:opacity-50 ${
              recording ? 'bg-red-500/20 text-red-300 border border-red-500/50' : 'bg-white/10 hover:bg-white/20'
            }`}
          >
            {recording ? <Square className="h-3 w-3 fill-current" /> : <Circle className="h-3 w-3 fill-red-500 text-red-500" />}
            {recording ? 'Stop Recording' : 'Start Recording'}
          </button>
          <div className="text-xs text-gray-400">Session ID: {sessionId.slice(0, 8)}...</div>
        </div>
      </header>

      <div className="flex h-[calc(100vh-52px)]">
        {/* Left: Video */}
        <div className="flex-1 relative bg-navy-900">
          {joinError ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <p className="text-sm text-red-400">{joinError}</p>
            </div>
          ) : (
            <SessionVideo token={token} serverUrl={serverUrl} className="absolute inset-0" onLeave={() => router.push('/dashboard')} />
          )}
          {status === 'matched_to_notary' && (
            <div className="absolute top-4 left-4 right-4 flex items-center justify-between rounded-legal bg-black/60 px-4 py-3">
              <div className="text-sm">Signer is waiting. Start the session when you are ready to begin the notarial act.</div>
              <Button variant="gold" size="sm" onClick={startSession} loading={busy}>
                <Play className="h-4 w-4" /> Start Session
              </Button>
            </div>
          )}
        </div>

        {/* Right: Workflow panel */}
        <div className="w-[26rem] bg-white text-gray-900 flex flex-col border-l border-gray-200">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="font-display text-lg font-semibold text-navy-700">Session Workflow</h2>
            <p className="text-xs text-gray-400 mt-0.5">Complete each step to finalize the notarization.</p>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-4">
            <div className="space-y-2">
              {WORKFLOW_STEPS.map((step, i) => {
                const Icon = step.icon;
                const isActive = i === currentStep;
                const isDone = i < currentStep;
                return (
                  <div key={step.id}>
                    <button
                      onClick={() => isDone && setCurrentStep(i)}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-legal border transition-all text-left ${
                        isActive ? 'border-gold-300 bg-gold-50 shadow-legal-sm' :
                        isDone ? 'border-emerald-200 bg-emerald-50/50' :
                        'border-gray-100 bg-gray-50'
                      }`}
                    >
                      <div className={`flex h-8 w-8 items-center justify-center rounded-full flex-shrink-0 ${
                        isDone ? 'bg-emerald-500 text-white' : isActive ? 'bg-gold-300 text-navy-800' : 'bg-gray-200 text-gray-400'
                      }`}>
                        {isDone ? <CheckCircle className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                      </div>
                      <div className={`flex-1 text-sm font-medium ${isDone ? 'text-emerald-700' : isActive ? 'text-navy-700' : 'text-gray-400'}`}>
                        {step.label}
                      </div>
                      {isActive && <ChevronRight className="h-4 w-4 text-gold-500" />}
                    </button>
                    {isActive && <div className="mt-2 mb-3 px-1">{renderStepBody()}</div>}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="px-6 py-4 border-t border-gray-100 space-y-2">
            {error && (
              <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                <AlertTriangle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" /> {error}
              </div>
            )}
            {status !== 'in_session' && status !== 'completed' && (
              <p className="text-xs text-gray-400">Start the session to unlock the workflow.</p>
            )}
            <Button variant="gold" className="w-full" onClick={advanceStep} disabled={!canAdvance || busy} loading={busy}>
              {nextLabel}
              {currentStep === 5 ? <CheckCircle className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-gray-400">{k}</span>
      <span className="text-gray-800 text-right">{v}</span>
    </div>
  );
}

function Check({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2">
      {ok ? <CheckCircle className="h-4 w-4 text-emerald-500" /> : <Circle className="h-4 w-4 text-gray-300" />}
      <span className={ok ? 'text-gray-800' : 'text-gray-400'}>{label}</span>
    </div>
  );
}
