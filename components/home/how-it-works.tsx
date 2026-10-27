import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { cn } from '@/lib/cn';
import { focusRing } from '@/components/ui/focus-ring';
import { Reveal } from '@/components/motion/reveal';
import { StaticScatter } from './static-scatter';

const STEPS = [
  { title: 'Assess', text: 'Answer six short steps. Every program is sorted into Act now, Prepare, Watch and Not a fit, with the reasons.', href: '/assess/', cta: 'Start the assessment' },
  { title: 'Plan', text: 'Add programs to your pipeline. Starter goals, deadlines and reminders go straight to your calendar.', href: '/plan/', cta: 'Open My plan' },
  { title: 'Report', text: 'Download a PDF for yourself or your board at any time, with the sections you choose.', href: '/report/', cta: 'Build a report' },
] as const;

/** Dark in both themes: the page's one dramatic panel. */
export function HowItWorks() {
  return (
    <section aria-labelledby="how-heading" className="relative isolate overflow-hidden rounded-3xl border border-panel-border bg-panel-bg px-6 py-10 text-panel-fg md:px-12 md:py-14">
      <div aria-hidden="true" className="absolute inset-0 -z-10 opacity-40"><StaticScatter drift /></div>
      <h2 id="how-heading" className="text-3xl tracking-[-0.03em] md:text-5xl">How it works</h2>
      <ol className="mt-8 grid grid-cols-1 gap-8 md:grid-cols-3">
        {STEPS.map((s, i) => (
          <li key={s.title}>
            <Reveal delay={i * 40} className="flex flex-col gap-3">
              <span aria-hidden="true" className="text-lift-panel num self-start font-mono text-5xl font-semibold">{String(i + 1).padStart(2, '0')}</span>
              <h3 className="text-xl">{s.title}</h3>
              <p className="text-sm text-panel-muted-fg">{s.text}</p>
              <Link href={s.href} className={cn('inline-flex min-h-11 items-center gap-1 self-start rounded-md text-sm font-medium text-panel-fg underline underline-offset-4', focusRing)}>
                {s.cta}
                <ArrowRight aria-hidden="true" size={16} strokeWidth={1.5} />
              </Link>
            </Reveal>
          </li>
        ))}
      </ol>
    </section>
  );
}
