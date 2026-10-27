import type { Options } from 'canvas-confetti';
import type { Stage } from '@/lib/plan/applications';
import { prefersReducedMotion } from '@/lib/motion';
import { toast, type ToastAction } from '@/lib/toast';
import { useWorkspace } from '@/lib/store/use-workspace';

export type BurstKind = 'results' | 'submitted' | 'awarded' | 'goals-done';
export type Cheer = { message: string; action?: ToastAction; burst?: BurstKind };
export type Origin = { x: number; y: number };

/**
 * Confetti colours: the Liftoff stops of both themes. Hex values are fine here: canvas-confetti
 * needs literal colours and this is not component styling. Keep in step with app/globals.css.
 */
export const LIFT_COLOURS = ['#0f766e', '#2563eb', '#7c3aed', '#2dd4bf', '#60a5fa', '#a78bfa'];

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
let assessmentFinished = false;

/** Fires a burst unless the user turned Celebrations off or prefers reduced motion. */
export async function burst(kind: BurstKind, origin?: Origin): Promise<void> {
  if (!useWorkspace.getState().ws.settings.celebrations || prefersReducedMotion()) return;
  const { default: confetti } = await import('canvas-confetti');
  for (const options of BURSTS[kind]) {
    // `...options` comes last so the award bursts keep their own side origins.
    void confetti({
      colors: LIFT_COLOURS, ticks: 180, scalar: 0.9, zIndex: 60, disableForReducedMotion: true,
      ...(origin && kind !== 'awarded' ? { origin } : { origin: { y: 0.6 } }),
      ...options,
    });
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

/** Set by the wizard's last step; read once by Results so revisiting Results does not celebrate. */
export const markAssessmentFinished = () => { assessmentFinished = true; };
export function consumeAssessmentFinished(): boolean {
  const was = assessmentFinished;
  assessmentFinished = false;
  return was;
}

/** What moving an application to a stage says, or null when the move needs no message. */
export function stageCheer(stage: Stage): Cheer | null {
  switch (stage) {
    case 'submitted': return { message: "Submitted. That's the hardest part done.", burst: 'submitted' };
    case 'awarded': return { message: 'Awarded. Add the reporting dates to your calendar.', burst: 'awarded', action: { label: 'Open calendar', href: '/plan/?tab=calendar' } };
    case 'declined': return { message: 'Most funded startups applied more than once. See what else fits.', action: { label: 'See your results', href: '/assess/results/' } };
    default: return null;
  }
}

/** The line shown when Results first opens after the assessment. */
export function resultsCheer(actNow: number, prepare: number): string {
  if (actNow > 0) return `${actNow} ${actNow === 1 ? 'program' : 'programs'} you can act on now. Start with the one closing first.`;
  if (prepare > 0) return `${prepare} ${prepare === 1 ? 'program is' : 'programs are'} worth preparing for. Your plan starts here.`;
  return 'Nothing is open for you today. Watch the programs below for their next round.';
}

/** For tests. */
export function resetCelebrations() {
  fired.clear();
  assessmentFinished = false;
}
