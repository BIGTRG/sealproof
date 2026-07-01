'use client';

import { Card, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { DollarSign, TrendingUp, CreditCard, ArrowUpRight, ArrowDownRight } from 'lucide-react';

export default function FinancialsPage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="font-display text-2xl font-semibold text-navy-700">Financials</h1>
        <p className="text-sm text-gray-500 mt-1">Revenue, payouts, and financial performance.</p>
      </div>

      {/* Revenue stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-6 mb-8">
        {[
          { label: 'Gross Revenue (MTD)', value: '$12,450', change: '+24%', up: true },
          { label: 'Net Revenue (MTD)', value: '$8,715', change: '+18%', up: true },
          { label: 'Notary Payouts (MTD)', value: '$3,735', change: '+31%', up: true },
          { label: 'Avg. Session Value', value: '$29.40', change: '-2%', up: false },
        ].map(({ label, value, change, up }) => (
          <Card key={label}>
            <div className="text-xs text-gray-400 uppercase tracking-wide mb-2">{label}</div>
            <div className="text-3xl font-display font-bold text-navy-700">{value}</div>
            <div className={`flex items-center gap-1 mt-1 text-xs font-medium ${up ? 'text-emerald-600' : 'text-red-500'}`}>
              {up ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
              {change} vs last month
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue by channel */}
        <Card>
          <CardTitle>Revenue by Channel</CardTitle>
          <div className="mt-4 space-y-4">
            {[
              { channel: 'B2C Standard', revenue: '$6,225', pct: 50 },
              { channel: 'B2C Rush', revenue: '$3,780', pct: 30 },
              { channel: 'B2B Subscriptions', revenue: '$1,998', pct: 16 },
              { channel: 'API Partners', revenue: '$447', pct: 4 },
            ].map(({ channel, revenue, pct }) => (
              <div key={channel}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-navy-700">{channel}</span>
                  <span className="font-medium text-navy-700">{revenue}</span>
                </div>
                <div className="h-2 rounded-full bg-gray-100">
                  <div className="h-2 rounded-full bg-gradient-to-r from-gold-400 to-gold-300" style={{ width: `${pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Recent payouts */}
        <Card>
          <CardTitle>Recent Notary Payouts</CardTitle>
          <div className="mt-4 divide-y divide-gray-100">
            {[
              { notary: 'J. Williams', amount: '$312.50', sessions: 25, date: 'Jun 7' },
              { notary: 'K. Chen', amount: '$287.50', sessions: 23, date: 'Jun 7' },
              { notary: 'R. Patel', amount: '$200.00', sessions: 16, date: 'Jun 7' },
              { notary: 'M. Davis', amount: '$137.50', sessions: 11, date: 'Jun 7' },
            ].map((p) => (
              <div key={p.notary} className="flex items-center justify-between py-3">
                <div>
                  <div className="text-sm font-medium text-navy-700">{p.notary}</div>
                  <div className="text-xs text-gray-400">{p.sessions} sessions -- {p.date}</div>
                </div>
                <span className="text-sm font-semibold text-navy-700">{p.amount}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
