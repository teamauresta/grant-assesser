import type { ISourceOptions } from '@tsparticles/engine';

/**
 * tsParticles options for the home hero: short dashes in the Liftoff colours, drifting slowly.
 *
 * Written for tsParticles 4: colour, fill and stroke live under `particles.paint`; `size`,
 * `opacity` and `rotate` are read by the slim bundle's updaters; hover events belong to the
 * interactivity plugin; resize is a top-level option. `line` is one of the slim bundle's shapes and
 * draws a stroke of length 2 × size, so stroke width must be above zero for it to show.
 *
 * `satisfies ISourceOptions` checks only the engine's own keys (`fullScreen`, `paint`, `shape`,
 * `move`, ...). The engine types plugin keys (`size`, `opacity`, `rotate`, `interactivity`) as
 * `unknown`, and the plugin packages that type them are not direct dependencies, so those keys are
 * checked against the 4.5 sources by hand and by tests/lib/hero-particles.test.ts only.
 */
export function heroParticleOptions({ compact, colours }: { compact: boolean; colours: string[] }) {
  return {
    fullScreen: { enable: false },
    detectRetina: true,
    fpsLimit: 60,
    pauseOnBlur: true,
    // Has no effect with `detectsOn: 'window'` in 4.5; ParticleField pauses with its own IntersectionObserver.
    pauseOnOutsideViewport: true,
    resize: { enable: true },
    background: { color: 'transparent' },
    particles: {
      number: { value: compact ? 50 : 120 },
      paint: {
        color: { value: colours },
        fill: { enable: false },
        stroke: { width: 2 },
      },
      shape: { type: 'line', close: false, options: { line: { cap: 'round' } } },
      size: { value: { min: 3, max: 6 } },
      opacity: { value: { min: 0.35, max: 0.85 } },
      rotate: { value: { min: 0, max: 360 }, animation: { enable: true, speed: 2 } },
      move: { enable: true, speed: { min: 0.15, max: 0.5 }, direction: 'none', random: true, outModes: { default: 'out' } },
    },
    interactivity: {
      // Pointer moves are read on the document, so the field never needs pointer events itself.
      detectsOn: 'window',
      events: { onHover: { enable: !compact, mode: 'repulse' } },
      modes: { repulse: { distance: 110, duration: 0.6, speed: 0.4 } },
    },
  } satisfies ISourceOptions;
}

/** The current theme's Liftoff colours, read from the CSS variables. */
export function readLiftColours(): string[] {
  const style = getComputedStyle(document.documentElement);
  return ['--lift-1', '--lift-2', '--lift-3'].map((v) => style.getPropertyValue(v).trim());
}
