import type { ReactNode } from 'react';
import Link from 'next/link';
import { ChevronRight, ExternalLink, ShieldCheck, TriangleAlert } from 'lucide-react';
import type { Program } from '@/lib/schema';
import { getProgram } from '@/content/programs';
import { formatDate } from '@/lib/dates';
import { formatBenefit, LEVEL_LABELS, TYPE_LABELS } from '@/lib/format';
import { cn } from '@/lib/cn';
import { Badge } from '@/components/ui/badge';
import { Window } from '@/components/ui/window';
import { focusRing } from '@/components/ui/focus-ring';
import { AddToPipeline } from './add-to-pipeline';
import { DeadlineCalendar } from './deadline-calendar';
import { ProgramEligibility, ProgramPersonaNotes } from './personalised';
import { NextDeadline, ProgramStatusPill, VerifiedNote } from './program-status';

const linkClasses = cn('rounded-sm text-accent underline underline-offset-4 hover:no-underline', focusRing);

/**
 * A section of the page as a window (Billabong design doc, section 4): a region named by its h2
 * title, under the page's h1. The id keeps each heading linkable.
 */
function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <Window title={title} titleId={id} bodyClassName="flex flex-col gap-3">
      {children}
    </Window>
  );
}

function hostname(url: string): string {
  return new URL(url).hostname.replace(/^www\./, '');
}

/**
 * Full program page. Server-rendered; status, deadlines, staleness, persona advice and eligibility
 * results refine on the client from the stored profile.
 */
export function ProgramDetail({ program: p }: { program: Program }) {
  const { content } = p;
  return (
    <article className="flex max-w-3xl flex-col gap-6">
      <nav aria-label="Breadcrumb">
        <ol className="flex flex-wrap items-center gap-1 text-sm text-muted-fg">
          <li className="flex items-center gap-1">
            <Link href="/programs/" className={cn('inline-flex min-h-11 items-center rounded-sm hover:text-fg', focusRing)}>Programs</Link>
            <ChevronRight aria-hidden="true" size={16} strokeWidth={1.5} />
          </li>
          <li aria-current="page" className="text-fg">{p.name}</li>
        </ol>
      </nav>

      <header className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl">{p.name}</h1>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-muted-fg">
            <ProgramStatusPill program={p} />
            <span>{p.provider}</span>
            <span aria-hidden="true">·</span>
            <span>{LEVEL_LABELS[p.level]}</span>
          </div>
          {p.status.note && <p className="text-sm text-muted-fg">{p.status.note}</p>}
        </div>

        <dl className="grid grid-cols-1 rounded-lg border border-border bg-surface sm:grid-cols-3 sm:divide-x sm:divide-border max-sm:divide-y max-sm:divide-border">
          <div className="flex flex-col gap-1 p-4">
            <dt className="text-xs text-muted-fg">Benefit</dt>
            <dd className="num text-sm">{formatBenefit(p.benefit)}</dd>
          </div>
          <div className="flex flex-col gap-1 p-4">
            <dt className="text-xs text-muted-fg">Next deadline</dt>
            <dd className="num text-sm"><NextDeadline program={p} /></dd>
          </div>
          <div className="flex flex-col gap-1 p-4">
            <dt className="text-xs text-muted-fg">Type</dt>
            <dd className="text-sm">{TYPE_LABELS[p.type]}</dd>
          </div>
        </dl>

        <div className="flex flex-wrap items-start gap-x-3 gap-y-4">
          <AddToPipeline program={p} />
          <DeadlineCalendar program={p} />
        </div>
      </header>

      <ProgramPersonaNotes personas={p.personas} />

      <Section id="what" title="What it is">
        <p>{content.summary}</p>
        {p.benefit.note && <p className="text-muted-fg">{p.benefit.note}</p>}
      </Section>

      <Section id="eligibility" title="Eligibility">
        <ProgramEligibility gates={p.gates} />
      </Section>

      {content.howToApply.length > 0 && (
        <Section id="how-to-apply" title="How to apply">
          <ol className="flex list-decimal flex-col gap-2 pl-6 marker:num marker:text-muted-fg">
            {content.howToApply.map((s, i) => <li key={i} className="pl-1">{s}</li>)}
          </ol>
        </Section>
      )}

      {content.prepare.length > 0 && (
        <Section id="prepare" title="Prepare">
          <ul className="flex list-disc flex-col gap-2 pl-6 marker:text-muted-fg">
            {content.prepare.map((s, i) => <li key={i} className="pl-1">{s}</li>)}
          </ul>
        </Section>
      )}

      {content.mistakes.length > 0 && (
        <Section id="mistakes" title="Common mistakes">
          <ul className="flex list-disc flex-col gap-2 pl-6 marker:text-muted-fg">
            {content.mistakes.map((s, i) => <li key={i} className="pl-1">{s}</li>)}
          </ul>
        </Section>
      )}

      {content.caveats.length > 0 && (
        <Section id="caveats" title="Caveats">
          <div className="flex gap-3 rounded-lg border border-border bg-warn-bg p-4">
            <TriangleAlert aria-hidden="true" size={20} strokeWidth={1.5} className="mt-0.5 shrink-0 text-warn-fg" />
            <ul className="flex flex-col gap-2 text-fg">
              {content.caveats.map((s, i) => <li key={i}>{s}</li>)}
            </ul>
          </div>
        </Section>
      )}

      {p.stacking.length > 0 && (
        <Section id="stacking" title="Stacking">
          <p className="text-sm text-muted-fg">How this program combines with others.</p>
          <ul className="divide-y divide-border rounded-lg border border-border">
            {p.stacking.map((s) => {
              const other = getProgram(s.with);
              return (
                <li key={s.with} className="flex flex-col gap-1 px-4 py-3">
                  {other ? (
                    <Link href={`/programs/${other.slug}/`} className={cn(linkClasses, 'self-start font-medium')}>{other.name}</Link>
                  ) : (
                    <span className="font-medium">{s.with}</span>
                  )}
                  <p className="text-sm text-muted-fg">{s.note}</p>
                </li>
              );
            })}
          </ul>
        </Section>
      )}

      <Section id="sources" title="Sources">
        <VerifiedNote program={p} />
        <ul className="flex flex-col gap-3">
          {p.verification.sources.map((s) => (
            <li key={s.url} className="flex flex-col gap-0.5">
              <div className="flex flex-wrap items-center gap-2">
                <a href={s.url} target="_blank" rel="noopener noreferrer" className={cn(linkClasses, 'inline-flex items-center gap-1')}>
                  {s.title}
                  <ExternalLink aria-hidden="true" size={16} strokeWidth={1.5} className="shrink-0" />
                  <span className="sr-only"> (opens in a new tab)</span>
                </a>
                {s.official && (
                  <Badge>
                    <ShieldCheck aria-hidden="true" size={16} strokeWidth={1.5} />
                    Official
                  </Badge>
                )}
              </div>
              <span className="text-xs text-muted-fg">{hostname(s.url)}</span>
            </li>
          ))}
        </ul>
      </Section>

      {p.changelog.length > 0 && (
        <Section id="changelog" title="Change log">
          <ul className="flex flex-col gap-2">
            {[...p.changelog].sort((a, b) => b.date.localeCompare(a.date)).map((c, i) => (
              <li key={i} className="flex flex-col gap-0.5 text-sm sm:flex-row sm:gap-4">
                <time dateTime={c.date} className="num shrink-0 text-muted-fg sm:w-28">{formatDate(c.date)}</time>
                <span>{c.note}</span>
              </li>
            ))}
          </ul>
        </Section>
      )}
    </article>
  );
}
