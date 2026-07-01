// ─── Tenant / White-Label ───────────────────────────────────────────────────

export interface TenantBranding {
  slug: string;
  companyName: string;
  domain: string;
  logoUrl: string | null;
  faviconUrl: string | null;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  supportEmail: string | null;
  supportPhone: string | null;
  legalEntity: string | null;
  termsUrl: string | null;
  privacyUrl: string | null;
  enableB2c: boolean;
  enableB2b: boolean;
  enableRush: boolean;
  b2cStandardPriceCents: number;
  b2cRushPriceCents: number;
}

// ─── Session ────────────────────────────────────────────────────────────────

export type DocumentType =
  | 'deed'
  | 'poa'
  | 'will'
  | 'trust'
  | 'affidavit'
  | 'mortgage'
  | 'other';

export type ServiceLevel = 'standard' | 'rush';

export type SessionStatus =
  | 'created'
  | 'kyc_pending'
  | 'kyc_complete'
  | 'payment_pending'
  | 'queued'
  | 'matched'
  | 'in_progress'
  | 'signing'
  | 'sealing'
  | 'completed'
  | 'cancelled'
  | 'failed';

export interface Signer {
  id?: string;
  name: string;
  email: string;
  phone: string;
  isPrimary: boolean;
  kycStatus: 'pending' | 'verified' | 'failed';
}

export interface SessionDocument {
  id?: string;
  file: File | null;
  fileName: string;
  fileSize: number;
  pageCount: number;
  documentType: DocumentType;
  description: string;
  uploadProgress: number;
  uploadedUrl?: string;
}

export interface Session {
  id: string;
  status: SessionStatus;
  documentType: DocumentType;
  description: string;
  serviceLevel: ServiceLevel;
  signerCount: number;
  signers: Signer[];
  documents: SessionDocument[];
  notaryName?: string;
  createdAt: string;
  completedAt?: string;
  totalPriceCents: number;
  queuePosition?: number;
  estimatedWaitMinutes?: number;
  livekitRoomName?: string;
  livekitToken?: string;
}

// ─── New Session Flow ───────────────────────────────────────────────────────

export interface NewSessionData {
  documentType: DocumentType;
  description: string;
  signerCount: number;
  signers: Signer[];
  documents: SessionDocument[];
  serviceLevel: ServiceLevel;
}

// ─── Document Vault ─────────────────────────────────────────────────────────

export interface VaultDocument {
  id: string;
  sessionId: string;
  fileName: string;
  documentType: DocumentType;
  notarizedAt: string;
  sealedUrl: string;
  pageCount: number;
  signerNames: string[];
}

// ─── User ───────────────────────────────────────────────────────────────────

export interface CustomerProfile {
  id: string;
  clerkUserId: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  totalSessions: number;
  createdAt: string;
}

// ─── KBA (Knowledge-Based Authentication) ───────────────────────────────────

export interface KbaQuestion {
  id: string;
  text: string;
  choices: { id: string; text: string }[];
}

export interface KbaResult {
  result: 'pass' | 'fail';
  canRetry: boolean;
  attemptsUsed: number;
  maxAttempts: number;
}

// ─── API Responses ──────────────────────────────────────────────────────────

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}
