import type { Metadata, Viewport } from 'next';
import './globals.css';
import ErrorBoundary from '@/components/ErrorBoundary';
import TrackingPing from '@/components/TrackingPing';
import CookieBanner from '@/components/CookieBanner';
import FeedbackButton from '@/components/FeedbackButton';

export const metadata: Metadata = {
  title: '30sec. — Intellectual Tournament',
  description: '30 seconds. One answer. Are you ready?',
  icons: { icon: '/favicon.ico' },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#0a0e17',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" className="dark">
      <body className="min-h-screen bg-dark-900 overflow-x-hidden">
        <TrackingPing />
        <CookieBanner />
        <FeedbackButton />
        <ErrorBoundary>{children}</ErrorBoundary>
      </body>
    </html>
  );
}
