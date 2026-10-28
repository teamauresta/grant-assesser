'use client';

import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type ComponentType } from 'react';
import { Pause, Play } from 'lucide-react';
import { readAuroraPaused, writeAuroraPaused } from '@/lib/aurora';
import { prefersReducedMotion } from '@/lib/motion';
import { cn } from '@/lib/cn';
import { focusRing } from '@/components/ui/focus-ring';

type Mode = 'pending' | 'still' | 'live';
type CanvasProps = { playing: boolean; onUnsupported: () => void; onLost: () => void };

const REDUCED = '(prefers-reduced-motion: reduce)';
/** A context lost this soon after a fresh canvas means WebGL is failing, not just a background tab. */
const LOSS_WINDOW_MS = 30_000;

/** Follows the reduced-motion setting, so turning it on mid-session stops the aurora and drops the button. */
function subscribe(onChange: () => void) {
  if (typeof window.matchMedia !== 'function') return () => {};
  const list = window.matchMedia(REDUCED);
  list.addEventListener?.('change', onChange);
  return () => list.removeEventListener?.('change', onChange);
}
const clientMode = (): Mode => (prefersReducedMotion() ? 'still' : 'live');
const serverMode = (): Mode => 'pending';

/**
 * Without WebGL: a still wash in the same stops. One layer, so no spot passes 14%, under both themes'
 * AURORA_ALPHA. Masked at the top and bottom like the shader, so the hero has no visible edge.
 */
function AuroraFallback() {
  return (
    <div
      data-aurora-fallback
      className="absolute inset-0 bg-[radial-gradient(70%_80%_at_80%_45%,color-mix(in_srgb,var(--lift-2)_14%,transparent),color-mix(in_srgb,var(--lift-3)_10%,transparent)_40%,transparent_75%)] [mask-image:linear-gradient(to_bottom,transparent,black_20%,black_70%,transparent)]"
    />
  );
}

/**
 * The hero's background. Nothing in the server HTML; on the client the aurora shader, loaded with
 * import() so it is not in the first download. It moves for as long as the page is open, so it has
 * a pause button (WCAG 2.2.2), remembered per browser. Under reduced motion it draws one still frame
 * and offers no button; without WebGL it shows a still gradient. A lost WebGL context (iOS drops
 * them in background tabs) gets a fresh canvas, once the tab is visible again; only a loss within
 * 30 seconds of a fresh canvas settles for the gradient.
 */
export function HeroAurora() {
  const mode = useSyncExternalStore(subscribe, clientMode, serverMode);
  const [Canvas, setCanvas] = useState<ComponentType<CanvasProps> | null>(null);
  const [unsupported, setUnsupported] = useState(false);
  const [failed, setFailed] = useState(false);
  // The canvas's key, and whether a lost one waits for the tab to come back before it is replaced.
  const [generation, setGeneration] = useState(0);
  const [waiting, setWaiting] = useState(false);
  const freshAt = useRef<number | null>(null);
  // Read once, lazily: safe for hydration because nothing that depends on it renders while the
  // mode is 'pending' (server and hydration), and blocked or missing storage reads as playing.
  const [paused, setPaused] = useState(readAuroraPaused);

  const pending = mode === 'pending';
  useEffect(() => {
    if (pending) return;
    let cancelled = false;
    import('./aurora-canvas').then(
      (m) => { if (!cancelled) setCanvas(() => m.default); },
      () => { if (!cancelled) setUnsupported(true); },
    );
    return () => { cancelled = true; };
  }, [pending]);

  const onUnsupported = useCallback(() => setUnsupported(true), []);
  const replace = useCallback(() => {
    freshAt.current = performance.now();
    setWaiting(false);
    setGeneration((n) => n + 1);
  }, []);
  const onLost = useCallback(() => {
    if (freshAt.current !== null && performance.now() - freshAt.current < LOSS_WINDOW_MS) setFailed(true);
    else if (document.visibilityState === 'visible') replace();
    else setWaiting(true);
  }, [replace]);
  useEffect(() => {
    if (!waiting) return;
    const onVisibility = () => { if (document.visibilityState === 'visible') replace(); };
    document.addEventListener('visibilitychange', onVisibility);
    // The tab may have come back before this effect ran.
    onVisibility();
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [waiting, replace]);
  const still = unsupported || failed;
  const toggle = () => {
    const next = !paused;
    writeAuroraPaused(next);
    setPaused(next);
  };

  return (
    <>
      {/* Full bleed: the hero sits in the 1120px column, the field spans the viewport. The page clips
          the overhang wherever this marker is (app/globals.css). */}
      <div data-hero-aurora aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-1/2 -z-10 w-screen -translate-x-1/2 overflow-hidden">
        {!pending && (still
          ? <AuroraFallback />
          : Canvas && !waiting && <Canvas key={generation} playing={mode === 'live' && !paused} onUnsupported={onUnsupported} onLost={onLost} />)}
      </div>
      {/* Outside the keyed canvas, so a remount after a lost context keeps the button and its focus. */}
      {mode === 'live' && Canvas && !still && (
        <button
          type="button"
          aria-pressed={paused}
          onClick={toggle}
          className={cn('absolute right-4 bottom-4 z-10 inline-flex size-11 items-center justify-center rounded-full border border-border bg-bg/80 text-muted-fg backdrop-blur-sm hover:text-fg', focusRing)}
        >
          {paused ? <Play aria-hidden="true" size={16} strokeWidth={1.5} /> : <Pause aria-hidden="true" size={16} strokeWidth={1.5} />}
          <span className="sr-only">Pause background animation</span>
        </button>
      )}
    </>
  );
}
