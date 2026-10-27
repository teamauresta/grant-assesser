/**
 * Reads a Tailwind arbitrary animation class, `animate-[name_<dur>s_<easing>_<count>...]`, and an
 * optional inline `animation-delay`, and returns how long the element visibly moves in seconds
 * (Infinity for `infinite`). A negative delay starts the animation part-way through, so it counts
 * off the total. WCAG 2.2.2: automatic motion must stop within 5 seconds without a pause control.
 */
export function visibleMotionSeconds(el: Element): number {
  const cls = [...el.classList].find((c) => c.startsWith('animate-['));
  if (!cls) return 0;
  const parts = cls.slice('animate-['.length, -1).split('_');
  if (parts.includes('infinite')) return Infinity;
  const token = parts.find((p) => /^[\d.]+m?s$/.test(p)) ?? '0s';
  const duration = parseFloat(token) / (token.endsWith('ms') ? 1000 : 1);
  const count = Number(parts.find((p) => /^\d+$/.test(p)) ?? 1);
  const delay = parseFloat((el as HTMLElement).style?.animationDelay || '0');
  return Math.max(0, duration * count + Math.min(0, delay)) + Math.max(0, delay);
}
