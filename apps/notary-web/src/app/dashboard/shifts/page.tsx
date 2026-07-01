'use client';

import { useEffect, useState } from 'react';
import { Card, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import * as api from '@/lib/api';
import type { Shift } from '@/types';
import { Calendar, Clock, Plus, CheckCircle } from 'lucide-react';

export default function ShiftsPage() {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getMyShifts().then((data) => {
      setShifts(data || []);
      setLoading(false);
    });
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-2xl font-semibold text-navy-700">My Shifts</h1>
          <p className="text-sm text-gray-500 mt-1">Schedule and manage your availability.</p>
        </div>
        <Button variant="gold"><Plus className="h-4 w-4" /> Schedule Shift</Button>
      </div>

      <Card className="overflow-hidden !p-0">
        {loading ? (
          <div className="p-12 text-center text-gray-400 text-sm">Loading...</div>
        ) : shifts.length === 0 ? (
          <div className="p-12 text-center text-gray-400 text-sm">No shifts scheduled yet.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-surface-warm border-b border-gray-200">
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Time</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Sessions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {shifts.map((shift) => (
                <tr key={shift.id} className="hover:bg-brand-50/50 transition-colors">
                  <td className="px-6 py-4 font-medium text-navy-700">
                    {new Date(shift.startTime).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                  </td>
                  <td className="px-6 py-4 text-gray-500">
                    {new Date(shift.startTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                    {' -- '}
                    {new Date(shift.endTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                  </td>
                  <td className="px-6 py-4">
                    <Badge variant={
                      shift.status === 'active' ? 'success' :
                      shift.status === 'completed' ? 'navy' :
                      shift.status === 'scheduled' ? 'gold' : 'default'
                    }>
                      {shift.status}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 text-right text-navy-700 font-medium">{shift.sessionsHandled}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
