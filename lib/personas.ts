import type { Persona, Profile } from '@/lib/schema';
import type { Track } from '@/lib/assess';

/** A brand colour that colours a persona's card. Each meets AA on the page background. */
export type PersonaTone = 'var(--brand)' | 'var(--brand-2)' | 'var(--spark)';

/** Persona copy, defaults, results intro and starter goals. Icons are mapped in the component. */
export const PERSONAS_INFO: Record<Persona, { label: string; description: string; tone: PersonaTone }> = {
  bootstrapped: {
    label: 'Bootstrapped',
    description: 'Self-funded or customer-funded. Start with low-cost wins and matched vouchers.',
    tone: 'var(--brand)',
  },
  'pre-raise': {
    label: 'Pre-raise',
    description: 'Getting ready to raise. Build eligibility and evidence before the round.',
    tone: 'var(--brand-2)',
  },
  'vc-backed': {
    label: 'VC-backed',
    description: 'Institutionally funded. Unlock VC-gated credits and larger grants.',
    tone: 'var(--spark)',
  },
};

/** Answers a persona implies. Applied by setProfile only where the user has not answered for themselves. */
export const PERSONA_DEFAULTS: Record<Persona, Required<Pick<Profile, 'vcBacked'>>> = {
  bootstrapped: { vcBacked: false },
  'pre-raise': { vcBacked: false },
  'vc-backed': { vcBacked: true },
};

export type PersonaResultsCopy = {
  /** Heading and lead paragraph above the results. */
  title: string;
  intro: string;
  /** The track the results open on. */
  defaultTrack: Track;
};

/**
 * How the results page leads for each persona. Bootstrapped founders see customer-funded pilots and
 * quick wins first; VC-backed founders see the credits their investors unlock and larger funding.
 */
export const PERSONA_RESULTS: Record<Persona, PersonaResultsCopy> = {
  bootstrapped: {
    title: 'Start with what pays back quickly',
    intro: 'A paid pilot with a customer is still your best funding. Around it, take the free credits and services that save cash now, and keep matched grants for when you can spare the match. Programs that need VC funding stay listed, greyed out, so you can see what a raise would unlock.',
    defaultTrack: 'quick-wins',
  },
  'pre-raise': {
    title: 'Build eligibility before the round',
    intro: 'Claim what you qualify for now, such as the R&D Tax Incentive, and prepare the evidence investors and assessors both look for. Some programs open up once you close a VC-led round; they are marked as fixable rather than ruled out.',
    defaultTrack: 'funding',
  },
  'vc-backed': {
    title: 'Use what your investors unlock',
    intro: 'Your VC backing opens the larger credit tiers, often through your investor\'s partner ID or referral code, and makes bigger matched grants realistic. Start with the funding that moves the most money, then claim the VC-gated credits.',
    defaultTrack: 'funding',
  },
};

/** Results lead when no persona has been chosen. */
export const DEFAULT_RESULTS: PersonaResultsCopy = {
  title: 'Your results',
  intro: 'Ranked with balanced weights because no persona is set. Choose one in the assessment to rank programs for your situation.',
  defaultTrack: 'funding',
};

export type StarterGoal = { title: string; description: string };

/** Goals offered on the results page, added to the plan with source 'persona'. */
export const PERSONA_STARTER_GOALS: Record<Persona, StarterGoal[]> = {
  bootstrapped: [{
    title: 'Secure a paid pilot with measurable success criteria',
    description: 'Customer money funds the work without dilution, and a paid pilot is the evidence most grants ask for.',
  }],
  'pre-raise': [{
    title: 'Secure a paid pilot with measurable success criteria',
    description: 'Paid traction strengthens both your raise and your grant applications.',
  }],
  'vc-backed': [{
    title: 'Apply for VC-partner credits through your investor',
    description: 'Ask your investor for their AWS Activate Org ID and any Microsoft for Startups referral code, and keep your round details ready for Google Cloud\'s AI tier.',
  }],
};
