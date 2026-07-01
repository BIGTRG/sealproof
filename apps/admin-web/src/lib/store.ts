import { create } from 'zustand';
import type { LiveOpsMetrics, LiveSession, QueuedSession, NotaryOnShift } from '@/types';

/* ─── Live Ops Store (real-time via Socket.IO) ────────── */

interface LiveOpsState {
  metrics: LiveOpsMetrics;
  activeSessions: LiveSession[];
  queue: QueuedSession[];
  notariesOnShift: NotaryOnShift[];
  setMetrics: (m: LiveOpsMetrics) => void;
  setActiveSessions: (s: LiveSession[]) => void;
  setQueue: (q: QueuedSession[]) => void;
  setNotariesOnShift: (n: NotaryOnShift[]) => void;
}

export const useLiveOpsStore = create<LiveOpsState>((set) => ({
  metrics: {
    activeSessions: 0,
    queueDepth: 0,
    notariesOnShift: 0,
    coverageGaps: 0,
    avgWaitTime: 0,
    sessionsToday: 0,
    completedToday: 0,
    cancelledToday: 0,
  },
  activeSessions: [],
  queue: [],
  notariesOnShift: [],
  setMetrics: (metrics) => set({ metrics }),
  setActiveSessions: (activeSessions) => set({ activeSessions }),
  setQueue: (queue) => set({ queue }),
  setNotariesOnShift: (notariesOnShift) => set({ notariesOnShift }),
}));

/* ─── Navigation Store ────────────────────────────────── */

interface NavState {
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
}

export const useNavStore = create<NavState>((set) => ({
  sidebarCollapsed: false,
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
}));
