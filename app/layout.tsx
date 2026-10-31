import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { Rubik } from 'next/font/google';
import { SkipLink } from '@/components/layout/skip-link';
import { TopNav } from '@/components/layout/top-nav';
import { BottomNav } from '@/components/layout/bottom-nav';
import { MobileHeader } from '@/components/layout/mobile-header';
import { LogoMark } from '@/components/layout/logo-mark';
import { StorageBanner } from '@/components/layout/storage-banner';
import { ThemeWatcher } from '@/components/layout/theme-watcher';
import { Toaster } from '@/components/ui/toast';
import { MotionProvider } from '@/components/motion/motion-provider';
import { WorkspaceProvider } from '@/lib/store/workspace-provider';
import { heroPreloadScript } from '@/lib/hero-preload';
import './globals.css';

// Self-hosted at build time by next/font: the export makes no request to Google at runtime. No
// weight list: Rubik is a variable font (300 to 900 in one file per subset), so every weight is real.
const rubik = Rubik({ subsets: ['latin'], display: 'swap', variable: '--font-rubik' });

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

// Runs before first paint so the page never flashes the wrong theme. On the home page it also
// preloads the active theme's hero diorama (lib/hero-preload.ts), which is lazy so that each theme
// fetches only its own picture.
const THEME_SCRIPT = `(function(){var t;try{t=localStorage.getItem('gn-theme')}catch(e){}if(t!=='light'&&t!=='dark'){t=window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'}document.documentElement.dataset.theme=t;${heroPreloadScript(process.env.NEXT_PUBLIC_BASE_PATH ?? '')}})();`;

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
          {/* The logo renders here, on the server, so the bars' client code never ships the art manifest. */}
          <TopNav logo={<LogoMark />} className="hidden md:block" />
          <MobileHeader logo={<LogoMark />} className="md:hidden" />
          <StorageBanner />
          <main id="main" tabIndex={-1} className="mx-auto max-w-[1120px] px-4 pt-6 pb-[calc(var(--bottom-bar-h)+2rem)] focus:outline-none md:pt-10 md:pb-12">
            {children}
          </main>
          <BottomNav className="md:hidden" />
          <Toaster />
        </MotionProvider>
      </body>
    </html>
  );
}
