import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import { SkipLink } from '@/components/layout/skip-link';
import { TopNav } from '@/components/layout/top-nav';
import { BottomNav } from '@/components/layout/bottom-nav';
import './globals.css';

export const metadata: Metadata = {
  title: 'Grant Navigator',
  description: 'Find, assess and track Australian startup funding.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // Lets env(safe-area-inset-bottom) report the home-indicator inset for the bottom nav.
  viewportFit: 'cover',
};

// Runs before first paint so the page never flashes the wrong theme.
const THEME_SCRIPT = `(function(){var t;try{t=localStorage.getItem('gn-theme')}catch(e){}if(t!=='light'&&t!=='dark'){t=window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'}document.documentElement.dataset.theme=t})();`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en-AU" className={`${GeistSans.variable} ${GeistMono.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body>
        <SkipLink />
        <TopNav className="hidden md:block" />
        <main id="main" tabIndex={-1} className="mx-auto max-w-[1120px] px-4 pt-6 pb-[calc(6rem+env(safe-area-inset-bottom))] focus:outline-none md:pt-10 md:pb-12">
          {children}
        </main>
        <BottomNav className="md:hidden" />
      </body>
    </html>
  );
}
