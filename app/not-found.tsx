import type { Metadata } from 'next';
import Link from 'next/link';
import { buttonClasses } from '@/components/ui/button';

export const metadata: Metadata = { title: 'Page not found' };

export default function NotFound() {
  return (
    <div className="flex max-w-xl flex-col items-start gap-4 py-12">
      <h1 className="text-3xl">Page not found</h1>
      <p className="text-muted-fg">The page may have moved, or the link may be mistyped.</p>
      <Link href="/programs/" className={buttonClasses({ variant: 'primary' })}>
        Browse programs
      </Link>
    </div>
  );
}
