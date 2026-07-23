'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Scale } from 'lucide-react';

export default function SignInPage() {
  return (
    <div className="flex min-h-screen">
      <div className="hidden lg:flex lg:w-1/2 bg-legal-dark relative overflow-hidden items-center justify-center">
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: `radial-gradient(circle at 50% 50%, rgba(197,160,94,0.25) 0%, transparent 60%)` }}
        />
        <div className="relative text-center px-12">
          <img src="/seal-icon.png" alt="SealProof" className="h-12 w-12 rounded-full object-cover" />
          <h2 className="font-display text-3xl text-white font-semibold">Notary Portal</h2>
          <p className="mt-4 text-gray-400 max-w-sm mx-auto leading-relaxed">
            Manage your practice, accept sessions, and track your earnings.
          </p>
        </div>
      </div>
      <div className="flex-1 flex items-center justify-center px-6 py-12 bg-white">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-2 mb-10">
            <Scale className="h-5 w-5 text-gold-400" />
            <span className="text-2xl font-script text-navy-700">SealProof</span>
          </div>
          <h1 className="font-display text-2xl font-semibold text-navy-700">Sign in</h1>
          <p className="mt-2 text-sm text-gray-500">Access your notary dashboard.</p>
          <div className="mt-8 space-y-5">
            <Input label="Email address" type="email" placeholder="you@example.com" />
            <Input label="Password" type="password" placeholder="Enter your password" />
            <Button variant="primary" className="w-full">Sign In</Button>
          </div>
          <div className="divider-gold mt-8 opacity-40" />
          <p className="mt-6 text-sm text-center text-gray-500">
            Not a SealProof notary yet?{' '}
            <Link href="/auth/sign-up" className="text-gold-500 font-medium hover:text-gold-600">Apply now</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
