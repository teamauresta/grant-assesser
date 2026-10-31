import type { ReactNode } from 'react';
import { AnimatePresence } from 'motion/react';
import * as m from 'motion/react-m';
import { useMotionReady } from '@/components/motion/motion-provider';
import { formatDate } from '@/lib/dates';
import { formatMoney } from '@/lib/format';
import { cn } from '@/lib/cn';
import { focusRing } from '@/components/ui/focus-ring';
import {
  PREPARED_WITH, SECTION_INFO, UPCOMING_DAYS, hasAnySection,
  type FundingData, type GapRow, type PipelineRow, type ProgramGroup, type Range, type ReportData,
  type SourceGroup, type StackingRow, type SummaryData, type UpcomingRow,
} from '@/lib/pdf/report-data';

const fmt = (iso: string | null) => (iso ? formatDate(iso) : 'not recorded');

function range({ low, high }: Range): string {
  if (high <= 0) return 'None counted yet';
  return low === high || low <= 0 ? `Up to ${formatMoney(high, 'AUD')}` : `${formatMoney(low, 'AUD')}–${formatMoney(high, 'AUD')}`;
}

function Section({ id, title, lead, children }: { id: string; title: string; lead?: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        {/* A neutral hairline, as in the PDF: coloured lines are for state only (CLAUDE.md). */}
        <h3 id={id} className="border-b border-border pb-1.5 text-lg">{title}</h3>
        {lead && <p className="text-sm text-muted-fg">{lead}</p>}
      </div>
      {children}
    </section>
  );
}

function Empty({ children }: { children: ReactNode }) {
  return <p className="rounded-md border border-dashed border-border px-3 py-2 text-sm text-muted-fg">{children}</p>;
}

/**
 * A bordered table that scrolls sideways inside the preview on narrow screens. The scroll box is a
 * focusable, named region so keyboard users can scroll it too.
 */
function Table({ label, head, children, minWidth = 560 }: { label: string; head: string[]; children: ReactNode; minWidth?: number }) {
  return (
    <div role="region" aria-label={label} tabIndex={0} className={cn('overflow-x-auto rounded-md border border-border', focusRing)}>
      <table className="w-full border-collapse text-left text-sm" style={{ minWidth }}>
        {/* The preview sits on the window's --surface body, so the head row takes the bar's fill. */}
        <thead className="bg-neutral-bg text-xs uppercase tracking-wide text-muted-fg">
          <tr>{head.map((h) => <th key={h} scope="col" className="px-3 py-2 font-semibold">{h}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-border align-top">{children}</tbody>
      </table>
    </div>
  );
}

const td = 'px-3 py-2';

/** A preview section that fades in and out (150ms) inside the preview's AnimatePresence. */
function Fade({ children }: { children: ReactNode }) {
  // Starts hidden only when it can fade in: see useMotionReady.
  const motionReady = useMotionReady();
  return (
    <m.div initial={motionReady ? { opacity: 0 } : false} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15, ease: 'easeOut' }}>
      {children}
    </m.div>
  );
}

function Cover({ data }: { data: ReportData }) {
  const cover = data.cover!;
  return (
    <header className="flex flex-col gap-3 border-b border-border pb-6">
      <p className="text-xs font-medium uppercase tracking-widest text-muted-fg">Funding report</p>
      {/* An h3, as the sections are: the preview sits under the Preview window's h2. */}
      <h3 className="text-3xl">{cover.title}</h3>
      <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-1 text-sm">
        {cover.persona && <><dt className="text-muted-fg">Persona</dt><dd className="font-medium">{cover.persona}</dd></>}
        <dt className="text-muted-fg">Date</dt><dd className="num font-medium">{fmt(data.generatedOn)}</dd>
        <dt className="text-muted-fg">Data verified</dt><dd className="num font-medium">{fmt(data.oldestVerified)}</dd>
      </dl>
      <p className="text-sm text-muted-fg">
        {cover.directoryOnly
          ? 'Directory-only report: every program open or rolling today, with no eligibility checks or estimate.'
          : PREPARED_WITH}
      </p>
    </header>
  );
}

function Summary({ summary }: { summary: SummaryData }) {
  return (
    <Section id="preview-summary" title={SECTION_INFO.summary.label}>
      <p className="font-semibold">{summary.title}</p>
      <p className="text-sm text-muted-fg">{summary.intro}</p>
      {summary.facts.length > 0 && (
        <dl className="grid grid-cols-1 gap-x-6 gap-y-1 rounded-md border border-border p-3 text-sm sm:grid-cols-2">
          {summary.facts.map((f) => (
            <div key={f.label} className="flex gap-3">
              <dt className="w-36 shrink-0 text-muted-fg">{f.label}</dt>
              <dd className="font-medium">{f.value}</dd>
            </div>
          ))}
        </dl>
      )}
      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {summary.counts.map((c) => (
          <li key={c.group} className="rounded-md border border-border px-3 py-2">
            <span className="num block text-xl font-semibold">{c.count}</span>
            <span className="text-xs text-muted-fg">{c.label}</span>
          </li>
        ))}
      </ul>
    </Section>
  );
}

