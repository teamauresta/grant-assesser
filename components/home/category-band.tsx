'use client';

import Link from 'next/link';
import type { IconName } from '@/lib/art';
import type { Program } from '@/lib/schema';
import { PROGRAM_TYPES } from '@/lib/programs/filter';
import { TYPE_LABELS } from '@/lib/format';
import { cn } from '@/lib/cn';
import { focusRing } from '@/components/ui/focus-ring';
import { SageIcon } from '@/components/ui/sage-icon';
import { useSpotlight } from '@/components/ui/spotlight';

const ICONS: Record<Program['type'], IconName> = {
  grant: 'landmark', voucher: 'ticket', 'tax-incentive': 'receipt', credits: 'cloud',
  accelerator: 'rocket', capital: 'banknote', service: 'handshake', 'investor-incentive': 'trending-up',
};

/** Program types as a row of links to the directory, filtered by type, with a cursor spotlight. */
export function CategoryBand() {
  const listRef = useSpotlight<HTMLUListElement>();
  return (
    <section aria-labelledby="types-heading" className="flex flex-col gap-4 py-2">
      <h2 id="types-heading" className="text-xl">Browse by type</h2>
      <ul ref={listRef} className="grid grid-cols-4 gap-3 px-1 md:flex md:justify-center md:gap-4">
        {PROGRAM_TYPES.map((type) => {
          return (
            <li key={type}>
              <Link
                href={`/programs/?type=${type}`}
                data-spotlight=""
                className={cn('spotlight group flex flex-col items-center gap-2 rounded-xl px-1 py-3 text-center [--spot-size:72px] md:px-2 text-xs text-muted-fg hover:text-fg', focusRing)}
              >
                <span className="flex size-14 items-center justify-center rounded-full border border-border bg-surface transition-[border-color] duration-150 group-hover:border-border-strong">
                  <SageIcon name={ICONS[type]} size={36} />
                </span>
                {TYPE_LABELS[type]}
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
