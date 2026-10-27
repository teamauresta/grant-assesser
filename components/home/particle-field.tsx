'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Particles, { ParticlesProvider } from '@tsparticles/react';
import type { Container, Engine } from '@tsparticles/engine';
import { loadSlim } from '@tsparticles/slim';
import { heroParticleOptions, readLiftColours } from '@/lib/hero-particles';
import { particleIdle } from '@/lib/particle-idle';
import { cn } from '@/lib/cn';

// Must be one stable function for the app's lifetime (ParticlesProvider throws otherwise).
const init = async (engine: Engine) => {
  await loadSlim(engine);
};

const isCompact = () => window.matchMedia('(max-width: 47.99rem), (pointer: coarse)').matches;

/** True when the pointer is inside the element's box. */
const inside = (el: Element, e: PointerEvent) => {
  const r = el.getBoundingClientRect();
  return e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
};

/**
 * The live hero field. Only ever loaded by import() from HeroParticles.
 *
 * It settles 5 seconds after loading and moves again only while the pointer moves over the hero,
 * so nothing moves on its own for more than 5 seconds (WCAG 2.2.2). It also pauses while the hero
 * is out of view: tsParticles' own pauseOnOutsideViewport does nothing with `detectsOn: 'window'`.
 */
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
  const [idle] = useState(particleIdle);
  const area = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = area.current;
    if (!el) return;
    // The field never takes the pointer itself, so watch moves on the window, within its box.
    const onMove = (e: PointerEvent) => { if (inside(el, e)) idle.pointer(); };
    window.addEventListener('pointermove', onMove, { passive: true });
    const io = typeof IntersectionObserver === 'undefined'
      ? undefined
      : new IntersectionObserver(([entry]) => idle.setInView(entry.isIntersecting));
    io?.observe(el);
    return () => {
      window.removeEventListener('pointermove', onMove);
      io?.disconnect();
      idle.dispose();
    };
  }, [idle]);
  // Stable, so <Particles> does not reload the container when `shown` changes.
  const loaded = useCallback(async (container?: Container) => {
    if (container) idle.attach(container);
    setShown(true);
  }, [idle]);
  return (
    <div ref={area} className="absolute inset-0">
      <ParticlesProvider init={init}>
        {/* No key: <Particles> reloads its container whenever `options` changes. */}
        <Particles
          id="hero-particles"
          options={options}
          particlesLoaded={loaded}
          className={cn('absolute inset-0 transition-opacity duration-700', shown ? 'opacity-100' : 'opacity-0')}
        />
      </ParticlesProvider>
    </div>
  );
}
