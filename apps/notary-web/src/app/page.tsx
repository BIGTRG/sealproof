'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Scale, DollarSign, Calendar, Shield, ArrowRight, CheckCircle } from 'lucide-react';

/**
 * Notary Portal Landing — notary.sealproof.ai
 */
export default function NotaryLandingPage() {
  return (
    <div className="min-h-screen">
      {/* Nav */}
      <header className="border-b border-gray-100 bg-white/95 backdrop-blur-sm sticky top-0 z-50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 flex h-16 items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/seal-icon.png" alt="SealProof" className="h-12 w-12 object-contain drop-shadow-[0_0_6px_rgba(197,160,94,0.45)]" />
            <span className="text-2xl font-script text-navy-700">Seal<span className="text-brand-300">Proof</span></span>
            <Badge variant="gold" className="ml-1">Notary Portal</Badge>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/auth/sign-in"><Button variant="ghost">Sign In</Button></Link>
            <Link href="/auth/sign-up"><Button variant="gold">Apply Now</Button></Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-legal-dark" />
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: `radial-gradient(circle at 50% 50%, rgba(197,160,94,0.25) 0%, transparent 60%)` }}
        />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 py-24 sm:py-32">
          <div className="max-w-2xl mx-auto text-center">
            <h1 className="font-display text-display-lg text-white leading-tight">
              Grow your notary practice
              <span className="block text-gold-gradient mt-1">digitally</span>
            </h1>
            <p className="mt-6 text-lg text-gray-400 leading-relaxed">
              Perform remote online notarizations from home or office. Set your own schedule,
              accept sessions on demand, and earn more per act.
            </p>
            <div className="mt-10 flex items-center justify-center gap-4">
              <Link href="/auth/sign-up">
                <Button variant="gold" size="lg">Apply to Join <ArrowRight className="h-4 w-4" /></Button>
              </Link>
            </div>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-white to-transparent" />
      </section>

      {/* Benefits */}
      <section className="py-20 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="text-center mb-16">
            <h2 className="font-display text-display-sm text-navy-700">Why notaries choose SealProof</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {[
              { icon: DollarSign, title: 'Earn More', desc: 'Competitive per-session rates with bonuses for rush priority. Get paid weekly.' },
              { icon: Calendar, title: 'Your Schedule', desc: 'Set shifts when you want. Accept sessions on your terms. No minimums.' },
              { icon: Shield, title: 'Full Compliance', desc: 'Platform handles recordings, journal, seals, and retention. You focus on the notarization.' },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="card-legal p-6 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 border border-brand-200 mx-auto mb-5">
                  <Icon className="h-5 w-5 text-gold-500" />
                </div>
                <h3 className="text-base font-semibold text-navy-700">{title}</h3>
                <p className="mt-2 text-sm text-gray-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Requirements */}
      <section className="py-20 bg-legal-warm">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 text-center">
          <h2 className="font-display text-display-sm text-navy-700 mb-8">Requirements</h2>
          <div className="text-left space-y-3">
            {[
              'Active notary commission in your state',
              'Electronic notary authorization (or willingness to apply)',
              'Reliable internet connection and webcam',
              'Pass background check and platform training',
              'Maintain current commission and E&O insurance',
            ].map((item) => (
              <div key={item} className="flex items-center gap-3 text-sm text-gray-600">
                <CheckCircle className="h-4 w-4 text-gold-400 flex-shrink-0" />
                {item}
              </div>
            ))}
          </div>
          <div className="mt-10">
            <Link href="/auth/sign-up"><Button variant="gold" size="lg">Start Your Application</Button></Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-navy-700 text-gray-400 py-8 text-center text-sm">
        <p>&copy; {new Date().getFullYear()} SealProof LLC. All rights reserved.</p>
      </footer>
    </div>
  );
}

function Badge({ variant, className, children }: { variant: string; className?: string; children: React.ReactNode }) {
  return (
    <span className={`inline-flex items-center rounded-[0.25rem] px-2.5 py-0.5 text-xs font-medium border bg-gold-50 text-gold-600 border-gold-200 ${className}`}>
      {children}
    </span>
  );
}
