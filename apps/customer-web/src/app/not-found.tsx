import { Button } from '@/components/ui/Button';
import { Scale } from 'lucide-react';
import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-warm">
      <div className="text-center max-w-md px-6">
        <img src="/seal-icon.png" alt="SealProof" className="h-12 w-12 object-contain drop-shadow-[0_0_6px_rgba(197,160,94,0.45)]" />
        <h1 className="font-display text-4xl font-bold text-navy-700 mb-2">404</h1>
        <p className="text-sm text-gray-500 mb-6">
          The page you are looking for does not exist or has been moved.
        </p>
        <Link href="/">
          <Button variant="primary">Return Home</Button>
        </Link>
      </div>
    </div>
  );
}
