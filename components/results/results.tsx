'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Check, ClipboardCheck, Pencil, Plus, Target } from 'lucide-react';
import type { Persona, Profile } from '@/lib/schema';
import { PROGRAMS } from '@/content/programs';
import { assessAll, estimateFunding, type Track } from '@/lib/assess';
import { GROUP_INFO, TRACK_INFO, countedPrograms, groupsForTrack, type ResultGroup } from '@/lib/assessment/results';
import { DEFAULT_RESULTS, PERSONA_RESULTS, PERSONA_STARTER_GOALS } from '@/lib/personas';
import { useNow } from '@/lib/use-now';
import { useStoredProfile, useWorkspace } from '@/lib/store/use-workspace';
import { cn } from '@/lib/cn';
import { Button, buttonClasses } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { focusRing } from '@/components/ui/focus-ring';
import { Tabs } from '@/components/ui/tabs';
import { AssessmentRow } from './assessment-row';
import { FundingSummary } from './funding-summary';

const TRACKS: Track[] = ['funding', 'quick-wins'];

export const DISCLAIMER = "General information, not financial or tax advice. Check each program's official guidelines before applying.";

/**
 * Assessment results from the stored profile. Needs the loaded workspace and "now", so the static
 * HTML (and the first client render) is a skeleton.
 */
export function Results() {
  const ready = useWorkspace((s) => s.ready);
  const profile = useStoredProfile();
  const now = useNow();
  if (!ready || !now) return <ResultsSkeleton />;
  if (!profile) {
    return (
      <div className="flex flex-col gap-6">
        <h1 className="text-3xl">Your results</h1>
        <EmptyState
          icon={ClipboardCheck}
          title="Take the assessment first"
          description="Answer six short steps and we will sort every program into Act now, Prepare, Watch and Not a fit."
          action={<Link href="/assess/" className={buttonClasses({ variant: 'primary' })}>Start the assessment<ArrowRight aria-hidden="true" size={16} strokeWidth={1.5} /></Link>}
        />
      </div>
    );
  }
  return <ResultsView profile={profile} now={now} />;
}

function ResultsView({ profile, now }: { profile: Profile; now: Date }) {
  const copy = profile.persona ? PERSONA_RESULTS[profile.persona] : DEFAULT_RESULTS;
  const [track, setTrack] = useState<Track>(copy.defaultTrack);
  const assessments = useMemo(() => assessAll(PROGRAMS, profile, now), [profile, now]);
  const estimate = useMemo(() => estimateFunding(assessments, profile), [assessments, profile]);
  const counted = useMemo(() => countedPrograms(estimate, PROGRAMS), [estimate]);
  const pipeline = useWorkspace((s) => s.ws.pipeline);
  const addApplication = useWorkspace((s) => s.addApplication);
  const inPlan = useMemo(() => new Set(pipeline.map((a) => a.programSlug)), [pipeline]);
  const byTrack = useMemo(
    () => Object.fromEntries(TRACKS.map((t) => [t, groupsForTrack(assessments, t)])) as Record<Track, ResultGroup[]>,
    [assessments],
  );

  return (
    <div className="flex flex-col gap-8">
      <header className="flex max-w-3xl flex-col gap-3">
        <h1 className="text-3xl">{copy.title}</h1>
        <p className="text-muted-fg">{copy.intro}</p>
        <Link href="/assess/" className={cn('inline-flex min-h-11 items-center gap-1.5 self-start rounded-sm text-sm text-accent underline-offset-4 hover:underline', focusRing)}>
          <Pencil aria-hidden="true" size={16} strokeWidth={1.5} />
          Edit your answers
        </Link>
      </header>

      <div className="flex flex-col gap-2">
        <FundingSummary estimate={estimate} counted={counted} />
        <p className="text-xs text-muted-fg">{DISCLAIMER}</p>
      </div>

      {profile.persona && <StarterGoals persona={profile.persona} />}

      <Tabs
        label="Result tracks"
        value={track}
        onValueChange={setTrack}
        tabs={TRACKS.map((t) => ({
          value: t,
          label: (
            <>
              {TRACK_INFO[t].label}{' '}
              <span className="num font-mono font-normal text-muted-fg">{byTrack[t].reduce((n, g) => n + g.items.length, 0)}</span>
            </>
          ),
          content: (
            <TrackView
              track={t}
              groups={byTrack[t]}
              inPlan={inPlan}
              onAdd={(slug) => addApplication(slug)}
            />
          ),
        }))}
      />
    </div>
  );
}

