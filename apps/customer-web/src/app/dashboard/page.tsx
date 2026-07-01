'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import * as api from '@/lib/api';
import type { Session } from '@/types';
import {
  FileText,
  FolderOpen,
  Clock,
  CheckCircle,
  ArrowRight,
  Plus,
  Scale,
} from 'lucide-react';

function statusBadge(status: string) {
  const map: Record<string, { variant: 'success' | 'warning' | 'gold' | 'navy' | 'danger' | 'default'; label: string }> = {
    completed:       { variant: 'success', label: 'Completed' },
    in_progress:     { variant: 'gold',    label: 'In Progress' },
    queued:          { variant: 'warning', label: 'Queued' },
    kyc_pending:     { variant: 'warning', label: 'ID Verification' },
    payment_pending: { variant: 'warning', label: 'Payment' },
    cancelled:       { variant: 'danger',  label: 'Cancelled' },
    failed:          { variant: 'danger',  label: 'Failed' },
  };
  const s = map[status] || { variant: 'default' as const, label: status };
  return <Badge variant={s.variant}>{s.label}</Badge>;
}

export default function DashboardPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.listSessions().then((res) => {
      if (res.data) setSessions(res.data.sessions || []);
      setLoading(false);
    });
  }, []);

  const recentSessions = sessions.slice(0, 5);
  const completedCount = sessions.filter((s) => s.status === 'completed').length;
  const activeCount = sessions.filter((s) => !['completed', 'cancelled', 'failed'].includes(s.status)).length;

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-2xl font-semibold text-navy-700">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">Welcome back. Here is your notarization overview.</p>
        </div>
        <Link href="/session/new">
          <Button variant="gold">
            <Plus className="h-4 w-4" />
            New Session
          </Button>
        </Link>
      </div>

      {/* ─── Stats ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
        <Card className="flex items-center gap-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-50 border border-brand-200">
            <FileText className="h-5 w-5 text-gold-500" />
          </div>
          <div>
            <div className="text-2xl font-semibold text-navy-700">{sessions.length}</div>
            <div className="text-xs text-gray-500">Total Sessions</div>
          </div>
        </Card>
        <Card className="flex items-center gap-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-50 border border-emerald-200">
            <CheckCircle className="h-5 w-5 text-emerald-500" />
          </div>
          <div>
            <div className="text-2xl font-semibold text-navy-700">{completedCount}</div>
            <div className="text-xs text-gray-500">Completed</div>
          </div>
        </Card>
        <Card className="flex items-center gap-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-amber-50 border border-amber-200">
            <Clock className="h-5 w-5 text-amber-500" />
          </div>
          <div>
            <div className="text-2xl font-semibold text-navy-700">{activeCount}</div>
            <div className="text-xs text-gray-500">Active / In Queue</div>
          </div>
        </Card>
      </div>

      {/* ─── Recent Sessions ─── */}
      <Card>
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-display text-lg font-semibold text-navy-700">Recent Sessions</h2>
          <Link href="/dashboard/sessions" className="text-sm text-gold-500 hover:text-gold-600 font-medium flex items-center gap-1">
            View All <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        {loading ? (
          <div className="py-12 text-center text-gray-400 text-sm">Loading sessions...</div>
        ) : recentSessions.length === 0 ? (
          <div className="py-12 text-center">
            <Scale className="h-10 w-10 text-brand-200 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">No sessions yet.</p>
            <Link href="/session/new" className="text-sm text-gold-500 hover:text-gold-600 font-medium mt-2 inline-block">
              Start your first notarization
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {recentSessions.map((session) => (
              <div key={session.id} className="flex items-center justify-between py-4 first:pt-0 last:pb-0">
                <div className="flex items-center gap-4">
                  <div className="flex h-9 w-9 items-center justify-center rounded-legal bg-brand-50 border border-brand-200">
                    <FolderOpen className="h-4 w-4 text-gold-500" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-navy-700 capitalize">
                      {session.documentType.replace(/_/g, ' ')} Notarization
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5">
                      {new Date(session.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      {session.signerCount > 1 && ` | ${session.signerCount} signers`}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {statusBadge(session.status)}
                  <span className="text-sm font-medium text-navy-700">
                    ${(session.totalPriceCents / 100).toFixed(2)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
