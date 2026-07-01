'use client';

import { useState, useEffect } from 'react';
import { useSessionWizard } from '@/lib/store';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import * as api from '@/lib/api';
import type { KbaQuestion } from '@/types';
import { ShieldCheck, AlertTriangle, CheckCircle, HelpCircle } from 'lucide-react';

type KbaState = 'loading' | 'questions' | 'submitting' | 'passed' | 'failed' | 'error';

/**
 * Step 6 — Knowledge-Based Authentication (KBA)
 * Required by most RON states. 5 questions from credit/public records.
 * Signer must answer 4/5 correctly. 2 attempts max.
 */
export function StepKBA() {
  const { nextStep, prevStep, sessionId, data } = useSessionWizard();
  const [state, setState] = useState<KbaState>('loading');
  const [questions, setQuestions] = useState<KbaQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [canRetry, setCanRetry] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const primarySigner = data.signers.find((s) => s.isPrimary) || data.signers[0];

  useEffect(() => {
    if (!sessionId) return;
    startKbaSession();
  }, [sessionId]);

  async function startKbaSession() {
    setState('loading');
    setAnswers({});
    const res = await api.startKba(sessionId!, primarySigner?.id || 'primary');
    if (res.data) {
      setQuestions(res.data.questions || []);
      setState('questions');
    } else {
      setErrorMsg(res.error || 'Could not start identity verification.');
      setState('error');
    }
  }

  async function handleSubmit() {
    if (!sessionId) return;
    setState('submitting');
    const res = await api.submitKbaAnswers(sessionId, answers);
    if (res.data) {
      if (res.data.result === 'pass') {
        setState('passed');
      } else {
        setCanRetry(res.data.can_retry);
        setState('failed');
      }
    } else {
      setErrorMsg(res.error || 'Submission failed.');
      setState('error');
    }
  }

  const allAnswered = questions.length > 0 && questions.every((q) => answers[q.id]);

  // ─── Passed ────────────────────────────────────────────────
  if (state === 'passed') {
    return (
      <Card className="text-center py-12">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 border border-emerald-200 mx-auto mb-5">
          <CheckCircle className="h-7 w-7 text-emerald-500" />
        </div>
        <h2 className="font-display text-xl font-semibold text-navy-700">Identity Verified</h2>
        <p className="text-sm text-gray-500 mt-2 max-w-sm mx-auto">
          You have successfully passed knowledge-based authentication.
        </p>
        <div className="mt-8">
          <Button variant="gold" onClick={nextStep}>Continue to Payment</Button>
        </div>
      </Card>
    );
  }

  // ─── Failed (no more retries) ──────────────────────────────
  if (state === 'failed' && !canRetry) {
    return (
      <Card className="text-center py-12">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-50 border border-red-200 mx-auto mb-5">
          <AlertTriangle className="h-7 w-7 text-red-500" />
        </div>
        <h2 className="font-display text-xl font-semibold text-navy-700">Verification Failed</h2>
        <p className="text-sm text-gray-500 mt-2 max-w-sm mx-auto">
          You were unable to pass knowledge-based authentication.
          For security reasons, this session cannot proceed. You have not been charged.
        </p>
        <div className="mt-8">
          <Button variant="outline" onClick={prevStep}>Go Back</Button>
        </div>
      </Card>
    );
  }

  // ─── Failed (can retry) ────────────────────────────────────
  if (state === 'failed' && canRetry) {
    return (
      <Card className="text-center py-12">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-50 border border-amber-200 mx-auto mb-5">
          <AlertTriangle className="h-7 w-7 text-amber-500" />
        </div>
        <h2 className="font-display text-xl font-semibold text-navy-700">Incorrect Answers</h2>
        <p className="text-sm text-gray-500 mt-2 max-w-sm mx-auto">
          Some answers were incorrect. You have one more attempt to verify your identity.
        </p>
        <div className="mt-8">
          <Button variant="gold" onClick={startKbaSession}>Try Again</Button>
        </div>
      </Card>
    );
  }

  // ─── Loading or Error ──────────────────────────────────────
  if (state === 'loading') {
    return (
      <Card className="text-center py-12">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-50 border border-brand-200 mx-auto mb-5 animate-pulse">
          <ShieldCheck className="h-7 w-7 text-gold-500" />
        </div>
        <h2 className="font-display text-xl font-semibold text-navy-700">Preparing Verification</h2>
        <p className="text-sm text-gray-500 mt-2">Generating your identity questions...</p>
      </Card>
    );
  }

  if (state === 'error') {
    return (
      <Card className="text-center py-12">
        <AlertTriangle className="h-10 w-10 text-red-400 mx-auto mb-4" />
        <h2 className="font-display text-xl font-semibold text-navy-700">Error</h2>
        <p className="text-sm text-gray-500 mt-2">{errorMsg}</p>
        <div className="mt-8 flex justify-center gap-3">
          <Button variant="outline" onClick={prevStep}>Go Back</Button>
          <Button variant="primary" onClick={startKbaSession}>Retry</Button>
        </div>
      </Card>
    );
  }

  // ─── Questions ─────────────────────────────────────────────
  return (
    <div>
      <div className="mb-8 text-center">
        <h2 className="font-display text-xl font-semibold text-navy-700">
          Knowledge-Based Authentication
        </h2>
        <p className="text-sm text-gray-500 mt-2 max-w-md mx-auto">
          Answer these questions to verify your identity. These are generated from
          public records and are required by state notarization law.
        </p>
      </div>

      <div className="space-y-6">
        {questions.map((q, idx) => (
          <Card key={q.id}>
            <div className="flex items-start gap-3 mb-4">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-50 border border-brand-200 text-xs font-semibold text-gold-600 flex-shrink-0">
                {idx + 1}
              </div>
              <p className="text-sm font-medium text-navy-700 pt-0.5">{q.text}</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 ml-10">
              {q.choices.map((choice) => (
                <button
                  key={choice.id}
                  onClick={() => setAnswers({ ...answers, [q.id]: choice.id })}
                  className={`text-left px-4 py-3 rounded-legal border text-sm transition-all ${
                    answers[q.id] === choice.id
                      ? 'border-gold-300 bg-gold-50 text-navy-700 font-medium shadow-legal-sm'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {choice.text}
                </button>
              ))}
            </div>
          </Card>
        ))}
      </div>

      <div className="flex items-center justify-between mt-8">
        <Button variant="ghost" onClick={prevStep}>Back</Button>
        <Button
          variant="gold"
          onClick={handleSubmit}
          disabled={!allAnswered}
          loading={state === 'submitting'}
        >
          Submit Answers
        </Button>
      </div>
    </div>
  );
}
