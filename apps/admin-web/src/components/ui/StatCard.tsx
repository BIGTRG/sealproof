'use client';

import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

interface StatCardProps {
  label: string;
  value: string | number;
  change?: string;
  changeType?: 'up' | 'down' | 'neutral';
  icon?: ReactNode;
  iconBg?: string;
  className?: string;
}

export function StatCard({ label, value, change, changeType, icon, iconBg = 'bg-gray-100', className }: StatCardProps) {
  return (
    <div className={cn('rounded-xl border border-gray-200 bg-white p-5', className)}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-gray-500">{label}</p>
          <p className="mt-1.5 text-2xl font-bold text-gray-900">{value}</p>
          {change && (
            <p className={cn('mt-1 text-xs font-medium', {
              'text-green-600': changeType === 'up',
              'text-red-600': changeType === 'down',
              'text-gray-500': changeType === 'neutral',
            })}>
              {change}
            </p>
          )}
        </div>
        {icon && (
          <div className={cn('flex h-10 w-10 items-center justify-center rounded-lg', iconBg)}>
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}
