'use client';

import { useState } from 'react';
import { useSessionWizard, useTenantStore } from '@/lib/store';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import * as api from '@/lib/api';
import { CreditCard, Lock, CheckCircle } from 'lucide-react';

/**
 * Step 7 — Payment Authorization
 * Collects payment method and places an authorization hold via TRG Pay.
 */
export function StepPayment() {
  const { data, sessionId, nextStep, prevStep } = useSessionWizard();
  const { branding } = useTenantStore();
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');

  const price = data.serviceLevel === 'rush'
    ? (branding?.b2cRushPriceCents ?? 4500)
    : (branding?.b2cStandardPriceCents ?? 2500);

  const handlePay = async () => {
    if (!sessionId) return;
    setProcessing(true);
    setError('');

    // In production, collect payment method from TRG Pay widget / Stripe Elements
    const res = await api.initiatePayment(sessionId, 'demo_payment_method');
    if (res.data) {
      nextStep();
    } else {
      setError(res.error || 'Payment failed. Please try again.');
    }
    setProcessing(false);
  };

  return (
    <div>
      <div className="text-center mb-8">
        <h2 className="font-display text-xl font-semibold text-navy-700">
          Payment Authorization
        </h2>
        <p className="text-sm text-gray-500 mt-2">
          A hold will be placed on your card. You are only charged after the session completes.
        </p>
      </div>

      <Card className="max-w-lg mx-auto">
        {/* Summary */}
        <div className="mb-6 pb-6 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-navy-700 mb-3">Session Summary</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Document Type</span>
              <span className="text-navy-700 font-medium capitalize">{data.documentType.replace(/_/g, ' ')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Service Level</span>
              <span className="text-navy-700 font-medium capitalize">{data.serviceLevel}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Signers</span>
              <span className="text-navy-700 font-medium">{data.signerCount}</span>
            </div>
          </div>
          <div className="divider-gold mt-4 mb-4" />
          <div className="flex justify-between items-baseline">
            <span className="text-sm font-semibold text-navy-700">Authorization Amount</span>
            <span className="text-2xl font-display font-bold text-navy-700">
              ${(price / 100).toFixed(2)}
            </span>
          </div>
        </div>

        {/* Card form placeholder (TRG Pay / Stripe Elements mounts here) */}
        <div className="space-y-4 mb-6">
          <Input label="Cardholder Name" placeholder="Name on card" />
          <Input label="Card Number" placeholder="4242 4242 4242 4242" />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Expiry" placeholder="MM / YY" />
            <Input label="CVC" placeholder="123" />
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-gray-400 mb-6">
          <Lock className="h-3.5 w-3.5" />
          <span>Encrypted and processed securely by TRG Pay.</span>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-legal px-4 py-3 text-sm text-red-700 mb-6">
            {error}
          </div>
        )}

        <Button variant="gold" className="w-full" onClick={handlePay} loading={processing}>
          <CreditCard className="h-4 w-4" />
          Authorize ${(price / 100).toFixed(2)}
        </Button>
      </Card>

      <div className="flex items-center justify-between mt-8">
        <Button variant="ghost" onClick={prevStep}>Back</Button>
        <div />
      </div>
    </div>
  );
}
