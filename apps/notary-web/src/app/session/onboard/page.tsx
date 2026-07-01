'use client';

/**
 * Notary Onboarding Wizard — 5-step credentialing flow
 *
 * Step 1: Personal info + NC commission details
 * Step 2: Document upload (6 required credentials)
 * Step 3: Verification (admin review, 1-3 business days)
 * Step 4: Approval + mandatory training video
 * Step 5: First shift available
 */
import { useOnboardingStore } from '@/lib/store';
import { OnboardStep1Personal } from '@/components/onboarding/Step1Personal';
import { OnboardStep2Documents } from '@/components/onboarding/Step2Documents';
import { OnboardStep3Verification } from '@/components/onboarding/Step3Verification';
import { OnboardStep4Training } from '@/components/onboarding/Step4Training';
import { OnboardStep5Ready } from '@/components/onboarding/Step5Ready';

const stepLabels = ['Personal Info', 'Documents', 'Verification', 'Training', 'Ready'];

const StepComponents: Record<number, React.ComponentType> = {
  1: OnboardStep1Personal,
  2: OnboardStep2Documents,
  3: OnboardStep3Verification,
  4: OnboardStep4Training,
  5: OnboardStep5Ready,
};

export default function OnboardingPage() {
  const { step } = useOnboardingStore();
  const CurrentStep = StepComponents[step] || OnboardStep1Personal;

  return (
    <div className="min-h-screen bg-brand-950 flex items-start justify-center py-12 px-4">
      <div className="w-full max-w-xl">
        {/* Progress */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            {stepLabels.map((label, i) => {
              const stepNum = i + 1;
              const active = step === stepNum;
              const completed = step > stepNum;
              return (
                <div key={label} className="flex flex-col items-center flex-1">
                  <div
                    className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold mb-1 ${
                      completed
                        ? 'bg-green-500 text-white'
                        : active
                        ? 'bg-white text-brand-950'
                        : 'bg-white/10 text-white/40'
                    }`}
                  >
                    {completed ? '\u2713' : stepNum}
                  </div>
                  <span
                    className={`text-[10px] font-medium ${
                      active || completed ? 'text-white' : 'text-white/30'
                    }`}
                  >
                    {label}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="flex gap-1">
            {stepLabels.map((_, i) => (
              <div
                key={i}
                className={`h-1 flex-1 rounded-full ${
                  step > i + 1 ? 'bg-green-500' : step === i + 1 ? 'bg-white' : 'bg-white/10'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Step content */}
        <div className="rounded-xl bg-white p-8 shadow-lg">
          <CurrentStep />
        </div>
      </div>
    </div>
  );
}
