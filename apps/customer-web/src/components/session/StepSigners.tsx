'use client';

import { useSessionWizard } from '@/lib/store';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Users, Plus, X } from 'lucide-react';

export function StepSigners() {
  const { data, setSignerCount, updateSigner, nextStep, prevStep } = useSessionWizard();

  const addSigner = () => setSignerCount(Math.min(data.signerCount + 1, 4));
  const removeSigner = (i: number) => {
    if (data.signerCount <= 1) return;
    setSignerCount(data.signerCount - 1);
  };

  const isValid = data.signers.every((s) => s.name.trim() && s.email.trim());

  return (
    <div>
      <div className="text-center mb-8">
        <h2 className="font-display text-xl font-semibold text-navy-700">
          Who is signing?
        </h2>
        <p className="text-sm text-gray-500 mt-2">
          Add each person who needs to sign the document. Each signer will verify their identity.
        </p>
      </div>

      <div className="space-y-4">
        {data.signers.map((signer, i) => (
          <Card key={i}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-50 border border-brand-200 text-xs font-semibold text-gold-600">
                  {i + 1}
                </div>
                <span className="text-sm font-medium text-navy-700">
                  {signer.isPrimary ? 'Primary Signer (You)' : `Signer ${i + 1}`}
                </span>
              </div>
              {!signer.isPrimary && data.signerCount > 1 && (
                <button onClick={() => removeSigner(i)} className="text-gray-400 hover:text-red-500 transition-colors">
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Input
                label="Full Name"
                placeholder="John Doe"
                value={signer.name}
                onChange={(e) => updateSigner(i, { name: e.target.value })}
              />
              <Input
                label="Email"
                type="email"
                placeholder="john@example.com"
                value={signer.email}
                onChange={(e) => updateSigner(i, { email: e.target.value })}
              />
              <Input
                label="Phone"
                type="tel"
                placeholder="(555) 000-0000"
                value={signer.phone}
                onChange={(e) => updateSigner(i, { phone: e.target.value })}
              />
            </div>
          </Card>
        ))}
      </div>

      {data.signerCount < 4 && (
        <button
          onClick={addSigner}
          className="mt-4 flex items-center gap-2 text-sm font-medium text-gold-500 hover:text-gold-600 transition-colors"
        >
          <Plus className="h-4 w-4" /> Add another signer
        </button>
      )}

      <div className="flex items-center justify-between mt-8">
        <Button variant="ghost" onClick={prevStep}>Back</Button>
        <Button variant="gold" onClick={nextStep} disabled={!isValid}>
          Continue
        </Button>
      </div>
    </div>
  );
}
