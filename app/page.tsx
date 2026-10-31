import Link from 'next/link';
import { PROGRAMS } from '@/content/programs';
import type { IconName } from '@/lib/art';
import { cn } from '@/lib/cn';
import { focusRing } from '@/components/ui/focus-ring';
import { SageIcon } from '@/components/ui/sage-icon';
import { Reveal } from '@/components/motion/reveal';
import { ClosingSoonStrip } from '@/components/programs/closing-soon-strip';
import { Hero } from '@/components/home/hero';
import { ResumeCard } from '@/components/home/resume-card';
import { PersonaCards } from '@/components/home/persona-cards';
import { SortStory } from '@/components/home/sort-story';
import { CategoryBand } from '@/components/home/category-band';
import { HowItWorks } from '@/components/home/how-it-works';
import { DueThisWeek } from '@/components/plan/due-this-week';

const VALUES: { icon: IconName; title: string; text: string }[] = [
  { icon: 'verified', title: 'Verified sources', text: 'Every program links to the official pages and shows the date it was checked.' },
  { icon: 'question', title: 'Honest about uncertainty', text: 'Where the rules are unclear or contradictory, we say so instead of guessing.' },
  { icon: 'lock', title: 'Private', text: 'Your answers stay in this browser. There is no account and no server.' },
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
            <p className="text-sm text-muted-fg">Pick the closest fit to start the assessment. Nothing is locked in: you can change it, and every answer, any time.</p>
          </div>
          <PersonaCards />
          <p className="text-sm text-muted-fg">
            Just looking?{' '}
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
            {VALUES.map(({ icon, title, text }) => (
              <li key={title} className="flex gap-3">
                <SageIcon name={icon} size={36} />
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
