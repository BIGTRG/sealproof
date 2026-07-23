'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTenantStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import { FileText, Clock, FolderOpen, Settings, Menu, X } from 'lucide-react';
import { useState } from 'react';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: FileText },
  { href: '/dashboard/sessions', label: 'My Sessions', icon: Clock },
  { href: '/dashboard/documents', label: 'My Documents', icon: FolderOpen },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings },
];

export function Header() {
  const pathname = usePathname();
  const { branding } = useTenantStore();
  const [mobileOpen, setMobileOpen] = useState(false);

  const companyName = branding?.companyName || 'SealProof';

  return (
    <header className="sticky top-0 z-50 border-b border-gray-200 bg-white/95 backdrop-blur">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="flex h-16 items-center justify-between">
          {/* Logo / Brand */}
          <Link href="/dashboard" className="flex items-center gap-2">
            {branding?.logoUrl ? (
              <img src={branding.logoUrl} alt={companyName} className="h-8 w-auto" />
            ) : (
              <div className="flex items-center gap-2">
                <img src="/seal-icon.png" alt="SealProof" className="h-12 w-12 rounded-full object-cover" />
                <span className="text-lg font-semibold text-gray-900">{companyName}</span>
              </div>
            )}
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                  pathname === href || (href !== '/dashboard' && pathname?.startsWith(href))
                    ? 'bg-brand-50 text-brand-900'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            ))}
          </nav>

          {/* User area — Clerk UserButton renders here */}
          <div className="flex items-center gap-3">
            <div id="clerk-user-button" />
            <button
              className="md:hidden p-2 text-gray-500 hover:text-gray-700"
              onClick={() => setMobileOpen(!mobileOpen)}
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Nav */}
      {mobileOpen && (
        <div className="md:hidden border-t border-gray-200 bg-white px-4 py-3 space-y-1">
          {navItems.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                'flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium',
                pathname === href
                  ? 'bg-brand-50 text-brand-900'
                  : 'text-gray-600 hover:bg-gray-50'
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          ))}
        </div>
      )}
    </header>
  );
}
