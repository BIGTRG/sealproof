'use client';

import { useTenantStore } from '@/lib/store';

interface BrandMarkProps {
  tone?: 'light' | 'dark';
  size?: 'sm' | 'md';
  className?: string;
}

/**
 * Tenant-aware wordmark. SealProof (platform tenant) keeps the seal icon and the
 * two-tone script wordmark; white-label tenants get their logo or their name in
 * the same script treatment.
 */
export function BrandMark({ tone = 'dark', size = 'md', className = '' }: BrandMarkProps) {
  const { branding } = useTenantStore();
  const name = branding?.companyName || 'SealProof';
  const isPlatform = !branding || branding.slug === 'sealproof';
  const textColor = tone === 'light' ? 'text-white' : 'text-navy-700';
  const textSize = size === 'sm' ? 'text-xl' : 'text-2xl';
  const iconSize = size === 'sm' ? 'h-9 w-9' : 'h-12 w-12';

  if (!isPlatform && branding?.logoUrl) {
    return <img src={branding.logoUrl} alt={name} className={`${size === 'sm' ? 'h-8' : 'h-10'} w-auto object-contain ${className}`} />;
  }

  return (
    <span className={`flex items-center gap-3 ${className}`}>
      {isPlatform && (
        <img src="/seal-icon.png" alt={name} className={`${iconSize} object-contain drop-shadow-[0_0_6px_rgba(197,160,94,0.45)]`} />
      )}
      <span className={`${textSize} font-script ${textColor}`}>
        {isPlatform ? (<>Seal<span className="text-brand-300">Proof</span></>) : name}
      </span>
    </span>
  );
}
