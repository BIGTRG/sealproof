'use client';

import { cn } from '@/lib/utils';
import { forwardRef } from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, className, id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');
    return (
      <div className="w-full">
        {label && <label htmlFor={inputId} className="block text-sm font-medium text-navy-600 mb-1.5">{label}</label>}
        <input
          ref={ref} id={inputId}
          className={cn(
            'block w-full rounded-legal border px-4 py-2.5 text-sm shadow-legal-sm bg-white',
            'placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gold-300 focus:border-gold-300 transition-colors',
            error ? 'border-red-300' : 'border-gray-300 hover:border-gray-400',
            className
          )}
          {...props}
        />
        {error && <p className="mt-1.5 text-xs text-red-600">{error}</p>}
        {helperText && !error && <p className="mt-1.5 text-xs text-gray-500">{helperText}</p>}
      </div>
    );
  }
);
Input.displayName = 'Input';
