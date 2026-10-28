import { describe, it, expect } from 'vitest';
import { PROGRAMS } from '@/content/programs';
import { assessProgram, GROUP_ORDER } from '@/lib/assess';
import { ProfileSchema } from '@/lib/schema';
import { readFileSync } from 'node:fs';
import { CHIP_SPAN, chipProgress, chipScatter, cloudSlots, keepStory, pileColumns, pileLayout, pinProgress, scatterOffset, type Box, type Story } from '@/lib/showcase';
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
  it('tilts up to 6 degrees and staggers within 0..1', () => {
    for (const { slug } of PROGRAMS) {
      const s = chipScatter(slug);
      expect(Math.abs(s.rotate)).toBeLessThanOrEqual(6);
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

describe('pileLayout (the wide-screen pile)', () => {
  const story = sortStory(PROGRAMS, PERSONA_NOW);
  const all = GROUP_ORDER.flatMap((g) => story.groups[g]);
  /** Chip sizes as the browser draws them: 12px text, 12px padding a side, capped at the column width. */
  const chipsFor = (column: number, height = 26) => all.map((c) => ({ slug: c.slug, width: Math.min(column, Math.round(24 + c.name.length * 6.1)), height }));
  /** The pile area under the column headings (stage less the headings and a 10px inset), from the browser. */
  const geometries = [
    { name: '1280px wide', cloud: { left: 0, top: 0, width: 1068, height: 398 }, column: 258 },
    { name: '800px wide', cloud: { left: 0, top: 0, width: 748, height: 398 }, column: 178 },
    // Short windows use 22px chips and a shorter stage (the pin-short layout).
    { name: '1280 × 720', cloud: { left: 0, top: 0, width: 1068, height: 326 }, column: 258, chipHeight: 22 },
    { name: '1024 × 640', cloud: { left: 0, top: 0, width: 972, height: 326 }, column: 234, chipHeight: 22 },
  ];

  /** The on-screen (tilted) box of a chip placed at `at`: rotation is about its centre. */
  function screenBox(chip: { slug: string; width: number; height: number }, at: { left: number; top: number }): Box {
    const turn = (Math.abs(chipScatter(chip.slug).rotate) * Math.PI) / 180;
    const width = chip.width * Math.cos(turn) + chip.height * Math.sin(turn);
    const height = chip.width * Math.sin(turn) + chip.height * Math.cos(turn);
    return { left: at.left + (chip.width - width) / 2, top: at.top + (chip.height - height) / 2, width, height };
  }
  /** The largest share of the smaller box that any two boxes cover together. */
  function worstOverlap(boxes: Box[]) {
    let worst = 0;
    for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
      const [a, b] = [boxes[i], boxes[j]];
      const x = Math.min(a.left + a.width, b.left + b.width) - Math.max(a.left, b.left);
      const y = Math.min(a.top + a.height, b.top + b.height) - Math.max(a.top, b.top);
      if (x > 0 && y > 0) worst = Math.max(worst, (x * y) / Math.min(a.width * a.height, b.width * b.height));
    }
    return worst;
  }

  it('fits as many columns as there is room for a typical chip and a clear gap', () => {
    expect(pileColumns(1068, chipsFor(258).map((c) => c.width))).toBe(4);
    expect(pileColumns(748, chipsFor(178).map((c) => c.width))).toBe(3);
    expect(pileColumns(100, [300])).toBe(1);
    expect(pileColumns(1000, [])).toBe(1);
  });

  it.each(geometries)('keeps every chip inside the pile at $name', ({ cloud, column, chipHeight }) => {
    const chips = chipsFor(column, chipHeight);
    const placed = pileLayout(chips, cloud);
    expect(placed.size).toBe(chips.length);
    for (const chip of chips) {
      const at = placed.get(chip.slug)!;
      expect(at.left).toBeGreaterThanOrEqual(cloud.left);
      expect(at.left + chip.width).toBeLessThanOrEqual(cloud.left + cloud.width + 0.01);
      expect(at.top).toBeGreaterThanOrEqual(cloud.top);
      expect(at.top + chip.height).toBeLessThanOrEqual(cloud.top + cloud.height + 0.01);
    }
  });

  // The pile is the section's opening image: names must stay readable, so no chip may hide much of another.
  it.each(geometries)('lets no chip cover more than 15% of another at $name', ({ cloud, column, chipHeight }) => {
    const chips = chipsFor(column, chipHeight);
    const placed = pileLayout(chips, cloud);
    expect(worstOverlap(chips.map((c) => screenBox(c, placed.get(c.slug)!)))).toBeLessThanOrEqual(0.15);
  });

  it('is the same on every visit, whatever order the chips come in', () => {
    const chips = chipsFor(258);
    expect(pileLayout([...chips].reverse(), geometries[0].cloud)).toEqual(pileLayout(chips, geometries[0].cloud));
  });

  // Not a grid: rows are dealt in a seeded order, with uneven gaps, so columns do not line up.
  it('mixes the groups and does not line chips up in columns', () => {
    const chips = chipsFor(258);
    const placed = pileLayout(chips, geometries[0].cloud);
    // Each group of four or more spreads across at least half the pile (centres, in px).
    for (const g of GROUP_ORDER.filter((g) => story.groups[g].length >= 4)) {
      const centres = story.groups[g].map((c) => placed.get(c.slug)!.left + chips.find((x) => x.slug === c.slug)!.width / 2);
      expect(Math.max(...centres) - Math.min(...centres)).toBeGreaterThan(geometries[0].cloud.width / 2);
    }
    const lefts = new Set([...placed.values()].map((p) => Math.round(p.left / 8)));
    expect(lefts.size).toBeGreaterThan(chips.length * 0.75);
  });

  it('copes with no chips', () => {
    expect(pileLayout([], geometries[0].cloud).size).toBe(0);
  });
});
