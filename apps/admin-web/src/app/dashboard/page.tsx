'use client';

import { Card, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import {
  Users, Video, DollarSign, ShieldCheck, TrendingUp, ArrowUpRight, ArrowDownRight,
} from 'lucide-react';

const stats = [
  { label: 'Active Sessions', value: '12', change: '+3', up: true, icon: Video },
  { label: 'Sessions Today', value: '47', change: '+18%', up: true, icon: TrendingUp },
  { label: 'Revenue Today', value: '$1,175', change: '+12%', up: true, icon: DollarSign },
  { label: 'Active Notaries', value: '8', change: '-2', up: false, icon: Users },
];

export default function OverviewPage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="font-display text-2xl font-semibold text-navy-700">Admin Overview</h1>
        <p className="text-sm text-gray-500 mt-1">Real-time platform snapshot.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-6 mb-8">
        {stats.map(({ label, value, change, up, icon: Icon }) => (
          <Card key={label}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-gray-400 uppercase tracking-wide">{label}</span>
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-50 border border-brand-200">
                <Icon className="h-4 w-4 text-gold-500" />
              </div>
            </div>
            <div className="text-3xl font-display font-bold text-navy-700">{value}</div>
            <div className={`flex items-center gap-1 mt-1 text-xs font-medium ${up ? 'text-emerald-600' : 'text-red-500'}`}>
              {up ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
              {change} vs yesterday
            </div>
          </Card>
        ))}
      </div>

      {/* Recent sessions */}
      <Card>
        <CardTitle>Recent Sessions</CardTitle>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left py-2 text-xs font-semibold text-gray-500 uppercase">Session</th>
                <th className="text-left py-2 text-xs font-semibold text-gray-500 uppercase">Document</th>
                <th className="text-left py-2 text-xs font-semibold text-gray-500 uppercase">Notary</th>
                <th className="text-left py-2 text-xs font-semibold text-gray-500 uppercase">Status</th>
                <th className="text-right py-2 text-xs font-semibold text-gray-500 uppercase">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {[
                { id: 'SES-0147', doc: 'Power of Attorney', notary: 'J. Williams', status: 'completed', amt: '$25.00' },
                { id: 'SES-0146', doc: 'Mortgage', notary: 'K. Chen', status: 'in_progress', amt: '$45.00' },
                { id: 'SES-0145', doc: 'Affidavit', notary: 'R. Patel', status: 'completed', amt: '$25.00' },
                { id: 'SES-0144', doc: 'Trust', notary: 'M. Davis', status: 'queued', amt: '$25.00' },
                { id: 'SES-0143', doc: 'Deed', notary: 'J. Williams', status: 'completed', amt: '$45.00' },
              ].map((s) => (
                <tr key={s.id} className="hover:bg-brand-50/50 transition-colors">
                  <td className="py-3 font-mono text-xs text-gold-600">{s.id}</td>
                  <td className="py-3 text-navy-700">{s.doc}</td>
                  <td className="py-3 text-gray-500">{s.notary}</td>
                  <td className="py-3">
                    <Badge variant={s.status === 'completed' ? 'success' : s.status === 'in_progress' ? 'gold' : 'warning'}>
                      {s.status.replace(/_/g, ' ')}
                    </Badge>
                  </td>
                  <td className="py-3 text-right font-medium text-navy-700">{s.amt}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
