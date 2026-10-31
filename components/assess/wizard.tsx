'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, ArrowRight, Check, CircleAlert } from 'lucide-react';
import { Persona, type Profile } from '@/lib/schema';
import { STEPS, STEP_COUNT, parseStep, visibleQuestions, type Step } from '@/lib/assessment/questions';
import { todayISO } from '@/lib/dates';
import { useNow } from '@/lib/use-now';
import { useHeightVar } from '@/lib/use-height-var';
import { useWorkspace } from '@/lib/store/use-workspace';
import { markAssessmentFinished } from '@/lib/celebrate';
import { hasAnswers } from '@/lib/profile';
import { cn } from '@/lib/cn';
import { Button } from '@/components/ui/button';
import { WINDOW_BAR, WINDOW_FRAME, Window, WindowControls } from '@/components/ui/window';
import { Question } from './question';

/**
 * The six-step self-assessment. The step lives in `?step=` so Back/Forward and reloads keep it;
 * answers go straight to the workspace store, which saves them in this browser.
 */
export function Wizard() {
  return (
    <Suspense fallback={<WizardSkeleton />}>
      <UrlWizard />
    </Suspense>
  );
}

function UrlWizard() {
  const params = useSearchParams();
  const step = parseStep(params.get('step'));
  const personaParam = Persona.safeParse(params.get('persona'));
  const ready = useWorkspace((s) => s.ready);
  const hasPersona = useWorkspace((s) => s.ws.profile.persona !== undefined);
  const setProfile = useWorkspace((s) => s.setProfile);
  const now = useNow();

  // The home page stores the persona on click, but the store may not have loaded yet; the query
  // parameter makes sure the choice survives. A persona already stored wins.
  const wanted = personaParam.success ? personaParam.data : undefined;
  useEffect(() => {
    if (ready && wanted && !hasPersona) setProfile({ persona: wanted });
  }, [ready, wanted, hasPersona, setProfile]);

  if (!ready || !now) return <WizardSkeleton />;
  return <WizardView step={step} today={todayISO(now)} />;
}

