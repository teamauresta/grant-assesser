'use client';

import { useId, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { ArrowRight, Ban, Check, ChevronDown, Plus } from 'lucide-react';
import { blockingGate, type Assessment } from '@/lib/assess';
import type { Dims } from '@/lib/scoring';
import { firstIssue, gateSummaryText, summariseGates } from '@/lib/assessment/results';
import { formatBenefit } from '@/lib/format';
import { cn } from '@/lib/cn';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { focusRing } from '@/components/ui/focus-ring';
import { StatusPill } from '@/components/ui/status-pill';
import { GateRow } from '@/components/programs/eligibility-list';

const DIMENSIONS: { key: keyof Dims; label: string; help: string }[] = [
  { key: 'funding', label: 'Funding', help: 'How much money or credit it can bring' },
  { key: 'probability', label: 'Probability', help: 'Your chance of success, from the checks below' },
  { key: 'effort', label: 'Effort', help: 'How easy it is to apply; higher means less work' },
  { key: 'value', label: 'Value', help: 'What it is worth beyond the money' },
  { key: 'speed', label: 'Speed', help: 'How soon the benefit arrives' },
];

const fmt = (n: number) => String(Number(n.toFixed(2)));

export type AssessmentRowProps = {
  assessment: Assessment;
  inPlan: boolean;
  onAdd: () => void;
};

/**
 * A text-style toggle for a panel shown below the row's toolbar. `muted` draws it in --muted-fg (--fg on
 * hover), for Not a fit cards.
 */
function PanelToggle({ open, controls, onToggle, muted = false, children }: { open: boolean; controls: string; onToggle: () => void; muted?: boolean; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-expanded={open}
      aria-controls={controls}
      onClick={onToggle}
      className={cn('inline-flex min-h-11 items-center gap-1.5 rounded-md text-sm font-medium', muted ? 'text-muted-fg hover:text-fg' : 'text-fg hover:text-accent', focusRing)}
    >
      {children}
      <ChevronDown aria-hidden="true" size={16} className={cn('shrink-0 text-muted-fg transition-transform duration-150', open && 'rotate-180')} />
    </button>
  );
}

/**
 * One program in the results, as a card: status, benefit, score with its breakdown, checks, and Add to
 * pipeline. Not a fit cards are quiet (no fill, a dashed --border-strong outline, muted text and
 * toggles, a ghost Add button) and keep their status pill at full strength and their reason in --fg.
 */
export function AssessmentRow({ assessment: a, inPlan, onAdd }: AssessmentRowProps) {
  const { program: p, score, gates, status } = a;
  const notFit = a.group === 'not-a-fit';
  const blocker = notFit ? blockingGate(gates) : undefined;
  const issue = a.group === 'prepare' ? firstIssue(gates) : undefined;
  const summary = summariseGates(gates);
  const id = `row-${useId().replace(/[^a-zA-Z0-9-]/g, '')}`;
  const [showWhy, setShowWhy] = useState(false);
  const [showChecks, setShowChecks] = useState(false);

  return (
    <Card as="li" emphasis={notFit ? 'quiet' : 'default'} className={cn('flex flex-col gap-3', notFit && 'text-muted-fg')}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-1.5">
          <h3 className={cn('text-base leading-snug', notFit && 'font-medium')}>
            <Link href={`/programs/${p.slug}/`} className={cn('rounded-sm underline-offset-4 hover:underline', focusRing)}>
              {p.name}
            </Link>
          </h3>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <StatusPill declared={p.status.state} derived={status.state} daysToClose={status.daysToClose} />
            <span className="num text-sm">{formatBenefit(p.benefit)}</span>
          </div>
        </div>
        <p className="shrink-0 text-right">
          <span className="sr-only">Score </span>
          <span className={cn('num text-xl font-semibold', notFit ? 'text-muted-fg' : 'text-fg')}>{score.total}</span>
          <span className="num text-sm text-muted-fg">/100</span>
        </p>
      </div>

      {blocker && (
        <p className="flex items-start gap-1.5 text-sm text-fg">
          <Ban aria-hidden="true" size={16} className="mt-[3px] shrink-0" />
          <span><span className="font-medium">Not a fit:</span> {blocker.reason}</span>
        </p>
      )}
      {issue && (
        <p className="flex items-start gap-1.5 text-sm text-fg">
          <ArrowRight aria-hidden="true" size={16} className="mt-[3px] shrink-0 text-muted-fg" />
          <span>
            <span className="font-medium">{issue.result === 'unknown' ? 'To check:' : 'To fix:'}</span> {issue.reason}
            {issue.fix && <>. {issue.fix}</>}
          </span>
        </p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-1">
        <div className="flex flex-wrap items-center gap-x-6">
          <PanelToggle muted={notFit} open={showWhy} controls={`${id}-why`} onToggle={() => setShowWhy((v) => !v)}>
            Why?<span className="sr-only"> How the score for {p.name} is worked out</span>
          </PanelToggle>
          <PanelToggle muted={notFit} open={showChecks} controls={`${id}-checks`} onToggle={() => setShowChecks((v) => !v)}>
            {gateSummaryText(summary)}<span className="sr-only"> for {p.name}</span>
          </PanelToggle>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          {inPlan ? (
            <>
              <Link href="/plan/" className={cn('inline-flex min-h-11 items-center gap-1 rounded-sm text-sm text-accent underline-offset-4 hover:underline', focusRing)}>
                View plan
                <ArrowRight aria-hidden="true" size={16} />
              </Link>
              <Button variant="secondary" aria-disabled="true">
                <Check aria-hidden="true" size={16} className="text-accent" />
                In your plan
              </Button>
            </>
          ) : (
            <Button variant={notFit ? 'ghost' : 'secondary'} onClick={onAdd}>
              <Plus aria-hidden="true" size={16} />
              Add to pipeline
              <span className="sr-only">: {p.name}</span>
            </Button>
          )}
        </div>
      </div>

      <div id={`${id}-why`} hidden={!showWhy} className="text-fg">
        {showWhy && <ScoreBreakdown assessment={a} />}
      </div>
      <div id={`${id}-checks`} hidden={!showChecks} className="text-fg">
        {showChecks && (gates.length > 0 ? (
          <ul className="divide-y divide-border rounded-lg border border-border bg-bg">
            {gates.map((g, i) => <GateRow key={i} label={g.label} severity={g.severity} result={g} />)}
          </ul>
        ) : (
          <p className="text-sm text-muted-fg">Read the official guidelines before applying.</p>
        ))}
      </div>
    </Card>
  );
}

function ScoreBreakdown({ assessment: { score } }: { assessment: Assessment }) {
  return (
    <div className="flex flex-col gap-3 pb-1 text-sm">
      <p className="text-muted-fg">
        Each dimension is rated 0 to 5, multiplied by its weight for your persona, and averaged to a score out of 100.
      </p>
      <table className="w-full max-w-md border-collapse text-left">
        <thead>
          <tr className="border-b border-border text-xs text-muted-fg">
            <th scope="col" className="py-1.5 pr-3 font-medium">Dimension</th>
            <th scope="col" className="py-1.5 pr-3 text-right font-medium">Rating</th>
            <th scope="col" className="py-1.5 text-right font-medium">Weight</th>
          </tr>
        </thead>
        <tbody>
          {DIMENSIONS.map((d) => (
            <tr key={d.key} className="border-b border-border last:border-0">
              <th scope="row" className="py-1.5 pr-3 font-normal">
                <span className="font-medium">{d.label}</span>
                <span className="block text-xs text-muted-fg">{d.help}</span>
              </th>
              <td className="num py-1.5 pr-3 text-right align-top">{fmt(score.dims[d.key])}/5</td>
              <td className="num py-1.5 text-right align-top">×{fmt(score.weights[d.key])}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {score.notes.length > 0 && (
        <ul className="flex list-disc flex-col gap-1 pl-5 marker:text-muted-fg">
          {score.notes.map((n) => <li key={n}>{n}</li>)}
        </ul>
      )}
    </div>
  );
}
