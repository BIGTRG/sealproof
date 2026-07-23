'use client';

/**
 * Step 1: Personal info + commission details.
 * State-dynamic: selecting a commission state loads that state's RON rules
 * from state-compliance-svc and drives labels, required fields, and the
 * Step 2 document checklist.
 */
import { useEffect, useState } from 'react';
import { useOnboardingStore } from '@/lib/store';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

const money = (cents?: number | null) =>
  cents ? `$${(cents / 100).toLocaleString('en-US')}` : '';

export function OnboardStep1Personal() {
  const { updateData, nextStep, data } = useOnboardingStore();
  const [states, setStates] = useState<any[]>([]);
  const [form, setForm] = useState({
    firstName: (data.firstName as string) || '',
    lastName: (data.lastName as string) || '',
    email: (data.email as string) || '',
    phone: (data.phone as string) || '',
    address: (data.address as string) || '',
    city: (data.city as string) || '',
    state: (data.state as string) || 'NC',
    zip: (data.zip as string) || '',
    county: (data.county as string) || '',
    commissionNumber: (data.commissionNumber as string) || '',
    commissionExpiry: (data.commissionExpiry as string) || '',
    electronicNotaryId: (data.electronicNotaryId as string) || '',
    renAuthorizationId: (data.renAuthorizationId as string) || '',
  });

  useEffect(() => {
    fetch('/api/compliance/api/state-rules')
      .then((r) => r.json())
      .then((j) => setStates(j.data || []))
      .catch(() => setStates([]));
  }, []);

  const rules = states.find((s) => s.state_code === form.state) || null;
  const stateName = rules?.state_name || form.state;
  const ronAuthorized = rules ? rules.ron_authorized : true;
  const needsENotaryReg = rules ? rules.enotary_registration_required !== false : true;
  const bondTotal =
    (rules?.bond_amount_cents || 0) + (rules?.ron_bond_additional_cents || 0);

  const update = (key: string, value: string) => setForm({ ...form, [key]: value });

  const canProceed =
    ronAuthorized &&
    form.firstName &&
    form.lastName &&
    form.email &&
    form.commissionNumber &&
    form.commissionExpiry &&
    (!needsENotaryReg || form.electronicNotaryId) &&
    form.renAuthorizationId;

  const handleNext = () => {
    updateData({ ...form, stateRules: rules });
    nextStep();
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Personal Information</h2>
        <p className="mt-1 text-sm text-gray-500">
          Enter your details and your notary commission information. Requirements update
          based on your commission state.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input label="First name *" value={form.firstName} onChange={(e) => update('firstName', e.target.value)} />
        <Input label="Last name *" value={form.lastName} onChange={(e) => update('lastName', e.target.value)} />
        <Input label="Email *" type="email" value={form.email} onChange={(e) => update('email', e.target.value)} />
        <Input label="Phone" type="tel" value={form.phone} onChange={(e) => update('phone', e.target.value)} />
        <Input label="Address" value={form.address} onChange={(e) => update('address', e.target.value)} className="col-span-full" />
        <Input label="City" value={form.city} onChange={(e) => update('city', e.target.value)} />
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Commission State *</label>
          <select
            value={form.state}
            onChange={(e) => update('state', e.target.value)}
            className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 focus:border-gold-400 focus:outline-none focus:ring-1 focus:ring-gold-400"
          >
            {states.length === 0 && <option value={form.state}>{form.state}</option>}
            {states.map((s) => (
              <option key={s.state_code} value={s.state_code}>
                {s.state_name}
              </option>
            ))}
          </select>
        </div>
        <Input label="ZIP" value={form.zip} onChange={(e) => update('zip', e.target.value)} />
        <Input label="County *" value={form.county} onChange={(e) => update('county', e.target.value)} />
      </div>

      {!ronAuthorized && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Remote online notarization is not currently authorized in {stateName}. We cannot
          onboard notaries commissioned in this state yet.
        </div>
      )}

      {rules && ronAuthorized && (
        <div className="rounded-lg border border-gold-200 bg-brand-50 p-4">
          <p className="text-sm font-semibold text-gray-900 mb-2">
            {stateName} RON requirements
          </p>
          <ul className="text-xs text-gray-600 space-y-1 list-disc list-inside">
            <li>Active {stateName} notary commission</li>
            {needsENotaryReg && <li>Electronic notary registration with the state</li>}
            <li>Remote online notarization authorization</li>
            {rules.bond_required ? (
              <li>
                {money(bondTotal)} surety bond
                {rules.ron_bond_additional_cents
                  ? ` (${money(rules.bond_amount_cents)} standard + ${money(rules.ron_bond_additional_cents)} RON)`
                  : ''}
              </li>
            ) : (
              <li>No surety bond required in {stateName}</li>
            )}
            {rules.eo_required ? (
              <li>E&amp;O insurance, {money(rules.eo_min_amount_cents)} minimum</li>
            ) : (
              <li>E&amp;O insurance recommended</li>
            )}
            {rules.governing_statute && <li>Governed by {rules.governing_statute}</li>}
          </ul>
        </div>
      )}

      <div className="border-t border-gray-200 pt-5">
        <h3 className="text-base font-semibold text-gray-900 mb-3">{stateName} Commission Details</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Commission Number *"
            value={form.commissionNumber}
            onChange={(e) => update('commissionNumber', e.target.value)}
            placeholder={`${form.state}-XXXXXX`}
          />
          <Input
            label="Commission Expiry *"
            type="date"
            value={form.commissionExpiry}
            onChange={(e) => update('commissionExpiry', e.target.value)}
          />
          <Input
            label={needsENotaryReg ? 'Electronic Notary ID *' : 'Electronic Notary ID'}
            value={form.electronicNotaryId}
            onChange={(e) => update('electronicNotaryId', e.target.value)}
            helperText={needsENotaryReg ? `Required by ${stateName}` : 'If issued by your state'}
          />
          <Input
            label="RON Authorization ID *"
            value={form.renAuthorizationId}
            onChange={(e) => update('renAuthorizationId', e.target.value)}
            helperText="Remote online notarization authorization"
          />
        </div>
      </div>

      <div className="flex justify-end">
        <Button onClick={handleNext} disabled={!canProceed} size="lg">
          Continue to Documents
        </Button>
      </div>
    </div>
  );
}
