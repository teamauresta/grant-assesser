import type { Metadata } from 'next';
import Link from 'next/link';
import { buttonClasses } from '@/components/ui/button';
import { PageNoticeWindow } from '@/components/layout/page-notice';

export const metadata: Metadata = { title: 'Page not found' };

/**
 * The 404 (exported as out/404.html): a window whose title is the page's one h1 (Billabong design doc
 * section 4), a playful line, then the plain way out (section 7).
 */
export default function NotFound() {
  return (
    <PageNoticeWindow title="Page not found">
      {/* Art: platypus-search (Task 10 adds the illustration here). */}
      <p className="text-xl font-semibold">This page went for a swim.</p>
      <p className="text-muted-fg">The page may have moved, or the link may be mistyped.</p>
      <Link href="/programs/" className={buttonClasses({ variant: 'primary' })}>
        Browse programs
      </Link>
    </PageNoticeWindow>
  );
}
