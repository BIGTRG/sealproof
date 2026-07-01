'use client';

import { Card, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { DollarSign, Save, Tag } from 'lucide-react';

export default function PricingPage() {
  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-2xl font-semibold text-navy-700">Pricing Control</h1>
          <p className="text-sm text-gray-500 mt-1">Manage pricing for B2C, B2B, and notary payout rates.</p>
        </div>
        <Button variant="gold"><Save className="h-4 w-4" /> Save Changes</Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* B2C Pricing */}
        <Card>
          <CardTitle>B2C Session Pricing</CardTitle>
          <p className="text-xs text-gray-400 mt-1 mb-6">Per-session fees charged to individual customers.</p>
          <div className="space-y-4">
            <Input label="Standard Session" type="number" defaultValue="25.00" />
            <Input label="Rush Session" type="number" defaultValue="45.00" />
            <Input label="Additional Signer" type="number" defaultValue="10.00" />
          </div>
        </Card>

        {/* B2B Pricing */}
        <Card>
          <CardTitle>B2B Subscription Tiers</CardTitle>
          <p className="text-xs text-gray-400 mt-1 mb-6">Monthly plans for business clients.</p>
          <div className="space-y-4">
            <Input label="Starter (50 sessions/mo)" type="number" defaultValue="499.00" />
            <Input label="Professional (200 sessions/mo)" type="number" defaultValue="1499.00" />
            <Input label="Enterprise (unlimited)" type="number" defaultValue="4999.00" />
          </div>
        </Card>

        {/* Notary Payouts */}
        <Card>
          <CardTitle>Notary Payout Rates</CardTitle>
          <p className="text-xs text-gray-400 mt-1 mb-6">Per-session payout to notaries.</p>
          <div className="space-y-4">
            <Input label="Standard Session Payout" type="number" defaultValue="12.50" />
            <Input label="Rush Session Payout" type="number" defaultValue="22.50" />
            <Input label="Rush Bonus" type="number" defaultValue="5.00" />
          </div>
        </Card>

        {/* Payment Processing */}
        <Card>
          <CardTitle>Processing Fees</CardTitle>
          <p className="text-xs text-gray-400 mt-1 mb-6">Platform transaction costs (for reference).</p>
          <div className="space-y-4">
            <Input label="TRG Pay Processing %" type="text" defaultValue="2.9% + $0.30" disabled />
            <Input label="Notary Payout Method" type="text" defaultValue="ACH (TRG Pay)" disabled />
          </div>
        </Card>
      </div>
    </div>
  );
}
