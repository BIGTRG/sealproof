'use client';

import { Card, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Radio, Video, Users, Clock, AlertTriangle } from 'lucide-react';

export default function LiveOperationsPage() {
  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-2xl font-semibold text-navy-700">Live Operations</h1>
          <p className="text-sm text-gray-500 mt-1">Real-time session monitoring and queue management.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-sm text-emerald-600 font-medium">Live</span>
        </div>
      </div>

      {/* Live stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-6 mb-8">
        {[
          { icon: Video, label: 'Active Sessions', value: '4', color: 'text-emerald-500' },
          { icon: Clock, label: 'In Queue', value: '7', color: 'text-amber-500' },
          { icon: Users, label: 'Notaries Online', value: '6', color: 'text-gold-500' },
          { icon: AlertTriangle, label: 'Alerts', value: '0', color: 'text-gray-400' },
        ].map(({ icon: Icon, label, value, color }) => (
          <Card key={label} className="flex items-center gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-50 border border-brand-200">
              <Icon className={`h-5 w-5 ${color}`} />
            </div>
            <div>
              <div className="text-2xl font-semibold text-navy-700">{value}</div>
              <div className="text-xs text-gray-500">{label}</div>
            </div>
          </Card>
        ))}
      </div>

      {/* Active sessions */}
      <Card className="mb-6">
        <CardTitle>Active Sessions</CardTitle>
        <div className="mt-4 divide-y divide-gray-100">
          {[
            { id: 'SES-0146', doc: 'Mortgage', notary: 'K. Chen', signer: 'John M.', elapsed: '8m 32s', step: 'Signatures' },
            { id: 'SES-0148', doc: 'POA', notary: 'J. Williams', signer: 'Sarah T.', elapsed: '3m 10s', step: 'Review' },
            { id: 'SES-0149', doc: 'Affidavit', notary: 'R. Patel', signer: 'Carlos G.', elapsed: '1m 45s', step: 'Verify ID' },
            { id: 'SES-0150', doc: 'Deed', notary: 'M. Davis', signer: 'Lisa R.', elapsed: '0m 30s', step: 'Verify ID' },
          ].map((s) => (
            <div key={s.id} className="flex items-center justify-between py-4">
              <div className="flex items-center gap-4">
                <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <div>
                  <div className="text-sm font-medium text-navy-700">{s.doc}</div>
                  <div className="text-xs text-gray-400">{s.notary} -- {s.signer}</div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <Badge variant="gold">{s.step}</Badge>
                <span className="text-xs text-gray-400 font-mono">{s.elapsed}</span>
                <Button variant="outline" size="sm">Monitor</Button>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Queue */}
      <Card>
        <CardTitle>Session Queue</CardTitle>
        <div className="mt-4 divide-y divide-gray-100">
          {[
            { id: 'SES-0151', doc: 'Trust', service: 'rush', wait: '0m 45s' },
            { id: 'SES-0152', doc: 'Affidavit', service: 'standard', wait: '2m 10s' },
            { id: 'SES-0153', doc: 'POA', service: 'standard', wait: '4m 22s' },
          ].map((s) => (
            <div key={s.id} className="flex items-center justify-between py-3">
              <div className="flex items-center gap-3">
                <div className={`h-2 w-2 rounded-full ${s.service === 'rush' ? 'bg-gold-300' : 'bg-gray-300'}`} />
                <span className="text-sm text-navy-700">{s.doc}</span>
                {s.service === 'rush' && <Badge variant="gold">Rush</Badge>}
              </div>
              <span className="text-xs text-gray-400">Waiting {s.wait}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
