import Link from 'next/link';
import { BadgeCheck, CircleHelp, Lock, type LucideIcon } from 'lucide-react';
import { PROGRAMS } from '@/content/programs';
import { cn } from '@/lib/cn';
import { focusRing } from '@/components/ui/focus-ring';
import { Reveal } from '@/components/motion/reveal';
import { ClosingSoonStrip } from '@/components/programs/closing-soon-strip';
import { Hero } from '@/components/home/hero';
import { ResumeCard } from '@/components/home/resume-card';
import { PersonaCards } from '@/components/home/persona-cards';
import { SortStory } from '@/components/home/sort-story';
import { CategoryBand } from '@/components/home/category-band';
import { HowItWorks } from '@/components/home/how-it-works';
import { DueThisWeek } from '@/components/plan/due-this-week';

const VALUES: { icon: LucideIcon; title: string; text: string; tint: string }[] = [
  { icon: BadgeCheck, title: 'Verified sources', text: 'Every program links to the official pages and shows the date it was checked.', tint: 'text-brand' },
  { icon: CircleHelp, title: 'Honest about uncertainty', text: 'Where the rules are unclear or contradictory, we say so instead of guessing.', tint: 'text-brand-2' },
  { icon: Lock, title: 'Private', text: 'Your answers stay in this browser. There is no account and no server.', tint: 'text-spark' },
];

export default function HomePage() {
  return (
    <div className="flex flex-col gap-12 md:gap-16">
      <Hero />

      <ResumeCard />

      <DueThisWeek />

      <Reveal>
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
      </Reveal>

      <SortStory />

      <CategoryBand />

      <HowItWorks />

      <Reveal>
        <ClosingSoonStrip programs={PROGRAMS} />
      </Reveal>

      <Reveal>
        <section aria-labelledby="values-heading" className="border-t border-border pt-8">
          <h2 id="values-heading" className="sr-only">Why Grant Navigator</h2>
          <ul className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {VALUES.map(({ icon: Icon, title, text, tint }) => (
              <li key={title} className="flex gap-3">
                <Icon aria-hidden="true" size={20} strokeWidth={1.5} className={cn('mt-0.5 shrink-0', tint)} />
                <div>
                  <h3 className="text-base">{title}</h3>
                  <p className="text-sm text-muted-fg">{text}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </Reveal>
    </div>
  );
}
