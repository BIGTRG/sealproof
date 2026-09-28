'use client';

/**
 * TenantProvider — resolves the white-label tenant from the current hostname,
 * loads branding into the tenant store, tags every API call with the tenant id,
 * and applies the tenant palette as CSS variables (navy = primary, gold = accent).
 *
 * The platform tenant (slug "sealproof") keeps the hand-tuned SealProof palette.
 */
import { useEffect } from 'react';
import * as api from '@/lib/api';
import { useTenantStore } from '@/lib/store';

const NAVY_L = { 50: 93, 100: 83, 200: 63, 300: 43, 400: 31, 500: 17, 600: 14, 700: 12, 800: 8, 900: 5 };
const GOLD_L = { 50: 96, 100: 91, 200: 82, 300: null, 400: -6, 500: -13, 600: -20 };

function hexToHsl(hex: string): [number, number, number] | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  const r = ((n >> 16) & 255) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l * 100];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;
  return [h * 360, s * 100, l * 100];
}

function applyPalette(primary: string, accent: string) {
  const root = document.documentElement;
  const p = hexToHsl(primary);
  const a = hexToHsl(accent);
  if (p) {
    Object.entries(NAVY_L).forEach(([k, l]) => root.style.setProperty(`--navy-${k}`, `hsl(${p[0].toFixed(0)} ${Math.min(p[1], 45).toFixed(0)}% ${l}%)`));
    root.style.setProperty('--brand-800', `hsl(${p[0].toFixed(0)} ${Math.min(p[1], 45).toFixed(0)}% 17%)`);
    root.style.setProperty('--brand-900', `hsl(${p[0].toFixed(0)} ${Math.min(p[1], 45).toFixed(0)}% 12%)`);
    root.style.setProperty('--brand-950', `hsl(${p[0].toFixed(0)} ${Math.min(p[1], 45).toFixed(0)}% 8%)`);
    root.style.setProperty('--surface-dark', `hsl(${p[0].toFixed(0)} ${Math.min(p[1], 45).toFixed(0)}% 12%)`);
  }
  if (a) {
    Object.entries(GOLD_L).forEach(([k, l]) => {
      const light = l === null ? a[2] : l < 0 ? Math.max(a[2] + l, 10) : l;
      const val = `hsl(${a[0].toFixed(0)} ${a[1].toFixed(0)}% ${light.toFixed(0)}%)`;
      root.style.setProperty(`--gold-${k}`, val);
      if (['300', '400', '500', '600'].includes(k)) root.style.setProperty(`--brand-${k}`, val);
    });
  }
}

export function TenantProvider({ children }: { children: React.ReactNode }) {
  const { setBranding } = useTenantStore();

  useEffect(() => {
    let cancelled = false;
    const host = window.location.hostname;
    api.resolveTenant(host).then((res: any) => {
      if (cancelled) return;
      const tenant = res?.tenant || res?.data?.tenant;
      if (!tenant) return;
      if (tenant.id) api.setTenantId(tenant.id);
      setBranding(tenant);

      if (tenant.slug !== 'sealproof') {
        applyPalette(tenant.primaryColor, tenant.accentColor);
        document.title = document.title.replace(/SealProof/g, tenant.companyName);
        if (tenant.faviconUrl) {
          let link = document.querySelector<HTMLLinkElement>("link[rel~='icon']");
          if (!link) { link = document.createElement('link'); link.rel = 'icon'; document.head.appendChild(link); }
          link.href = tenant.faviconUrl;
        }
      }
    }).catch(() => undefined);
    return () => { cancelled = true; };
  }, [setBranding]);

  return <>{children}</>;
}
