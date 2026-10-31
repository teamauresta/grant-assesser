import type { ComponentType } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import type { ArtName } from '@/lib/art';
import { cn } from '@/lib/cn';
import { focusRing } from '@/components/ui/focus-ring';
import { Art } from '@/components/ui/art';
import { Window } from '@/components/ui/window';
import { Reveal } from '@/components/motion/reveal';
import { AnswerPreview, AssessPreview, PlanPreview } from '@/components/home/previews';

/** The three steps, in order: a real sequence, so the titles carry their numbers (Billabong plan, Task 11). */
const STEPS: { title: string; art: ArtName; text: string; href: string; cta: string; preview: ComponentType }[] = [
  { title: '1. Answer six questions', art: 'step-answer', text: 'Six short steps about your company, its R&D and its funding. Your answers stay in this browser.', href: '/assess/', cta: 'Start the assessment', preview: AnswerPreview },
  { title: '2. See what fits', art: 'step-sort', text: 'Every program is sorted into Act now, Prepare, Watch and Not a fit, with the reasons.', href: '/programs/', cta: 'Browse the programs', preview: AssessPreview },
  { title: '3. Plan the applications', art: 'step-plan', text: 'Add programs to your pipeline. Starter goals, deadlines and reminders go straight to your calendar, and a PDF report is a click away.', href: '/plan/', cta: 'Open My plan', preview: PlanPreview },
];

/**
 * Three windows on the page background, one per step (Billabong design doc, section 8), each with its
 * spot illustration, its text and link, and a small preview of the product along the bottom. The
 * windows are steps in a sequence, not parts of the page to jump to, so they are not landmarks; the
 * section is the one "How it works" region.
 */
export function HowItWorks() {
  return (
    <section aria-labelledby="how-heading" className="flex flex-col gap-6">
      <h2 id="how-heading" className="text-3xl tracking-[-0.03em] md:text-5xl">How it works</h2>
      <ol className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {STEPS.map(({ preview: Preview, ...s }, i) => (
          <li key={s.title}>
            <Reveal delay={i * 40} className="h-full">
              <Window
                landmark={false}
                as="h3"
                title={s.title}
                titleSize="md"
                className="flex h-full flex-col"
                bodyClassName="flex flex-1 flex-col gap-3"
              >
                <Art name={s.art} sizes="96px" className="w-24" />
                <p className="text-sm text-muted-fg">{s.text}</p>
                <Link href={s.href} className={cn('inline-flex min-h-11 items-center gap-1 self-start rounded-md text-sm font-medium text-accent underline underline-offset-4', focusRing)}>
                  {s.cta}
                  <ArrowRight aria-hidden="true" size={16} />
                </Link>
                <div className="mt-auto md:pt-2">
                  <Preview />
                </div>
              </Window>
            </Reveal>
          </li>
        ))}
      </ol>
    </section>
  );
}
