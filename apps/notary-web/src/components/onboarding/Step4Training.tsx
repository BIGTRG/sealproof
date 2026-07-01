'use client';

/**
 * Step 4: Mandatory onboarding training video
 * Notary must watch the full video before they can start shifts.
 */
import { useState } from 'react';
import { useOnboardingStore } from '@/lib/store';
import { Button } from '@/components/ui/Button';
import { Play, CheckCircle } from 'lucide-react';

export function OnboardStep4Training() {
  const { nextStep, prevStep } = useOnboardingStore();
  const [watched, setWatched] = useState(false);
  const [playing, setPlaying] = useState(false);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Onboarding Training</h2>
        <p className="mt-1 text-sm text-gray-500">
          Watch this mandatory training video before conducting your first session.
          Covers NC remote notarization procedures, platform walkthrough, and compliance requirements.
        </p>
      </div>

      {/* Video player placeholder */}
      <div className="rounded-xl bg-gray-900 aspect-video flex items-center justify-center relative overflow-hidden">
        {!playing ? (
          <button
            onClick={() => setPlaying(true)}
            className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-6 py-3 rounded-lg transition-colors"
          >
            <Play className="h-6 w-6" />
            <span className="font-medium">Play Training Video</span>
          </button>
        ) : (
          <div className="text-center text-white space-y-3">
            <p className="text-lg font-semibold">Training video playing...</p>
            <p className="text-sm text-white/60">
              In production, this embeds the training video hosted on the platform.
            </p>
            {!watched && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setWatched(true)}
              >
                Mark as Watched (dev)
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Training topics */}
      <div className="space-y-2">
        <p className="text-sm font-medium text-gray-700">Topics covered:</p>
        {[
          'NC General Statutes Chapter 10B overview',
          'Remote notarization session procedures',
          'Identity verification best practices',
          'Electronic seal and signature application',
          'Journal entry requirements',
          'Common issues and how to handle them',
          'Platform walkthrough (dashboard, queue, session view)',
        ].map((topic) => (
          <div key={topic} className="flex items-center gap-2">
            <CheckCircle className={`h-4 w-4 ${watched ? 'text-green-500' : 'text-gray-300'}`} />
            <span className="text-sm text-gray-600">{topic}</span>
          </div>
        ))}
      </div>

      <div className="flex justify-between">
        <Button variant="outline" onClick={prevStep}>
          Back
        </Button>
        <Button onClick={nextStep} disabled={!watched} size="lg">
          Complete Training
        </Button>
      </div>
    </div>
  );
}
