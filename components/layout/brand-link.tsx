'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/cn';
import { focusRing } from '@/components/ui/focus-ring';
import { LogoMark } from '@/components/layout/logo-mark';

/** The product name, linking home. Shared by the desktop and mobile headers. */
export function BrandLink({ className }: { className?: string }) {
  const pathname = usePathname();
  return (
    <Link
      href="/"
      aria-current={pathname === '/' ? 'page' : undefined}
      className={cn('inline-flex min-h-11 items-center gap-2 rounded-md text-base font-semibold tracking-tight', focusRing, className)}
    >
      <LogoMark />
      {/* Between md and lg the top bar has no room for the name beside the nav, the persona chip and
          "Start assessment": the logo alone shows, and the name stays the link's accessible name. */}
      <span className="md:max-lg:sr-only">Grant Navigator</span>
    </Link>
  );
}
