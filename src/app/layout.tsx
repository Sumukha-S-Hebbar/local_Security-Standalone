
import type { Metadata } from 'next';
import { IBM_Plex_Sans } from 'next/font/google';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';

const ibmPlexSans = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-ibm-plex-sans',
});

export const metadata: Metadata = {
  title: 'GlobalGuard',
  description: 'Patrolling officer dashboard for GlobalGuard security management.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${ibmPlexSans.variable} h-full`}>
      <body className="font-body antialiased h-full">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
