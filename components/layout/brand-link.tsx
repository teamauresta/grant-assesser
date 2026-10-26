'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/cn';
import { focusRing } from '@/components/ui/focus-ring';

/** The product name, linking home. Shared by the desktop and mobile headers. */
export function BrandLink({ className }: { className?: string }) {
  const pathname = usePathname();
  return (
    <Link
      href="/"
      aria-current={pathname === '/' ? 'page' : undefined}
      className={cn('inline-flex min-h-11 items-center rounded-md text-base font-semibold tracking-tight', focusRing, className)}
    >
      Grant Navigator
    </Link>
  );
}
