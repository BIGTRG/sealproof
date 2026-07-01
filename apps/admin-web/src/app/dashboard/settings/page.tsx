'use client';

import { Card, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Settings, Key, Globe, Mail, Shield, Save } from 'lucide-react';

export default function SettingsPage() {
  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-2xl font-semibold text-navy-700">Settings</h1>
          <p className="text-sm text-gray-500 mt-1">Platform configuration and integrations.</p>
        </div>
        <Button variant="gold"><Save className="h-4 w-4" /> Save All</Button>
      </div>

      <div className="space-y-6">
        {/* Platform identity */}
        <Card>
          <CardTitle>Platform Identity</CardTitle>
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Platform Name" defaultValue="SealProof" />
            <Input label="Legal Entity" defaultValue="SealProof LLC" />
            <Input label="Primary Domain" defaultValue="sealproof.ai" />
            <Input label="Support Email" defaultValue="support@sealproof.ai" />
          </div>
        </Card>

        {/* Integrations */}
        <Card>
          <CardTitle>Integration Status</CardTitle>
          <div className="mt-4 space-y-4">
            {[
              { name: 'Clerk (Auth)', status: 'connected', key: 'sk_live_...x4Lj' },
              { name: 'Persona (KYC)', status: 'connected', key: 'persona_api_...Qk8' },
              { name: 'IDology (KBA)', status: 'connected', key: 'idology_...9f2' },
              { name: 'LiveKit (Video)', status: 'connected', key: 'APIKey...vR3' },
              { name: 'TRG Pay (Payments)', status: 'connected', key: 'trg_live_...m1P' },
              { name: 'TRG e-Sign', status: 'connected', key: 'esign_...t8Y' },
              { name: 'AWS S3 (Storage)', status: 'connected', key: 'AKIA...QR6' },
              { name: 'AWS KMS (Encryption)', status: 'connected', key: 'alias/sealproof-...' },
              { name: 'SendGrid (Email)', status: 'connected', key: 'SG....kP2' },
              { name: 'Twilio (SMS)', status: 'connected', key: 'AC...d8F' },
            ].map((i) => (
              <div key={i.name} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                <div className="flex items-center gap-3">
                  <Key className="h-4 w-4 text-gold-400" />
                  <span className="text-sm text-navy-700">{i.name}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono text-gray-400">{i.key}</span>
                  <Badge variant="success">{i.status}</Badge>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Domain config */}
        <Card>
          <CardTitle>Domain Configuration</CardTitle>
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Customer App" defaultValue="sealproof.ai" />
            <Input label="Notary Portal" defaultValue="notary.sealproof.ai" />
            <Input label="Admin Console" defaultValue="admin.sealproof.ai" />
            <Input label="API Gateway" defaultValue="api.sealproof.ai" />
          </div>
        </Card>
      </div>
    </div>
  );
}
