import type { ProgramInput } from '@/lib/schema';

const program: ProgramInput = {
  slug: 'startmate-summer-27',
  name: 'Startmate Summer \'27 Accelerator',
  provider: 'Startmate',
  level: 'industry',
  type: 'accelerator',
  benefit: { kind: 'equity', min: 120_000, max: 120_000, currency: 'AUD',
    note: 'Equity investment: $120K for 8% at a $1.5M post-money valuation. If you have already raised $250K or more, Startmate matches your last round\'s terms instead.' },
  status: { state: 'open', note: 'Applications close 1 November 2026, 11:59pm AEDT. The program runs 1 February to 7 May 2027.' },
  deadlines: [
    { label: 'Applications close', kind: 'close', date: '2026-11-01', time: '23:59', tz: 'Australia/Melbourne' },
  ],
  gates: [
    { id: 'au-entity', severity: 'soft' },
  ],
  scores: { funding: 3, value: 4, effort: 3, speed: 3 },
  personas: {
    bootstrapped: 'You give up 8% of the company. Weigh that against the mentors, network and follow-on fundraising support.',
    'vc-backed': 'If you raised $250K or more with executed documents, Startmate matches your previous round\'s terms and valuation.',
  },
  goalTemplate: [
    { title: 'Decide whether 8% for $120K is right for you', beforeDeadlineBusinessDays: 3 },
    { title: 'Draft your application answers', beforeDeadlineBusinessDays: 2 },
    { title: 'Submit the Startmate application', beforeDeadlineBusinessDays: 1 },
  ],
  stacking: [
    { with: 'esic', note: 'Completing an accelerator can count towards the ESIC 100-point innovation test. Check the ATO criteria before relying on it.' },
  ],
  content: {
    summary: 'A 14-week accelerator for Australian and New Zealand founders that invests $120K for 8%, with Week 0 in Melbourne.',
    howToApply: [
      'Apply online before 11:59pm AEDT on 1 November 2026.',
      'If shortlisted, interview with the Startmate team.',
      'If accepted, choose a SAFE or priced equity round for the investment.',
    ],
    prepare: [
      'At least one founder able to work full-time',
      'Your company\'s stage, traction and goals for the 14 weeks',
      'Executed documents for any previous round of $250K or more',
      'Availability for Week 0 in Melbourne and the in-person weeks',
    ],
    mistakes: [
      'Missing the 1 November close by working in a different time zone',
      'Not reading the full investment terms before accepting',
    ],
    caveats: [
      'Startmate is for Australian and New Zealand founders. Its page does not say you need an Australian company to apply, so that check is soft.',
    ],
  },
  verification: {
    lastVerified: '2026-10-26',
    sources: [
      { url: 'https://www.startmate.com/accelerator', title: 'Startmate Accelerator', official: true },
    ],
  },
  changelog: [{ date: '2026-10-26', note: 'Initial verified record' }],
};

export default program;
