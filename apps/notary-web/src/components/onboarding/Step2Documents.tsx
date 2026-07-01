'use client';

/**
 * Step 2: Document upload — 6 required credentials
 *
 * 1. Commission Certificate
 * 2. Electronic Notary Certificate
 * 3. REN Authorization
 * 4. Surety Bond Proof
 * 5. E&O Insurance Policy
 * 6. Digital Signature Certificate
 */
import { useState } from 'react';
import { useOnboardingStore } from '@/lib/store';
import { Button } from '@/components/ui/Button';
import { Upload, CheckCircle, FileText, X } from 'lucide-react';

const requiredDocs = [
  { key: 'commissionCert', label: 'Commission Certificate', desc: 'Your NC notary commission certificate' },
  { key: 'electronicNotaryCert', label: 'Electronic Notary Certificate', desc: 'NC Electronic Notary Public certificate' },
  { key: 'renAuthorization', label: 'REN Authorization', desc: 'Remote Electronic Notarization authorization letter' },
  { key: 'suretyBond', label: 'Surety Bond Proof', desc: '$25,000 surety bond as required by NC law' },
  { key: 'eoPolicy', label: 'E&O Insurance Policy', desc: 'Errors & Omissions insurance policy' },
  { key: 'digitalSignatureCert', label: 'Digital Signature Certificate', desc: 'Certificate from an approved TSA provider' },
];

export function OnboardStep2Documents() {
  const { nextStep, prevStep, updateData, data } = useOnboardingStore();
  const [files, setFiles] = useState<Record<string, File | null>>({
    commissionCert: null,
    electronicNotaryCert: null,
    renAuthorization: null,
    suretyBond: null,
    eoPolicy: null,
    digitalSignatureCert: null,
  });

  const handleFile = (key: string, file: File | null) => {
    setFiles((prev) => ({ ...prev, [key]: file }));
  };

  const allUploaded = Object.values(files).every((f) => f !== null);

  const handleNext = () => {
    updateData(files);
    nextStep();
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Upload Credentials</h2>
        <p className="mt-1 text-sm text-gray-500">
          Upload all 6 required documents to verify your NC notary commission.
        </p>
      </div>

      <div className="space-y-4">
        {requiredDocs.map(({ key, label, desc }) => (
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
