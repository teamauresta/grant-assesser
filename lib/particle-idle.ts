/**
 * When the hero's particle field may move (WCAG 2.2.2 Pause, Stop, Hide: automatic motion must stop
 * within 5 seconds unless there is a pause control).
 *
 * - A newly loaded container runs for SETTLE_MS, then pauses.
 * - Pointer movement over the hero is user-initiated: it plays the field, which pauses again once
 *   the pointer has been still for IDLE_MS. A move never cuts the first SETTLE_MS short.
 * - Out of view it is always paused; back in view it resumes only if one of the rules above allows.
 *
 * play() and pause() are called only when the wanted state changes: tsParticles' play() redraws
 * every time it is called.
 */
export const SETTLE_MS = 5_000;
export const IDLE_MS = 1_500;

export type Playable = { play(): void; pause(): void };

export function particleIdle() {
  let container: Playable | undefined;
  let playing = false;
  let inView = true;
  let active = false;
  let activeUntil = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;

  const apply = () => {
    if (!container) return;
    const want = inView && active;
    if (want === playing) return;
    playing = want;
    if (want) container.play();
    else container.pause();
  };

  /** Keeps the field allowed to move for at least `ms` from now. */
  const extend = (ms: number) => {
    const until = Date.now() + ms;
    if (until > activeUntil) {
      activeUntil = until;
      clearTimeout(timer);
      timer = setTimeout(() => { active = false; apply(); }, ms);
    }
    active = true;
    apply();
  };

  return {
    /** A container has loaded (first load or a reload): it is already running. */
    attach(c: Playable) {
      container = c;
      playing = true;
      activeUntil = 0;
      extend(SETTLE_MS);
    },
    /** The pointer moved over the hero. */
    pointer() {
      extend(IDLE_MS);
    },
    setInView(visible: boolean) {
      inView = visible;
      apply();
    },
    /**
     * Stops the timer and forgets the container (unmount). Not final: a later attach() starts
     * again, which keeps React's development double-run of effects harmless.
     */
    dispose() {
      clearTimeout(timer);
      container = undefined;
      active = false;
      activeUntil = 0;
    },
  };
}
