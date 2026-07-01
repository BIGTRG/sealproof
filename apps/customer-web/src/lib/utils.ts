import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Tailwind class merge utility */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Format cents to dollar string */
export function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

/** Format date string */
export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/** Format date + time */
export function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

/** Human-readable session status */
export function statusLabel(status: string): string {
  const labels: Record<string, string> = {
    created: 'Created',
    kyc_pending: 'Identity Verification',
    kyc_complete: 'Verified',
    payment_pending: 'Payment',
    queued: 'In Queue',
    matched: 'Notary Assigned',
    in_progress: 'In Session',
    signing: 'Signing',
    sealing: 'Applying Seal',
    completed: 'Completed',
    cancelled: 'Cancelled',
    failed: 'Failed',
  };
  return labels[status] || status;
}

/** Status color for badges */
export function statusColor(status: string): string {
  const colors: Record<string, string> = {
    created: 'bg-gray-100 text-gray-700',
    kyc_pending: 'bg-yellow-100 text-yellow-800',
    kyc_complete: 'bg-green-100 text-green-800',
    payment_pending: 'bg-orange-100 text-orange-800',
    queued: 'bg-blue-100 text-blue-800',
    matched: 'bg-indigo-100 text-indigo-800',
    in_progress: 'bg-purple-100 text-purple-800',
    signing: 'bg-purple-100 text-purple-800',
    sealing: 'bg-purple-100 text-purple-800',
    completed: 'bg-green-100 text-green-800',
    cancelled: 'bg-red-100 text-red-800',
    failed: 'bg-red-100 text-red-800',
  };
  return colors[status] || 'bg-gray-100 text-gray-700';
}

/** Document type label */
export function docTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    deed: 'Deed',
    poa: 'Power of Attorney',
    will: 'Will',
    trust: 'Trust',
    affidavit: 'Affidavit',
    mortgage: 'Mortgage',
    other: 'Other',
  };
  return labels[type] || type;
}

/** File size formatter */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
