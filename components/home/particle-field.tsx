'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
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
  useEffect(() => {
    const observer = new MutationObserver(() => setColours(readLiftColours()));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => observer.disconnect();
  }, []);
  const options = useMemo(() => heroParticleOptions({ compact, colours }), [compact, colours]);
  // Stable, so <Particles> does not reload the container when `shown` changes.
  const loaded = useCallback(async () => setShown(true), []);
  return (
    <ParticlesProvider init={init}>
      <Particles
        key={colours.join()}
        id="hero-particles"
        options={options}
        particlesLoaded={loaded}
        className={cn('absolute inset-0 transition-opacity duration-700', shown ? 'opacity-100' : 'opacity-0')}
      />
    </ParticlesProvider>
  );
}
