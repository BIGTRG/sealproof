'use client';

import { useSessionWizard } from '@/lib/store';
import { useTenantStore } from '@/lib/store';
import { Button } from '@/components/ui/Button';
import { Clock, Zap, CheckCircle } from 'lucide-react';

export function StepServiceLevel() {
  const { data, setServiceLevel, nextStep, prevStep } = useSessionWizard();
  const { branding } = useTenantStore();
  const standardPrice = branding?.b2cStandardPriceCents ?? 2500;
  const rushPrice = branding?.b2cRushPriceCents ?? 4500;

  return (
    <div>
      <div className="text-center mb-8">
        <h2 className="font-display text-xl font-semibold text-navy-700">
          Choose your service level
        </h2>
        <p className="text-sm text-gray-500 mt-2">
          Both options include the same notarization quality and compliance guarantees.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-2xl mx-auto">
        {/* Standard */}
        <button
          onClick={() => setServiceLevel('standard')}
          className={`text-left p-6 rounded-legal border transition-all ${
            data.serviceLevel === 'standard'
              ? 'border-gold-300 bg-gold-50 shadow-legal-md'
              : 'border-gray-200 hover:border-gray-300 bg-white'
          }`}
        >
          <div className="flex items-center gap-3 mb-4">
            <div className={`flex h-10 w-10 items-center justify-center rounded-full ${
              data.serviceLevel === 'standard' ? 'bg-gold-300 text-navy-800' : 'bg-brand-50 border border-brand-200 text-gold-500'
            }`}>
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <div className="text-sm font-semibold text-navy-700">Standard</div>
              <div className="text-2xl font-display font-bold text-navy-700">${(standardPrice / 100).toFixed(0)}</div>
            </div>
          </div>
          <ul className="space-y-2 text-sm text-gray-500">
            <li className="flex items-center gap-2"><CheckCircle className="h-3.5 w-3.5 text-gold-400" /> Next available notary</li>
            <li className="flex items-center gap-2"><CheckCircle className="h-3.5 w-3.5 text-gold-400" /> Full compliance guarantee</li>
            <li className="flex items-center gap-2"><CheckCircle className="h-3.5 w-3.5 text-gold-400" /> Encrypted recording</li>
          </ul>
        </button>

        {/* Rush */}
        <button
          onClick={() => setServiceLevel('rush')}
          className={`text-left p-6 rounded-legal border transition-all relative ${
            data.serviceLevel === 'rush'
              ? 'border-gold-300 bg-gold-50 shadow-legal-md'
              : 'border-gray-200 hover:border-gray-300 bg-white'
          }`}
        >
          <div className="absolute -top-3 right-4">
            <span className="bg-gold-300 text-navy-800 text-xs font-semibold px-3 py-1 rounded-full">
              Priority
            </span>
          </div>
          <div className="flex items-center gap-3 mb-4">
            <div className={`flex h-10 w-10 items-center justify-center rounded-full ${
              data.serviceLevel === 'rush' ? 'bg-gold-300 text-navy-800' : 'bg-brand-50 border border-brand-200 text-gold-500'
            }`}>
              <Zap className="h-5 w-5" />
            </div>
            <div>
              <div className="text-sm font-semibold text-navy-700">Rush</div>
              <div className="text-2xl font-display font-bold text-navy-700">${(rushPrice / 100).toFixed(0)}</div>
            </div>
          </div>
          <ul className="space-y-2 text-sm text-gray-500">
            <li className="flex items-center gap-2"><CheckCircle className="h-3.5 w-3.5 text-gold-400" /> Jump to front of queue</li>
            <li className="flex items-center gap-2"><CheckCircle className="h-3.5 w-3.5 text-gold-400" /> Dedicated notary matching</li>
            <li className="flex items-center gap-2"><CheckCircle className="h-3.5 w-3.5 text-gold-400" /> Ideal for deadlines</li>
          </ul>
        </button>
      </div>

      <div className="flex items-center justify-between mt-8">
        <Button variant="ghost" onClick={prevStep}>Back</Button>
        <Button variant="gold" onClick={nextStep}>Continue</Button>
      </div>
    </div>
  );
}
