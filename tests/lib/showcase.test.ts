import { describe, it, expect } from 'vitest';
import { PROGRAMS } from '@/content/programs';
import { assessProgram, GROUP_ORDER } from '@/lib/assess';
import { ProfileSchema } from '@/lib/schema';
import { CHIP_SPAN, chipProgress, chipScatter, DEMO_PROFILE, sortStory } from '@/lib/showcase';
import { PERSONA_NOW, preRaiseVic } from '@/tests/fixtures/personas';

describe('DEMO_PROFILE', () => {
  it('is a valid pre-raise profile in Victoria', () => {
    expect(ProfileSchema.parse(DEMO_PROFILE)).toEqual(DEMO_PROFILE);
    expect(DEMO_PROFILE).toMatchObject({ persona: 'pre-raise', state: 'vic' });
  });

  // lib code cannot import the test fixture, so it keeps a copy; this keeps the two in step.
  it('is the preRaiseVic fixture', () => {
    expect(DEMO_PROFILE).toEqual(preRaiseVic);
  });
});

describe('sortStory', () => {
  const story = sortStory(PROGRAMS, PERSONA_NOW);

  it('puts every program in its real group, and counts the closed ones', () => {
    const placed = GROUP_ORDER.flatMap((g) => story.groups[g]);
    expect(placed.length + story.closed).toBe(PROGRAMS.length);
    for (const chip of placed) {
      const program = PROGRAMS.find((p) => p.slug === chip.slug)!;
      expect(assessProgram(program, DEMO_PROFILE, PERSONA_NOW).group).toBe(chip.group);
    }
  });

  // A data edit that moves a program changes these counts: check the move is right, then update.
  it('matches the reviewed split at PERSONA_NOW', () => {
    expect(Object.fromEntries(GROUP_ORDER.map((g) => [g, story.groups[g].length]))).toEqual({ 'act-now': 13, prepare: 4, watch: 9, 'not-a-fit': 3 });
    expect(story.closed).toBe(6);
  });
});

describe('chipScatter', () => {
  it('is the same for the same slug, so server, client and every visit agree', () => {
    expect(chipScatter('csiro-kick-start')).toEqual(chipScatter('csiro-kick-start'));
    expect(chipScatter('csiro-kick-start')).not.toEqual(chipScatter('rdti'));
  });
  it('stays within the stage: up to 22rem across, 13.2rem down or up, 12 degrees of tilt', () => {
    for (const { slug } of PROGRAMS) {
      const s = chipScatter(slug);
      expect(Math.hypot(s.x, s.y / 0.6)).toBeGreaterThanOrEqual(8 - 0.01);
      expect(Math.abs(s.x)).toBeLessThanOrEqual(22);
      expect(Math.abs(s.y)).toBeLessThanOrEqual(13.2);
      expect(Math.abs(s.rotate)).toBeLessThanOrEqual(12);
      expect(s.delay).toBeGreaterThanOrEqual(0);
      expect(s.delay).toBeLessThan(1);
    }
  });
});

describe('chipProgress', () => {
  it('runs 0 to 1, starting later for a later chip, and lands every chip by the end', () => {
    expect(chipProgress(0, 0)).toBe(0);
    expect(chipProgress(1, 0)).toBe(1);
    expect(chipProgress(1, 0.999)).toBe(1);
    expect(chipProgress(0.3, 0.9)).toBe(0);
    expect(chipProgress(CHIP_SPAN / 2, 0)).toBeGreaterThan(0.5); // eased out: fast, then gentle
  });
  it('never leaves 0..1, even for overscroll', () => {
    expect(chipProgress(-0.2, 0.5)).toBe(0);
    expect(chipProgress(1.4, 0.5)).toBe(1);
  });
});
