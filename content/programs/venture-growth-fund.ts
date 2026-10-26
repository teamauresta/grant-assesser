import type { ProgramInput } from '@/lib/schema';

const program: ProgramInput = {
  slug: 'venture-growth-fund',
  name: 'Venture Growth Fund',
  provider: 'Innovation Victoria (managed by OneVentures and Lighter Capital)',
  level: 'vic',
  type: 'capital',
  benefit: { kind: 'debt', min: 50_000, max: 5_000_000, currency: 'AUD',
    note: 'Venture credit (a loan, not a grant) of $50K–$5M for later-stage, high-growth startups. You repay it with interest.' },
  status: { state: 'rolling', note: 'Ongoing. The two fund managers make all lending decisions.' },
  deadlines: [],
  gates: [
    { id: 'state-is', state: 'vic', severity: 'soft',
      note: 'The fund supports Victorian jobs and growth, but the page does not spell out a residency rule' },
    { id: 'customer-evidence-at-least', level: 'revenue', severity: 'soft',
      note: 'Lighter Capital expects revenue of over $15,000 a month' },
  ],
  scores: { funding: 4, value: 3, effort: 2, speed: 2 },
  personas: {
    bootstrapped: 'Lighter Capital\'s revenue-based loans suit revenue-generating bootstrapped companies, without giving up equity.',
    'vc-backed': 'Venture credit can extend runway between equity rounds without dilution. Compare the cost of interest with the dilution you avoid.',
  },
  goalTemplate: [
    { title: 'Model repayments against your monthly recurring revenue', offsetDays: 7 },
    { title: 'Contact OneVentures or Lighter Capital about the Venture Growth Fund', offsetDays: 14 },
    { title: 'Prepare financials and growth plan for the lender', offsetDays: 30 },
  ],
  content: {
    summary: 'Victorian Government-backed venture debt of $50K–$5M for high-growth startups, delivered by OneVentures and Lighter Capital.',
    howToApply: [
      'Decide which manager fits: Lighter Capital ($50K–$2M revenue-based loans) or OneVentures (about $0.5M–$5M).',
      'Contact the fund manager directly.',
      'Work through the manager\'s own assessment and loan terms.',
    ],
    prepare: [
      'Monthly recurring revenue and growth history',
      'Financial statements and forecasts',
      'Cap table and details of equity raised',
      'A plan showing how you will repay the loan',
    ],
    mistakes: [
      'Treating venture credit as free money: it avoids dilution, but it is debt you repay with interest',
      'Borrowing before revenue can support repayments',
    ],
    caveats: [
      'Loan sizes, terms and revenue expectations are set by each fund manager and may vary.',
      'The page does not say whether non-Victorian companies are eligible, so the Victoria check is soft.',
    ],
  },
  verification: {
    lastVerified: '2026-10-26',
    sources: [
      { url: 'https://www.innovationvictoria.com/funding', title: 'Innovation Victoria funding', official: true },
      { url: 'https://www.innovationvictoria.com/funding/venture-growth-fund', title: 'Venture Growth Fund', official: true },
    ],
  },
  changelog: [
    { date: '2026-10-26', note: 'Initial verified record' },
    { date: '2026-10-27', note: 'Fund managers and loan sizes added from the fund page' },
  ],
};

export default program;
