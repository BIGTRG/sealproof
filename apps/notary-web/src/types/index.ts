/* ─── Notary Types ─────────────────────────────────────────── */

export type NotaryStatus = 'pending' | 'approved' | 'suspended' | 'offboarded';
export type ShiftStatus = 'available' | 'in_session' | 'break' | 'off';
export type SessionStatus =
  | 'queued'
  | 'matched'
  | 'kyc_pending'
  | 'kyc_complete'
  | 'payment_hold'
  | 'in_progress'
  | 'signing'
  | 'sealing'
  | 'completed'
  | 'cancelled'
  | 'expired';

export type DocumentType = 'deed' | 'poa' | 'will' | 'trust' | 'affidavit' | 'mortgage' | 'other';
export type NotarizationAct = 'acknowledgment' | 'jurat' | 'oath_affirmation' | 'verification' | 'copy_certification';

/* ─── Models ───────────────────────────────────────────────── */

export interface NotaryProfile {
  id: string;
  userId: string;
  fullName: string;
  email: string;
  phone: string;
  commissionNumber: string;
  commissionExpiry: string;
  electronicNotaryId: string;
  renAuthorizationId: string;
  status: NotaryStatus;
  county: string;
  state: string;
  totalSessions: number;
  rating: number;
  createdAt: string;
}

export interface Shift {
  id: string;
  notaryId: string;
  startTime: string;
  endTime: string;
  status: 'scheduled' | 'active' | 'completed' | 'cancelled';
  sessionsHandled: number;
}

export interface QueuedSession {
  id: string;
  customerId: string;
  customerName: string;
  documentType: DocumentType;
  documentCount: number;
  signerCount: number;
  serviceLevel: 'standard' | 'rush';
  kycStatus: 'pending' | 'verified' | 'failed';
  createdAt: string;
  estimatedDuration: number; // minutes
}

export interface ActiveSession {
  id: string;
  customerId: string;
  customerName: string;
  signers: Signer[];
  documents: SessionDocument[];
  documentType: DocumentType;
  serviceLevel: 'standard' | 'rush';
  livekitRoomId: string;
  livekitToken: string;
  status: SessionStatus;
  startedAt: string;
}

export interface Signer {
  id: string;
  name: string;
  email: string;
  kycVerified: boolean;
  signatureStatus: 'pending' | 'signed' | 'declined';
}

export interface SessionDocument {
  id: string;
  fileName: string;
  pageCount: number;
  sealApplied: boolean;
  esignStatus: 'pending' | 'sent' | 'signed' | 'completed';
}

export interface JournalEntry {
  id: string;
  entryNumber: number;
  sessionId: string;
  signerName: string;
  signerAddress: string;
  documentType: DocumentType;
  notarizationAct: NotarizationAct;
  documentDescription: string;
  fee: number;
  idType: string;
  idNumber: string;
  createdAt: string;
  hashCurrent: string;
  hashPrevious: string;
  chainValid: boolean;
}

export interface EarningsRecord {
  id: string;
  sessionId: string;
  documentType: DocumentType;
  customerName: string;
  amount: number; // cents
  status: 'pending' | 'paid' | 'processing';
  completedAt: string;
  paidAt?: string;
}

export interface EarningsSummary {
  totalEarned: number;
  pendingPayout: number;
  sessionsThisMonth: number;
  sessionsThisWeek: number;
  averagePerSession: number;
}

/* ─── Onboarding ───────────────────────────────────────────── */

export interface OnboardingData {
  // Step 1: Personal + commission
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  county: string;
  commissionNumber: string;
  commissionExpiry: string;
  electronicNotaryId: string;
  renAuthorizationId: string;

  // Step 2: Document uploads
  commissionCert?: File;
  electronicNotaryCert?: File;
  renAuthorization?: File;
  suretyBond?: File;
  eoPolicy?: File;
  digitalSignatureCert?: File;

  // Step 3-5: Status flags
  verificationStatus: 'pending' | 'approved' | 'rejected';
  trainingCompleted: boolean;
}
