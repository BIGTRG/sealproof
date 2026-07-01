'use client';

import { useEffect, useState } from 'react';
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

  useEffect(() => {
    Promise.all([
      api.getMyProfile(),
      api.getMyActiveShift(),
      api.getQueuedSessions(),
    ]).then(([p, s, q]) => {
      setProfile(p);
      setShift(s);
      setQueued(q || []);
      setLoading(false);
    });
  }, []);

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
          <Button variant="gold" onClick={() => api.startShift()}>
            <Clock className="h-4 w-4" /> Start Shift
          </Button>
        ) : (
          <Badge variant="success">On Shift</Badge>
        )}
      </div>

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
                <Button variant="gold" size="sm" onClick={() => api.acceptSession(session.id)}>
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
