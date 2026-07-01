'use client';
import { Sidebar } from '@/components/layout/Sidebar';
import { TopBar } from '@/components/layout/TopBar';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-surface-alt">
      <Sidebar />
      <TopBar />
      <main className="ml-60 px-8 py-8">{children}</main>
    </div>
  );
}
