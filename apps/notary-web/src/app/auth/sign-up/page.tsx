'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Scale } from 'lucide-react';

export default function SignUpPage() {
  return (
    <div className="flex min-h-screen">
      <div className="hidden lg:flex lg:w-1/2 bg-legal-dark relative overflow-hidden items-center justify-center">
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: `radial-gradient(circle at 50% 50%, rgba(197,160,94,0.25) 0%, transparent 60%)` }}
        />
        <div className="relative text-center px-12">
          <img src="/seal-icon.png" alt="SealProof" className="h-12 w-12 rounded-full object-cover" />
          <h2 className="font-display text-3xl text-white font-semibold">Join SealProof</h2>
          <p className="mt-4 text-gray-400 max-w-sm mx-auto leading-relaxed">
            Apply to join the notary network. Onboarding takes less than 24 hours.
          </p>
        </div>
      </div>
      <div className="flex-1 flex items-center justify-center px-6 py-12 bg-white">
        <div className="w-full max-w-sm">
          <h1 className="font-display text-2xl font-semibold text-navy-700">Notary Application</h1>
          <p className="mt-2 text-sm text-gray-500">Start your application to join the SealProof notary network.</p>
          <div className="mt-8 space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <Input label="First name" placeholder="Jane" />
              <Input label="Last name" placeholder="Smith" />
            </div>
            <Input label="Email address" type="email" placeholder="you@example.com" />
            <Input label="Commission Number" placeholder="NC commission #" />
            <Input label="Commission State" placeholder="NC" />
            <Input label="Password" type="password" placeholder="Create a password" />
            <Button variant="gold" className="w-full">Submit Application</Button>
          </div>
          <div className="divider-gold mt-6 opacity-40" />
          <p className="mt-6 text-sm text-center text-gray-500">
            Already a member?{' '}
            <Link href="/auth/sign-in" className="text-gold-500 font-medium hover:text-gold-600">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
