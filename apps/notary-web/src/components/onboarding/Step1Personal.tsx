'use client';

/**
 * Step 1: Personal info + NC commission details
 */
import { useState } from 'react';
import { useOnboardingStore } from '@/lib/store';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

export function OnboardStep1Personal() {
  const { updateData, nextStep, data } = useOnboardingStore();
  const [form, setForm] = useState({
    firstName: (data.firstName as string) || '',
    lastName: (data.lastName as string) || '',
    email: (data.email as string) || '',
    phone: (data.phone as string) || '',
    address: (data.address as string) || '',
    city: (data.city as string) || '',
    state: 'NC',
    zip: (data.zip as string) || '',
    county: (data.county as string) || '',
    commissionNumber: (data.commissionNumber as string) || '',
    commissionExpiry: (data.commissionExpiry as string) || '',
    electronicNotaryId: (data.electronicNotaryId as string) || '',
    renAuthorizationId: (data.renAuthorizationId as string) || '',
  });

  const update = (key: string, value: string) => setForm({ ...form, [key]: value });

  const canProceed =
    form.firstName &&
    form.lastName &&
    form.email &&
    form.commissionNumber &&
    form.commissionExpiry &&
    form.electronicNotaryId &&
    form.renAuthorizationId;

  const handleNext = () => {
    updateData(form);
    nextStep();
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Personal Information</h2>
        <p className="mt-1 text-sm text-gray-500">
          Enter your details and NC notary commission information.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input label="First name *" value={form.firstName} onChange={(e) => update('firstName', e.target.value)} />
        <Input label="Last name *" value={form.lastName} onChange={(e) => update('lastName', e.target.value)} />
        <Input label="Email *" type="email" value={form.email} onChange={(e) => update('email', e.target.value)} />
        <Input label="Phone" type="tel" value={form.phone} onChange={(e) => update('phone', e.target.value)} />
        <Input label="Address" value={form.address} onChange={(e) => update('address', e.target.value)} className="col-span-full" />
        <Input label="City" value={form.city} onChange={(e) => update('city', e.target.value)} />
        <Input label="State" value={form.state} disabled />
        <Input label="ZIP" value={form.zip} onChange={(e) => update('zip', e.target.value)} />
        <Input label="County *" value={form.county} onChange={(e) => update('county', e.target.value)} />
      </div>

      <div className="border-t border-gray-200 pt-5">
        <h3 className="text-base font-semibold text-gray-900 mb-3">NC Commission Details</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Commission Number *"
            value={form.commissionNumber}
            onChange={(e) => update('commissionNumber', e.target.value)}
            placeholder="NC-XXXXXX"
          />
          <Input
            label="Commission Expiry *"
            type="date"
            value={form.commissionExpiry}
            onChange={(e) => update('commissionExpiry', e.target.value)}
          />
          <Input
            label="Electronic Notary ID *"
            value={form.electronicNotaryId}
            onChange={(e) => update('electronicNotaryId', e.target.value)}
          />
          <Input
            label="REN Authorization ID *"
            value={form.renAuthorizationId}
            onChange={(e) => update('renAuthorizationId', e.target.value)}
            helperText="Remote Electronic Notarization authorization"
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
