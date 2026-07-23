import type { Metadata } from 'next';
import { Cormorant_Garamond, Inter, Great_Vibes } from 'next/font/google';
import { ClerkProvider } from '@clerk/nextjs';
import '@/styles/globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });
const greatVibes = Great_Vibes({ subsets: ['latin'], weight: '400', variable: '--font-script', display: 'swap' });
const cormorant = Cormorant_Garamond({ subsets: ['latin'], weight: ['400','500','600','700'], variable: '--font-cormorant', display: 'swap' });

export const metadata: Metadata = {
  icons: { icon: '/favicon.png' },
  title: 'SealProof Admin Console',
  description: 'Manage notaries, sessions, compliance, and business operations.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en" className={`${inter.variable} ${cormorant.variable} ${greatVibes.variable}`}>
        <body className="font-body">{children}</body>
      </html>
    </ClerkProvider>
  );
}
