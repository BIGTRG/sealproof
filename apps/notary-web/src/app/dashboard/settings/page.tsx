'use client';

import { Card, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Save, Shield, FileText, User } from 'lucide-react';

export default function NotarySettingsPage() {
  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-2xl font-semibold text-navy-700">Settings</h1>
          <p className="text-sm text-gray-500 mt-1">Manage your profile, commission, and payout settings.</p>
        </div>
        <Button variant="gold"><Save className="h-4 w-4" /> Save Changes</Button>
      </div>

      <div className="space-y-6">
        {/* Profile */}
        <Card>
          <CardTitle>Profile Information</CardTitle>
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Full Legal Name" defaultValue="Jane Williams" />
            <Input label="Email" type="email" defaultValue="jane.williams@email.com" />
            <Input label="Phone" defaultValue="(704) 555-0188" />
            <Input label="Mailing Address" defaultValue="123 Main St, Charlotte, NC 28202" />
          </div>
        </Card>

        {/* Commission */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <CardTitle>Commission Details</CardTitle>
            <Badge variant="success">Active</Badge>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Commission Number" defaultValue="NC-2024-0482" disabled />
            <Input label="Commission State" defaultValue="North Carolina" disabled />
            <Input label="Commission Expiration" defaultValue="2028-09-30" type="date" />
            <Input label="E&O Insurance Provider" defaultValue="NNA Insurance" />
          </div>
        </Card>

        {/* Payout */}
        <Card>
          <CardTitle>Payout Settings</CardTitle>
          <p className="text-xs text-gray-400 mt-1 mb-4">Payouts are processed weekly via TRG Pay ACH.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Bank Name" defaultValue="First Citizens Bank" />
            <Input label="Account Type" defaultValue="Checking" />
            <Input label="Routing Number" defaultValue="*****6789" disabled />
            <Input label="Account Number" defaultValue="*****4321" disabled />
          </div>
        </Card>

        {/* Security */}
        <Card>
          <CardTitle>Security</CardTitle>
          <div className="mt-4 space-y-4">
            <div className="flex items-center justify-between py-2">
              <div>
                <div className="text-sm font-medium text-navy-700">Two-Factor Authentication</div>
                <div className="text-xs text-gray-400">Add an extra layer of security to your account.</div>
              </div>
              <Badge variant="success">Enabled</Badge>
            </div>
            <div className="flex items-center justify-between py-2">
              <div>
                <div className="text-sm font-medium text-navy-700">Password</div>
                <div className="text-xs text-gray-400">Last changed 30 days ago.</div>
              </div>
              <Button variant="outline" size="sm">Change</Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
