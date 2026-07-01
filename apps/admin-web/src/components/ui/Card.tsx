'use client';
import { cn } from '@/lib/utils';

interface CardProps { className?: string; children: React.ReactNode; variant?: 'default' | 'elevated' | 'dark'; }

export function Card({ className, children, variant = 'default' }: CardProps) {
  const v = { default: 'bg-white border border-gray-200 shadow-legal-sm', elevated: 'bg-white border border-brand-200 shadow-legal-md', dark: 'bg-navy-700 border border-navy-500 text-white' };
  return <div className={cn('rounded-legal p-6', v[variant], className)}>{children}</div>;
}

export function CardTitle({ className, children }: { className?: string; children: React.ReactNode }) {
  return <h3 className={cn('text-lg font-semibold text-navy-700 font-display', className)}>{children}</h3>;
}