function Programs({ groups, directory }: { groups: ProgramGroup[]; directory: boolean }) {
  return (
    <Section
      id="preview-programs"
      title={directory ? 'Open and rolling programs' : SECTION_INFO.programs.label}
      lead={directory ? 'Every program open or taking applications today. Eligibility is not checked.' : 'Programs not ruled out by your answers, grouped by what to do next.'}
    >
      {groups.map((g) => (
        <div key={g.id} className="flex flex-col gap-2">
          <div>
            <h4 className="text-base">{g.label} <span className="num font-normal text-muted-fg">({g.programs.length})</span></h4>
            <p className="text-xs text-muted-fg">{g.description}</p>
          </div>
          {g.programs.length === 0 ? <Empty>Nothing here for now.</Empty> : (
            <Table label={g.label} head={['Program', 'Benefit', 'Status', 'Verified']}>
              {g.programs.map((p) => (
                <tr key={p.slug}>
                  <td className={td}>
                    <span className="font-medium">{p.name}</span>
                    {p.inPipeline && <span className="text-muted-fg"> · In pipeline</span>}
                    <span className="block text-xs text-muted-fg">{p.provider} · {p.type}{p.checks ? ` · ${p.checks}` : ''}</span>
                    {p.issue && <span className="block text-xs text-muted-fg">Next step: {p.issue}</span>}
                    {p.source && (
                      <a href={p.source.url} target="_blank" rel="noreferrer" className="block break-all text-xs text-accent underline-offset-2 hover:underline">
                        {p.source.title}
                      </a>
                    )}
                  </td>
                  <td className={cn(td, 'num')}>{p.benefit}</td>
                  <td className={td}>{p.status}</td>
                  <td className={cn(td, 'num whitespace-nowrap')}>{formatDate(p.lastVerified)}</td>
                </tr>
              ))}
            </Table>
          )}
        </div>
      ))}
    </Section>
  );
}

function Funding({ funding }: { funding: FundingData }) {
  return (
    <Section id="preview-funding" title={SECTION_INFO.funding.label} lead="An estimate of what you could apply for, not money you have been awarded.">
      <dl className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <div className="rounded-md border border-border p-3">
          <dt className="text-xs text-muted-fg">Potential cash and tax offsets (AUD), not secured</dt>
          <dd className="num text-xl font-semibold">{range(funding.aud)}</dd>
          <dd className="text-xs text-muted-fg">{funding.fundingPrograms.length ? `From ${funding.fundingPrograms.join(', ')}` : 'Nothing counted yet'}</dd>
        </div>
        <div className="rounded-md border border-border p-3">
          <dt className="text-xs text-muted-fg">Cloud and AI credits (USD), counted separately</dt>
          <dd className="num text-xl font-semibold">{funding.creditsUsd.high > 0 ? `Up to ${formatMoney(funding.creditsUsd.high, 'USD')}` : 'None counted yet'}</dd>
          <dd className="text-xs text-muted-fg">{funding.creditPrograms.length ? `From ${funding.creditPrograms.join(', ')}` : 'Nothing counted yet'}</dd>
        </div>
      </dl>
    </Section>
  );
}

function Pipeline({ rows }: { rows: PipelineRow[] }) {
  return (
    <Section id="preview-pipeline" title={SECTION_INFO.pipeline.label} lead="Every application you are tracking, including ones you are no longer pursuing.">
      {rows.length === 0 ? <Empty>No applications in your pipeline yet.</Empty> : (
        <Table label={SECTION_INFO.pipeline.label} head={['Application', 'Stage', 'Expected', 'Progress and next step']}>
          {rows.map((r) => (
            <tr key={r.id} className={cn(r.dropped && 'text-muted-fg')}>
              <td className={cn(td, !r.dropped && 'font-medium')}>{r.name}</td>
              <td className={td}>{r.stage}{r.dropped && <span className="block text-xs">No longer pursued</span>}</td>
              <td className={cn(td, 'num text-right')}>{r.expected ?? '–'}</td>
              <td className={td}>
                {r.goals}
                {r.next && <span className="block text-xs text-muted-fg">Next: {r.next.title}, due <span className="num">{formatDate(r.next.date)}</span></span>}
                {r.nextDeadline && <span className="block text-xs text-muted-fg">{r.nextDeadline.label}: <span className="num">{formatDate(r.nextDeadline.date)}</span></span>}
              </td>
            </tr>
          ))}
        </Table>
      )}
    </Section>
  );
}

