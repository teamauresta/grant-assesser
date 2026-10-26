import type { ProgramInput } from '@/lib/schema';

const program: ProgramInput = {
  slug: 'monash-generator',
  name: 'Monash Generator Accelerator',
  provider: 'Monash University',
  level: 'university',
  type: 'accelerator',
  benefit: { kind: 'service', currency: 'AUD',
    note: 'An accelerator for the Monash community. Benefits and intake dates could not be verified.' },
  status: { state: 'unverified', note: 'Program pages are behind a login; intake status is unknown.' },
  deadlines: [],
  gates: [
    { id: 'state-is', state: 'vic', severity: 'soft',
      note: 'Not verified: the program pages are behind a login' },
  ],
  scores: { funding: 1, value: 3, effort: 3, speed: 3 },
  goalTemplate: [
    { title: 'Confirm your Monash affiliation (student, staff or alumni)', offsetDays: 3 },
    { title: 'Contact Monash entrepreneurship about the next intake', offsetDays: 7 },
  ],
  content: {
    summary: 'Monash University\'s accelerator, open only to Monash students, staff and alumni. Current details are not public.',
    howToApply: [
      'Confirm you are a Monash student, staff member or alumnus.',
      'Sign in to the Monash entrepreneurship pages or contact the team.',
      'Ask about the next intake and how to apply.',
    ],
    prepare: [
      'Proof of your Monash affiliation',
      'A short description of your startup and stage',
      'Questions about intake dates and benefits',
    ],
    mistakes: [
      'Applying without a Monash affiliation',
      'Assuming last year\'s dates or benefits still apply',
    ],
    caveats: [
      'Program pages are behind a login, so intake dates, benefits and the Victorian location check are unverified.',
      'Open to Monash students, staff and alumni only. This tool does not check Monash affiliation.',
    ],
  },
  verification: {
    lastVerified: '2026-10-26',
    sources: [
      { url: 'https://www.monash.edu/entrepreneurship', title: 'Monash entrepreneurship', official: true },
    ],
  },
  changelog: [{ date: '2026-10-26', note: 'Initial record; program pages behind a login' }],
};

export default program;