function WizardView({ step, today }: { step: Step; today: string }) {
  const router = useRouter();
  const profile = useWorkspace((s) => s.ws.profile);
  const storageAvailable = useWorkspace((s) => s.storageAvailable);
  const setProfile = useWorkspace((s) => s.setProfile);
  const [unsure, setUnsure] = useState<ReadonlySet<keyof Profile>>(() => new Set());
  const headingRef = useRef<HTMLHeadingElement>(null);
  const shownStep = useRef(step);
  // Enlarged text makes the phone footer taller than its default: what keeps fields clear of it
  // (scroll-padding-bottom, the bottom padding below) follows its real height.
  const footerRef = useRef<HTMLDivElement>(null);
  useHeightVar(footerRef, '--wizard-footer-h');

  // Move focus to the new step's heading (not on first load), so keyboard and screen reader users
  // start at the top of the new questions.
  useEffect(() => {
    if (shownStep.current === step) return;
    shownStep.current = step;
    window.scrollTo({ top: 0 });
    headingRef.current?.focus({ preventScroll: true });
  }, [step]);

  const info = STEPS[step - 1];
  const questions = visibleQuestions(step, profile);
  const last = step === STEP_COUNT;

  const goTo = (next: number) => {
    // Next.js keeps useSearchParams in sync with native history calls. Push, so the browser's Back
    // button steps back through the wizard.
    window.history.pushState(null, '', `?step=${next}`);
  };

  const markUnsure = (id: keyof Profile, on: boolean) =>
    setUnsure((prev) => {
      if (prev.has(id) === on) return prev;
      const next = new Set(prev);
      if (on) next.add(id); else next.delete(id);
      return next;
    });

  return (
    <div className="flex max-w-2xl flex-col max-md:pb-[calc(var(--wizard-footer-h)+1rem)]">
      {/* One window, titled with the step (design doc section 11, Task 6): the title is the step
          heading that takes focus on Next and Back, and the text equivalent of the progress bar. */}
      <Window
        title={<><span className="num">Step {step} of {STEP_COUNT}</span>: {info.title}</>}
        titleSize="md"
        headingRef={headingRef}
        headingProps={{ tabIndex: -1 }}
      >
        <div className="flex flex-col gap-8">
          <div className="flex flex-col gap-3">
            {/* The only coloured bar on the page, a progress indicator. Hidden from assistive tech:
                the title says the same in words. The track is --border, so its empty part still shows
                on the --surface body (--neutral-bg nearly vanishes there). */}
            <div data-wizard-progress aria-hidden="true" className="h-2 overflow-hidden rounded-full bg-border">
              <div className="h-full origin-left rounded-full bg-primary transition-transform duration-200" style={{ transform: `scaleX(${step / STEP_COUNT})` }} />
            </div>
            <p className="text-muted-fg">{info.intro}</p>
            <SaveNote available={storageAvailable} />
          </div>

          {/* Keyed by step so each step's drafts start from the stored answers. */}
          <div key={step} className="flex flex-col gap-8">
            {questions.map((q) => (
              <Question
                key={q.id}
                question={q}
                profile={profile}
                onAnswer={setProfile}
                unsure={unsure.has(q.id)}
                onUnsureChange={(on) => markUnsure(q.id, on)}
                today={today}
              />
            ))}
          </div>

          {/* Mobile: a bar fixed on top of the bottom navigation's band (--bottom-bar-h), at least
              --wizard-footer-min-h tall: with enlarged text its button grows, and the bar grows upwards
              rather than under the nav. Its measured height is --wizard-footer-h, which app/globals.css
              uses to keep focused fields clear of both (scroll-padding-bottom). From md up it is the
              window's last row. */}
          <div ref={footerRef} data-wizard-footer className="z-30 border-border bg-bg max-md:fixed max-md:inset-x-0 max-md:bottom-(--bottom-bar-h) max-md:min-h-(--wizard-footer-min-h) max-md:border-t max-md:px-4 max-md:py-3 md:border-t md:bg-transparent md:pt-6">
            <div className="mx-auto flex max-w-2xl gap-3 md:mx-0">
              {step > 1 && (
                <Button variant="secondary" className="max-md:flex-1" onClick={() => goTo(step - 1)}>
                  <ArrowLeft aria-hidden="true" size={16} strokeWidth={1.5} />
                  Back
                </Button>
              )}
              <Button
                variant="primary"
                className="max-md:flex-1"
                onClick={() => {
                  if (!last) return goTo(step + 1);
                  // Results celebrates once when it opens straight after this, if there is anything to
                  // show (without answers it shows "Take the assessment first").
                  if (hasAnswers(profile)) markAssessmentFinished(useWorkspace.getState().ws.updatedAt);
                  router.push('/assess/results/');
                }}
              >
                {last ? 'See results' : 'Next'}
                <ArrowRight aria-hidden="true" size={16} strokeWidth={1.5} />
              </Button>
            </div>
          </div>
        </div>
      </Window>
    </div>
  );
}

function SaveNote({ available }: { available: boolean }) {
  if (!available) {
    return (
      <p className="flex items-center gap-1.5 text-sm text-danger">
        <CircleAlert aria-hidden="true" size={16} strokeWidth={1.5} />
        This browser is blocking storage, so answers are lost when you close the tab.
      </p>
    );
  }
  return (
    <p className="flex items-center gap-1.5 text-sm text-muted-fg">
      <Check aria-hidden="true" size={16} strokeWidth={1.5} />
      Answers save in this browser as you go
    </p>
  );
}

function WizardSkeleton() {
  // The window's frame, bar and glyphs, the progress track, the intro and save-note lines, and cards
  // like the real ones, so the page does not jump when the answers load. A status, so "Loading your
  // answers" is announced as text (a plain div cannot take an aria-label).
  return (
    <div role="status" aria-busy="true" className={cn(WINDOW_FRAME, 'max-w-2xl border-border')}>
      <span className="sr-only">Loading your answers</span>
      <div aria-hidden="true">
        <div className={WINDOW_BAR}>
          <div className="h-6 flex-1">
            <div className="h-full w-48 rounded bg-surface" />
          </div>
          <WindowControls />
        </div>
        <div className="flex flex-col gap-8 p-4 md:p-6">
          <div className="flex flex-col gap-3">
            <div className="h-2 rounded-full bg-border" />
            <div className="h-6 w-72 max-w-full rounded bg-neutral-bg" />
            <div className="h-5 w-56 max-w-full rounded bg-neutral-bg" />
          </div>
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex flex-col gap-2">
              <div className="h-5 w-64 max-w-full rounded bg-neutral-bg" />
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <div className="h-11 rounded-lg border border-border-strong bg-surface" />
                <div className="h-11 rounded-lg border border-border-strong bg-surface" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
