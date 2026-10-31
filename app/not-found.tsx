import type { Metadata } from 'next';
import Link from 'next/link';
import { buttonClasses } from '@/components/ui/button';
import { PageNoticeWindow } from '@/components/layout/page-notice';
import { Art } from '@/components/ui/art';

export const metadata: Metadata = { title: 'Page not found' };

/**
 * The 404 (exported as out/404.html): a window whose title is the page's one h1 (Billabong design doc
 * section 4), the searching platypus (section 6), a playful line, then the plain way out (section 7).
 */
export default function NotFound() {
  return (
    <PageNoticeWindow title="Page not found">
      {/* Decorative: the copy says it. A placeholder of its size until the artwork is processed (art/README.md). */}
      <Art name="platypus-search" alt="" sizes="(min-width: 48rem) 160px, 128px" className="w-32 md:w-40" />
      <p className="text-xl font-semibold">This page went for a swim.</p>
      <p className="text-muted-fg">The page may have moved, or the link may be mistyped.</p>
      <Link href="/programs/" className={buttonClasses({ variant: 'primary' })}>
        Browse programs
      </Link>
    </PageNoticeWindow>
  );
}
