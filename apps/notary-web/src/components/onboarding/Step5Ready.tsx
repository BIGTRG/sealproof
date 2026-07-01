'use client';

/**
 * Step 5: All done — first shift available
 */
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { CheckCircle, ArrowRight, Calendar, DollarSign, BookOpen } from 'lucide-react';

export function OnboardStep5Ready() {
  return (
    <div className="text-center space-y-6 py-4">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-green-100 mx-auto">
        <CheckCircle className="h-12 w-12 text-green-500" />
      </div>

      <div>
        <h2 className="text-2xl font-bold text-gray-900">You are all set</h2>
        <p className="mt-2 text-sm text-gray-500 max-w-sm mx-auto">
          Your credentials are verified and training is complete.
          Schedule your first shift and start earning.
        </p>
      </div>

      {/* Quick info */}
      <div className="grid grid-cols-3 gap-4 max-w-md mx-auto text-center">
        <div>
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-100 mx-auto mb-2">
            <Calendar className="h-5 w-5 text-brand-700" />
          </div>
          <p className="text-xs font-medium text-gray-700">Schedule shifts</p>
        </div>
        <div>
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-100 mx-auto mb-2">
            <BookOpen className="h-5 w-5 text-brand-700" />
          </div>
          <p className="text-xs font-medium text-gray-700">Journal auto-fills</p>
        </div>
        <div>
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-100 mx-auto mb-2">
            <DollarSign className="h-5 w-5 text-brand-700" />
          </div>
          <p className="text-xs font-medium text-gray-700">Earn per session</p>
        </div>
      </div>

      <Link href="/dashboard">
        <Button size="lg">
          Go to Dashboard
          <ArrowRight className="h-4 w-4" />
        </Button>
      </Link>
    </div>
  );
}
