'use client';

import { useEffect, useState } from 'react';
import { Card, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import * as api from '@/lib/api';
import type { CustomerProfile } from '@/types';
import { User, Shield, Bell } from 'lucide-react';

export default function SettingsPage() {
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ firstName: '', lastName: '', phone: '' });

  useEffect(() => {
    api.getProfile().then((res) => {
      if (res.data?.customer) {
        const c = res.data.customer;
        setProfile(c);
        setForm({ firstName: c.firstName, lastName: c.lastName, phone: c.phone });
      }
      setLoading(false);
    });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    const res = await api.updateProfile(form);
    if (res.data?.customer) setProfile(res.data.customer);
    setSaving(false);
  };

  if (loading) {
    return <div className="py-20 text-center text-gray-400 text-sm">Loading...</div>;
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-display text-2xl font-semibold text-navy-700">Account Settings</h1>
        <p className="text-sm text-gray-500 mt-1">Manage your profile information and preferences.</p>
      </div>

      <div className="space-y-6 max-w-2xl">
        {/* Profile */}
        <Card>
          <div className="flex items-center gap-3 mb-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-50 border border-brand-200">
              <User className="h-5 w-5 text-gold-500" />
            </div>
            <CardTitle>Personal Information</CardTitle>
          </div>
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="First Name"
                value={form.firstName}
                onChange={(e) => setForm({ ...form, firstName: e.target.value })}
              />
              <Input
                label="Last Name"
                value={form.lastName}
                onChange={(e) => setForm({ ...form, lastName: e.target.value })}
              />
            </div>
            <Input
              label="Email"
              type="email"
              value={profile?.email || ''}
              disabled
              helperText="Email is managed through your authentication provider."
            />
            <Input
              label="Phone"
              type="tel"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
            <div className="flex justify-end">
              <Button variant="primary" loading={saving} onClick={handleSave}>
                Save Changes
              </Button>
            </div>
          </div>
        </Card>

        {/* Security */}
        <Card>
          <div className="flex items-center gap-3 mb-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-50 border border-brand-200">
              <Shield className="h-5 w-5 text-gold-500" />
            </div>
            <CardTitle>Security</CardTitle>
          </div>
          <p className="text-sm text-gray-500 mb-4">
            Password and two-factor authentication are managed through your identity provider (Clerk).
          </p>
          <Button variant="outline" size="sm">
            Manage Security Settings
          </Button>
        </Card>

        {/* Account Info */}
        <Card>
          <div className="flex items-center gap-3 mb-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-50 border border-brand-200">
              <Bell className="h-5 w-5 text-gold-500" />
            </div>
            <CardTitle>Account</CardTitle>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Member since</span>
              <p className="font-medium text-navy-700 mt-0.5">
                {profile ? new Date(profile.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : '--'}
              </p>
            </div>
            <div>
              <span className="text-gray-500">Total sessions</span>
              <p className="font-medium text-navy-700 mt-0.5">{profile?.totalSessions || 0}</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
