import { GROUP_ORDER, type Group } from '@/lib/groups';

/*
 * Layout and motion for the home page's sorting story. This module is in the page's first load, so
 * it must not import the checks (lib/assess, lib/gates): the story itself is in lib/showcase-story,
 * loaded with import().
 */

export type StoryChip = { slug: string; name: string; group: Group };
export type Story = { groups: Record<Group, StoryChip[]>; closed: number };

const storyKey = (s: Story) => `${GROUP_ORDER.map((g) => s.groups[g].map((c) => c.slug).join(',')).join('|')}|${s.closed}`;

/**
 * The previous story when the new one sorts every program the same way, so a fresh "now" (useNow
 * ticks every minute) does not restart the section; otherwise the new one.
 */
export function keepStory(prev: Story | null, next: Story): Story {
  return prev && storyKey(prev) === storyKey(next) ? prev : next;
}

/**
 * Progress (0..1) through a pinned section from its top edge (px from the top of the window, as
 * getBoundingClientRect gives it), its height and the window's height. A section no taller than the
 * window has no pinned range, so it is sorted as soon as it reaches the top.
 */
export function pinProgress(top: number, height: number, viewport: number): number {
  const range = height - viewport;
  if (range <= 0) return top <= 0 ? 1 : 0;
  return Math.min(1, Math.max(0, -top / range));
}

export type Scatter = { rotate: number; delay: number };

const round = (n: number) => Math.round(n * 100) / 100;

/** FNV-1a: a 32-bit hash of the text. */
function hash(text: string) {
  let s = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) s = Math.imul(s ^ text.charCodeAt(i), 0x01000193);
  return s >>> 0;
}

/** mulberry32 seeded with the text's hash: a small generator, so a slug always scatters the same way. */
function seeded(text: string) {
  let s = hash(text);
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** How a chip lies before it sorts: a tilt (degrees) and a stagger (0..1) for when it starts moving. */
export function chipScatter(slug: string): Scatter {
  const next = seeded(slug);
  return { rotate: round((next() - 0.5) * 12), delay: round(next() * 0.99) };
}

/** A point in a box, as fractions (0..1) of its free width and height. */
export type Slot = { x: number; y: number };
export type Box = { left: number; top: number; width: number; height: number };

/**
 * Where each chip lies in the unsorted pile: one chip per cell of a grid `columns` wide, cells dealt
 * in a seeded order (so groups mix), alternate rows shifted like bricks and each chip jittered within
 * its cell. It looks random, but nothing bunches up or leaves a hole, and every visit agrees.
 */
export function cloudSlots(slugs: string[], columns: number): Map<string, Slot> {
  const rows = Math.max(1, Math.ceil(slugs.length / columns));
  const order = [...slugs].sort((a, b) => hash(a) - hash(b) || a.localeCompare(b));
  return new Map(order.map((slug, i) => {
    const row = Math.floor(i / columns);
    const next = seeded(`${slug}:slot`);
    const base = row % 2 ? 0.65 : 0.35;
    const x = ((i % columns) + base + (next() - 0.5) * 0.4) / columns;
    const y = (row + 0.5 + (next() - 0.5) * 0.6) / rows;
    return [slug, { x: Math.round(x * 1000) / 1000, y: Math.round(y * 1000) / 1000 }];
  }));
}

/** The offset (px) from a chip's sorted box to its slot in the cloud, keeping the chip inside the cloud. */
export function scatterOffset(chip: Box, cloud: Box, slot: Slot): { x: number; y: number } {
  return {
    x: round(cloud.left + Math.max(0, cloud.width - chip.width) * slot.x - chip.left),
    y: round(cloud.top + Math.max(0, cloud.height - chip.height) * slot.y - chip.top),
  };
}

export type PileChip = { slug: string; width: number; height: number };

/** Clear space (px) a column of the wide-screen pile keeps beside a typical chip. */
const PILE_GAP = 56;
/** When rows would sit closer than a chip plus ROW_ROOM, the pile takes another column, if each gap across keeps MIN_GAP. */
const ROW_ROOM = 16;
const MIN_GAP = 24;

/** Columns for the wide-screen pile: as many median-width chips, each with a clear gap, as fit across. */
export function pileColumns(width: number, chipWidths: number[]): number {
  if (!chipWidths.length) return 1;
  const sorted = [...chipWidths].sort((a, b) => a - b);
  return Math.max(1, Math.min(chipWidths.length, Math.floor(width / (sorted[sorted.length >> 1] + PILE_GAP))));
}

/**
 * Where each chip lies in the wide-screen pile (top-left, px), from the chips' real sizes. Chips are
 * dealt in a seeded order (so groups mix) into rows of `pileColumns` (one more when the pile is
 * short and there is room across); each row's spare width is
 * split into uneven, seeded gaps, so chips never overlap within a row and columns never line up;
 * each chip then sits high or low within its row band, as far as its tilt leaves room. Rows share the
 * height evenly.
 */
export function pileLayout(chips: PileChip[], cloud: Box): Map<string, { left: number; top: number }> {
  const placed = new Map<string, { left: number; top: number }>();
  if (!chips.length) return placed;
  const widths = chips.map((c) => c.width).sort((a, b) => a - b);
  const median = widths[widths.length >> 1];
  const tallest = Math.max(...chips.map((c) => c.height));
  let columns = pileColumns(cloud.width, widths);
  // A short pile trades width for height: more columns, so fewer, roomier rows.
  while (columns < chips.length && cloud.height / Math.ceil(chips.length / columns) < tallest + ROW_ROOM
    && (cloud.width - (columns + 1) * median) / (columns + 2) >= MIN_GAP) columns++;
  const order = [...chips].sort((a, b) => hash(a.slug) - hash(b.slug) || a.slug.localeCompare(b.slug));
  const rows = Math.ceil(order.length / columns);
  const pitch = cloud.height / rows;
  for (let r = 0; r < rows; r++) {
    const row = order.slice(r * columns, (r + 1) * columns);
    // Gaps before, between and after the chips, weighted 0.4-1.6 so the row looks dealt, not set.
    const weights = [...row.map((c) => 0.4 + seeded(`${c.slug}:gap`)() * 1.2), 0.4 + seeded(`${row[0].slug}:end`)() * 1.2];
    const spare = cloud.width - row.reduce((sum, c) => sum + c.width, 0);
    const unit = Math.max(0, spare) / weights.reduce((a, b) => a + b, 0);
    let left = cloud.left;
    row.forEach((chip, i) => {
      left += weights[i] * unit;
      // Free to move up or down only as far as its tilted height stays inside the row band.
      const tilted = chip.width * Math.sin((Math.abs(chipScatter(chip.slug).rotate) * Math.PI) / 180) + chip.height;
      const room = Math.max(0, pitch - tilted);
      const top = cloud.top + r * pitch + (pitch - chip.height) / 2 + room * (seeded(`${chip.slug}:row`)() - 0.5);
      placed.set(chip.slug, { left: round(Math.min(left, cloud.left + cloud.width - chip.width)), top: round(top) });
      left += chip.width;
    });
  }
  return placed;
}

/** Share of the sort each chip spends moving; the rest of the range staggers their starts. */
export const CHIP_SPAN = 0.55;

/** Scroll progress through the pinned section at which every chip has landed; the rest holds the result. */
export const SORT_END = 0.8;

/** A chip's own progress (0..1, eased out) at overall progress `p`. */
export function chipProgress(p: number, delay: number): number {
  const start = delay * (1 - CHIP_SPAN);
  const t = Math.min(1, Math.max(0, (p - start) / CHIP_SPAN));
  return 1 - (1 - t) ** 3;
}
