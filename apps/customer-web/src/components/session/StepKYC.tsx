'use client';

import { useState, useEffect } from 'react';
import { useSessionWizard } from '@/lib/store';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import * as api from '@/lib/api';
import { Scan, CheckCircle, AlertTriangle, Loader2 } from 'lucide-react';

type KycState = 'idle' | 'initiating' | 'pending' | 'approved' | 'failed';

/**
 * Step 5 — Credential Analysis (Persona KYC)
 * Government-issued photo ID scan + facial match.
 */
export function StepKYC() {
  const { sessionId, nextStep, prevStep } = useSessionWizard();
  const [state, setState] = useState<KycState>('idle');
  const [inquiryUrl, setInquiryUrl] = useState<string | null>(null);

  const initiate = async () => {
    if (!sessionId) return;
    setState('initiating');
    const res = await api.initiateKyc(sessionId);
    if (res.data) {
      setInquiryUrl(res.data.inquiryUrl);
      setState('pending');
      // Open Persona in new tab/iframe
      if (res.data.inquiryUrl) {
        window.open(res.data.inquiryUrl, '_blank');
      }
      pollKycStatus();
    } else {
      setState('failed');
    }
  };

  const pollKycStatus = () => {
    const interval = setInterval(async () => {
      if (!sessionId) return;
      const res = await api.getKycStatus(sessionId);
      if (res.data?.status === 'approved') {
        setState('approved');
        clearInterval(interval);
      } else if (res.data?.status === 'failed' || res.data?.status === 'declined') {
        setState('failed');
        clearInterval(interval);
      }
    }, 5000);

    // Clean up after 10 minutes
    setTimeout(() => clearInterval(interval), 600_000);
  };

  if (state === 'approved') {
    return (
      <Card className="text-center py-12">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 border border-emerald-200 mx-auto mb-5">
          <CheckCircle className="h-7 w-7 text-emerald-500" />
        </div>
        <h2 className="font-display text-xl font-semibold text-navy-700">Identity Verified</h2>
        <p className="text-sm text-gray-500 mt-2">
          Your government ID has been verified successfully.
        </p>
        <div className="mt-8">
          <Button variant="gold" onClick={nextStep}>Continue to KBA</Button>
        </div>
      </Card>
    );
  }

  if (state === 'failed') {
    return (
      <Card className="text-center py-12">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-50 border border-red-200 mx-auto mb-5">
          <AlertTriangle className="h-7 w-7 text-red-500" />
        </div>
        <h2 className="font-display text-xl font-semibold text-navy-700">Verification Failed</h2>
        <p className="text-sm text-gray-500 mt-2 max-w-sm mx-auto">
          We were unable to verify your identity. Please try again with a clear photo of your government-issued ID.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Button variant="outline" onClick={prevStep}>Go Back</Button>
          <Button variant="primary" onClick={initiate}>Try Again</Button>
        </div>
      </Card>
    );
  }

  if (state === 'pending') {
    return (
      <Card className="text-center py-12">
        <Loader2 className="h-10 w-10 text-gold-400 mx-auto mb-5 animate-spin" />
        <h2 className="font-display text-xl font-semibold text-navy-700">Verifying Your ID</h2>
        <p className="text-sm text-gray-500 mt-2 max-w-sm mx-auto">
          Complete the identity check in the window that opened.
          This page will update automatically once verification is complete.
        </p>
      </Card>
    );
  }

  return (
    <div>
      <div className="text-center mb-8">
        <h2 className="font-display text-xl font-semibold text-navy-700">
          Verify your identity
        </h2>
        <p className="text-sm text-gray-500 mt-2 max-w-md mx-auto">
          State law requires identity verification before a notarization session.
          You will scan your government-issued photo ID and take a quick selfie for facial match.
        </p>
      </div>

      <Card className="text-center py-10">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-50 border border-brand-200 mx-auto mb-5">
          <Scan className="h-7 w-7 text-gold-500" />
        </div>
        <h3 className="text-base font-semibold text-navy-700 mb-2">Government Photo ID Required</h3>
        <p className="text-sm text-gray-500 max-w-sm mx-auto mb-6">
          Have your driver&apos;s license, passport, or state ID ready.
          The process takes about 60 seconds.
        </p>
        <Button variant="gold" onClick={initiate} loading={state === 'initiating'}>
          Start ID Verification
        </Button>
      </Card>

      <div className="flex items-center justify-between mt-8">
        <Button variant="ghost" onClick={prevStep}>Back</Button>
        <div />
      </div>
    </div>
  );
}
