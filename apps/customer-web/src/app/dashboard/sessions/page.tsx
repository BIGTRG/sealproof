'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import * as api from '@/lib/api';
import type { Session } from '@/types';
import { FileText, Plus, Search, Filter, ArrowUpDown } from 'lucide-react';

function statusBadge(status: string) {
  const map: Record<string, { variant: 'success' | 'warning' | 'gold' | 'danger' | 'default'; label: string }> = {
    completed:       { variant: 'success', label: 'Completed' },
    in_progress:     { variant: 'gold',    label: 'In Progress' },
    queued:          { variant: 'warning', label: 'Queued' },
    matched:         { variant: 'gold',    label: 'Matched' },
    kyc_pending:     { variant: 'warning', label: 'ID Verification' },
    kyc_complete:    { variant: 'success', label: 'ID Verified' },
    payment_pending: { variant: 'warning', label: 'Payment' },
    signing:         { variant: 'gold',    label: 'Signing' },
    sealing:         { variant: 'gold',    label: 'Sealing' },
    cancelled:       { variant: 'danger',  label: 'Cancelled' },
    failed:          { variant: 'danger',  label: 'Failed' },
  };
  const s = map[status] || { variant: 'default' as const, label: status };
  return <Badge variant={s.variant}>{s.label}</Badge>;
}

export default function SessionsPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'active' | 'completed' | 'cancelled'>('all');

  useEffect(() => {
    api.listSessions().then((res) => {
      if (res.data) setSessions(res.data.sessions || []);
      setLoading(false);
    });
  }, []);

  const filtered = sessions.filter((s) => {
    if (filter === 'active') return !['completed', 'cancelled', 'failed'].includes(s.status);
    if (filter === 'completed') return s.status === 'completed';
    if (filter === 'cancelled') return ['cancelled', 'failed'].includes(s.status);
    return true;
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-2xl font-semibold text-navy-700">My Sessions</h1>
          <p className="text-sm text-gray-500 mt-1">View and manage your notarization sessions.</p>
        </div>
        <Link href="/session/new">
          <Button variant="gold"><Plus className="h-4 w-4" /> New Session</Button>
        </Link>
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-2 mb-6">
        {(['all', 'active', 'completed', 'cancelled'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-legal text-sm font-medium transition-colors capitalize ${
              filter === f
                ? 'bg-navy-700 text-white'
                : 'text-gray-500 hover:bg-gray-100'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      <Card className="overflow-hidden !p-0">
        {loading ? (
          <div className="p-12 text-center text-gray-400 text-sm">Loading sessions...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-gray-400 text-sm">No sessions found.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-surface-warm border-b border-gray-200">
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Document</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Service</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((session) => (
                <tr key={session.id} className="hover:bg-brand-50/50 transition-colors cursor-pointer">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <FileText className="h-4 w-4 text-gold-400" />
                      <span className="font-medium text-navy-700 capitalize">
                        {session.documentType.replace(/_/g, ' ')}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-gray-500">
                    {new Date(session.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </td>
                  <td className="px-6 py-4">
                    <Badge variant={session.serviceLevel === 'rush' ? 'gold' : 'default'}>
                      {session.serviceLevel === 'rush' ? 'Rush' : 'Standard'}
                    </Badge>
                  </td>
                  <td className="px-6 py-4">{statusBadge(session.status)}</td>
                  <td className="px-6 py-4 text-right font-medium text-navy-700">
                    ${(session.totalPriceCents / 100).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
