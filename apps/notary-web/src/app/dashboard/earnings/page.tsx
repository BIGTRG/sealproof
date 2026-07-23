'use client';

import { useEffect, useState } from 'react';
import { Card, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import * as api from '@/lib/api';
import { DollarSign, TrendingUp, Calendar, ArrowUpRight } from 'lucide-react';

export default function EarningsPage() {
  const [earnings, setEarnings] = useState<any>(null);
  const [payouts, setPayouts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.getMyEarnings(),
      api.getPayoutHistory(),
    ]).then(([e, p]) => {
      setEarnings(e);
      setPayouts(p || []);
      setLoading(false);
    });
  }, []);

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-display text-2xl font-semibold text-navy-700">Earnings</h1>
        <p className="text-sm text-gray-500 mt-1">Track your session earnings and payout history.</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
        <Card>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-400 uppercase tracking-wide">Today</span>
            <DollarSign className="h-4 w-4 text-gold-400" />
          </div>
          <div className="text-3xl font-display font-bold text-navy-700">
            ${(earnings?.today || 0).toFixed(2)}
          </div>
          <div className="text-xs text-gray-400 mt-1">{earnings?.sessionsToday || 0} sessions</div>
        </Card>
        <Card>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-400 uppercase tracking-wide">This Week</span>
            <TrendingUp className="h-4 w-4 text-gold-400" />
          </div>
          <div className="text-3xl font-display font-bold text-navy-700">
            ${(earnings?.thisWeek || 0).toFixed(2)}
          </div>
          <div className="text-xs text-gray-400 mt-1">{earnings?.sessionsThisWeek || 0} sessions</div>
        </Card>
        <Card>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-400 uppercase tracking-wide">This Month</span>
            <Calendar className="h-4 w-4 text-gold-400" />
          </div>
          <div className="text-3xl font-display font-bold text-navy-700">
            ${(earnings?.thisMonth || 0).toFixed(2)}
          </div>
          <div className="text-xs text-gray-400 mt-1">{earnings?.sessionsThisMonth || 0} sessions</div>
        </Card>
      </div>

      {/* Payout history */}
      <Card>
        <CardTitle>Payout History</CardTitle>
        <div className="mt-4">
          {payouts.length === 0 ? (
            <p className="text-sm text-gray-400 py-6 text-center">No payouts yet.</p>
          ) : (
            <div className="divide-y divide-gray-100">
              {payouts.map((payout: any) => (
                <div key={payout.id} className="flex items-center justify-between py-4">
                  <div>
                    <div className="text-sm font-medium text-navy-700">${payout.amount.toFixed(2)}</div>
                    <div className="text-xs text-gray-400 mt-0.5">
                      {new Date(payout.paidAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </div>
                  </div>
                  <Badge variant={payout.status === 'paid' ? 'success' : 'warning'}>
                    {payout.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
