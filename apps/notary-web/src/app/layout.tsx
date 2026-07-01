import type { Metadata } from 'next';
import { Cormorant_Garamond, Inter } from 'next/font/google';
import { ClerkProvider } from '@clerk/nextjs';
import '@/styles/globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });
const cormorant = Cormorant_Garamond({ subsets: ['latin'], weight: ['400','500','600','700'], variable: '--font-cormorant', display: 'swap' });

export const metadata: Metadata = {
  title: 'SealProof Notary Portal',
  description: 'Manage your notary practice, shifts, sessions, and journal through SealProof.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en" className={`${inter.variable} ${cormorant.variable}`}>
        <body className="font-body">{children}</body>
      </html>
    </ClerkProvider>
  );
}
