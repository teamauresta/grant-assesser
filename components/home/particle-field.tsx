'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Particles, { ParticlesProvider } from '@tsparticles/react';
import type { Engine } from '@tsparticles/engine';
import { loadSlim } from '@tsparticles/slim';
import { heroParticleOptions, readLiftColours } from '@/lib/hero-particles';
import { cn } from '@/lib/cn';

// Must be one stable function for the app's lifetime (ParticlesProvider throws otherwise).
const init = async (engine: Engine) => {
  await loadSlim(engine);
};

const isCompact = () => window.matchMedia('(max-width: 47.99rem), (pointer: coarse)').matches;

/** The live hero field. Only ever loaded by import() from HeroParticles. */
export default function ParticleField() {
  const [colours, setColours] = useState(readLiftColours);
  const [compact] = useState(isCompact);
  const [shown, setShown] = useState(false);
  const current = useRef(colours);
  useEffect(() => {
    const observer = new MutationObserver(() => {
      const next = readLiftColours();
      if (next.join() === current.current.join()) return;
      current.current = next;
      // Hide while the container reloads in the new colours, so they fade in as on first load.
      setShown(false);
      setColours(next);
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => observer.disconnect();
  }, []);
  const options = useMemo(() => heroParticleOptions({ compact, colours }), [compact, colours]);
  // Stable, so <Particles> does not reload the container when `shown` changes.
  const loaded = useCallback(async () => setShown(true), []);
  return (
    <ParticlesProvider init={init}>
      {/* No key: <Particles> reloads its container whenever `options` changes. */}
      <Particles
        id="hero-particles"
        options={options}
        particlesLoaded={loaded}
        className={cn('absolute inset-0 transition-opacity duration-700', shown ? 'opacity-100' : 'opacity-0')}
      />
    </ParticlesProvider>
  );
}
