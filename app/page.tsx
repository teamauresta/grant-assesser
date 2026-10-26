import Link from 'next/link';
import { BadgeCheck, CircleHelp, Lock, type LucideIcon } from 'lucide-react';
import { PROGRAMS } from '@/content/programs';
import { cn } from '@/lib/cn';
import { focusRing } from '@/components/ui/focus-ring';
import { ClosingSoonStrip } from '@/components/programs/closing-soon-strip';
import { PersonaCards } from '@/components/home/persona-cards';
import { DueThisWeek } from '@/components/plan/due-this-week';

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

      <DueThisWeek />

      <section aria-labelledby="persona-heading" className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h2 id="persona-heading" className="text-xl">Where is your company today?</h2>
          <p className="text-sm text-muted-fg">Pick one to start the assessment. You can change it at any time.</p>
        </div>
        <PersonaCards />
        <p className="text-sm text-muted-fg">
          Not ready to answer questions?{' '}
          <Link href="/programs/" className={cn('rounded-sm text-accent underline underline-offset-4', focusRing)}>
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
