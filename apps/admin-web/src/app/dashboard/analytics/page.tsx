'use client';

import { Card, CardTitle } from '@/components/ui/Card';
import { BarChart3, Clock, Users, Video, MapPin } from 'lucide-react';

export default function AnalyticsPage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="font-display text-2xl font-semibold text-navy-700">Analytics</h1>
        <p className="text-sm text-gray-500 mt-1">Platform performance metrics and insights.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
        {[
          { label: 'Avg. Session Duration', value: '8m 42s', icon: Clock },
          { label: 'Completion Rate', value: '97.3%', icon: Video },
          { label: 'Avg. Wait Time', value: '1m 18s', icon: Users },
        ].map(({ label, value, icon: Icon }) => (
          <Card key={label}>
            <div className="flex items-center gap-3 mb-2">
              <Icon className="h-4 w-4 text-gold-500" />
              <span className="text-xs text-gray-400 uppercase tracking-wide">{label}</span>
            </div>
            <div className="text-3xl font-display font-bold text-navy-700">{value}</div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Volume by document type */}
        <Card>
          <CardTitle>Sessions by Document Type</CardTitle>
          <div className="mt-4 space-y-3">
            {[
              { type: 'Power of Attorney', count: 142, pct: 30 },
              { type: 'Mortgage / Loan', count: 118, pct: 25 },
              { type: 'Affidavit', count: 95, pct: 20 },
              { type: 'Property Deed', count: 71, pct: 15 },
              { type: 'Trust', count: 33, pct: 7 },
              { type: 'Other', count: 14, pct: 3 },
            ].map(({ type, count, pct }) => (
              <div key={type}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600">{type}</span>
                  <span className="text-navy-700 font-medium">{count}</span>
                </div>
                <div className="h-1.5 rounded-full bg-gray-100">
                  <div className="h-1.5 rounded-full bg-gradient-to-r from-gold-400 to-gold-300" style={{ width: `${pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Volume by state */}
        <Card>
          <CardTitle>Sessions by Signer State</CardTitle>
          <div className="mt-4 space-y-3">
            {[
              { state: 'North Carolina', count: 189, pct: 40 },
              { state: 'Virginia', count: 95, pct: 20 },
              { state: 'Florida', count: 71, pct: 15 },
              { state: 'Texas', count: 47, pct: 10 },
              { state: 'Georgia', count: 33, pct: 7 },
              { state: 'Other', count: 38, pct: 8 },
            ].map(({ state, count, pct }) => (
              <div key={state}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600">{state}</span>
                  <span className="text-navy-700 font-medium">{count}</span>
                </div>
                <div className="h-1.5 rounded-full bg-gray-100">
                  <div className="h-1.5 rounded-full bg-navy-200" style={{ width: `${pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
