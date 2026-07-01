'use client';

import { cn } from '@/lib/utils';

interface CardProps {
  className?: string;
  children: React.ReactNode;
  onClick?: () => void;
  hover?: boolean;
  variant?: 'default' | 'elevated' | 'outlined' | 'dark';
}

export function Card({ className, children, onClick, hover, variant = 'default' }: CardProps) {
  const variants = {
    default:  'bg-white border border-gray-200 shadow-legal-sm',
    elevated: 'bg-white border border-brand-200 shadow-legal-md',
    outlined: 'bg-transparent border border-gray-200',
    dark:     'bg-navy-700 border border-navy-500 text-white',
  };

  return (
    <div
      className={cn(
        'rounded-legal p-6',
        variants[variant],
        hover && 'cursor-pointer transition-all duration-200 hover:shadow-legal-md hover:border-gold-300',
        className
      )}
      onClick={onClick}
    >
      {children}
    </div>
  );
}

export function CardHeader({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn('mb-4', className)}>{children}</div>;
}

export function CardTitle({ className, children }: { className?: string; children: React.ReactNode }) {
  return <h3 className={cn('text-lg font-semibold text-navy-700 font-display', className)}>{children}</h3>;
}

export function CardDescription({ className, children }: { className?: string; children: React.ReactNode }) {
  return <p className={cn('text-sm text-gray-500 mt-1', className)}>{children}</p>;
}

export function CardContent({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn('', className)}>{children}</div>;
}
