'use client';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Scale, Shield } from 'lucide-react';

export default function AdminSignIn() {
  return (
    <div className="flex min-h-screen">
      <div className="hidden lg:flex lg:w-1/2 bg-legal-dark relative overflow-hidden items-center justify-center">
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: `radial-gradient(circle at 50% 50%, rgba(197,160,94,0.25) 0%, transparent 60%)` }}
        />
        <div className="relative text-center px-12">
          <img src="/seal-icon.png" alt="SealProof" className="h-12 w-12 rounded-full object-cover" />
          <h2 className="font-display text-3xl text-white font-semibold">Admin Console</h2>
          <p className="mt-4 text-gray-400 max-w-sm mx-auto leading-relaxed">
            Manage platform operations, notaries, compliance, and financials.
          </p>
        </div>
      </div>
      <div className="flex-1 flex items-center justify-center px-6 py-12 bg-white">
        <div className="w-full max-w-sm">
          <div className="flex items-center gap-2 mb-10">
            <Shield className="h-5 w-5 text-gold-400" />
            <span className="text-sm font-semibold text-navy-700 uppercase tracking-wide">Admin Access</span>
          </div>
          <h1 className="font-display text-2xl font-semibold text-navy-700">Sign in</h1>
          <p className="mt-2 text-sm text-gray-500">Authorized personnel only.</p>
          <div className="mt-8 space-y-5">
            <Input label="Email address" type="email" placeholder="admin@sealproof.ai" />
            <Input label="Password" type="password" placeholder="Enter password" />
            <Button variant="primary" className="w-full">Sign In</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
