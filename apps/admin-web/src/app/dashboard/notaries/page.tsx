'use client';

import { Card, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { UserCheck, Plus, Search, MoreVertical } from 'lucide-react';

const notaries = [
  { name: 'Jane Williams', state: 'NC', commission: 'NC-2024-0482', status: 'active', sessions: 234, rating: 4.9, online: true },
  { name: 'Kevin Chen', state: 'NC', commission: 'NC-2023-1128', status: 'active', sessions: 189, rating: 4.8, online: true },
  { name: 'Riya Patel', state: 'VA', commission: 'VA-2024-0091', status: 'active', sessions: 156, rating: 4.7, online: false },
  { name: 'Marcus Davis', state: 'FL', commission: 'FL-2023-3347', status: 'active', sessions: 98, rating: 4.6, online: true },
  { name: 'Sarah Thompson', state: 'TX', commission: 'TX-2024-2201', status: 'pending', sessions: 0, rating: 0, online: false },
];

export default function NotariesPage() {
  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-2xl font-semibold text-navy-700">Notary Management</h1>
          <p className="text-sm text-gray-500 mt-1">Review applications, manage commissions, and monitor performance.</p>
        </div>
        <Button variant="gold"><Plus className="h-4 w-4" /> Invite Notary</Button>
      </div>

      <Card className="!p-0 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
          <Search className="h-4 w-4 text-gray-400" />
          <input placeholder="Search notaries..." className="text-sm text-navy-700 placeholder:text-gray-400 outline-none flex-1" />
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-surface-warm border-b border-gray-200">
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Notary</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">State</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Commission</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
              <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Sessions</th>
              <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Rating</th>
              <th className="px-6 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {notaries.map((n) => (
              <tr key={n.commission} className="hover:bg-brand-50/50 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-50 border border-brand-200 text-xs font-semibold text-gold-600">
                        {n.name.split(' ').map(w => w[0]).join('')}
                      </div>
                      {n.online && <div className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-500 border-2 border-white" />}
                    </div>
                    <span className="font-medium text-navy-700">{n.name}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-gray-500">{n.state}</td>
                <td className="px-6 py-4 font-mono text-xs text-gray-500">{n.commission}</td>
                <td className="px-6 py-4"><Badge variant={n.status === 'active' ? 'success' : 'warning'}>{n.status}</Badge></td>
                <td className="px-6 py-4 text-right font-medium text-navy-700">{n.sessions}</td>
                <td className="px-6 py-4 text-right text-navy-700">{n.rating > 0 ? n.rating.toFixed(1) : '--'}</td>
                <td className="px-6 py-4"><button className="text-gray-400 hover:text-navy-700"><MoreVertical className="h-4 w-4" /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
