import type { CreateTypes, Options } from 'canvas-confetti';
import type { Stage } from '@/lib/plan/applications';
import { prefersReducedMotion } from '@/lib/motion';
import { toast, type ToastAction } from '@/lib/toast';
// This module imports the workspace store, so call cheer() and burst() from components only, never
// from lib/store/* or lib/plan/* (the store would then import itself through this file).
import { useWorkspace } from '@/lib/store/use-workspace';

export type BurstKind = 'results' | 'submitted' | 'awarded' | 'goals-done';
export type Cheer = { message: string; action?: ToastAction; burst?: BurstKind };
export type Origin = { x: number; y: number };

/**
 * Confetti colours: amber, sage and sky, the highlight tones (--hl-amber, --hl-sage, --hl-sky) of both
 * themes, each once; they are the same in light and dark (Billabong design doc, section 8). Hex values
 * are fine here: canvas-confetti needs literal colours and this is not component styling. Keep in step
 * with app/globals.css (tests/lib/tokens.test.ts checks it).
 */
export const CONFETTI_COLOURS = ['#f2a93b', '#9cc5a1', '#7fb3d5'];

const BURSTS: Record<BurstKind, Options[]> = {
  results: [{ particleCount: 90, spread: 70, startVelocity: 38 }],
  submitted: [{ particleCount: 50, spread: 55, startVelocity: 30 }],
  'goals-done': [{ particleCount: 40, spread: 50, startVelocity: 26 }],
  awarded: [
    { particleCount: 110, angle: 60, spread: 65, startVelocity: 55, origin: { x: 0, y: 0.75 } },
    { particleCount: 110, angle: 120, spread: 65, startVelocity: 55, origin: { x: 1, y: 0.75 } },
  ],
};

const fired = new Set<string>();
/** The workspace's updatedAt when the wizard last finished, until Results reads it; null if not. */
let assessmentFinished: string | null = null;
let fire: CreateTypes | undefined;
let canvas: HTMLCanvasElement | undefined;

/**
 * The confetti function, drawing on one full-screen canvas that is hidden from assistive technology
 * and never takes clicks. Created on first use and kept for later bursts.
 */
async function confettiInstance(): Promise<CreateTypes> {
  if (fire) return fire;
  const { default: confetti } = await import('canvas-confetti');
  if (fire) return fire;
  canvas = document.createElement('canvas');
  canvas.setAttribute('aria-hidden', 'true');
  Object.assign(canvas.style, { position: 'fixed', inset: '0', width: '100%', height: '100%', pointerEvents: 'none', zIndex: '60' });
  document.body.appendChild(canvas);
  fire = confetti.create(canvas, { resize: true, disableForReducedMotion: true });
  return fire;
}

/** Fires a burst unless the user turned Celebrations off or prefers reduced motion. */
export async function burst(kind: BurstKind, origin?: Origin): Promise<void> {
  if (!useWorkspace.getState().ws.settings.celebrations || prefersReducedMotion()) return;
  try {
    const confetti = await confettiInstance();
    for (const options of BURSTS[kind]) {
      // `...options` comes last so the award bursts keep their own side origins.
      void confetti({
        colors: CONFETTI_COLOURS, ticks: 180, scalar: 0.9, disableForReducedMotion: true,
        ...(origin && kind !== 'awarded' ? { origin } : { origin: { y: 0.6 } }),
        ...options,
      });
    }
  } catch {
    // Confetti is decoration: if its code fails to load (offline, a new deploy), the message has
    // already shown, so carry on without it.
  }
}

/** Shows a milestone message (and burst) once per key in this session, e.g. `${appId}:submitted`. */
export async function cheer(key: string, { message, action, burst: kind }: Cheer, origin?: Origin): Promise<void> {
  if (fired.has(key)) return;
  fired.add(key);
  toast(message, action);
  if (kind) await burst(kind, origin);
}

/** Where an element's centre sits in the viewport, as confetti's 0–1 origin. */
export function originOf(el: Element | null | undefined): Origin | undefined {
  if (!el || typeof window === 'undefined') return undefined;
  const r = el.getBoundingClientRect();
  return { x: (r.left + r.width / 2) / window.innerWidth, y: (r.top + r.height / 2) / window.innerHeight };
}

/**
 * Set by the wizard's last step with the workspace's `updatedAt`; read once by Results so
 * revisiting Results does not celebrate. The stamp keys the cheer, so finishing a changed
 * assessment later in the session cheers again, while finishing the same answers twice does not.
 */
export const markAssessmentFinished = (stamp = '') => { assessmentFinished = stamp; };
/** The finish stamp, once; null when the wizard has not finished since the last read. */
export function consumeAssessmentFinish(): string | null {
  const was = assessmentFinished;
  assessmentFinished = null;
  return was;
}
export const consumeAssessmentFinished = (): boolean => consumeAssessmentFinish() !== null;

/**
 * What moving an application to a stage says, or null when the move needs no message. Celebrations
 * get the Billabong voice (design doc, section 7): one joke, at most one exclamation mark, never about
 * money, eligibility or deadlines; the instruction after the joke stays plain.
 */
export function stageCheer(stage: Stage): Cheer | null {
  switch (stage) {
    case 'submitted': return { message: "Submitted! The hard part's done. Time for a cuppa.", burst: 'submitted' };
    case 'awarded': return { message: 'Awarded! The platypus is doing laps. Add the reporting dates to your calendar.', burst: 'awarded', action: { label: 'Open calendar', href: '/plan/?tab=calendar' } };
    // Kind and plain, no joke (Billabong design doc, section 7).
    case 'declined': return { message: 'Most funded startups applied more than once. See what else fits.', action: { label: 'See your results', href: '/assess/results/' } };
    default: return null;
  }
}

/** The Results cheer: confetti only when there is something to act on or prepare for. */
export function resultsCelebration(actNow: number, prepare: number): Cheer {
  const message = resultsCheer(actNow, prepare);
  return actNow + prepare > 0 ? { message, burst: 'results' } : { message };
}

/** The line shown when Results first opens after the assessment. The "nothing open" line stays plain: nothing to celebrate. */
export function resultsCheer(actNow: number, prepare: number): string {
  if (actNow > 0) return `Good news: ${actNow} ${actNow === 1 ? 'program' : 'programs'} you can act on now. Start with the one closing first.`;
  if (prepare > 0) return `${prepare} ${prepare === 1 ? 'program is' : 'programs are'} worth preparing for. Your plan starts here.`;
  return 'Nothing is open for you today. Watch the programs below for their next round.';
}

/** For tests. */
export function resetCelebrations() {
  fired.clear();
  assessmentFinished = null;
  fire = undefined;
  canvas?.remove();
  canvas = undefined;
}
