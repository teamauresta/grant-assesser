/** True when the user's device asks for reduced motion. False on the server. */
export function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

const easeOut = (t: number) => 1 - (1 - t) ** 3;

/** Animates a number with requestAnimationFrame (ease-out). Returns a cancel function. */
export function tween(from: number, to: number, ms: number, onUpdate: (value: number) => void): () => void {
  let start: number | undefined;
  let frame = 0;
  const step = (t: number) => {
    start ??= t;
    const p = ms > 0 ? Math.min(1, (t - start) / ms) : 1;
    onUpdate(p === 1 ? to : from + (to - from) * easeOut(p));
    if (p < 1) frame = requestAnimationFrame(step);
  };
  frame = requestAnimationFrame(step);
  return () => cancelAnimationFrame(frame);
}
