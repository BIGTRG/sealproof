'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Scale } from 'lucide-react';

export default function SignUpPage() {
  return (
    <div className="flex min-h-screen">
      {/* Left panel — branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-legal-dark relative overflow-hidden items-center justify-center">
        <div className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `radial-gradient(circle at 50% 50%, rgba(197,160,94,0.25) 0%, transparent 60%)`,
          }}
        />
        <div className="relative text-center px-12">
          <img src="/seal-icon.png" alt="SealProof" className="h-12 w-12 rounded-full object-cover" />
          <h2 className="font-display text-3xl text-white font-semibold">
            SealProof
          </h2>
          <p className="mt-4 text-gray-400 max-w-sm mx-auto leading-relaxed">
            Create your account and notarize your first document in under 10 minutes.
          </p>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 bg-white">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-2 mb-10">
            <Scale className="h-5 w-5 text-gold-400" />
            <span className="text-lg font-display font-semibold text-navy-700">SealProof</span>
          </div>

          <h1 className="font-display text-2xl font-semibold text-navy-700">
            Create your account
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            Start notarizing documents online in minutes.
          </p>

          {/* Clerk SignUp component mounts here in production. */}
          <div className="mt-8 space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <Input label="First name" placeholder="John" />
              <Input label="Last name" placeholder="Doe" />
            </div>
            <Input label="Email address" type="email" placeholder="you@example.com" />
            <Input label="Phone" type="tel" placeholder="(555) 000-0000" />
            <Input label="Password" type="password" placeholder="Create a password" />
            <Button variant="gold" className="w-full">
              Create Account
            </Button>
          </div>

          <p className="mt-6 text-xs text-center text-gray-400 leading-relaxed">
            By creating an account you agree to our{' '}
            <a href="#" className="text-gold-500 hover:text-gold-600">Terms of Service</a>
            {' '}and{' '}
            <a href="#" className="text-gold-500 hover:text-gold-600">Privacy Policy</a>.
          </p>

          <div className="divider-gold mt-6 opacity-40" />

          <p className="mt-6 text-sm text-center text-gray-500">
            Already have an account?{' '}
            <Link href="/auth/sign-in" className="text-gold-500 font-medium hover:text-gold-600">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
