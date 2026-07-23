'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import * as api from '@/lib/api';
import {
  Video, Mic, MicOff, VideoOff, Phone,
  ShieldCheck, FileText, PenTool, Stamp, BookOpen, CheckCircle,
  ChevronRight,
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
  const sessionId = params.id as string;
  const [currentStep, setCurrentStep] = useState(0);
  const [session, setSession] = useState<any>(null);
  const [videoOn, setVideoOn] = useState(true);
  const [audioOn, setAudioOn] = useState(true);

  useEffect(() => {
    api.getSessionById(sessionId).then(setSession);
  }, [sessionId]);

  const advanceStep = async () => {
    if (currentStep === 3) {
      // Apply seal
      await api.applySeal(sessionId, session?.documentId ?? sessionId, {});
    }
    if (currentStep === 4) {
      // Confirm journal
      await api.confirmJournalEntry(sessionId);
    }
    if (currentStep === 5) {
      // Complete session
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
          <Badge variant="gold">{session?.documentType?.replace(/_/g, ' ') || 'Loading...'}</Badge>
        </div>
        <div className="text-xs text-gray-400">
          Session ID: {sessionId.slice(0, 8)}...
        </div>
      </header>

      <div className="flex h-[calc(100vh-52px)]">
        {/* Left: Video */}
        <div className="flex-1 relative flex items-center justify-center bg-navy-900">
          <div className="text-center">
            <Video className="h-16 w-16 text-gray-600 mx-auto mb-4" />
            <p className="text-sm text-gray-500">LiveKit video session active</p>
            <p className="text-xs text-gray-600 mt-1">Encrypted and recording</p>
          </div>

          {/* Video controls */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-3">
            <button
              onClick={() => setAudioOn(!audioOn)}
              className={`flex h-12 w-12 items-center justify-center rounded-full transition-all ${
                audioOn ? 'bg-white/10 hover:bg-white/20' : 'bg-red-500'
              }`}
            >
              {audioOn ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
            </button>
            <button
              onClick={() => setVideoOn(!videoOn)}
              className={`flex h-12 w-12 items-center justify-center rounded-full transition-all ${
                videoOn ? 'bg-white/10 hover:bg-white/20' : 'bg-red-500'
              }`}
            >
              {videoOn ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
            </button>
            <button className="flex h-12 w-12 items-center justify-center rounded-full bg-red-600 hover:bg-red-700 transition-all">
              <Phone className="h-5 w-5 rotate-[135deg]" />
            </button>
          </div>
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
