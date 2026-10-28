import type { Profile, Program } from '@/lib/schema';
import { assessAll } from '@/lib/assess';
import { GROUP_ORDER } from '@/lib/groups';
import type { Story, StoryChip } from '@/lib/showcase';

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

/** Every program checked against DEMO_PROFILE, best first within each group; closed ones are only counted. */
export function sortStory(programs: Program[], now: Date): Story {
  const groups = Object.fromEntries(GROUP_ORDER.map((g) => [g, [] as StoryChip[]])) as Story['groups'];
  const assessed = assessAll(programs, DEMO_PROFILE, now);
  for (const a of assessed) groups[a.group!].push({ slug: a.program.slug, name: a.program.name, group: a.group! });
  return { groups, closed: programs.length - assessed.length };
}
