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

export type Scatter = { x: number; y: number; rotate: number; delay: number };

const round = (n: number) => Math.round(n * 100) / 100;

/** FNV-1a, then mulberry32: a small seeded generator, so a slug always scatters the same way. */
function seeded(text: string) {
  let s = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) s = Math.imul(s ^ text.charCodeAt(i), 0x01000193);
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Where a chip starts before it sorts: an offset from its sorted place (rem), a tilt (degrees) and
 * a stagger (0..1). Flattened vertically, because the stage is wider than it is tall.
 */
export function chipScatter(slug: string): Scatter {
  const next = seeded(slug);
  const angle = next() * Math.PI * 2;
  const distance = 8 + next() * 14;
  return { x: round(Math.cos(angle) * distance), y: round(Math.sin(angle) * distance * 0.6), rotate: round((next() - 0.5) * 24), delay: round(next() * 0.99) };
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
