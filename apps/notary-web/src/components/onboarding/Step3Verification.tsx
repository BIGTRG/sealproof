'use client';

/**
 * Step 3: Verification — admin reviews credentials (1-3 business days)
 * This is a waiting screen. Notary checks back or gets an email.
 */
import { useOnboardingStore } from '@/lib/store';
import { Clock, Mail, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export function OnboardStep3Verification() {
  const { nextStep } = useOnboardingStore();

  // In production:
  // - Poll getMyProfile() for status changes
  // - Show "approved" state when admin approves
  // - Auto-advance to step 4
  const isApproved = false;

  return (
    <div className="text-center space-y-6 py-4">
      {!isApproved ? (
        <>
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-amber-100 mx-auto">
            <Clock className="h-10 w-10 text-amber-600" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Under Review</h2>
            <p className="mt-2 text-sm text-gray-500 max-w-sm mx-auto">
              Your credentials have been submitted for manual review.
              This typically takes 1-3 business days.
            </p>
          </div>
          <div className="rounded-lg bg-gray-50 border border-gray-200 p-4 max-w-sm mx-auto">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Mail className="h-4 w-4 text-gray-400" />
              <span>You will receive an email when your application is approved.</span>
            </div>
          </div>
          {/* Dev shortcut */}
          <div className="border-t border-dashed border-gray-200 pt-4">
            <p className="text-xs text-gray-400 mb-2">Dev: simulate admin approval</p>
            <Button variant="secondary" size="sm" onClick={nextStep}>
              Simulate Approval
            </Button>
          </div>
        </>
      ) : (
        <>
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-green-100 mx-auto">
            <CheckCircle className="h-10 w-10 text-green-500" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Approved</h2>
            <p className="mt-2 text-sm text-gray-500">
              Your credentials have been verified. Complete the training to start.
            </p>
          </div>
          <Button onClick={nextStep} size="lg">
            Continue to Training
          </Button>
        </>
      )}
    </div>
  );
}
