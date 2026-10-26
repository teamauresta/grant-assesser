import type { ProgramInput } from '@/lib/schema';

const program: ProgramInput = {
  slug: 'alice-anderson-fund',
  name: 'Alice Anderson Fund',
  provider: 'Innovation Victoria',
  level: 'vic',
  type: 'capital',
  benefit: { kind: 'equity', min: 50_000, max: 300_000, currency: 'AUD',
    note: 'Co-investment of $50K–$300K in women-led startups, alongside a lead investor at 3:1. Only 85c in the dollar is taken as equity; the rest is a non-dilutive grant.' },
  status: { state: 'upcoming', note: 'Applications are closed. The last cut-off was 18 September 2026 for the 1 October Investment Committee meeting, and no next cut-off is published. Innovation Victoria has added $10M to the fund, so further rounds are expected.' },
  deadlines: [],
  gates: [
    { id: 'state-is', state: 'vic',
      note: 'The startup must be registered in Victoria with at least 50% of its assets and employees there, and the women founders must live in Victoria' },
    { id: 'women-led',
      note: 'Women must own at least 50%, or own at least 30% with a woman as CEO, COO or CTO and at least 30% women on any board' },
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
      'Applications were closed when the fund page was checked on 27 October 2026: the last cut-off was 18 September 2026, and the next one is not published. Check the fund page before your investor applies.',
      'Investors usually apply on a rolling basis, with applications reviewed at the next Investment Committee meeting after each cut-off.',
    ],
  },
  verification: {
    lastVerified: '2026-10-26',
    sources: [
      { url: 'https://www.innovationvictoria.com/funding', title: 'Innovation Victoria funding', official: true },
      { url: 'https://www.innovationvictoria.com/funding/the-alice-anderson-fund', title: 'The Alice Anderson Fund', official: true },
      { url: 'https://www.innovationvictoria.com/stories/news-and-media/alice-anderson-fund-continues', title: 'Innovation Victoria: Alice Anderson Fund continues (additional $10M)', official: true },
    ],
  },
  changelog: [
    { date: '2026-10-26', note: 'Initial verified record' },
    { date: '2026-10-27', note: 'Minimum cheque, structure and application process added from the fund page' },
    { date: '2026-10-27', note: 'Status changed from rolling to upcoming: the fund page says applications are closed after the 18 September cut-off, with no next cut-off published. Victorian-based and women-led definitions added to the checks from the fund FAQ' },
  ],
};

export default program;
