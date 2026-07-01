/* ─── Core enums ──────────────────────────────────────── */

export type DocumentType = 'deed' | 'poa' | 'will' | 'trust' | 'affidavit' | 'mortgage' | 'other';
export type NotarizationAct = 'acknowledgment' | 'jurat' | 'oath_affirmation' | 'verification' | 'copy_certification';
export type SessionStatus = 'queued' | 'matched' | 'kyc_pending' | 'kyc_complete' | 'payment_hold' | 'in_progress' | 'signing' | 'sealing' | 'completed' | 'cancelled' | 'expired';
export type ShiftStatus = 'available' | 'in_session' | 'break' | 'off';
export type NotaryStatus = 'pending' | 'approved' | 'suspended' | 'offboarded';
export type CredentialStatus = 'pending' | 'verified' | 'expired' | 'rejected';
export type TenantStatus = 'active' | 'suspended' | 'pending';
export type PaymentStatus = 'pending' | 'held' | 'captured' | 'refunded' | 'failed';
export type SubscriptionTier = 'starter' | 'professional' | 'enterprise';

/* ─── Admin dashboard data ────────────────────────────── */

export interface LiveOpsMetrics {
  activeSessions: number;
  queueDepth: number;
  notariesOnShift: number;
  coverageGaps: number;
  avgWaitTime: number;       // seconds
  sessionsToday: number;
  completedToday: number;
  cancelledToday: number;
}

export interface LiveSession {
  id: string;
  customerName: string;
  notaryName: string;
  documentType: DocumentType;
  status: SessionStatus;
  serviceLevel: 'standard' | 'rush';
  startedAt: string;
  durationMinutes: number;
}

export interface QueuedSession {
  id: string;
  customerName: string;
  documentType: DocumentType;
  serviceLevel: 'standard' | 'rush';
  waitingMinutes: number;
  kycStatus: 'pending' | 'passed' | 'failed';
}

export interface NotaryOnShift {
  id: string;
  name: string;
  status: ShiftStatus;
  sessionCount: number;
  shiftStart: string;
  currentSession?: string;
}

/* ─── Notary Management ───────────────────────────────── */

export interface NotaryApplication {
  id: string;
  name: string;
  email: string;
  county: string;
  commissionNumber: string;
  commissionExpiry: string;
  electronicNotaryId: string;
  renAuthorizationId: string;
  documentsUploaded: number;
  appliedAt: string;
  status: NotaryStatus;
}

export interface NotaryCredential {
  type: string;
  status: CredentialStatus;
  expiresAt?: string;
  daysUntilExpiry?: number;
}

export interface NotaryRecord {
  id: string;
  name: string;
  email: string;
  county: string;
  status: NotaryStatus;
  commissionExpiry: string;
  totalSessions: number;
  lastActiveAt: string;
  credentials: NotaryCredential[];
}

/* ─── Customer Management ─────────────────────────────── */

export interface CustomerRecord {
  id: string;
  name: string;
  email: string;
  type: 'b2c' | 'b2b';
  totalSessions: number;
  totalSpent: number;
  createdAt: string;
  lastSessionAt: string;
}

export interface ApiPartnerRecord {
  id: string;
  name: string;
  email: string;
  tier: SubscriptionTier;
  monthlyFee: number;
  apiCalls: number;
  sessionsUsed: number;
  status: 'active' | 'suspended' | 'cancelled';
  createdAt: string;
}

/* ─── Pricing ─────────────────────────────────────────── */

export interface PricingConfig {
  id: string;
  key: string;
  label: string;
  category: 'b2c' | 'b2b' | 'notary_payout' | 'api';
  valueCents: number;
  updatedAt: string;
  changedBy: string;
}

export interface PricingChangeLog {
  id: string;
  key: string;
  oldValue: number;
  newValue: number;
  changedBy: string;
  changedAt: string;
  reason: string;
}

/* ─── Compliance ──────────────────────────────────────── */

export interface JournalChainStatus {
  notaryId: string;
  notaryName: string;
  totalEntries: number;
  chainIntact: boolean;
  lastVerifiedAt: string;
}

export interface SessionAnomaly {
  sessionId: string;
  type: 'long_duration' | 'repeated_kyc_failure' | 'multiple_cancellations' | 'suspicious_pattern';
  description: string;
  severity: 'low' | 'medium' | 'high';
  detectedAt: string;
}

/* ─── Financial ───────────────────────────────────────── */

export interface RevenueMetrics {
  totalRevenue: number;
  b2cRevenue: number;
  b2bRevenue: number;
  apiRevenue: number;
  notaryPayouts: number;
  netRevenue: number;
  refunds: number;
  disputes: number;
}

export interface DailyRevenue {
  date: string;
  revenue: number;
  payouts: number;
  net: number;
  sessions: number;
}

/* ─── Analytics ───────────────────────────────────────── */

export interface VolumeDataPoint {
  date: string;
  sessions: number;
  completed: number;
  cancelled: number;
}

export interface NotaryUtilization {
  notaryId: string;
  name: string;
  totalShiftHours: number;
  activeSessionHours: number;
  utilization: number; // 0-100
  sessionsCompleted: number;
}

export interface ConversionFunnel {
  step: string;
  count: number;
  percentage: number;
}

/* ─── Tenant (White-Label) ────────────────────────────── */

export interface TenantRecord {
  id: string;
  name: string;
  slug: string;
  domain: string;
  status: TenantStatus;
  logoUrl?: string;
  primaryColor: string;
  totalSessions: number;
  totalNotaries: number;
  totalCustomers: number;
  monthlyRevenue: number;
  createdAt: string;
}

/* ─── Audit Log ───────────────────────────────────────── */

export interface AuditLogEntry {
  id: string;
  action: string;
  actorType: 'customer' | 'notary' | 'admin' | 'system' | 'api_partner';
  actorId: string;
  actorName: string;
  targetType: string;
  targetId: string;
  details: string;
  ipAddress: string;
  createdAt: string;
}
