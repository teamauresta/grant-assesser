'use client';

import { useEffect, useState, useSyncExternalStore, type ComponentType } from 'react';
import { prefersReducedMotion } from '@/lib/motion';
import { StaticScatter } from './static-scatter';

type Mode = 'pending' | 'still' | 'live';

const noop = () => () => {};
const clientMode = (): Mode => (prefersReducedMotion() ? 'still' : 'live');
const serverMode = (): Mode => 'pending';

/**
 * The hero's background. Nothing in the server HTML; on the client a still scatter for reduced
 * motion, otherwise the particle field, loaded with import() so it is not in the first download.
 * Masked so the dashes gather towards the right, as on the reference design. The hero content
 * must sit above it (`relative z-10`), since on desktop it takes the pointer for repulse.
 */
export function HeroParticles() {
  const mode = useSyncExternalStore(noop, clientMode, serverMode);
  const [Field, setField] = useState<ComponentType | null>(null);
  useEffect(() => {
    if (mode !== 'live') return;
    let cancelled = false;
    void import('./particle-field').then((m) => { if (!cancelled) setField(() => m.default); });
    return () => { cancelled = true; };
  }, [mode]);
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 -z-10 overflow-hidden [mask-image:radial-gradient(ellipse_70%_80%_at_78%_45%,black_35%,transparent_80%)] md:pointer-events-auto"
    >
      {mode === 'still' && <StaticScatter />}
      {mode === 'live' && Field && <Field />}
    </div>
  );
}
