'use client';

import { Button } from '@/components/ui/Button';
import { AlertTriangle } from 'lucide-react';

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-warm">
      <div className="text-center max-w-md px-6">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-50 border border-red-200 mx-auto mb-6">
          <AlertTriangle className="h-6 w-6 text-red-500" />
        </div>
        <h2 className="font-display text-xl font-semibold text-navy-700 mb-2">Something went wrong</h2>
        <p className="text-sm text-gray-500 mb-6">
          An unexpected error occurred. Our team has been notified.
        </p>
        <Button variant="primary" onClick={() => reset()}>Try Again</Button>
      </div>
    </div>
  );
}
