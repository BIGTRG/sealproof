'use client';

/**
 * Step 2: Document upload — checklist is built dynamically from the
 * commission state's RON rules captured in Step 1.
 */
import { useMemo, useState } from 'react';
import { useOnboardingStore } from '@/lib/store';
import { Button } from '@/components/ui/Button';
import { Upload, CheckCircle, FileText, X } from 'lucide-react';

const money = (cents?: number | null) =>
  cents ? `$${(cents / 100).toLocaleString('en-US')}` : '';

type DocDef = { key: string; label: string; desc: string; optional?: boolean };

function buildDocs(rules: any): DocDef[] {
  const stateName = rules?.state_name || 'your state';
  const bondTotal = (rules?.bond_amount_cents || 0) + (rules?.ron_bond_additional_cents || 0);
  const docs: DocDef[] = [
    {
      key: 'commissionCert',
      label: 'Commission Certificate',
      desc: `Your ${stateName} notary commission certificate`,
    },
  ];
  if (!rules || rules.enotary_registration_required !== false) {
    docs.push({
      key: 'electronicNotaryCert',
      label: 'Electronic Notary Certificate',
      desc: `${stateName} electronic notary registration certificate`,
    });
  }
  docs.push({
    key: 'renAuthorization',
    label: 'RON Authorization',
    desc: `${stateName} remote online notarization authorization`,
  });
  if (rules?.bond_required) {
    docs.push({
      key: 'suretyBond',
      label: 'Surety Bond Proof',
      desc: rules.ron_bond_additional_cents
        ? `${money(bondTotal)} total bond (${money(rules.bond_amount_cents)} standard + ${money(rules.ron_bond_additional_cents)} RON) required by ${stateName} law`
        : `${money(bondTotal)} surety bond as required by ${stateName} law`,
    });
  }
  if (rules?.eo_required) {
    docs.push({
      key: 'eoPolicy',
      label: 'E&O Insurance Policy',
      desc: `Errors & Omissions insurance, ${money(rules.eo_min_amount_cents)} minimum, required by ${stateName}`,
    });
  } else {
    docs.push({
      key: 'eoPolicy',
      label: 'E&O Insurance Policy (optional)',
      desc: 'Errors & Omissions insurance policy — recommended',
      optional: true,
    });
  }
  docs.push({
    key: 'digitalSignatureCert',
    label: 'Digital Signature Certificate',
    desc: 'Certificate from an approved TSA provider',
  });
  return docs;
}

export function OnboardStep2Documents() {
  const { nextStep, prevStep, updateData, data } = useOnboardingStore();
  const rules = (data.stateRules as any) || null;
  const stateName = rules?.state_name || 'your state';
  const docs = useMemo(() => buildDocs(rules), [rules]);
  const requiredCount = docs.filter((d) => !d.optional).length;

  const [files, setFiles] = useState<Record<string, File | null>>(
    Object.fromEntries(docs.map((d) => [d.key, null]))
  );

  const handleFile = (key: string, file: File | null) => {
    setFiles((prev) => ({ ...prev, [key]: file }));
  };

  const allUploaded = docs.filter((d) => !d.optional).every((d) => files[d.key]);

  const handleNext = () => {
    updateData(files);
    nextStep();
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Upload Credentials</h2>
        <p className="mt-1 text-sm text-gray-500">
          Upload the {requiredCount} required documents to verify your {stateName} notary
          commission.
        </p>
      </div>

      <div className="space-y-4">
        {docs.map(({ key, label, desc }) => (
          <div
            key={key}
            className={`rounded-lg border-2 p-4 transition-colors ${
              files[key] ? 'border-green-200 bg-green-50' : 'border-dashed border-gray-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {files[key] ? (
                  <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                ) : (
                  <FileText className="h-5 w-5 text-gray-400 flex-shrink-0" />
                )}
                <div>
                  <p className="text-sm font-medium text-gray-900">{label}</p>
                  <p className="text-xs text-gray-500">{desc}</p>
                </div>
              </div>

              {files[key] ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-green-700 font-medium truncate max-w-[120px]">
                    {files[key]!.name}
                  </span>
                  <button
                    onClick={() => handleFile(key, null)}
                    className="text-gray-400 hover:text-red-500"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <label className="cursor-pointer">
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0] || null;
                      handleFile(key, f);
                    }}
                  />
                  <span className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors">
                    <Upload className="h-3.5 w-3.5" />
                    Upload
                  </span>
                </label>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-between">
        <Button variant="outline" onClick={prevStep}>
          Back
        </Button>
        <Button onClick={handleNext} disabled={!allUploaded} size="lg">
          Submit for Review
        </Button>
      </div>
    </div>
  );
}
