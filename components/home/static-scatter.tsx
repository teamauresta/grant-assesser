import { cn } from '@/lib/cn';

type Dash = { x1: number; y1: number; x2: number; y2: number; stroke: string; opacity: number };

const COUNT = 60;
const STROKES = ['var(--lift-1)', 'var(--lift-2)', 'var(--lift-3)'];

/** mulberry32: a tiny seeded PRNG, so the scatter is identical on the server and the client. */
function seeded(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const round = (n: number) => Math.round(n * 10) / 10;

/** Fixed dashes in a 1200 × 600 box, computed once at module load. */
const DASHES: Dash[] = (() => {
  const rand = seeded(20261027);
  return Array.from({ length: COUNT }, (_, i) => {
    const x = rand() * 1200;
    const y = rand() * 600;
    const half = 5 + rand() * 6;
    const angle = rand() * Math.PI;
    const dx = Math.cos(angle) * half;
    const dy = Math.sin(angle) * half;
    return {
      x1: round(x - dx), y1: round(y - dy), x2: round(x + dx), y2: round(y + dy),
      stroke: STROKES[i % STROKES.length],
      opacity: round(0.35 + rand() * 0.45),
    };
  });
})();

/**
 * A still scatter of short dashes in the Liftoff colours: the hero background under reduced
 * motion, and (with `drift`) a slow CSS drift for the dark panel. Decorative only.
 */
export function StaticScatter({ drift = false, className }: { drift?: boolean; className?: string }) {
  return (
    <svg
      data-hero-static=""
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 1200 600"
      preserveAspectRatio="xMidYMid slice"
      className={cn('absolute inset-0 size-full', drift && 'animate-[drift_30s_linear_infinite_alternate]', className)}
    >
      {DASHES.map((d, i) => (
        <line key={i} x1={d.x1} y1={d.y1} x2={d.x2} y2={d.y2} stroke={d.stroke} strokeOpacity={d.opacity} strokeWidth={2} strokeLinecap="round" />
      ))}
    </svg>
  );
}
