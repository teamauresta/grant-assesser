import type { Profile } from '@/lib/schema';

/** "Now" for every persona test: results depend on it through program status and age checks. */
export const PERSONA_NOW = new Date('2026-10-27T00:00:00Z');

/** A self-funded Victorian product company, about 18 months old. */
export const bootstrappedVic: Profile = {
  persona: 'bootstrapped',
  hasAcn: true,
  gstRegistered: true,
  incorporatedOn: '2025-04-27',
  foreignSubsidiary: false,
  state: 'vic',
  turnover: 'under-1m',
  rdSpend: '20k-100k',
  cashMatch: 'under-20k',
  experimental: true,
  contemporaneousRecords: true,
  businessModel: 'product',
  hasMvp: true,
  hasWebsite: true,
  fundingStage: 'none',
  vcBacked: false,
  priorCreditsUsd: { aws: 0, azure: 0, gcp: 0 },
  researchPartner: 'none',
  industryPartners: 0,
  customerEvidence: 'pilots',
  sectors: ['other'],
  founderHoursPerWeek: '2-5',
  urgency: 'now',
  womenLed: 'no',
};

/** The same company, women-led, with angel money and planning a VC round. */
export const preRaiseVic: Profile = {
  ...bootstrappedVic,
  persona: 'pre-raise',
  fundingStage: 'angel',
  cashMatch: '20k-60k',
  researchPartner: 'informal',
  womenLed: 'yes',
};

/** A seed-stage, VC-backed NSW company on Google Cloud, with research and industry partners. */
export const vcBackedSeed: Profile = {
  ...bootstrappedVic,
  persona: 'vc-backed',
  incorporatedOn: '2023-03-01',
  fundingStage: 'seed',
  vcBacked: true,
  lastRoundOn: '2025-06-01',
  turnover: '1m-10m',
  rdSpend: '100k-500k',
  cashMatch: '60k-250k',
  researchPartner: 'active',
  industryPartners: 2,
  stack: ['gcp', 'gemini'],
  priorCreditsUsd: { aws: 0, azure: 0, gcp: 0 },
  state: 'nsw',
};

export const PERSONA_FIXTURES = { bootstrappedVic, preRaiseVic, vcBackedSeed } as const;
