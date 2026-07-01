'use client';

import { cn } from '@/lib/utils';

interface ProgressBarProps {
  value: number;
  max?: number;
  className?: string;
  showLabel?: boolean;
}

export function ProgressBar({ value, max = 100, className, showLabel }: ProgressBarProps) {
  const pct = Math.min(100, Math.round((value / max) * 100));
  return (
    <div className={cn('w-full', className)}>
      <div className="flex items-center gap-2">
        <div className="flex-1 h-2 bg-brand-100 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500 ease-out"
            style={{
              width: `${pct}%`,
              background: 'linear-gradient(90deg, #C5A05E 0%, #D4B574 100%)',
            }}
          />
        </div>
        {showLabel && <span className="text-xs text-gray-500 tabular-nums w-10 text-right">{pct}%</span>}
      </div>
    </div>
  );
}

// ─── Step Indicator (for session wizard) ────────────────────────────────────

interface StepIndicatorProps {
  steps: string[];
  currentStep: number;
}

export function StepIndicator({ steps, currentStep }: StepIndicatorProps) {
  return (
    <nav className="flex items-center justify-center gap-2">
      {steps.map((label, i) => {
        const stepNum = i + 1;
        const isActive = stepNum === currentStep;
        const isComplete = stepNum < currentStep;

        return (
          <div key={label} className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              <div
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold transition-all duration-200',
                  isActive && 'bg-navy-700 text-white shadow-legal-sm',
                  isComplete && 'bg-gold-300 text-navy-800',
                  !isActive && !isComplete && 'bg-gray-100 text-gray-400 border border-gray-200'
                )}
              >
                {isComplete ? (
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : stepNum}
              </div>
              <span
                className={cn(
                  'hidden sm:block text-xs font-medium',
                  isActive ? 'text-navy-700' : isComplete ? 'text-gold-600' : 'text-gray-400'
                )}
              >
                {label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className={cn(
                'w-8 h-px transition-colors duration-200',
                isComplete ? 'bg-gold-300' : 'bg-gray-200'
              )} />
            )}
          </div>
        );
      })}
    </nav>
  );
}
