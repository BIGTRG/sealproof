'use client';

import { useSessionWizard } from '@/lib/store';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Input';
import type { DocumentType } from '@/types';
import {
  Home, FileText, ScrollText, Shield, Scale, Landmark, FileQuestion,
} from 'lucide-react';

const DOC_TYPES: { value: DocumentType; label: string; icon: any; desc: string }[] = [
  { value: 'deed',      label: 'Property Deed',        icon: Home,         desc: 'Real estate deeds and transfers' },
  { value: 'poa',       label: 'Power of Attorney',     icon: Shield,       desc: 'Durable, financial, or healthcare' },
  { value: 'will',      label: 'Will or Trust',         icon: ScrollText,   desc: 'Last will, revocable or irrevocable trust' },
  { value: 'trust',     label: 'Trust Document',        icon: Scale,        desc: 'Trust amendments, certifications' },
  { value: 'affidavit', label: 'Affidavit',             icon: FileText,     desc: 'Sworn statements and declarations' },
  { value: 'mortgage',  label: 'Mortgage / Loan',       icon: Landmark,     desc: 'Mortgage closings, loan documents' },
  { value: 'other',     label: 'Other Document',        icon: FileQuestion, desc: 'Any other notarizable document' },
];

export function StepDocumentType() {
  const { data, setDocumentType, setDescription, nextStep } = useSessionWizard();

  return (
    <div>
      <div className="text-center mb-8">
        <h2 className="font-display text-xl font-semibold text-navy-700">
          What type of document?
        </h2>
        <p className="text-sm text-gray-500 mt-2">
          Select the document type to ensure we match you with the right notary.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
        {DOC_TYPES.map(({ value, label, icon: Icon, desc }) => (
          <button
            key={value}
            onClick={() => setDocumentType(value)}
            className={`text-left p-4 rounded-legal border transition-all flex items-start gap-3 ${
              data.documentType === value
                ? 'border-gold-300 bg-gold-50 shadow-legal-sm'
                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
            }`}
          >
            <div className={`flex h-9 w-9 items-center justify-center rounded-legal flex-shrink-0 ${
              data.documentType === value
                ? 'bg-gold-300 text-navy-800'
                : 'bg-brand-50 border border-brand-200 text-gold-500'
            }`}>
              <Icon className="h-4 w-4" />
            </div>
            <div>
              <div className="text-sm font-medium text-navy-700">{label}</div>
              <div className="text-xs text-gray-400 mt-0.5">{desc}</div>
            </div>
          </button>
        ))}
      </div>

      <Card>
        <Textarea
          label="Description (optional)"
          placeholder="Briefly describe the document or any special instructions for the notary."
          rows={3}
          value={data.description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </Card>

      <div className="flex justify-end mt-8">
        <Button variant="gold" onClick={nextStep}>
          Continue
        </Button>
      </div>
    </div>
  );
}
