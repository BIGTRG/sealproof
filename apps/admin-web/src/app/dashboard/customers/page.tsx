'use client';

import { Card, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Users, Building2, Key, Search } from 'lucide-react';

export default function CustomersPage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="font-display text-2xl font-semibold text-navy-700">Customers & API Partners</h1>
        <p className="text-sm text-gray-500 mt-1">Manage customer accounts, B2B subscriptions, and API integrations.</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 mb-6 border-b border-gray-200">
        {['B2C Customers', 'B2B Subscribers', 'API Partners'].map((tab, i) => (
          <button key={tab} className={`pb-3 text-sm font-medium border-b-2 transition-colors ${i === 0 ? 'border-gold-300 text-navy-700' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>
            {tab}
          </button>
        ))}
      </div>

      <Card className="!p-0 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
          <Search className="h-4 w-4 text-gray-400" />
          <input placeholder="Search customers..." className="text-sm text-navy-700 placeholder:text-gray-400 outline-none flex-1" />
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-surface-warm border-b border-gray-200">
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Customer</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Email</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Sessions</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Spent</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Last Session</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {[
              { name: 'John Morrison', email: 'john@email.com', sessions: 5, spent: '$145.00', last: '2 hours ago' },
              { name: 'Sarah Thomas', email: 'sarah@email.com', sessions: 3, spent: '$75.00', last: '1 day ago' },
              { name: 'Carlos Garcia', email: 'carlos@email.com', sessions: 1, spent: '$25.00', last: '3 days ago' },
              { name: 'Lisa Rogers', email: 'lisa@email.com', sessions: 2, spent: '$70.00', last: '5 days ago' },
            ].map((c) => (
              <tr key={c.email} className="hover:bg-brand-50/50 transition-colors">
                <td className="px-6 py-4 font-medium text-navy-700">{c.name}</td>
                <td className="px-6 py-4 text-gray-500">{c.email}</td>
                <td className="px-6 py-4 text-navy-700">{c.sessions}</td>
                <td className="px-6 py-4 font-medium text-navy-700">{c.spent}</td>
                <td className="px-6 py-4 text-gray-400">{c.last}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
