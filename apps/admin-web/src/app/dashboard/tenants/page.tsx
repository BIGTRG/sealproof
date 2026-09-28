'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import * as api from '@/lib/api';
import { Plus, Settings, ExternalLink, X } from 'lucide-react';

type Tenant = {
  id: string; slug: string; company_name: string; domain: string; notary_domain: string | null; admin_domain: string | null;
  logo_url: string | null; primary_color: string; accent_color: string; legal_entity: string | null; status: string;
  b2c_standard_price_cents: number | null; b2c_rush_price_cents: number | null; notary_payout_cents: number | null;
  sessions_mtd: number; sessions_completed: number; notary_count: number; partner_count: number;
};

const EMPTY = { slug: '', companyName: '', domain: '', legalEntity: '', supportEmail: '', primaryColor: '#0F1B2D', accentColor: '#C5A05E', logoUrl: '', b2cStandardPriceCents: 2500, b2cRushPriceCents: 4500, notaryPayoutCents: 1000 };

export default function TenantsPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ ...EMPTY });
  const [saving, setSaving] = useState(false);

  const load = () => api.getTenants().then((r: any) => setTenants(r.tenants || [])).catch((e: any) => setError(e.message)).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const submit = async () => {
    setSaving(true); setError('');
    try {
      const slug = form.slug || form.companyName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      await api.createTenant({
        ...form, slug,
        notaryDomain: `notary.${form.domain}`, adminDomain: `admin.${form.domain}`, apiDomain: 'api.sealproof.ai',
        emailFromName: form.companyName, secondaryColor: form.primaryColor,
        enableB2c: true, enableB2b: true, enableApi: true, enableRush: true,
      });
      setAdding(false); setForm({ ...EMPTY });
      await load();
    } catch (e: any) { setError(e.message); }
    setSaving(false);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-2xl font-semibold text-navy-700">White-Label Tenants</h1>
          <p className="text-sm text-gray-500 mt-1">Each tenant runs the full platform under its own domain, brand, pricing and legal entity.</p>
        </div>
        <Button variant="gold" onClick={() => setAdding(true)}><Plus className="h-4 w-4" /> Add Tenant</Button>
      </div>

      {error && <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      {adding && (
        <Card className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-navy-700">New tenant</h2>
            <button onClick={() => setAdding(false)} className="text-gray-400 hover:text-gray-600"><X className="h-4 w-4" /></button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
            <Field label="Company name" value={form.companyName} onChange={(v) => setForm({ ...form, companyName: v })} placeholder="Acme Title Co." />
            <Field label="Customer domain" value={form.domain} onChange={(v) => setForm({ ...form, domain: v })} placeholder="notary.acmetitle.com" />
            <Field label="Legal entity" value={form.legalEntity} onChange={(v) => setForm({ ...form, legalEntity: v })} placeholder="Acme Title Company LLC" />
            <Field label="Support email" value={form.supportEmail} onChange={(v) => setForm({ ...form, supportEmail: v })} placeholder="support@acmetitle.com" />
            <Field label="Logo URL" value={form.logoUrl} onChange={(v) => setForm({ ...form, logoUrl: v })} placeholder="https://.../logo.png" />
            <div className="grid grid-cols-2 gap-3">
              <Field label="Primary color" type="color" value={form.primaryColor} onChange={(v) => setForm({ ...form, primaryColor: v })} />
              <Field label="Accent color" type="color" value={form.accentColor} onChange={(v) => setForm({ ...form, accentColor: v })} />
            </div>
            <Field label="Standard price (cents)" type="number" value={String(form.b2cStandardPriceCents)} onChange={(v) => setForm({ ...form, b2cStandardPriceCents: Number(v) })} />
            <Field label="Rush price (cents)" type="number" value={String(form.b2cRushPriceCents)} onChange={(v) => setForm({ ...form, b2cRushPriceCents: Number(v) })} />
            <Field label="Notary payout (cents)" type="number" value={String(form.notaryPayoutCents)} onChange={(v) => setForm({ ...form, notaryPayoutCents: Number(v) })} />
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setAdding(false)}>Cancel</Button>
            <Button variant="gold" size="sm" onClick={submit} loading={saving} disabled={!form.companyName || !form.domain}>Create tenant</Button>
          </div>
          <p className="mt-3 text-xs text-gray-400">After creating, point the domain&apos;s DNS at the platform and the SSL certificate is issued automatically on first request.</p>
        </Card>
      )}

      {loading ? (
        <p className="text-sm text-gray-400">Loading tenants...</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {tenants.map((t) => {
            const isPlatform = t.slug === 'sealproof';
            return (
              <Card key={t.id} variant={isPlatform ? 'elevated' : 'default'}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3 min-w-0">
                    {t.logo_url ? (
                      <img src={t.logo_url.startsWith('http') ? t.logo_url : `https://${t.domain}${t.logo_url}`} alt={t.company_name} className="h-10 w-10 object-contain" />
                    ) : (
                      <div className="flex h-10 w-10 items-center justify-center rounded-full border text-xs font-semibold" style={{ background: t.primary_color, color: t.accent_color, borderColor: t.accent_color }}>
                        {t.company_name.split(' ').map((w) => w[0]).join('').slice(0, 2)}
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-navy-700 truncate">{t.company_name}</div>
                      <a href={`https://${t.domain}`} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs text-gray-400 hover:text-navy-700 truncate">{t.domain} <ExternalLink className="h-3 w-3" /></a>
                    </div>
                  </div>
                  <Badge variant={isPlatform ? 'gold' : t.status === 'active' ? 'success' : 'warning'}>{isPlatform ? 'Primary' : t.status}</Badge>
                </div>
                <div className="space-y-2 text-xs text-gray-500">
                  <div className="flex justify-between"><span>Sessions (MTD)</span><span className="text-navy-700 font-medium">{t.sessions_mtd}</span></div>
                  <div className="flex justify-between"><span>Completed (all time)</span><span className="text-navy-700 font-medium">{t.sessions_completed}</span></div>
                  <div className="flex justify-between"><span>Notaries</span><span className="text-navy-700 font-medium">{t.notary_count}</span></div>
                  <div className="flex justify-between"><span>API partners</span><span className="text-navy-700 font-medium">{t.partner_count}</span></div>
                  <div className="flex justify-between"><span>Pricing</span><span className="text-navy-700 font-medium">${((t.b2c_standard_price_cents ?? 2500) / 100).toFixed(0)} / ${((t.b2c_rush_price_cents ?? 4500) / 100).toFixed(0)} rush</span></div>
                  <div className="flex justify-between"><span>Legal entity</span><span className="text-navy-700 font-medium truncate max-w-[60%] text-right">{t.legal_entity || '-'}</span></div>
                  <div className="flex items-center justify-between"><span>Palette</span><span className="flex gap-1"><i className="h-4 w-4 rounded-full border" style={{ background: t.primary_color }} /><i className="h-4 w-4 rounded-full border" style={{ background: t.accent_color }} /></span></div>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <a href={`https://${t.notary_domain || t.domain}`} target="_blank" rel="noreferrer"><Button variant="outline" size="sm" className="w-full">Notary portal</Button></a>
                  <a href={`https://${t.admin_domain || t.domain}`} target="_blank" rel="noreferrer"><Button variant="outline" size="sm" className="w-full"><Settings className="h-3.5 w-3.5" /> Admin</Button></a>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Field({ label, value, onChange, placeholder, type = 'text' }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-gray-500 mb-1">{label}</span>
      <input type={type} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-gold-400 focus:outline-none" />
    </label>
  );
}
