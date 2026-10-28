import { describe, it, expect } from 'vitest';
import { PROGRAMS } from '@/content/programs';
import { assessProgram, GROUP_ORDER } from '@/lib/assess';
import { ProfileSchema } from '@/lib/schema';
import { readFileSync } from 'node:fs';
import { CHIP_SPAN, chipProgress, chipScatter, cloudSlots, keepStory, pinProgress, scatterOffset, type Story } from '@/lib/showcase';
import { DEMO_PROFILE, sortStory } from '@/lib/showcase-story';
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
  it('tilts up to 12 degrees and staggers within 0..1', () => {
    for (const { slug } of PROGRAMS) {
      const s = chipScatter(slug);
      expect(Math.abs(s.rotate)).toBeLessThanOrEqual(12);
      expect(s.delay).toBeGreaterThanOrEqual(0);
      expect(s.delay).toBeLessThan(1);
    }
  });
});

describe('cloudSlots', () => {
  const slugs = PROGRAMS.map((p) => p.slug);
  const columns = 6;
  const slots = cloudSlots(slugs, columns);

  it('gives every chip a place inside the box, the same on every visit', () => {
    expect([...slots.keys()].sort()).toEqual([...slugs].sort());
    expect(cloudSlots([...slugs].reverse(), columns)).toEqual(slots);
    for (const { x, y } of slots.values()) {
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThanOrEqual(1);
      expect(y).toBeGreaterThanOrEqual(0);
      expect(y).toBeLessThanOrEqual(1);
    }
  });

  // Even spread: one chip per cell of a columns x rows grid, so the pile never bunches up.
  it('puts one chip in each cell of the grid', () => {
    const rows = Math.ceil(slugs.length / columns);
    const cells = [...slots.values()].map(({ x, y }) => `${Math.floor(x * columns)},${Math.floor(y * rows)}`);
    expect(new Set(cells).size).toBe(slugs.length);
  });

  it('mixes the groups rather than keeping each chip near its column', () => {
    const story = sortStory(PROGRAMS, PERSONA_NOW);
    const actNow = story.groups['act-now'].map((c) => slots.get(c.slug)!.x);
    expect(Math.min(...actNow)).toBeLessThan(0.3);
    expect(Math.max(...actNow)).toBeGreaterThan(0.7);
  });

  it('copes with one chip and with an empty list', () => {
    expect(cloudSlots(['rdti'], 2).get('rdti')).toBeDefined();
    expect(cloudSlots([], 2).size).toBe(0);
  });
});

describe('scatterOffset', () => {
  const cloud = { left: 0, top: 40, width: 1000, height: 400 };
  const chip = { left: 300, top: 100, width: 200, height: 26 };

  it('moves the chip from its sorted place to its slot, kept inside the cloud', () => {
    expect(scatterOffset(chip, cloud, { x: 0, y: 0 })).toEqual({ x: -300, y: -60 });
    expect(scatterOffset(chip, cloud, { x: 1, y: 1 })).toEqual({ x: 500, y: 314 });
    expect(scatterOffset(chip, cloud, { x: 0.5, y: 0.5 })).toEqual({ x: 100, y: 127 });
  });

  it('never moves a chip wider than the cloud past its left edge', () => {
    expect(scatterOffset({ ...chip, left: 0, width: 1200 }, cloud, { x: 1, y: 0 }).x).toBe(0);
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

describe('keepStory', () => {
  const story = sortStory(PROGRAMS, PERSONA_NOW);

  // useNow() ticks every minute; a new instant that sorts the same way must not restart the story.
  it('keeps the previous story when every group holds the same programs', () => {
    const again = sortStory(PROGRAMS, new Date(PERSONA_NOW.getTime() + 60_000));
    expect(again).not.toBe(story);
    expect(keepStory(story, again)).toBe(story);
  });

  it('takes the new story when a program moves, or the closed count changes', () => {
    const [first, ...rest] = story.groups['act-now'];
    const moved: Story = { ...story, groups: { ...story.groups, 'act-now': rest, watch: [...story.groups.watch, { ...first, group: 'watch' }] } };
    expect(keepStory(story, moved)).toBe(moved);
    const fewer: Story = { ...story, closed: story.closed + 1 };
    expect(keepStory(story, fewer)).toBe(fewer);
  });

  it('takes the new story when there was none', () => {
    expect(keepStory(null, story)).toBe(story);
  });
});

describe('pinProgress', () => {
  // A 2000px section in an 800px window pins for 1200px of scrolling.
  it('runs 0 to 1 while the section is pinned', () => {
    expect(pinProgress(300, 2000, 800)).toBe(0);
    expect(pinProgress(0, 2000, 800)).toBe(0);
    expect(pinProgress(-600, 2000, 800)).toBe(0.5);
    expect(pinProgress(-1200, 2000, 800)).toBe(1);
    expect(pinProgress(-1900, 2000, 800)).toBe(1);
  });

  it('jumps straight to sorted once a section no taller than the window reaches the top', () => {
    expect(pinProgress(10, 700, 800)).toBe(0);
    expect(pinProgress(0, 700, 800)).toBe(1);
  });
});

// The section's first load must not include the eligibility checks: they load with import().
describe('first-load modules', () => {
  it('lib/showcase and lib/groups do not import lib/assess or lib/gates', () => {
    for (const file of ['lib/showcase.ts', 'lib/groups.ts']) {
      const source = readFileSync(file, 'utf8');
      expect(source).not.toMatch(/^import (?!type )[^;]*from '@\/lib\/(assess|gates|scoring|assessment\/)/m);
    }
  });
});
