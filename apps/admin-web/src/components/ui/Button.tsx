'use client';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'gold';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  children: React.ReactNode;
}

export function Button({ variant = 'primary', size = 'md', loading = false, className, children, disabled, ...props }: ButtonProps) {
  const variants = {
    primary:   'bg-navy-700 text-white hover:bg-navy-600 focus:ring-gold-300 border border-navy-600',
    secondary: 'bg-brand-50 text-navy-700 hover:bg-brand-100 focus:ring-gold-300 border border-brand-200',
    outline:   'border border-gray-300 text-gray-700 hover:border-gold-300 hover:text-navy-700 focus:ring-gold-300',
    ghost:     'text-gray-600 hover:text-navy-700 hover:bg-brand-50',
    danger:    'bg-red-700 text-white hover:bg-red-800 focus:ring-red-500 border border-red-600',
    gold:      'bg-gradient-to-r from-gold-400 to-gold-300 text-navy-800 hover:from-gold-500 hover:to-gold-400 focus:ring-gold-300 border border-gold-400 font-semibold',
  };
  const sizes = { sm: 'px-3 py-1.5 text-sm', md: 'px-5 py-2.5 text-sm', lg: 'px-7 py-3.5 text-base' };
  return (
    <button className={cn('inline-flex items-center justify-center gap-2 rounded-legal font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed', variants[variant], sizes[size], className)} disabled={disabled || loading} {...props}>
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
    </button>
  );
}
