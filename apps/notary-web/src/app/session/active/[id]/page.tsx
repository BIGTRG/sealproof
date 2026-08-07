'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import * as api from '@/lib/api';
import { SessionVideo } from '@/components/session/SessionVideo';
import {
  ShieldCheck, FileText, PenTool, Stamp, BookOpen, CheckCircle,
  ChevronRight, Circle, Square,
} from 'lucide-react';

const WORKFLOW_STEPS = [
  { id: 'verify',     label: 'Verify Identity',     icon: ShieldCheck },
  { id: 'review',     label: 'Review Documents',     icon: FileText },
  { id: 'signatures', label: 'Capture Signatures',   icon: PenTool },
  { id: 'seal',       label: 'Apply Seal',           icon: Stamp },
  { id: 'journal',    label: 'Confirm Journal',      icon: BookOpen },
  { id: 'complete',   label: 'Complete Session',     icon: CheckCircle },
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
  const serverUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL || '';

  useEffect(() => {
    api.getSessionById(sessionId).then(setSession);

    let cancelled = false;
    const join = async () => {
      try {
        await api.createLivekitRoom(sessionId).catch(() => undefined);
        const res = await api.getLivekitToken(sessionId, {
          identity: `notary-${sessionId}`,
          name: 'Notary',
          role: 'notary',
        });
        if (!cancelled && res?.data?.token) {
          setToken(res.data.token);
        } else if (!cancelled) {
          setJoinError('Could not join the video room. Refresh to retry.');
        }
      } catch {
        if (!cancelled) setJoinError('Could not join the video room. Refresh to retry.');
      }
    };
    join();
    return () => { cancelled = true; };
  }, [sessionId]);

  const toggleRecording = useCallback(async () => {
    if (recordingBusy) return;
    setRecordingBusy(true);
    try {
      if (recording) {
        await api.stopSessionRecording(sessionId);
        setRecording(false);
      } else {
        await api.startSessionRecording(sessionId);
        setRecording(true);
      }
    } finally {
      setRecordingBusy(false);
    }
  }, [recording, recordingBusy, sessionId]);

  const advanceStep = async () => {
    if (currentStep === 3) {
      await api.applySeal(sessionId, session?.documentId ?? sessionId, {});
    }
    if (currentStep === 4) {
      await api.confirmJournalEntry(sessionId);
    }
    if (currentStep === 5) {
      if (recording) await api.stopSessionRecording(sessionId).catch(() => undefined);
      await api.completeSession(sessionId);
    }
    setCurrentStep(Math.min(currentStep + 1, WORKFLOW_STEPS.length - 1));
  };

  return (
    <div className="min-h-screen bg-navy-800 text-white">
      {/* Session header */}
      <header className="flex items-center justify-between px-6 py-3 bg-navy-700 border-b border-navy-600">
        <div className="flex items-center gap-3">
          <div className="h-3 w-3 rounded-full bg-red-500 animate-pulse" />
          <span className="text-sm font-semibold">Live Session</span>
          <Badge variant="gold">{session?.documentType?.replace(/_/g, ' ') || 'Session'}</Badge>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={toggleRecording}
            disabled={recordingBusy || !token}
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
            <SessionVideo
              token={token}
              serverUrl={serverUrl}
              className="absolute inset-0"
              onLeave={() => router.push('/dashboard')}
            />
          )}
        </div>

        {/* Right: Workflow panel */}
        <div className="w-96 bg-white text-gray-900 flex flex-col border-l border-gray-200">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="font-display text-lg font-semibold text-navy-700">Session Workflow</h2>
            <p className="text-xs text-gray-400 mt-0.5">Complete each step to finalize the notarization.</p>
          </div>

          {/* Steps */}
          <div className="flex-1 overflow-y-auto px-6 py-4">
            <div className="space-y-3">
              {WORKFLOW_STEPS.map((step, i) => {
                const Icon = step.icon;
                const isActive = i === currentStep;
                const isDone = i < currentStep;

                return (
                  <div
                    key={step.id}
                    className={`flex items-center gap-3 px-4 py-3 rounded-legal border transition-all ${
                      isActive ? 'border-gold-300 bg-gold-50 shadow-legal-sm' :
                      isDone ? 'border-emerald-200 bg-emerald-50/50' :
                      'border-gray-100 bg-gray-50'
                    }`}
                  >
                    <div className={`flex h-8 w-8 items-center justify-center rounded-full flex-shrink-0 ${
                      isDone ? 'bg-emerald-500 text-white' :
                      isActive ? 'bg-gold-300 text-navy-800' :
                      'bg-gray-200 text-gray-400'
                    }`}>
                      {isDone ? (
                        <CheckCircle className="h-4 w-4" />
                      ) : (
                        <Icon className="h-4 w-4" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className={`text-sm font-medium ${
                        isDone ? 'text-emerald-700' :
                        isActive ? 'text-navy-700' :
                        'text-gray-400'
                      }`}>
                        {step.label}
                      </div>
                    </div>
                    {isDone && <CheckCircle className="h-4 w-4 text-emerald-500" />}
                    {isActive && <ChevronRight className="h-4 w-4 text-gold-500" />}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Action button */}
          <div className="px-6 py-4 border-t border-gray-100">
            {currentStep < WORKFLOW_STEPS.length - 1 ? (
              <Button variant="gold" className="w-full" onClick={advanceStep}>
                {WORKFLOW_STEPS[currentStep + 1]?.label || 'Next'}
                <ChevronRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button variant="gold" className="w-full" onClick={advanceStep}>
                Finalize Session
                <CheckCircle className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
