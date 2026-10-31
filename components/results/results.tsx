'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Check, ClipboardCheck, Pencil, Plus, Target } from 'lucide-react';
import type { Persona, Profile } from '@/lib/schema';
import { splitHighlight } from '@/lib/highlight';
import { PROGRAMS } from '@/content/programs';
import { assessAll, estimateFunding, type Track } from '@/lib/assess';
import { GROUP_INFO, TRACK_INFO, countedPrograms, groupsForTrack, type ResultGroup } from '@/lib/assessment/results';
import { DEFAULT_RESULTS, PERSONA_RESULTS, PERSONA_STARTER_GOALS, type PersonaResultsCopy } from '@/lib/personas';
import { DISCLAIMER } from '@/lib/copy';
import { cheer, consumeAssessmentFinish, consumeAssessmentFinished, originOf, resultsCelebration } from '@/lib/celebrate';
import { useNow } from '@/lib/use-now';
import { useStoredProfile, useWorkspace } from '@/lib/store/use-workspace';
import { cn } from '@/lib/cn';
import { Button, buttonClasses } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { focusRing } from '@/components/ui/focus-ring';
import { Highlight } from '@/components/ui/highlight';
import { Tabs } from '@/components/ui/tabs';
import { WINDOW_BAR, WINDOW_FRAME, WindowControls } from '@/components/ui/window';
import { Reveal } from '@/components/motion/reveal';
import { AssessmentRow } from './assessment-row';
import { FUNDING_SUMMARY_ID, FundingSummary } from './funding-summary';

const TRACKS: Track[] = ['funding', 'quick-wins'];

/**
 * Assessment results from the stored profile. Needs the loaded workspace and "now", so the static
 * HTML (and the first client render) is a skeleton.
 */
export function Results() {
  const ready = useWorkspace((s) => s.ready);
  const profile = useStoredProfile();
  const now = useNow();
  const empty = ready && now !== null && !profile;
  // The wizard can be left for this empty state; drop its finish flag, so answering later and
  // coming back without finishing does not celebrate.
  useEffect(() => { if (empty) consumeAssessmentFinished(); }, [empty]);
  if (!ready || !now) return <ResultsSkeleton />;
  if (!profile) {
    return (
      <div className="flex flex-col gap-6">
        <ResultsHeading copy={DEFAULT_RESULTS} />
        <EmptyState
          icon={ClipboardCheck}
          title="Nothing to sort yet"
          description="Answer six short steps and we'll sort every program into Act now, Prepare, Watch and Not a fit."
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

  // Right after the wizard's last step (not on later visits), cheer once per finished assessment.
  // The flag is read once, on mount; under Strict Mode the first run consumes it, so it fires once.
  useEffect(() => {
    const finished = consumeAssessmentFinish();
    if (finished === null) return;
    const count = (group: string) => assessments.filter((a) => a.group === group).length;
    void cheer(
      `results:${finished}`,
      resultsCelebration(count('act-now'), count('prepare')),
      originOf(document.getElementById(FUNDING_SUMMARY_ID)),
    );
    // On mount only: the flag is read once, and the counts are those Results first opened with.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex flex-col gap-8">
      <header className="flex max-w-3xl flex-col gap-3">
        <ResultsHeading copy={copy} />
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
              <span className="num font-normal text-muted-fg">{byTrack[t].reduce((n, g) => n + g.items.length, 0)}</span>
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

/**
 * The page's h1, with its one marker band (Billabong design doc, section 4) on the copy's phrase.
 * Exported for tests, which render it with their own copy rather than mutate the shared constants.
 */
export function ResultsHeading({ copy }: { copy: PersonaResultsCopy }) {
  const [before, phrase, after] = splitHighlight(copy.title, copy.highlight);
  return <h1 className="text-3xl">{before}{phrase && <Highlight>{phrase}</Highlight>}{after}</h1>;
}

function TrackView({ track, groups, inPlan, onAdd }: { track: Track; groups: ResultGroup[]; inPlan: Set<string | undefined>; onAdd: (slug: string) => void }) {
  return (
    <div className="flex flex-col gap-8">
      <p className="text-sm text-muted-fg">{TRACK_INFO[track].description}</p>
      {groups.map(({ group, items }, i) => {
        const id = `${track}-${group}`;
        return (
          <Reveal key={group} delay={i * 40}>
            <section aria-labelledby={id} className="flex flex-col gap-3">
              <div className="flex flex-col gap-0.5">
                <h2 id={id} className="flex items-baseline gap-2 text-xl">
                  {GROUP_INFO[group].label}{' '}
                  <span className="num text-base font-normal text-muted-fg">
                    {items.length}<span className="sr-only"> {items.length === 1 ? 'program' : 'programs'}</span>
                  </span>
                </h2>
                <p className="text-sm text-muted-fg">{GROUP_INFO[group].description}</p>
              </div>
              {items.length ? (
                // Each result is its own card (Billabong plan, Task 7); Not a fit cards are quiet.
                // role="list": Safari and VoiceOver drop a list's semantics when its list style is none.
                <ul role="list" className="flex flex-col gap-3">
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
          </Reveal>
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
                  <Button variant="secondary" aria-disabled="true">
                    <Check aria-hidden="true" size={16} strokeWidth={1.5} className="text-accent" />
                    Goal added
                  </Button>
                  <Link href="/plan/" className={cn('inline-flex min-h-11 items-center gap-1 rounded-sm text-sm text-accent underline-offset-4 hover:underline', focusRing)}>
                    View plan
                    <ArrowRight aria-hidden="true" size={16} strokeWidth={1.5} />
                  </Link>
                </>
              ) : (
                <Button variant="primary" onClick={() => addGoal({ title: g.title, source: 'persona' })}>
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
  // The heading and intro, the funding window's frame with its bar and glyphs, the tabs and result
  // cards, so the page does not jump when the workspace loads. A status, so "Loading your results" is
  // announced as text (a plain div cannot take an aria-label).
  return (
    <div role="status" aria-busy="true" className="flex flex-col gap-8">
      <span className="sr-only">Loading your results</span>
      <div aria-hidden="true" className="flex flex-col gap-8">
        <div className="flex max-w-3xl flex-col gap-3">
          <div className="h-9 w-72 max-w-full rounded bg-surface" />
          <div className="h-16 rounded bg-surface" />
        </div>
        <div className={cn(WINDOW_FRAME, 'border-border')}>
          <div className={WINDOW_BAR}>
            <div className="h-6 flex-1">
              <div className="h-full w-48 rounded bg-surface" />
            </div>
            <WindowControls />
          </div>
          <div className="h-36" />
        </div>
        <div className="h-11 w-64 max-w-full rounded bg-surface" />
        {[0, 1, 2].map((i) => <div key={i} className="h-28 rounded-lg border border-border bg-surface" />)}
      </div>
    </div>
  );
}
