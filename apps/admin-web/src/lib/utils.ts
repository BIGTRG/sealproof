import type { DocumentType, NotarizationAct, SessionStatus, ShiftStatus, NotaryStatus, TenantStatus, PaymentStatus } from '@/types';

export function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ');
}

export function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export function formatDollars(cents: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);
}

export function formatCompact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

export function formatDuration(minutes: number): string {
  if (minutes < 1) return '<1m';
  if (minutes < 60) return `${Math.round(minutes)}m`;
  return `${Math.floor(minutes / 60)}h ${Math.round(minutes % 60)}m`;
}

export function docTypeLabel(type: DocumentType): string {
  const labels: Record<DocumentType, string> = {
    deed: 'Property Deed', poa: 'Power of Attorney', will: 'Last Will & Testament',
    trust: 'Trust Document', affidavit: 'Affidavit', mortgage: 'Mortgage Document', other: 'Other Document',
  };
  return labels[type] || type;
}

export function actLabel(act: NotarizationAct): string {
  const labels: Record<NotarizationAct, string> = {
    acknowledgment: 'Acknowledgment', jurat: 'Jurat', oath_affirmation: 'Oath / Affirmation',
    verification: 'Verification on Oath', copy_certification: 'Copy Certification',
  };
  return labels[act] || act;
}

export function sessionStatusLabel(status: SessionStatus): string {
  const labels: Record<SessionStatus, string> = {
    queued: 'Queued', matched: 'Matched', kyc_pending: 'KYC Pending', kyc_complete: 'KYC Complete',
    payment_hold: 'Payment Hold', in_progress: 'In Progress', signing: 'Signing', sealing: 'Sealing',
    completed: 'Completed', cancelled: 'Cancelled', expired: 'Expired',
  };
  return labels[status] || status;
}

export function sessionStatusColor(status: SessionStatus): string {
  if (status === 'completed') return 'bg-green-100 text-green-700';
  if (status === 'cancelled' || status === 'expired') return 'bg-red-100 text-red-700';
  if (status === 'in_progress' || status === 'signing' || status === 'sealing') return 'bg-blue-100 text-blue-700';
  if (status === 'queued' || status === 'matched') return 'bg-amber-100 text-amber-700';
  return 'bg-gray-100 text-gray-700';
}

export function notaryStatusColor(status: NotaryStatus): string {
  if (status === 'approved') return 'bg-green-100 text-green-700';
  if (status === 'pending') return 'bg-amber-100 text-amber-700';
  if (status === 'suspended') return 'bg-red-100 text-red-700';
  return 'bg-gray-100 text-gray-600';
}

export function tenantStatusColor(status: TenantStatus): string {
  if (status === 'active') return 'bg-green-100 text-green-700';
  if (status === 'pending') return 'bg-amber-100 text-amber-700';
  return 'bg-red-100 text-red-700';
}

export function shiftStatusColor(status: ShiftStatus): string {
  if (status === 'available') return 'bg-green-100 text-green-700';
  if (status === 'in_session') return 'bg-blue-100 text-blue-700';
  if (status === 'break') return 'bg-yellow-100 text-yellow-700';
  return 'bg-gray-100 text-gray-700';
}

export function paymentStatusColor(status: PaymentStatus): string {
  if (status === 'captured') return 'bg-green-100 text-green-700';
  if (status === 'held') return 'bg-blue-100 text-blue-700';
  if (status === 'refunded') return 'bg-amber-100 text-amber-700';
  if (status === 'failed') return 'bg-red-100 text-red-700';
  return 'bg-gray-100 text-gray-700';
}
