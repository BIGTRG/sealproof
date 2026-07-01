import type { DocumentType, NotarizationAct, SessionStatus, ShiftStatus } from '@/types';

export function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function docTypeLabel(type: DocumentType): string {
  const labels: Record<DocumentType, string> = {
    deed: 'Property Deed',
    poa: 'Power of Attorney',
    will: 'Last Will & Testament',
    trust: 'Trust Document',
    affidavit: 'Affidavit',
    mortgage: 'Mortgage Document',
    other: 'Other Document',
  };
  return labels[type] || type;
}

export function actLabel(act: NotarizationAct): string {
  const labels: Record<NotarizationAct, string> = {
    acknowledgment: 'Acknowledgment',
    jurat: 'Jurat',
    oath_affirmation: 'Oath / Affirmation',
    verification: 'Verification on Oath',
    copy_certification: 'Copy Certification',
  };
  return labels[act] || act;
}

export function sessionStatusLabel(status: SessionStatus): string {
  const labels: Record<SessionStatus, string> = {
    queued: 'Queued',
    matched: 'Matched',
    kyc_pending: 'KYC Pending',
    kyc_complete: 'KYC Complete',
    payment_hold: 'Payment Hold',
    in_progress: 'In Progress',
    signing: 'Signing',
    sealing: 'Sealing',
    completed: 'Completed',
    cancelled: 'Cancelled',
    expired: 'Expired',
  };
  return labels[status] || status;
}

export function sessionStatusColor(status: SessionStatus): string {
  if (status === 'completed') return 'bg-green-100 text-green-700';
  if (status === 'cancelled' || status === 'expired') return 'bg-red-100 text-red-700';
  if (status === 'in_progress' || status === 'signing' || status === 'sealing')
    return 'bg-blue-100 text-blue-700';
  return 'bg-gray-100 text-gray-700';
}

export function shiftStatusLabel(status: ShiftStatus): string {
  const labels: Record<ShiftStatus, string> = {
    available: 'Available',
    in_session: 'In Session',
    break: 'On Break',
    off: 'Off Shift',
  };
  return labels[status] || status;
}

export function shiftStatusColor(status: ShiftStatus): string {
  if (status === 'available') return 'bg-green-100 text-green-700';
  if (status === 'in_session') return 'bg-blue-100 text-blue-700';
  if (status === 'break') return 'bg-yellow-100 text-yellow-700';
  return 'bg-gray-100 text-gray-700';
}

export function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ');
}

export function truncateHash(hash: string, len = 8): string {
  return hash.length > len * 2 ? `${hash.slice(0, len)}...${hash.slice(-len)}` : hash;
}
