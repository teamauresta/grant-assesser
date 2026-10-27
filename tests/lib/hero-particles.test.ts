import { describe, it, expect } from 'vitest';
import { heroParticleOptions } from '@/lib/hero-particles';

const colours = ['#0f766e', '#2563eb', '#7c3aed'];

// tsParticles 4 moved particle colour and stroke under `paint`, and the hover events under the
// interactivity plugin's `interactivity` key; resize is a top-level option.
describe('heroParticleOptions', () => {
  it('uses 120 particles with cursor repulse on desktop', () => {
    const o = heroParticleOptions({ compact: false, colours });
    expect(o.particles.number.value).toBe(120);
    expect(o.interactivity.events.onHover.enable).toBe(true);
    expect(o.interactivity.events.onHover.mode).toBe('repulse');
  });
  it('uses 50 particles and no interaction on phones', () => {
    const o = heroParticleOptions({ compact: true, colours });
    expect(o.particles.number.value).toBe(50);
    expect(o.interactivity.events.onHover.enable).toBe(false);
  });
  it('stays inside its box, pauses when hidden and uses the given colours', () => {
    const o = heroParticleOptions({ compact: false, colours });
    expect(o.fullScreen).toEqual({ enable: false });
    expect(o.pauseOnBlur).toBe(true);
    expect(o.pauseOnOutsideViewport).toBe(true);
    expect(o.particles.paint.color.value).toEqual(colours);
  });
  it('draws short stroked dashes, not filled dots', () => {
    const o = heroParticleOptions({ compact: false, colours });
    expect(o.particles.shape.type).toBe('line');
    expect(o.particles.paint.stroke.width).toBeGreaterThan(0);
    expect(o.particles.paint.fill.enable).toBe(false);
  });
});
