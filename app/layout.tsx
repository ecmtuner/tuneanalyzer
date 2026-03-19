import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import SessionProvider from '@/components/SessionProvider';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'TuneAnalyzer — AI-Powered ECU Log Analyzer',
  description: 'Upload your tune log and get an instant AI-powered analysis. Knock, AFR, boost, and IAT scoring for BM3, MHD, EcuTek, and more.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-gray-950 text-white antialiased`}>
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
