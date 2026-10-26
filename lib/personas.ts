import type { Persona, Profile } from '@/lib/schema';

/**
 * Persona copy and defaults. Task 15 adds intro copy and PERSONA_STARTER_GOALS here.
 */
export const PERSONAS_INFO: Record<Persona, { label: string; description: string }> = {
  bootstrapped: {
    label: 'Bootstrapped',
    description: 'Self-funded or customer-funded. Start with low-cost wins and matched vouchers.',
  },
  'pre-raise': {
    label: 'Pre-raise',
    description: 'Getting ready to raise. Build eligibility and evidence before the round.',
  },
  'vc-backed': {
    label: 'VC-backed',
    description: 'Institutionally funded. Unlock VC-gated credits and larger grants.',
  },
};

/** Answers a persona implies. Applied by setProfile only where the user has not answered for themselves. */
export const PERSONA_DEFAULTS: Record<Persona, Required<Pick<Profile, 'vcBacked'>>> = {
  bootstrapped: { vcBacked: false },
  'pre-raise': { vcBacked: false },
  'vc-backed': { vcBacked: true },
};
