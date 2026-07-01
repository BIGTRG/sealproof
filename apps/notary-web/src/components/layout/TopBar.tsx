'use client';

import { Bell, User } from 'lucide-react';

export function TopBar() {
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-gray-200 bg-white px-6 ml-60">
      <div />
      <div className="flex items-center gap-4">
        <button className="relative text-gray-400 hover:text-navy-700 transition-colors">
          <Bell className="h-5 w-5" />
          <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-gold-300 border-2 border-white" />
        </button>
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-50 border border-brand-200">
            <User className="h-4 w-4 text-gold-500" />
          </div>
        </div>
      </div>
    </header>
  );
}
