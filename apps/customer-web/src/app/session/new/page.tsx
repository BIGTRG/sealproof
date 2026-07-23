'use client';

import { useEffect } from 'react'; // TEMP-DEMO
import { useSessionWizard } from '@/lib/store';
import { StepIndicator } from '@/components/ui/ProgressBar';
import { StepDocumentType } from '@/components/session/StepDocumentType';
import { StepSigners } from '@/components/session/StepSigners';
import { StepUpload } from '@/components/session/StepUpload';
import { StepServiceLevel } from '@/components/session/StepServiceLevel';
import { StepKYC } from '@/components/session/StepKYC';
import { StepKBA } from '@/components/session/StepKBA';
import { StepPayment } from '@/components/session/StepPayment';
import { StepQueue } from '@/components/session/StepQueue';
import { StepLiveSession } from '@/components/session/StepLiveSession';
import { StepCompletion } from '@/components/session/StepCompletion';
import { Scale } from 'lucide-react';
import Link from 'next/link';

const STEPS = [
  'Document',
  'Signers',
  'Upload',
  'Service',
  'ID Check',
  'KBA',
  'Payment',
  'Queue',
  'Session',
  'Complete',
];

const stepComponents: Record<number, React.ComponentType> = {
  1: StepDocumentType,
  2: StepSigners,
  3: StepUpload,
  4: StepServiceLevel,
  5: StepKYC,
  6: StepKBA,
  7: StepPayment,
  8: StepQueue,
  9: StepLiveSession,
  10: StepCompletion,
};

export default function NewSessionPage() {
  const { step, setStep } = useSessionWizard();
  // TEMP-DEMO: allow ?step=N override for review screenshots -- remove before launch
  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get('step');
    if (q) setStep(parseInt(q, 10));
  }, [setStep]);
  const StepComponent = stepComponents[step] || StepDocumentType;

  return (
    <div className="min-h-screen bg-surface-alt">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 flex h-14 items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2">
            <Scale className="h-5 w-5 text-gold-400" />
            <span className="text-2xl font-script text-navy-700">Seal<span className="text-brand-300">Proof</span></span>
          </Link>
          <span className="text-sm text-gray-400">New Notarization Session</span>
        </div>
      </header>

      {/* Step indicator */}
      <div className="bg-white border-b border-gray-100 py-4">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <StepIndicator steps={STEPS} currentStep={step} />
        </div>
      </div>

      {/* Step content */}
      <main className="mx-auto max-w-3xl px-4 sm:px-6 py-10">
        <StepComponent />
      </main>
    </div>
  );
}
