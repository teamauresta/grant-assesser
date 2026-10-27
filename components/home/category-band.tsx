import Link from 'next/link';
import { Banknote, Cloud, Handshake, Landmark, Receipt, Rocket, Ticket, TrendingUp, type LucideIcon } from 'lucide-react';
import type { Program } from '@/lib/schema';
import { PROGRAM_TYPES } from '@/lib/programs/filter';
import { TYPE_LABELS } from '@/lib/format';
import { cn } from '@/lib/cn';
import { focusRing } from '@/components/ui/focus-ring';

const ICONS: Record<Program['type'], LucideIcon> = {
  grant: Landmark, voucher: Ticket, 'tax-incentive': Receipt, credits: Cloud,
  accelerator: Rocket, capital: Banknote, service: Handshake, 'investor-incentive': TrendingUp,
};

/** Program types as a row of links to the directory, filtered by type. */
export function CategoryBand() {
  return (
    <section aria-labelledby="types-heading" className="flex flex-col gap-4 overflow-hidden py-2">
      <h2 id="types-heading" className="text-xl">Browse by type</h2>
      <ul className="grid grid-cols-4 gap-3 px-1 md:flex md:justify-center md:gap-4">
        {PROGRAM_TYPES.map((type) => {
          const Icon = ICONS[type];
          return (
            <li key={type}>
              <Link
                href={`/programs/?type=${type}`}
                className={cn('group flex flex-col items-center gap-2 rounded-lg p-1 text-center text-xs text-muted-fg hover:text-fg', focusRing)}
              >
                <span className="flex size-14 items-center justify-center rounded-full border border-border bg-surface transition-[border-color] duration-150 group-hover:border-border-strong">
                  <Icon aria-hidden="true" size={20} strokeWidth={1.5} className="text-fg" />
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
