'use client';

import { cn } from '@/lib/utils';

interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  description?: string;
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
}

export function Toggle({ checked, onChange, label, description, size = 'md', disabled }: ToggleProps) {
  const sizeMap = {
    sm: { track: 'h-5 w-9', thumb: 'h-3.5 w-3.5', translate: 'translate-x-4' },
    md: { track: 'h-6 w-11', thumb: 'h-5 w-5', translate: 'translate-x-5' },
    lg: { track: 'h-8 w-14', thumb: 'h-6 w-6', translate: 'translate-x-6' },
  };
  const s = sizeMap[size];

  return (
    <div className="flex items-center justify-between">
      {(label || description) && (
        <div className="mr-4">
          {label && <p className="text-sm font-medium text-gray-900">{label}</p>}
          {description && <p className="text-xs text-gray-500">{description}</p>}
        </div>
      )}
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative inline-flex flex-shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2',
          s.track,
          checked ? 'bg-brand-600' : 'bg-gray-200',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
      >
        <span
          className={cn(
            'pointer-events-none inline-block rounded-full bg-white shadow ring-0 transition-transform duration-200 ease-in-out',
            s.thumb,
            'translate-y-[1px] translate-x-[2px]',
            checked && s.translate
          )}
        />
      </button>
    </div>
  );
}
