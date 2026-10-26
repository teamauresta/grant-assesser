'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, ArrowRight, Check, CircleAlert } from 'lucide-react';
import { Persona, type Profile } from '@/lib/schema';
import { STEPS, STEP_COUNT, parseStep, visibleQuestions, type Step } from '@/lib/assessment/questions';
import { todayISO } from '@/lib/dates';
import { useNow } from '@/lib/use-now';
import { useWorkspace } from '@/lib/store/use-workspace';
import { Button } from '@/components/ui/button';
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
    <div className="flex max-w-2xl flex-col gap-8 max-md:pb-20">
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <p className="text-sm text-muted-fg">
            <span className="num font-mono">Step {step} of {STEP_COUNT}</span> · {info.title}
          </p>
          <SaveNote available={storageAvailable} />
        </div>
        <div aria-hidden="true" className="h-1 overflow-hidden rounded-full bg-border">
          <div className="h-full origin-left rounded-full bg-accent transition-transform duration-200" style={{ transform: `scaleX(${step / STEP_COUNT})` }} />
        </div>
      </div>

      <section aria-labelledby="step-heading" className="flex flex-col gap-8">
        <div className="flex flex-col gap-1">
          <h2 id="step-heading" ref={headingRef} tabIndex={-1} className="scroll-mt-24 text-2xl focus:outline-none">
            {info.title}
          </h2>
          <p className="text-muted-fg">{info.intro}</p>
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
      </section>

      {/* Mobile: a bar fixed just above the bottom navigation (56px + 1px border + safe area). */}
      <div className="z-30 border-border bg-bg max-md:fixed max-md:inset-x-0 max-md:bottom-[calc(3.5rem+1px+env(safe-area-inset-bottom))] max-md:border-t max-md:px-4 max-md:py-3 md:border-t md:pt-6">
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
            onClick={() => (last ? router.push('/assess/results/') : goTo(step + 1))}
          >
            {last ? 'See results' : 'Next'}
            <ArrowRight aria-hidden="true" size={16} strokeWidth={1.5} />
          </Button>
        </div>
      </div>
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
  return (
    <div aria-busy="true" aria-label="Loading your answers" className="flex max-w-2xl flex-col gap-8">
      <div className="flex flex-col gap-3">
        <div className="h-5 w-40 rounded bg-surface" />
        <div className="h-1 rounded-full bg-border" />
      </div>
      <div className="h-8 w-48 rounded bg-surface" />
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex flex-col gap-2">
          <div className="h-5 w-64 rounded bg-surface" />
          <div className="h-24 rounded-lg border border-border bg-surface" />
        </div>
      ))}
    </div>
  );
}
