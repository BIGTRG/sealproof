'use client';

/**
 * Live Operations — real-time view of sessions, queue, and notary roster
 *
 * In production: powered by Socket.IO subscriptions to
 * - notary-roster room (shift changes)
 * - session-updates room (status transitions)
 */
import { Card, CardTitle } from '@/components/ui/Card';
import { StatCard } from '@/components/ui/StatCard';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { DataTable } from '@/components/ui/DataTable';
import { useLiveOpsStore } from '@/lib/store';
import { formatDuration, sessionStatusColor, sessionStatusLabel, shiftStatusColor, docTypeLabel } from '@/lib/utils';
import { Radio, Users, Clock, AlertTriangle, Activity, Zap } from 'lucide-react';
import type { LiveSession, QueuedSession, NotaryOnShift } from '@/types';

// Sample data for development
const sampleActive: LiveSession[] = [
  { id: 's-001', customerName: 'John Doe', notaryName: 'Jane Smith', documentType: 'deed', status: 'in_progress', serviceLevel: 'standard', startedAt: new Date(Date.now() - 12 * 60000).toISOString(), durationMinutes: 12 },
  { id: 's-002', customerName: 'Sarah Johnson', notaryName: 'Mike Wilson', documentType: 'poa', status: 'signing', serviceLevel: 'rush', startedAt: new Date(Date.now() - 8 * 60000).toISOString(), durationMinutes: 8 },
];

const sampleQueue: QueuedSession[] = [
  { id: 'q-001', customerName: 'Robert Chen', documentType: 'trust', serviceLevel: 'standard', waitingMinutes: 4, kycStatus: 'passed' },
  { id: 'q-002', customerName: 'Maria Garcia', documentType: 'affidavit', serviceLevel: 'rush', waitingMinutes: 1, kycStatus: 'pending' },
];

const sampleRoster: NotaryOnShift[] = [
  { id: 'n-001', name: 'Jane Smith', status: 'in_session', sessionCount: 5, shiftStart: new Date(Date.now() - 4 * 3600000).toISOString(), currentSession: 's-001' },
  { id: 'n-002', name: 'Mike Wilson', status: 'in_session', sessionCount: 3, shiftStart: new Date(Date.now() - 2 * 3600000).toISOString(), currentSession: 's-002' },
  { id: 'n-003', name: 'Lisa Brown', status: 'available', sessionCount: 4, shiftStart: new Date(Date.now() - 5 * 3600000).toISOString() },
  { id: 'n-004', name: 'Tom Davis', status: 'available', sessionCount: 2, shiftStart: new Date(Date.now() - 1 * 3600000).toISOString() },
  { id: 'n-005', name: 'Amy Taylor', status: 'break', sessionCount: 3, shiftStart: new Date(Date.now() - 3 * 3600000).toISOString() },
];

export default function LiveOpsPage() {
  return (
    <div className="space-y-6 max-w-7xl">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold text-gray-900">Live Operations</h1>
        <span className="flex h-2 w-2 rounded-full bg-green-500 animate-pulse" />
        <span className="text-xs text-green-600 font-medium">Real-time</span>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Active Sessions"
          value={sampleActive.length}
          icon={<Radio className="h-5 w-5 text-blue-600" />}
          iconBg="bg-blue-100"
        />
        <StatCard
          label="Queue Depth"
          value={sampleQueue.length}
          change={sampleQueue.some(q => q.serviceLevel === 'rush') ? '1 rush' : undefined}
          changeType="down"
          icon={<Clock className="h-5 w-5 text-amber-600" />}
          iconBg="bg-amber-100"
        />
        <StatCard
          label="Notaries On Shift"
          value={sampleRoster.length}
          change={`${sampleRoster.filter(n => n.status === 'available').length} available`}
          changeType="up"
          icon={<Users className="h-5 w-5 text-green-600" />}
          iconBg="bg-green-100"
        />
        <StatCard
          label="Coverage Gaps"
          value="0"
          icon={<AlertTriangle className="h-5 w-5 text-gray-400" />}
          iconBg="bg-gray-100"
        />
      </div>

      {/* Active Sessions */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <CardTitle>Active Sessions</CardTitle>
          <Badge className="bg-blue-100 text-blue-700">
            <Activity className="h-3 w-3 mr-0.5" /> {sampleActive.length} live
          </Badge>
        </div>
        <DataTable
          columns={[
            { key: 'customer', header: 'Customer', render: (r: LiveSession) => (
              <div>
                <p className="font-medium text-gray-900">{r.customerName}</p>
                <p className="text-xs text-gray-500">{docTypeLabel(r.documentType)}</p>
              </div>
            )},
            { key: 'notary', header: 'Notary', render: (r: LiveSession) => r.notaryName },
            { key: 'level', header: 'Level', render: (r: LiveSession) => (
              <Badge className={r.serviceLevel === 'rush' ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-600'}>
                {r.serviceLevel === 'rush' && <Zap className="h-3 w-3 mr-0.5" />}
                {r.serviceLevel}
              </Badge>
            )},
            { key: 'status', header: 'Status', render: (r: LiveSession) => (
              <Badge className={sessionStatusColor(r.status)}>{sessionStatusLabel(r.status)}</Badge>
            )},
            { key: 'duration', header: 'Duration', className: 'text-right', render: (r: LiveSession) => (
              <span className="font-mono text-sm">{formatDuration(r.durationMinutes)}</span>
            )},
          ]}
          data={sampleActive}
          keyExtractor={(r) => r.id}
          emptyMessage="No active sessions"
        />
      </Card>

      {/* Queue + Roster side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Queue */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <CardTitle>Session Queue</CardTitle>
            <Badge className="bg-amber-100 text-amber-700">{sampleQueue.length} waiting</Badge>
          </div>
          <div className="space-y-3">
            {sampleQueue.map((q) => (
              <div key={q.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                <div className="flex items-center gap-3">
                  {q.serviceLevel === 'rush' && (
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-orange-100">
                      <Zap className="h-3 w-3 text-orange-600" />
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-medium text-gray-900">{q.customerName}</p>
                    <p className="text-xs text-gray-500">{docTypeLabel(q.documentType)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={q.kycStatus === 'passed' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}>
                    KYC {q.kycStatus}
                  </Badge>
                  <span className="text-xs text-gray-500">{q.waitingMinutes}m</span>
                </div>
              </div>
            ))}
            {sampleQueue.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-8">Queue empty</p>
            )}
          </div>
        </Card>

        {/* Notary Roster */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <CardTitle>Notary Roster</CardTitle>
            <Badge className="bg-green-100 text-green-700">{sampleRoster.length} on shift</Badge>
          </div>
          <div className="space-y-3">
            {sampleRoster.map((n) => (
              <div key={n.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                <div className="flex items-center gap-3">
                  <div className={`h-2 w-2 rounded-full ${
                    n.status === 'available' ? 'bg-green-500' :
                    n.status === 'in_session' ? 'bg-blue-500' :
                    'bg-yellow-500'
                  }`} />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{n.name}</p>
                    <p className="text-xs text-gray-500">{n.sessionCount} sessions today</p>
                  </div>
                </div>
                <Badge className={shiftStatusColor(n.status)}>
                  {n.status === 'in_session' ? 'In Session' : n.status === 'available' ? 'Available' : 'Break'}
                </Badge>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