function TrackView({ track, groups, inPlan, onAdd }: { track: Track; groups: ResultGroup[]; inPlan: Set<string | undefined>; onAdd: (slug: string) => void }) {
  return (
    <div className="flex flex-col gap-8">
      <p className="text-sm text-muted-fg">{TRACK_INFO[track].description}</p>
      {groups.map(({ group, items }) => {
        const id = `${track}-${group}`;
        return (
          <section key={group} aria-labelledby={id} className="flex flex-col gap-3">
            <div className="flex flex-col gap-0.5">
              <h2 id={id} className="flex items-baseline gap-2 text-xl">
                {GROUP_INFO[group].label}{' '}
                <span className="num font-mono text-base font-normal text-muted-fg">
                  {items.length}<span className="sr-only"> {items.length === 1 ? 'program' : 'programs'}</span>
                </span>
              </h2>
              <p className="text-sm text-muted-fg">{GROUP_INFO[group].description}</p>
            </div>
            {items.length ? (
              <ul className={cn('divide-y divide-border rounded-lg border border-border', group === 'not-a-fit' ? 'border-dashed' : 'bg-surface')}>
                {items.map((a) => (
                  <AssessmentRow
                    key={a.program.slug}
                    assessment={a}
                    inPlan={inPlan.has(a.program.slug)}
                    onAdd={() => onAdd(a.program.slug)}
                  />
                ))}
              </ul>
            ) : (
              <p className="rounded-lg border border-dashed border-border px-4 py-3 text-sm text-muted-fg">Nothing here for now.</p>
            )}
          </section>
        );
      })}
    </div>
  );
}

function StarterGoals({ persona }: { persona: Persona }) {
  const goals = useWorkspace((s) => s.ws.goals);
  const addGoal = useWorkspace((s) => s.addGoal);
  const starters = PERSONA_STARTER_GOALS[persona];
  if (!starters.length) return null;
  return (
    <section aria-labelledby="starter-goals-heading" className="flex flex-col gap-3">
      <h2 id="starter-goals-heading" className="text-xl">Suggested first goal</h2>
      {starters.map((g) => {
        const added = goals.some((x) => x.source === 'persona' && x.title === g.title);
        return (
          <Card key={g.title} className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex gap-3">
              <Target aria-hidden="true" size={20} strokeWidth={1.5} className="mt-0.5 shrink-0 text-accent" />
              <div className="flex flex-col gap-0.5">
                <p className="font-medium">{g.title}</p>
                <p className="text-sm text-muted-fg">{g.description}</p>
              </div>
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-1">
              {added ? (
                <>
                  <Button variant="secondary" aria-disabled="true" className="cursor-default">
                    <Check aria-hidden="true" size={16} strokeWidth={1.5} className="text-accent" />
                    Goal added
                  </Button>
                  <Link href="/plan/" className={cn('inline-flex min-h-11 items-center gap-1 rounded-sm text-sm text-accent underline-offset-4 hover:underline', focusRing)}>
                    View plan
                    <ArrowRight aria-hidden="true" size={16} strokeWidth={1.5} />
                  </Link>
                </>
              ) : (
                <Button variant="secondary" onClick={() => addGoal({ title: g.title, source: 'persona' })}>
                  <Plus aria-hidden="true" size={16} strokeWidth={1.5} />
                  Add goal
                </Button>
              )}
            </div>
          </Card>
        );
      })}
    </section>
  );
}

function ResultsSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading your results" className="flex flex-col gap-8">
      <div className="flex max-w-3xl flex-col gap-3">
        <div className="h-9 w-72 rounded bg-surface" />
        <div className="h-16 rounded bg-surface" />
      </div>
      <div className="h-36 rounded-lg border border-border bg-surface" />
      <div className="h-11 w-64 rounded bg-surface" />
      {[0, 1, 2].map((i) => <div key={i} className="h-28 rounded-lg border border-border bg-surface" />)}
    </div>
  );
}
