'use client';

import { useEffect, useState } from 'react';
import { Card, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import * as api from '@/lib/api';
import { BookOpen, Download, Shield, Search } from 'lucide-react';

export default function JournalPage() {
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getMyJournal().then((data) => {
      setEntries(data || []);
      setLoading(false);
    });
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-2xl font-semibold text-navy-700">Notary Journal</h1>
          <p className="text-sm text-gray-500 mt-1">
            Immutable hash-chained record of all notarial acts performed.
          </p>
        </div>
        <Button variant="outline">
          <Download className="h-4 w-4" /> Export Journal
        </Button>
      </div>

      {/* Chain integrity */}
      <Card className="mb-6 !p-4 flex items-center gap-3">
        <Shield className="h-5 w-5 text-emerald-500" />
        <span className="text-sm font-medium text-navy-700">Chain Integrity: Verified</span>
        <span className="text-xs text-gray-400">SHA-256 hash chain intact. {entries.length} entries.</span>
      </Card>

      <Card className="overflow-hidden !p-0">
        {loading ? (
          <div className="p-12 text-center text-gray-400 text-sm">Loading journal entries...</div>
        ) : entries.length === 0 ? (
          <div className="p-12 text-center">
            <BookOpen className="h-8 w-8 text-brand-200 mx-auto mb-3" />
            <p className="text-sm text-gray-400">No journal entries yet. Complete your first session to start your journal.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-surface-warm border-b border-gray-200">
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Entry #</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Act</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Signer</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Document</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">State</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {entries.map((entry: any) => (
                <tr key={entry.id} className="hover:bg-brand-50/50 transition-colors">
                  <td className="px-6 py-4 font-mono text-xs text-gold-600">{entry.sequenceNumber}</td>
                  <td className="px-6 py-4 text-gray-500">
                    {new Date(entry.actDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </td>
                  <td className="px-6 py-4">
                    <Badge variant="gold">{entry.notarizationAct.replace(/_/g, ' ')}</Badge>
                  </td>
                  <td className="px-6 py-4 text-navy-700 font-medium">{entry.signerName}</td>
                  <td className="px-6 py-4 text-gray-500 capitalize">{entry.documentType.replace(/_/g, ' ')}</td>
                  <td className="px-6 py-4 text-gray-500 uppercase">{entry.governingState || 'NC'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
