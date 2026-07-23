'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  Scale,
  LayoutDashboard,
  FileText,
  FolderOpen,
  Settings,
  Plus,
  LogOut,
} from 'lucide-react';

const navItems = [
  { href: '/dashboard',           label: 'Dashboard',     icon: LayoutDashboard },
  { href: '/dashboard/sessions',  label: 'My Sessions',   icon: FileText },
  { href: '/dashboard/documents', label: 'My Documents',  icon: FolderOpen },
  { href: '/dashboard/settings',  label: 'Account',       icon: Settings },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-surface-alt">
      {/* ─── Top Navigation ─── */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 flex h-14 items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2">
              <Scale className="h-5 w-5 text-gold-400" />
              <span className="text-2xl font-script text-navy-700">SealProof</span>
            </Link>
            <nav className="hidden sm:flex items-center gap-1">
              {navItems.map(({ href, label, icon: Icon }) => {
                const active = pathname === href;
                return (
                  <Link
                    key={href}
                    href={href}
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-1.5 rounded-legal text-sm font-medium transition-colors',
                      active
                        ? 'bg-brand-50 text-navy-700 border border-brand-200'
                        : 'text-gray-500 hover:text-navy-700 hover:bg-gray-50'
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {label}
                  </Link>
                );
              })}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/session/new"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-legal text-sm font-semibold text-navy-800 transition-all"
              style={{ background: 'linear-gradient(135deg, #C5A05E 0%, #D4B574 100%)' }}
            >
              <Plus className="h-4 w-4" />
              New Session
            </Link>
            <button className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600 transition-colors">
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      {/* ─── Page Content ─── */}
      <main className="mx-auto max-w-7xl px-4 sm:px-6 py-8">
        {children}
      </main>
    </div>
  );
}
