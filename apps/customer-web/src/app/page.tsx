'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { useTenantStore } from '@/lib/store';
import {
  Shield,
  Video,
  Clock,
  FileCheck,
  ArrowRight,
  CheckCircle,
  Scale,
  Lock,
  Stamp,
  BookOpen,
} from 'lucide-react';

/**
 * Landing Page — sealproof.ai (or white-label domain)
 * Premium legal aesthetic: deep navy, gold accents, serif headings.
 */
export default function LandingPage() {
  const { branding } = useTenantStore();
  const companyName = branding?.companyName || 'SealProof';

  return (
    <div className="flex flex-col min-h-screen">
      {/* ─── Navbar ────────────────────────────────────────────── */}
      <header className="border-b border-gray-100 bg-white/95 backdrop-blur-sm sticky top-0 z-50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 flex h-16 items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/seal-icon.png" alt="SealProof" className="h-12 w-12 rounded-full object-cover" />
            <span className="text-2xl font-script text-navy-700">
              {companyName}
            </span>
          </div>
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-600">
            <a href="#how-it-works" className="hover:text-navy-700 transition-colors">How it Works</a>
            <a href="#documents" className="hover:text-navy-700 transition-colors">Documents</a>
            <a href="#pricing" className="hover:text-navy-700 transition-colors">Pricing</a>
            <a href="#business" className="hover:text-navy-700 transition-colors">For Business</a>
          </nav>
          <div className="flex items-center gap-3">
            <Link href="/auth/sign-in">
              <Button variant="ghost">Sign In</Button>
            </Link>
            <Link href="/auth/sign-up">
              <Button variant="gold">Get Started</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* ─── Hero ──────────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-legal-dark" />
        <div className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `radial-gradient(circle at 25% 50%, rgba(197,160,94,0.2) 0%, transparent 50%),
                              radial-gradient(circle at 75% 50%, rgba(197,160,94,0.15) 0%, transparent 50%)`,
          }}
        />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 py-24 sm:py-32 lg:py-36">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/5 border border-white/10 px-4 py-1.5 mb-8">
              <Lock className="h-3.5 w-3.5 text-gold-300" />
              <span className="text-xs font-medium text-gray-300 tracking-wide uppercase">
                Secure. Legal. Compliant.
              </span>
            </div>
            <h1 className="font-display text-display-lg text-white leading-tight">
              Notarize your documents
              <span className="block text-gold-gradient mt-1">with legal certainty</span>
            </h1>
            <p className="mt-6 text-lg text-gray-400 max-w-2xl mx-auto leading-relaxed">
              Connect with a state-commissioned notary via encrypted video.
              Upload, verify, sign, and seal -- all in under 10 minutes,
              from anywhere.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/auth/sign-up">
                <Button variant="gold" size="lg">
                  Start a Notarization
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="#how-it-works">
                <Button variant="outline" size="lg" className="border-white/20 text-white hover:bg-white/5 hover:border-white/30">
                  See How it Works
                </Button>
              </Link>
            </div>
            <p className="mt-6 text-sm text-gray-500">
              Starting at $25 per session. No subscription required.
            </p>
          </div>
        </div>
        {/* Bottom fade */}
        <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-white to-transparent" />
      </section>

      {/* ─── Trust Bar ─────────────────────────────────────────── */}
      <section className="py-8 border-b border-gray-100">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4 text-sm text-gray-400">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-gold-400" />
              <span>256-bit Encryption</span>
            </div>
            <div className="flex items-center gap-2">
              <Stamp className="h-4 w-4 text-gold-400" />
              <span>State Compliant</span>
            </div>
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-gold-400" />
              <span>10-Year Record Retention</span>
            </div>
            <div className="flex items-center gap-2">
              <Lock className="h-4 w-4 text-gold-400" />
              <span>SOC 2 Ready</span>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Features ──────────────────────────────────────────── */}
      <section className="py-20 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="text-center mb-16">
            <h2 className="font-display text-display-sm text-navy-700">
              Built for the legal standard
            </h2>
            <p className="mt-3 text-gray-500 max-w-xl mx-auto">
              Every session meets the same rigorous requirements as in-person notarization.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              {
                icon: Video,
                title: 'Live Video Session',
                desc: 'Face-to-face with a commissioned notary via encrypted HD video. Browser-based -- nothing to install.',
              },
              {
                icon: Shield,
                title: 'Multi-State Compliant',
                desc: 'Fully compliant with RON statutes across 46 states. Built to each state\'s specific requirements.',
              },
              {
                icon: Clock,
                title: 'Under 10 Minutes',
                desc: 'From document upload to sealed certificate. Rush priority available for time-sensitive matters.',
              },
              {
                icon: FileCheck,
                title: 'Legally Binding',
                desc: 'Digital seal, tamper-evident certificate, hash-chained journal, and encrypted recording archive.',
              },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="card-legal p-6 text-center group">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 border border-brand-200 mx-auto mb-5 group-hover:border-gold-300 transition-colors">
                  <Icon className="h-5 w-5 text-gold-500" />
                </div>
                <h3 className="text-base font-semibold text-navy-700">{title}</h3>
                <p className="mt-2.5 text-sm text-gray-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── How it Works ──────────────────────────────────────── */}
      <section id="how-it-works" className="py-20 sm:py-24 bg-legal-warm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="text-center mb-16">
            <h2 className="font-display text-display-sm text-navy-700">
              Three steps to notarization
            </h2>
            <p className="mt-3 text-gray-500">
              Straightforward, transparent, and completed in minutes.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 max-w-5xl mx-auto">
            {[
              {
                step: '01',
                title: 'Upload your documents',
                desc: 'Upload your PDFs, select the document type, and add any additional signers who need to participate.',
              },
              {
                step: '02',
                title: 'Verify your identity',
                desc: 'Government photo ID scan, facial match, and knowledge-based authentication to meet state requirements.',
              },
              {
                step: '03',
                title: 'Join your session',
                desc: 'A commissioned notary reviews your documents, witnesses your electronic signature, and applies the official seal.',
              },
            ].map(({ step, title, desc }) => (
              <div key={step} className="relative">
                <div className="text-5xl font-display font-bold text-brand-200 mb-4">
                  {step}
                </div>
                <h3 className="text-lg font-semibold text-navy-700">{title}</h3>
                <p className="mt-3 text-sm text-gray-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Document Types ────────────────────────────────────── */}
      <section id="documents" className="py-20 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="text-center mb-12">
            <h2 className="font-display text-display-sm text-navy-700">
              Documents we notarize
            </h2>
            <p className="mt-3 text-gray-500 max-w-xl mx-auto">
              Any document eligible for remote online notarization under applicable state law.
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-3 max-w-4xl mx-auto">
            {[
              'Property Deeds',
              'Powers of Attorney',
              'Wills & Trusts',
              'Affidavits',
              'Mortgage Documents',
              'Title Transfers',
              'Medical Directives',
              'Business Contracts',
              'Vehicle Titles',
              'Estate Documents',
              'Loan Documents',
              'Corporate Resolutions',
            ].map((doc) => (
              <div
                key={doc}
                className="flex items-center gap-2 rounded-legal bg-white border border-gray-200 px-5 py-2.5 text-sm font-medium text-navy-600 shadow-legal-sm hover:border-gold-300 hover:shadow-legal-md transition-all cursor-default"
              >
                <CheckCircle className="h-4 w-4 text-gold-400" />
                {doc}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Pricing ───────────────────────────────────────────── */}
      <section id="pricing" className="py-20 sm:py-24 bg-legal-warm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="text-center mb-16">
            <h2 className="font-display text-display-sm text-navy-700">
              Transparent pricing
            </h2>
            <p className="mt-3 text-gray-500">
              No hidden fees. Pay per session or subscribe for volume.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-3xl mx-auto">
            <div className="card-legal p-8 text-center">
              <div className="text-sm font-medium text-gray-400 uppercase tracking-wide mb-2">Standard</div>
              <div className="text-4xl font-display font-bold text-navy-700">$25</div>
              <div className="text-sm text-gray-500 mt-1">per session</div>
              <div className="divider-gold my-6" />
              <ul className="space-y-3 text-sm text-gray-600 text-left">
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-gold-400 mt-0.5 flex-shrink-0" />
                  Matched to next available notary
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-gold-400 mt-0.5 flex-shrink-0" />
                  Full identity verification and KBA
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-gold-400 mt-0.5 flex-shrink-0" />
                  Digital seal and certificate
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-gold-400 mt-0.5 flex-shrink-0" />
                  Encrypted recording archived
                </li>
              </ul>
              <div className="mt-8">
                <Link href="/auth/sign-up">
                  <Button variant="outline" className="w-full">Choose Standard</Button>
                </Link>
              </div>
            </div>
            <div className="card-legal p-8 text-center border-gold-300 shadow-gold-glow relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="bg-gold-300 text-navy-800 text-xs font-semibold px-3 py-1 rounded-full">
                  Priority
                </span>
              </div>
              <div className="text-sm font-medium text-gold-500 uppercase tracking-wide mb-2">Rush</div>
              <div className="text-4xl font-display font-bold text-navy-700">$45</div>
              <div className="text-sm text-gray-500 mt-1">per session</div>
              <div className="divider-gold my-6" />
              <ul className="space-y-3 text-sm text-gray-600 text-left">
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-gold-400 mt-0.5 flex-shrink-0" />
                  Jump to front of queue
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-gold-400 mt-0.5 flex-shrink-0" />
                  Dedicated notary matching
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-gold-400 mt-0.5 flex-shrink-0" />
                  Everything in Standard
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-gold-400 mt-0.5 flex-shrink-0" />
                  Ideal for closings and deadlines
                </li>
              </ul>
              <div className="mt-8">
                <Link href="/auth/sign-up">
                  <Button variant="gold" className="w-full">Choose Rush</Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Business CTA ──────────────────────────────────────── */}
      <section id="business" className="py-20 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="bg-navy-700 rounded-legal p-10 sm:p-14 text-center relative overflow-hidden">
            <div className="absolute inset-0 opacity-10"
              style={{
                backgroundImage: `radial-gradient(circle at 30% 50%, rgba(197,160,94,0.3) 0%, transparent 50%)`,
              }}
            />
            <div className="relative">
              <Scale className="h-10 w-10 text-gold-300 mx-auto mb-6" />
              <h2 className="font-display text-display-sm text-white">
                For law firms and enterprise
              </h2>
              <p className="mt-4 text-gray-400 max-w-xl mx-auto leading-relaxed">
                Volume subscriptions from $499/month. API integration for seamless embedding
                into your existing workflow. White-label available.
              </p>
              <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link href="/auth/sign-up">
                  <Button variant="gold" size="lg">
                    Contact Sales
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Link href="#">
                  <Button variant="outline" size="lg" className="border-white/20 text-white hover:bg-white/5">
                    View API Docs
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Final CTA ─────────────────────────────────────────── */}
      <section className="py-20 sm:py-24 bg-legal-warm">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 text-center">
          <h2 className="font-display text-display-sm text-navy-700">
            Ready to notarize?
          </h2>
          <p className="mt-4 text-lg text-gray-500 leading-relaxed">
            No appointments necessary. Commissioned notaries standing by.
          </p>
          <div className="mt-8">
            <Link href="/auth/sign-up">
              <Button variant="gold" size="lg">
                Get Started Now
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ─── Footer ────────────────────────────────────────────── */}
      <footer className="bg-navy-700 text-gray-400">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="md:col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <Scale className="h-5 w-5 text-gold-300" />
                <span className="text-2xl font-script text-white">{companyName}</span>
              </div>
              <p className="text-sm leading-relaxed max-w-sm">
                Remote online notarization built to the legal standard.
                Secure, compliant, and accessible from anywhere.
              </p>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white mb-4">Platform</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#how-it-works" className="hover:text-gold-300 transition-colors">How it Works</a></li>
                <li><a href="#documents" className="hover:text-gold-300 transition-colors">Documents</a></li>
                <li><a href="#pricing" className="hover:text-gold-300 transition-colors">Pricing</a></li>
                <li><a href="#business" className="hover:text-gold-300 transition-colors">For Business</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white mb-4">Legal</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-gold-300 transition-colors">Terms of Service</a></li>
                <li><a href="#" className="hover:text-gold-300 transition-colors">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-gold-300 transition-colors">Compliance</a></li>
                <li><a href="#" className="hover:text-gold-300 transition-colors">Support</a></li>
              </ul>
            </div>
          </div>
          <div className="divider-gold mt-10 mb-6 opacity-30" />
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs text-gray-500">
              &copy; {new Date().getFullYear()} {branding?.legalEntity || 'SealProof LLC'}. All rights reserved.
            </p>
            <p className="text-xs text-gray-500">
              A SealProof LLC platform. Formed in Delaware. Operated in North Carolina.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
