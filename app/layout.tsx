import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { Rubik } from 'next/font/google';
import { SkipLink } from '@/components/layout/skip-link';
import { TopNav } from '@/components/layout/top-nav';
import { BottomNav } from '@/components/layout/bottom-nav';
import { MobileHeader } from '@/components/layout/mobile-header';
import { StorageBanner } from '@/components/layout/storage-banner';
import { ThemeWatcher } from '@/components/layout/theme-watcher';
import { Toaster } from '@/components/ui/toast';
import { MotionProvider } from '@/components/motion/motion-provider';
import { WorkspaceProvider } from '@/lib/store/workspace-provider';
import './globals.css';

// Self-hosted at build time by next/font: the export makes no request to Google at runtime.
const rubik = Rubik({ subsets: ['latin'], weight: ['400', '500', '700'], display: 'swap', variable: '--font-rubik' });

export const metadata: Metadata = {
  title: { default: 'Grant Navigator', template: '%s · Grant Navigator' },
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
    <html lang="en-AU" className={rubik.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body>
        <MotionProvider>
          <WorkspaceProvider />
          <ThemeWatcher />
          <SkipLink />
          <TopNav className="hidden md:block" />
          <MobileHeader className="md:hidden" />
          <StorageBanner />
          <main id="main" tabIndex={-1} className="mx-auto max-w-[1120px] px-4 pt-6 pb-[calc(6rem+env(safe-area-inset-bottom))] focus:outline-none md:pt-10 md:pb-12">
            {children}
          </main>
          <BottomNav className="md:hidden" />
          <Toaster />
        </MotionProvider>
      </body>
    </html>
  );
}
