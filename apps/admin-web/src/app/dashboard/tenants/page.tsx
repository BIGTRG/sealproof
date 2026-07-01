'use client';

import { Card, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Globe, Plus, Settings, MoreVertical } from 'lucide-react';

export default function TenantsPage() {
  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-2xl font-semibold text-navy-700">White-Label Tenants</h1>
          <p className="text-sm text-gray-500 mt-1">Manage white-label deployments and tenant configurations.</p>
        </div>
        <Button variant="gold"><Plus className="h-4 w-4" /> Add Tenant</Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* SealProof (default) */}
        <Card variant="elevated">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="seal-stamp inline-flex h-10 w-10 items-center justify-center !p-0 !border-gold-300">
                <span className="text-sm font-display font-bold text-gold-300">SP</span>
              </div>
              <div>
                <div className="text-sm font-semibold text-navy-700">SealProof</div>
                <div className="text-xs text-gray-400">sealproof.ai</div>
              </div>
            </div>
            <Badge variant="gold">Primary</Badge>
          </div>
          <div className="space-y-2 text-xs text-gray-500">
            <div className="flex justify-between"><span>Sessions (MTD)</span><span className="text-navy-700 font-medium">473</span></div>
            <div className="flex justify-between"><span>Notaries</span><span className="text-navy-700 font-medium">12</span></div>
            <div className="flex justify-between"><span>States</span><span className="text-navy-700 font-medium">46 + DC</span></div>
          </div>
          <div className="mt-4">
            <Button variant="outline" size="sm" className="w-full"><Settings className="h-3.5 w-3.5" /> Configure</Button>
          </div>
        </Card>

        {/* Example tenants */}
        {[
          { name: 'QuickSeal Legal', domain: 'quickseal.legal', sessions: 87, notaries: 4, status: 'active' },
          { name: 'TrustNotary Pro', domain: 'trustnotarypro.com', sessions: 0, notaries: 0, status: 'setup' },
        ].map((t) => (
          <Card key={t.domain}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-50 border border-brand-200 text-xs font-semibold text-gold-600">
                  {t.name.split(' ').map(w => w[0]).join('').slice(0, 2)}
                </div>
                <div>
                  <div className="text-sm font-semibold text-navy-700">{t.name}</div>
                  <div className="text-xs text-gray-400">{t.domain}</div>
                </div>
              </div>
              <Badge variant={t.status === 'active' ? 'success' : 'warning'}>{t.status}</Badge>
            </div>
            <div className="space-y-2 text-xs text-gray-500">
              <div className="flex justify-between"><span>Sessions (MTD)</span><span className="text-navy-700 font-medium">{t.sessions}</span></div>
              <div className="flex justify-between"><span>Notaries</span><span className="text-navy-700 font-medium">{t.notaries}</span></div>
            </div>
            <div className="mt-4">
              <Button variant="outline" size="sm" className="w-full"><Settings className="h-3.5 w-3.5" /> Configure</Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
