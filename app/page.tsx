import Link from 'next/link';
import { ArrowRight, BadgeCheck, CircleHelp, Lock, type LucideIcon } from 'lucide-react';
import type { Persona } from '@/lib/schema';
import { PROGRAMS } from '@/content/programs';
import { cn } from '@/lib/cn';
import { focusRing } from '@/components/ui/focus-ring';
import { ClosingSoonStrip } from '@/components/programs/closing-soon-strip';

const PERSONAS: { value: Persona; title: string; description: string }[] = [
  { value: 'bootstrapped', title: 'Bootstrapped', description: 'Self-funded or customer-funded. Start with low-cost wins and matched vouchers.' },
  { value: 'pre-raise', title: 'Pre-raise', description: 'Getting ready to raise. Build eligibility and evidence before the round.' },
  { value: 'vc-backed', title: 'VC-backed', description: 'Institutionally funded. Unlock VC-gated credits and larger grants.' },
];

const VALUES: { icon: LucideIcon; title: string; text: string }[] = [
  { icon: BadgeCheck, title: 'Verified sources', text: 'Every program links to the official pages and shows the date it was checked.' },
  { icon: CircleHelp, title: 'Honest about uncertainty', text: 'Where the rules are unclear or contradictory, we say so instead of guessing.' },
  { icon: Lock, title: 'Private', text: 'Your answers stay in this browser. There is no account and no server.' },
];

export default function HomePage() {
  return (
    <div className="flex flex-col gap-12 md:gap-16">
      <header className="flex max-w-3xl flex-col gap-3">
        <h1 className="text-3xl md:text-5xl">Find, assess and track startup funding in Australia</h1>
        <p className="text-base text-muted-fg md:text-xl">
          Grants, tax incentives, credits and accelerators, checked against official sources and matched to your situation.
        </p>
      </header>

      <section aria-labelledby="persona-heading" className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h2 id="persona-heading" className="text-xl">Where is your company today?</h2>
          <p className="text-sm text-muted-fg">Pick one to start the assessment. You can change it at any time.</p>
        </div>
        <ul className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {PERSONAS.map(({ value, title, description }) => (
            <li key={value}>
              <Link
                href={`/assess/?persona=${value}`}
                className={cn(
                  'group flex h-full min-h-32 flex-col gap-2 rounded-lg border border-border bg-surface p-6',
                  'transition-[border-color] duration-150 hover:border-accent',
                  focusRing,
                )}
              >
                <span className="flex items-center justify-between gap-2 text-xl font-semibold tracking-tight">
                  {title}
                  <ArrowRight
                    aria-hidden="true"
                    size={20}
                    strokeWidth={1.5}
                    className="shrink-0 text-muted-fg transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-accent"
                  />
                </span>
                <span className="text-sm text-muted-fg">{description}</span>
              </Link>
            </li>
          ))}
        </ul>
        <p className="text-sm text-muted-fg">
          Not ready to answer questions?{' '}
          <Link href="/programs/" className={cn('rounded-sm text-accent underline-offset-4 hover:underline', focusRing)}>
            Browse all {PROGRAMS.length} programs
          </Link>
          .
        </p>
      </section>

      <ClosingSoonStrip programs={PROGRAMS} />

      <section aria-labelledby="values-heading" className="border-t border-border pt-8">
        <h2 id="values-heading" className="sr-only">Why Grant Navigator</h2>
        <ul className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {VALUES.map(({ icon: Icon, title, text }) => (
            <li key={title} className="flex gap-3">
              <Icon aria-hidden="true" size={20} strokeWidth={1.5} className="mt-0.5 shrink-0 text-accent" />
              <div>
                <h3 className="text-base">{title}</h3>
                <p className="text-sm text-muted-fg">{text}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
