'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  Scale,
  LayoutDashboard,
  Calendar,
  BookOpen,
  DollarSign,
  Settings,
  LogOut,
} from 'lucide-react';

const navItems = [
  { href: '/dashboard',          label: 'Dashboard',  icon: LayoutDashboard },
  { href: '/dashboard/shifts',   label: 'My Shifts',  icon: Calendar },
  { href: '/dashboard/journal',  label: 'Journal',    icon: BookOpen },
  { href: '/dashboard/earnings', label: 'Earnings',   icon: DollarSign },
  { href: '/dashboard/settings', label: 'Settings',   icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed inset-y-0 left-0 z-40 flex w-60 flex-col bg-navy-700 text-white">
      {/* Logo */}
      <div className="flex h-16 items-center gap-2.5 px-6 border-b border-navy-500">
        <img src="/seal-icon.png" alt="SealProof" className="h-12 w-12 object-contain drop-shadow-[0_0_6px_rgba(197,160,94,0.45)]" />
        <div>
          <span className="text-xl font-script text-white">Seal<span className="text-brand-300">Proof</span></span>
          <span className="block text-[10px] text-gold-300 font-medium tracking-wide uppercase">Notary Portal</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-legal text-sm font-medium transition-all',
                active
                  ? 'bg-navy-500 text-white border-l-2 border-gold-300'
                  : 'text-gray-400 hover:text-white hover:bg-navy-600'
              )}
            >
              <Icon className={cn('h-4 w-4', active ? 'text-gold-300' : '')} />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="px-3 pb-4">
        <div className="divider-gold opacity-30 mb-3" />
        <button className="flex items-center gap-3 px-3 py-2 text-sm text-gray-400 hover:text-white transition-colors w-full">
          <LogOut className="h-4 w-4" />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
