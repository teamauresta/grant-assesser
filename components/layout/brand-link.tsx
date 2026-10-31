'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/cn';
import { focusRing } from '@/components/ui/focus-ring';

/**
 * The product name, linking home. Shared by the desktop and mobile headers. `logo` is the `LogoMark`,
 * rendered on the server by the layout and passed down, so this client component never imports the
 * art manifest (it would ship to every page).
 */
export function BrandLink({ logo, className }: { logo: ReactNode; className?: string }) {
  const pathname = usePathname();
  return (
    <Link
      href="/"
      aria-current={pathname === '/' ? 'page' : undefined}
      className={cn('inline-flex min-h-11 items-center gap-2 rounded-md text-base font-semibold tracking-tight', focusRing, className)}
    >
      {logo}
      {/* Below 360px (beside the persona chip) and between md and lg (beside the nav, the persona chip
          and "Start assessment") there is no room for the name: the logo alone shows, and the name
          stays the link's accessible name. */}
      <span className="whitespace-nowrap max-[360px]:sr-only md:max-lg:sr-only">Grant Navigator</span>
    </Link>
  );
}
