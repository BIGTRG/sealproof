'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import * as api from '@/lib/api';
import {
  Scale, Video, Calendar, DollarSign, Clock, Users, ArrowRight,
} from 'lucide-react';

export default function NotaryDashboard() {
  const [profile, setProfile] = useState<any>(null);
  const [shift, setShift] = useState<any>(null);
  const [queued, setQueued] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<any>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState('');
  const router = useRouter();

  const load = useCallback(async () => {
    try {
      const [p, s, q] = await Promise.all([
        api.getMyProfile().then((r: any) => r?.data ?? r),
        api.getMyActiveShift(),
        api.getQueuedSessions(),
      ]);
      setProfile(p);
      setShift(s);
      setQueued(Array.isArray(q) ? q : []);
      if (p?.id) {
        const list: any[] = await api.listMySessions(p.id).catch(() => []);
        setActive(list.find((x) => x.status === 'matched_to_notary' || x.status === 'in_session') || null);
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); const t = setInterval(load, 8000); return () => clearInterval(t); }, [load]);

  // Presence heartbeat while on shift (matching only considers notaries with a live heartbeat)
  useEffect(() => {
    if (!shift || !profile?.id) return;
    const beat = () => api.sendHeartbeat(profile.id, shift.id, active?.status === 'in_session' ? 'in_session' : 'available').catch(() => undefined);
    beat();
    const t = setInterval(beat, 30000);
    return () => clearInterval(t);
  }, [shift, profile?.id, active?.status]);

  const handleStartShift = async () => {
    setBusy('shift'); setError('');
    try { await api.startShift(); await load(); } catch (e: any) { setError(e.message); }
    setBusy(null);
  };

  const handleAccept = async (sessionId: string) => {
    setBusy(sessionId); setError('');
    try {
      await api.claimSession(sessionId, profile.id);
      router.push(`/session/active/${sessionId}`);
    } catch (e: any) { setError(e.message); setBusy(null); }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-2xl font-semibold text-navy-700">
            {profile?.fullName ? `Welcome, ${profile.fullName}` : 'Notary Dashboard'}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {shift ? 'You are currently on shift.' : 'Start a shift to begin accepting sessions.'}
          </p>
        </div>
        {!shift ? (
          <Button variant="gold" onClick={handleStartShift} loading={busy === 'shift'}>
            <Clock className="h-4 w-4" /> Start Shift
          </Button>
        ) : (
          <Badge variant="success">On Shift</Badge>
        )}
      </div>

      {error && <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      {active && (
        <Card className="mb-8 border-gold-300 bg-gold-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-3 w-3 rounded-full bg-red-500 animate-pulse" />
            <div>
              <div className="text-sm font-semibold text-navy-700">
                {active.status === 'in_session' ? 'Session in progress' : 'Signer waiting for you'}
              </div>
              <div className="text-xs text-gray-500 capitalize">{String(active.document_type || '').replace(/_/g, ' ')}  |  {active.state_of_act}  |  {active.signer_count} signer{active.signer_count > 1 ? 's' : ''}</div>
            </div>
          </div>
          <Button variant="gold" size="sm" onClick={() => router.push(`/session/active/${active.id}`)}>
            {active.status === 'in_session' ? 'Return to Session' : 'Open Session'} <ArrowRight className="h-4 w-4" />
          </Button>
        </Card>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-6 mb-8">
        {[
          { icon: Video, label: 'Sessions Today', value: profile?.sessionsToday || 0, color: 'gold' },
          { icon: Calendar, label: 'This Week', value: profile?.sessionsThisWeek || 0, color: 'blue' },
          { icon: DollarSign, label: "Today's Earnings", value: `$${(profile?.earningsToday || 0).toFixed(2)}`, color: 'green' },
          { icon: Users, label: 'Queue Size', value: queued.length, color: 'amber' },
        ].map(({ icon: Icon, label, value, color }) => (
          <Card key={label} className="flex items-center gap-4">
            <div className={`flex h-11 w-11 items-center justify-center rounded-full bg-brand-50 border border-brand-200`}>
              <Icon className="h-5 w-5 text-gold-500" />
            </div>
            <div>
              <div className="text-2xl font-semibold text-navy-700">{value}</div>
              <div className="text-xs text-gray-500">{label}</div>
            </div>
          </Card>
        ))}
      </div>

      {/* Queue */}
      <Card>
        <div className="flex items-center justify-between mb-5">
          <CardTitle>Session Queue</CardTitle>
          <span className="text-xs text-gray-400">{queued.length} waiting</span>
        </div>
        {queued.length === 0 ? (
          <div className="py-10 text-center">
            <Scale className="h-8 w-8 text-brand-200 mx-auto mb-3" />
            <p className="text-sm text-gray-400">No sessions in queue.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {queued.slice(0, 5).map((session: any) => (
              <div key={session.id} className="flex items-center justify-between py-4">
                <div className="flex items-center gap-3">
                  <div className={`h-2 w-2 rounded-full ${session.serviceLevel === 'rush' ? 'bg-gold-300' : 'bg-gray-300'}`} />
                  <div>
                    <div className="text-sm font-medium text-navy-700 capitalize">
                      {session.documentType.replace(/_/g, ' ')}
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5">
                      {session.signerCount} signer{session.signerCount > 1 ? 's' : ''}
                      {session.serviceLevel === 'rush' && ' -- Rush Priority'}
                    </div>
                  </div>
                </div>
                <Button variant="gold" size="sm" onClick={() => handleAccept(session.id)} loading={busy === session.id} disabled={!shift || !!active}>
                  Accept <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
