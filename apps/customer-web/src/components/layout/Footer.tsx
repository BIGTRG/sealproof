'use client';

import { useTenantStore } from '@/lib/store';

export function Footer() {
  const { branding } = useTenantStore();
  const companyName = branding?.companyName || 'SealProof';
  const legalEntity = branding?.legalEntity || 'SealProof LLC';
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-gray-200 bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-gray-500">
            &copy; {year} {legalEntity}. All rights reserved.
          </p>
          <div className="flex items-center gap-6">
            {branding?.termsUrl && (
              <a href={branding.termsUrl} className="text-sm text-gray-500 hover:text-gray-700">
                Terms of Service
              </a>
            )}
            {branding?.privacyUrl && (
              <a href={branding.privacyUrl} className="text-sm text-gray-500 hover:text-gray-700">
                Privacy Policy
              </a>
            )}
            {branding?.supportEmail && (
              <a
                href={`mailto:${branding.supportEmail}`}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Support
              </a>
            )}
          </div>
        </div>
      </div>
    </footer>
  );
}
