'use client';
import { cn } from '@/lib/utils';

interface BadgeProps { className?: string; children: React.ReactNode; variant?: 'default' | 'success' | 'warning' | 'danger' | 'gold' | 'navy'; }

export function Badge({ className, children, variant = 'default' }: BadgeProps) {
  const v = {
    default: 'bg-gray-100 text-gray-700 border-gray-200',
    success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    warning: 'bg-amber-50 text-amber-700 border-amber-200',
    danger:  'bg-red-50 text-red-700 border-red-200',
    gold:    'bg-gold-50 text-gold-600 border-gold-200',
    navy:    'bg-navy-50 text-navy-700 border-navy-200',
  };
  return <span className={cn('inline-flex items-center rounded-legal px-2.5 py-0.5 text-xs font-medium border', v[variant], className)}>{children}</span>;
}
