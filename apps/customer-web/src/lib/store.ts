/**
 * SealProof — Client State Store (Zustand)
 * Manages the new-session wizard state and tenant branding.
 */
import { create } from 'zustand';
import type {
  TenantBranding,
  NewSessionData,
  DocumentType,
  ServiceLevel,
  Signer,
  SessionDocument,
} from '@/types';

// ─── Tenant Store ───────────────────────────────────────────────────────────

interface TenantState {
  branding: TenantBranding | null;
  loading: boolean;
  setBranding: (b: TenantBranding) => void;
  setLoading: (l: boolean) => void;
}

export const useTenantStore = create<TenantState>((set) => ({
  branding: null,
  loading: true,
  setBranding: (branding) => set({ branding, loading: false }),
  setLoading: (loading) => set({ loading }),
}));

// ─── Session Wizard Store ───────────────────────────────────────────────────

interface SessionWizardState {
  step: number;
  data: NewSessionData;
  sessionId: string | null;

  setStep: (step: number) => void;
  nextStep: () => void;
  prevStep: () => void;
  setDocumentType: (type: DocumentType) => void;
  setDescription: (desc: string) => void;
  setSignerCount: (count: number) => void;
  updateSigner: (index: number, signer: Partial<Signer>) => void;
  addDocument: (doc: SessionDocument) => void;
  removeDocument: (index: number) => void;
  updateDocumentProgress: (index: number, progress: number) => void;
  setServiceLevel: (level: ServiceLevel) => void;
  setSessionId: (id: string) => void;
  reset: () => void;
}

const emptyData: NewSessionData = {
  documentType: 'other',
  description: '',
  signerCount: 1,
  signers: [{ name: '', email: '', phone: '', isPrimary: true, kycStatus: 'pending' }],
  documents: [],
  serviceLevel: 'standard',
};

export const useSessionWizard = create<SessionWizardState>((set) => ({
  step: 1,
  data: { ...emptyData },
  sessionId: null,

  setStep: (step) => set({ step }),
  nextStep: () => set((s) => ({ step: s.step + 1 })),
  prevStep: () => set((s) => ({ step: Math.max(1, s.step - 1) })),

  setDocumentType: (documentType) =>
    set((s) => ({ data: { ...s.data, documentType } })),

  setDescription: (description) =>
    set((s) => ({ data: { ...s.data, description } })),

  setSignerCount: (signerCount) =>
    set((s) => {
      const signers = [...s.data.signers];
      while (signers.length < signerCount) {
        signers.push({ name: '', email: '', phone: '', isPrimary: false, kycStatus: 'pending' });
      }
      return { data: { ...s.data, signerCount, signers: signers.slice(0, signerCount) } };
    }),

  updateSigner: (index, update) =>
    set((s) => {
      const signers = [...s.data.signers];
      signers[index] = { ...signers[index], ...update };
      return { data: { ...s.data, signers } };
    }),

  addDocument: (doc) =>
    set((s) => ({ data: { ...s.data, documents: [...s.data.documents, doc] } })),

  removeDocument: (index) =>
    set((s) => ({
      data: { ...s.data, documents: s.data.documents.filter((_, i) => i !== index) },
    })),

  updateDocumentProgress: (index, progress) =>
    set((s) => {
      const documents = [...s.data.documents];
      documents[index] = { ...documents[index], uploadProgress: progress };
      return { data: { ...s.data, documents } };
    }),

  setServiceLevel: (serviceLevel) =>
    set((s) => ({ data: { ...s.data, serviceLevel } })),

  setSessionId: (sessionId) => set({ sessionId }),

  reset: () => set({ step: 1, data: { ...emptyData }, sessionId: null }),
}));
