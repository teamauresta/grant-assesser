import type { ProgramInput } from '@/lib/schema';

const program: ProgramInput = {
  slug: 'emdg',
  name: 'Export Market Development Grants (EMDG)',
  provider: 'Austrade',
  level: 'federal',
  type: 'grant',
  benefit: { kind: 'cash', min: 20_000, max: 80_000, currency: 'AUD',
    note: 'Matched grants for export marketing. In 2025–26 and 2026–27, $20K up to $30K, $50K or $80K a year depending on tier.' },
  status: { state: 'paused', note: 'No rounds open; Round 4 closed. An independent review is complete and the Minister is considering its recommendations. No Round 5 details yet.' },
  deadlines: [],
  gates: [
    'au-entity',
    { id: 'turnover-under', aud: 20_000_000, severity: 'soft' },
  ],
  scores: { funding: 2, value: 3, effort: 3, speed: 2 },
  goalTemplate: [
    { title: 'Subscribe to the EMDG Update newsletter', offsetDays: 7 },
    { title: 'List export marketing activities you would run in the next year', offsetDays: 30 },
  ],
  content: {
    summary: 'Matched grants that help Australian SMEs market and promote their products overseas. No round is open.',
    howToApply: [
      'Wait for Austrade to announce the next round.',
      'Pick the tier that fits: ready to export, exporting in existing markets, or exporting to new key markets.',
      'Read that round\'s guidelines, then apply online before it closes.',
    ],
    prepare: [
      'A product of substantially Australian origin (software counts)',
      'A plan for eligible export marketing activities',
      'At least $20,000 of your own money to spend, and funds to match the grant',
      'Turnover records to show you meet your tier\'s minimum',
    ],
    mistakes: [
      'Budgeting on Round 4 terms before Round 5 is announced',
      'Counting domestic trips or general industry events with no foreign buyers',
    ],
    caveats: [
      'The $20M turnover limit is not confirmed on the pages checked, and Round 5 rules may change after the review. Treat it as a guide.',
      'Each tier has a minimum turnover; check the round guidelines.',
    ],
  },
  verification: {
    lastVerified: '2026-10-26',
    sources: [
      { url: 'https://www.austrade.gov.au/en/how-we-can-help-you/grants/export-market-development-grants', title: 'EMDG (Austrade)', official: true },
      { url: 'https://www.austrade.gov.au/en/how-we-can-help-you/grants/export-market-development-grants/check-eligibility/criteria', title: 'EMDG eligibility criteria and grant amounts', official: true },
    ],
  },
  changelog: [
    { date: '2026-10-26', note: 'Initial verified record' },
    { date: '2026-10-27', note: 'Grant amounts and matching rules checked on the Austrade criteria page' },
  ],
};

export default program;
