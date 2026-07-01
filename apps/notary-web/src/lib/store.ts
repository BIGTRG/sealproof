import { create } from 'zustand';
import type { NotaryProfile, QueuedSession, ActiveSession, Shift, ShiftStatus } from '@/types';

/* ─── Tenant Branding Store ──────────────────────────────── */

interface TenantBranding {
  companyName: string;
  logoUrl?: string;
  primaryColor: string;
  secondaryColor: string;
  legalEntity: string;
  notaryPayoutCents: number;
}

interface TenantState {
  branding: TenantBranding | null;
  setBranding: (b: TenantBranding) => void;
}

export const useTenantStore = create<TenantState>((set) => ({
  branding: {
    companyName: 'SealProof',
    primaryColor: '#1a1a2e',
    secondaryColor: '#4c6ef5',
    legalEntity: 'SealProof LLC',
    notaryPayoutCents: 1000,
  },
  setBranding: (branding) => set({ branding }),
}));

/* ─── Notary Shift Store ─────────────────────────────────── */

interface ShiftState {
  isOnShift: boolean;
  currentShiftId: string | null;
  shiftStatus: ShiftStatus;
  queueDepth: number;
  queue: QueuedSession[];
  activeSession: ActiveSession | null;
  toggleShift: () => void;
  setShiftStatus: (s: ShiftStatus) => void;
  setQueue: (q: QueuedSession[]) => void;
  setActiveSession: (s: ActiveSession | null) => void;
  claimSession: (sessionId: string) => void;
}

export const useShiftStore = create<ShiftState>((set) => ({
  isOnShift: false,
  currentShiftId: null,
  shiftStatus: 'off',
  queueDepth: 0,
  queue: [],
  activeSession: null,
  toggleShift: () =>
    set((s) => ({
      isOnShift: !s.isOnShift,
      shiftStatus: s.isOnShift ? 'off' : 'available',
    })),
  setShiftStatus: (shiftStatus) => set({ shiftStatus }),
  setQueue: (queue) => set({ queue, queueDepth: queue.length }),
  setActiveSession: (activeSession) =>
    set({
      activeSession,
      shiftStatus: activeSession ? 'in_session' : 'available',
    }),
  claimSession: (sessionId) =>
    set((s) => ({
      queue: s.queue.filter((q) => q.id !== sessionId),
      queueDepth: s.queueDepth - 1,
    })),
}));

/* ─── Notary Profile Store ───────────────────────────────── */

interface ProfileState {
  profile: NotaryProfile | null;
  setProfile: (p: NotaryProfile) => void;
}

export const useProfileStore = create<ProfileState>((set) => ({
  profile: null,
  setProfile: (profile) => set({ profile }),
}));

/* ─── Onboarding Wizard Store ────────────────────────────── */

interface OnboardingState {
  step: number;
  data: Record<string, unknown>;
  nextStep: () => void;
  prevStep: () => void;
  setStep: (n: number) => void;
  updateData: (partial: Record<string, unknown>) => void;
  reset: () => void;
}

export const useOnboardingStore = create<OnboardingState>((set) => ({
  step: 1,
  data: {},
  nextStep: () => set((s) => ({ step: Math.min(s.step + 1, 5) })),
  prevStep: () => set((s) => ({ step: Math.max(s.step - 1, 1) })),
  setStep: (step) => set({ step }),
  updateData: (partial) => set((s) => ({ data: { ...s.data, ...partial } })),
  reset: () => set({ step: 1, data: {} }),
}));
