'use client';

import { useEffect, useState } from 'react';
import { useSessionWizard } from '@/lib/store';
import * as api from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Users, Plus, X, MapPin, ShieldCheck, AlertTriangle } from 'lucide-react';

const US_STATES: [string, string][] = [
  ['AL','Alabama'],['AK','Alaska'],['AZ','Arizona'],['AR','Arkansas'],['CA','California'],['CO','Colorado'],['CT','Connecticut'],['DE','Delaware'],['DC','District of Columbia'],['FL','Florida'],['GA','Georgia'],['HI','Hawaii'],['ID','Idaho'],['IL','Illinois'],['IN','Indiana'],['IA','Iowa'],['KS','Kansas'],['KY','Kentucky'],['LA','Louisiana'],['ME','Maine'],['MD','Maryland'],['MA','Massachusetts'],['MI','Michigan'],['MN','Minnesota'],['MS','Mississippi'],['MO','Missouri'],['MT','Montana'],['NE','Nebraska'],['NV','Nevada'],['NH','New Hampshire'],['NJ','New Jersey'],['NM','New Mexico'],['NY','New York'],['NC','North Carolina'],['ND','North Dakota'],['OH','Ohio'],['OK','Oklahoma'],['OR','Oregon'],['PA','Pennsylvania'],['RI','Rhode Island'],['SC','South Carolina'],['SD','South Dakota'],['TN','Tennessee'],['TX','Texas'],['UT','Utah'],['VT','Vermont'],['VA','Virginia'],['WA','Washington'],['WV','West Virginia'],['WI','Wisconsin'],['WY','Wyoming'],
];

export function StepSigners() {
  const { data, setSignerCount, updateSigner, setStateOfAct, setSessionId, setCustomerId, sessionId, nextStep, prevStep } = useSessionWizard();
  const [rules, setRules] = useState<any | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setRules(null);
    api.getStateRules(data.stateOfAct).then((res) => { if (!cancelled) setRules(res.data || null); });
    return () => { cancelled = true; };
  }, [data.stateOfAct]);

  const handleContinue = async () => {
    if (sessionId) { nextStep(); return; }
    setSubmitting(true);
    setError(null);
    const res = await api.createSession(data);
    setSubmitting(false);
    if (res.error || !res.data) { setError(res.error || 'Could not start the session'); return; }
    setSessionId(res.data.session.id);
    setCustomerId(res.data.customerId);
    nextStep();
  };

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

      <Card className="mb-4">
        <div className="flex items-center gap-2 mb-3">
          <MapPin className="h-4 w-4 text-gold-500" />
          <span className="text-sm font-medium text-navy-700">Where is the primary signer located?</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">State</label>
            <select
              value={data.stateOfAct}
              onChange={(e) => setStateOfAct(e.target.value)}
              disabled={!!sessionId}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-gold-400 focus:outline-none focus:ring-1 focus:ring-gold-400"
            >
              {US_STATES.map(([code, name]) => (
                <option key={code} value={code}>{name}</option>
              ))}
            </select>
          </div>
          <div className="text-xs text-gray-600 sm:pt-6">
            {rules ? (
              rules.ron_authorized ? (
                <div className="flex items-start gap-2">
                  <ShieldCheck className="h-4 w-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="font-medium text-gray-800">Remote notarization is authorized in {rules.state_name}</div>
                    <div className="mt-0.5">{rules.governing_statute}. {rules.kba_required ? `Identity quiz required (${rules.kba_min_correct} of ${rules.kba_min_questions} correct).` : 'No identity quiz required.'} {rules.recording_required ? `Session recorded and retained ${rules.recording_retention_years} years.` : ''}</div>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="font-medium text-gray-800">{rules.state_name} does not yet authorize remote online notarization</div>
                    <div className="mt-0.5">You can continue; a notary commissioned in a RON state will perform the act under that state&apos;s law where your document allows it.</div>
                  </div>
                </div>
              )
            ) : (
              <span className="text-gray-400">Loading state rules...</span>
            )}
          </div>
        </div>
      </Card>

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

      {error && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <div className="flex items-center justify-between mt-8">
        <Button variant="ghost" onClick={prevStep}>Back</Button>
        <Button variant="gold" onClick={handleContinue} disabled={!isValid || submitting}>
          {submitting ? 'Starting session...' : 'Continue'}
        </Button>
      </div>
    </div>
  );
}
