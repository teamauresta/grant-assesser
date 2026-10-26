import type { ProgramInput } from '@/lib/schema';

const program: ProgramInput = {
  slug: 'alice-anderson-fund',
  name: 'Alice Anderson Fund',
  provider: 'Innovation Victoria',
  level: 'vic',
  type: 'capital',
  benefit: { kind: 'equity', min: 50_000, max: 300_000, currency: 'AUD',
    note: 'Co-investment of $50K–$300K in women-led startups, alongside a lead investor at 3:1. Only 85c in the dollar is taken as equity; the rest is a non-dilutive grant.' },
  status: { state: 'rolling', note: 'Investors apply on the startup\'s behalf, on a rolling basis, reviewed at Investment Committee meetings with cut-off dates.' },
  deadlines: [],
  gates: [
    { id: 'state-is', state: 'vic' },
    'women-led',
  ],
  scores: { funding: 4, value: 4, effort: 2, speed: 2 },
  personas: {
    bootstrapped: 'The fund only joins rounds led by other investors. You need an investor ready to put in three dollars for every one it invests.',
    'pre-raise': 'Raise it with your lead investor early: they apply, and the next Investment Committee cut-off sets the timing.',
  },
  goalTemplate: [
    { title: 'Read the Alice Anderson Fund application guidelines', offsetDays: 3 },
    { title: 'Ask your lead investor to apply for co-investment', offsetDays: 14 },
    { title: 'Check the next Investment Committee cut-off date', offsetDays: 14 },
  ],
  stacking: [
    { with: 'esic', note: 'If your company qualifies as an ESIC, private investors in the same round may be able to claim the ESIC tax offset.' },
  ],
  content: {
    summary: 'An Innovation Victoria sidecar fund that co-invests up to $300K in women-led startups, alongside other investors.',
    howToApply: [
      'Find a lead investor (angel, family office or VC) for your round.',
      'Your investor applies to the fund; startups do not apply directly.',
      'The application is reviewed at the next Investment Committee meeting after the cut-off.',
    ],
    prepare: [
      'A lead investor committed to the round',
      'Private investment of at least three times the co-investment',
      'Round terms and the investor\'s due diligence',
      'Evidence the startup is women-led',
    ],
    mistakes: [
      'Applying directly as a startup without an investor',
      'Missing the Investment Committee cut-off date',
    ],
    caveats: [
      'The fund page (checked 27 October 2026) said applications were closed after the 18 September 2026 cut-off for the 1 October meeting. Check the next cut-off date.',
    ],
  },
  verification: {
    lastVerified: '2026-10-26',
    sources: [
      { url: 'https://www.innovationvictoria.com/funding', title: 'Innovation Victoria funding', official: true },
      { url: 'https://www.innovationvictoria.com/funding/the-alice-anderson-fund', title: 'The Alice Anderson Fund', official: true },
    ],
  },
  changelog: [
    { date: '2026-10-26', note: 'Initial verified record' },
    { date: '2026-10-27', note: 'Minimum cheque, structure and application process added from the fund page' },
  ],
};

export default program;
