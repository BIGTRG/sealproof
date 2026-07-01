'use client';

import { Card, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ShieldCheck, FileCheck, Database, AlertTriangle, CheckCircle, Download, Lock } from 'lucide-react';

export default function CompliancePage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="font-display text-2xl font-semibold text-navy-700">Compliance Center</h1>
        <p className="text-sm text-gray-500 mt-1">Monitor regulatory compliance, journal integrity, and audit readiness.</p>
      </div>

      {/* Status cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-6 mb-8">
        {[
          { icon: ShieldCheck, label: 'Journal Integrity', value: 'Verified', variant: 'success' as const },
          { icon: Lock, label: 'Recording Encryption', value: 'AES-256-GCM', variant: 'success' as const },
          { icon: Database, label: 'S3 Object Lock', value: '10-Year', variant: 'success' as const },
          { icon: FileCheck, label: 'Audit Readiness', value: 'Ready', variant: 'success' as const },
        ].map(({ icon: Icon, label, value, variant }) => (
          <Card key={label} className="flex items-center gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-50 border border-emerald-200">
              <Icon className="h-5 w-5 text-emerald-500" />
            </div>
            <div>
              <div className="text-xs text-gray-400">{label}</div>
              <div className="text-sm font-semibold text-navy-700">{value}</div>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* State compliance */}
        <Card>
          <CardTitle>State Compliance Status</CardTitle>
          <div className="mt-4 space-y-3">
            {[
              { state: 'North Carolina', status: 'compliant', sessions: 312 },
              { state: 'Virginia', status: 'compliant', sessions: 156 },
              { state: 'Florida', status: 'compliant', sessions: 98 },
              { state: 'Texas', status: 'pending_review', sessions: 0 },
            ].map((s) => (
              <div key={s.state} className="flex items-center justify-between py-2 border-b border-gray-50">
                <div className="flex items-center gap-3">
                  {s.status === 'compliant' ? (
                    <CheckCircle className="h-4 w-4 text-emerald-500" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                  )}
                  <span className="text-sm text-navy-700">{s.state}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-400">{s.sessions} sessions</span>
                  <Badge variant={s.status === 'compliant' ? 'success' : 'warning'}>{s.status.replace(/_/g, ' ')}</Badge>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Audit tools */}
        <Card>
          <CardTitle>Audit Tools</CardTitle>
          <div className="mt-4 space-y-4">
            <div className="p-4 rounded-legal border border-gray-100 flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-navy-700">NC Secretary of State Packet</div>
                <div className="text-xs text-gray-400 mt-0.5">Generate full audit packet for NC SoS review.</div>
              </div>
              <Button variant="outline" size="sm"><Download className="h-3.5 w-3.5" /> Generate</Button>
            </div>
            <div className="p-4 rounded-legal border border-gray-100 flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-navy-700">Notary Self-Audit Report</div>
                <div className="text-xs text-gray-400 mt-0.5">Individual notary compliance summary.</div>
              </div>
              <Button variant="outline" size="sm"><Download className="h-3.5 w-3.5" /> Generate</Button>
            </div>
            <div className="p-4 rounded-legal border border-gray-100 flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-navy-700">Subpoena Response Packet</div>
                <div className="text-xs text-gray-400 mt-0.5">Court-ready document + recording package.</div>
              </div>
              <Button variant="outline" size="sm"><Download className="h-3.5 w-3.5" /> Generate</Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
