import type { Profile, Program } from '@/lib/schema';
import { assessAll, GROUP_ORDER, type Group } from '@/lib/assess';

/**
 * The example founder in the home page's sorting story: a pre-raise AI product company in Victoria,
 * about 18 months old, women-led, with angel money. Fixed answers, presented as an example only.
 * A copy of the `preRaiseVic` test fixture (lib code must not import from tests/; a test keeps them equal).
 */
export const DEMO_PROFILE: Profile = {
  persona: 'pre-raise',
  hasAcn: true,
  gstRegistered: true,
  incorporatedOn: '2025-04-27',
  foreignSubsidiary: false,
  state: 'vic',
  turnover: 'under-1m',
  rdSpend: '20k-100k',
  cashMatch: '20k-60k',
  experimental: true,
  contemporaneousRecords: true,
  businessModel: 'product',
  hasMvp: true,
  hasWebsite: true,
  fundingStage: 'angel',
  vcBacked: false,
  priorCreditsUsd: { aws: 0, azure: 0, gcp: 0 },
  researchPartner: 'informal',
  industryPartners: 0,
  customerEvidence: 'pilots',
  sectors: ['other'],
  founderHoursPerWeek: '2-5',
  urgency: 'now',
  womenLed: 'yes',
};

export type StoryChip = { slug: string; name: string; group: Group };
export type Story = { groups: Record<Group, StoryChip[]>; closed: number };

/** Every program checked against DEMO_PROFILE, best first within each group; closed ones are only counted. */
export function sortStory(programs: Program[], now: Date): Story {
  const groups = Object.fromEntries(GROUP_ORDER.map((g) => [g, [] as StoryChip[]])) as Record<Group, StoryChip[]>;
  const assessed = assessAll(programs, DEMO_PROFILE, now);
  for (const a of assessed) groups[a.group!].push({ slug: a.program.slug, name: a.program.name, group: a.group! });
  return { groups, closed: programs.length - assessed.length };
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
  return { rotate: round((next() - 0.5) * 24), delay: round(next() * 0.99) };
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
