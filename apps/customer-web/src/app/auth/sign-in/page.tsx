'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Scale } from 'lucide-react';

export default function SignInPage() {
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
          <div className="seal-stamp inline-flex h-16 w-16 items-center justify-center mx-auto mb-8">
            <Scale className="h-8 w-8 text-gold-300" />
          </div>
          <h2 className="font-display text-3xl text-white font-semibold">
            SealProof
          </h2>
          <p className="mt-4 text-gray-400 max-w-sm mx-auto leading-relaxed">
            Remote online notarization built to the legal standard.
            Secure, compliant, and accessible from anywhere.
          </p>
          <div className="divider-gold mt-10 opacity-30" />
          <p className="mt-6 text-xs text-gray-500">
            256-bit encryption. State compliant. 10-year retention.
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
            Sign in to your account
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            Access your notarization sessions and document vault.
          </p>

          {/* Clerk SignIn component mounts here in production.
              Showing form skeleton for design reference. */}
          <div className="mt-8 space-y-5">
            <Input label="Email address" type="email" placeholder="you@example.com" />
            <Input label="Password" type="password" placeholder="Enter your password" />
            <Button variant="primary" className="w-full">
              Sign In
            </Button>
          </div>

          <div className="divider-gold mt-8 opacity-40" />

          <p className="mt-6 text-sm text-center text-gray-500">
            Don&apos;t have an account?{' '}
            <Link href="/auth/sign-up" className="text-gold-500 font-medium hover:text-gold-600">
              Create one
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