function Upcoming({ rows }: { rows: UpcomingRow[] }) {
  return (
    <Section id="preview-upcoming" title={SECTION_INFO.upcoming.label} lead={`Open goals and program deadlines due in the next ${UPCOMING_DAYS} days, with anything overdue.`}>
      {rows.length === 0 ? <Empty>Nothing due in the next {UPCOMING_DAYS} days.</Empty> : (
        <Table label={SECTION_INFO.upcoming.label} head={['Date', 'Item', 'Type']} minWidth={480}>
          {rows.map((r) => (
            <tr key={r.id}>
              <td className={cn(td, 'num whitespace-nowrap')}>{formatDate(r.date)}</td>
              <td className={td}><span className="font-medium">{r.title}</span>{r.context && <span className="block text-xs text-muted-fg">{r.context}</span>}</td>
              <td className={td}>{r.kind === 'deadline' ? 'Program deadline' : r.overdue ? 'Goal, overdue' : 'Goal'}</td>
            </tr>
          ))}
        </Table>
      )}
    </Section>
  );
}

function Gaps({ rows }: { rows: GapRow[] }) {
  return (
    <Section id="preview-gaps" title={SECTION_INFO.gaps.label} lead="Required checks that are unanswered or not yet met, across the programs to act on or prepare for.">
      {rows.length === 0 ? <Empty>No gaps: you meet every required check for the programs you can act on.</Empty> : (
        <Table label={SECTION_INFO.gaps.label} head={['Check', 'Status', 'What to do', 'Needed for']}>
          {rows.map((r) => (
            <tr key={`${r.gateId}|${r.label}`}>
              <td className={td}><span className="font-medium">{r.label}</span><span className="block text-xs text-muted-fg">{r.reason}</span></td>
              <td className={cn(td, 'whitespace-nowrap')}>{r.outcome === 'unknown' ? 'Not answered' : 'Not met'}</td>
              <td className={td}>{r.fix}</td>
              <td className={cn(td, 'text-xs text-muted-fg')}>{r.programs.join(', ')}</td>
            </tr>
          ))}
        </Table>
      )}
    </Section>
  );
}

function Stacking({ rows }: { rows: StackingRow[] }) {
  return (
    <Section id="preview-stacking" title={SECTION_INFO.stacking.label} lead="How the programs you are pursuing combine with others.">
      {rows.length === 0 ? <Empty>No stacking notes for the programs in your pipeline.</Empty> : (
        <ul className="flex flex-col divide-y divide-border text-sm">
          {rows.map((r) => (
            <li key={`${r.program}-${r.with}`} className="py-2 first:pt-0">
              <p className="font-medium">{r.program} with {r.with}{r.withInPipeline && <span className="font-normal text-muted-fg"> · Both in pipeline</span>}</p>
              <p className="text-muted-fg">{r.note}</p>
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}

function Sources({ groups }: { groups: SourceGroup[] }) {
  return (
    <Section id="preview-sources" title={SECTION_INFO.sources.label} lead="The sources behind each program in this report.">
      <ul className="flex flex-col divide-y divide-border text-sm">
        {groups.map((g) => (
          <li key={g.program} className="py-2 first:pt-0">
            <p className="font-medium">{g.program} <span className="num text-xs font-normal text-muted-fg">· verified {formatDate(g.lastVerified)}</span></p>
            <ul className="flex flex-col gap-0.5">
              {g.sources.map((s) => (
                <li key={s.url} className="text-xs">
                  <a href={s.url} target="_blank" rel="noreferrer" className="break-all text-accent underline-offset-2 hover:underline">{s.title}</a>
                  {!s.official && <span className="text-muted-fg"> (secondary source)</span>}
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </Section>
  );
}

/**
 * An HTML rendering of the report's selected sections, in the same order as the PDF. Not a PDF viewer.
 * Unframed and unnamed: the report builder shows it in its Preview window, the region that names it.
 */
export function ReportPreview({ data }: { data: ReportData }) {
  return (
    <article className="flex flex-col gap-8">
      {/* Sections fade in and out as they are switched on and off; the first render is not animated. */}
      <AnimatePresence initial={false}>
        {!hasAnySection(data) && <Fade key="none"><Empty>Choose at least one section to include.</Empty></Fade>}
        {data.cover && <Fade key="cover"><Cover data={data} /></Fade>}
        {data.summary && <Fade key="summary"><Summary summary={data.summary} /></Fade>}
        {data.programs && <Fade key="programs"><Programs groups={data.programs} directory={data.mode === 'directory'} /></Fade>}
        {data.funding && <Fade key="funding"><Funding funding={data.funding} /></Fade>}
        {data.pipeline && <Fade key="pipeline"><Pipeline rows={data.pipeline} /></Fade>}
        {data.upcoming && <Fade key="upcoming"><Upcoming rows={data.upcoming} /></Fade>}
        {data.gaps && <Fade key="gaps"><Gaps rows={data.gaps} /></Fade>}
        {data.stacking && <Fade key="stacking"><Stacking rows={data.stacking} /></Fade>}
        {data.sources && <Fade key="sources"><Sources groups={data.sources} /></Fade>}
      </AnimatePresence>
      <footer className="border-t border-border pt-3 text-xs text-muted-fg">
        Generated <span className="num">{fmt(data.generatedOn)}</span> · Program data verified as of <span className="num">{fmt(data.oldestVerified)}</span> · {data.disclaimer}
      </footer>
    </article>
  );
}
