import type { ProgramInput } from '@/lib/schema';

const program: ProgramInput = {
  slug: 'defence-industry-development',
  name: 'Defence Industry Development Grants',
  provider: 'Department of Defence',
  level: 'federal',
  type: 'grant',
  benefit: { kind: 'cash', min: 10_000, max: 250_000, currency: 'AUD',
    note: 'Exports stream $15K–$250K; Security stream $10K–$100K. Grants cover up to 50% of eligible spending.' },
  status: { state: 'unverified', note: 'Program being updated. Sovereign Industrial Priorities is temporarily closed. New guidelines are expected by 3 November 2026, when all streams reopen.' },
  deadlines: [
    { label: 'Exports & Security batch closes', kind: 'close', date: '2026-10-31', time: '23:59', tz: 'Australia/Brisbane' },
  ],
  gates: [
    'au-entity',
    { id: 'sector-any', sectors: ['defence'] },
  ],
  scores: { funding: 3, value: 3, effort: 2, speed: 2 },
  goalTemplate: [
    { title: 'Decide: apply in this batch or wait for the new guidelines', beforeDeadlineBusinessDays: 3 },
    { title: 'Prepare the project budget, quotes and your 50% contribution', beforeDeadlineBusinessDays: 2 },
    { title: 'Submit the application in the business grants portal', beforeDeadlineBusinessDays: 1 },
  ],
  stacking: [
    { with: 'rdti', note: 'Possible, but the grant can trigger an R&D Tax clawback adjustment. Get advice.' },
  ],
  content: {
    summary: 'Grants for Australian defence-industry SMEs to export, improve security, buy equipment or build skills. The program is changing.',
    howToApply: [
      'Pick the stream that fits your project and read its grant opportunity guidelines.',
      'Check you are an eligible SME: ABN, GST registered, fewer than 200 employees, incorporated in Australia.',
      'Apply in the business grants portal before the batch closing date.',
    ],
    prepare: [
      'A project with a clear link to the Sovereign Defence Industrial Priorities',
      'A budget and quotes for eligible spending',
      'Cash to fund at least half the project',
      'A plan to finish the project by 31 March 2028',
    ],
    mistakes: [
      'Applying without an established defence project or customer',
      'Starting a long application now when guidelines change within days',
    ],
    caveats: [
      'The page says the Sovereign Industrial Priorities stream is temporarily closed but also lists a 30 November 2026 batch date for it. Confirm with industry.grants@defence.gov.au.',
      'Closing times are published in AEST.',
      'The program has been extended to 2030 with an extra $80M; new guidelines may change amounts and eligibility.',
    ],
  },
  verification: {
    lastVerified: '2026-10-26',
    sources: [
      { url: 'https://business.gov.au/grants-and-programs/defence-industry-development-grants-program', title: 'Defence Industry Development Grants (business.gov.au)', official: true },
    ],
  },
  changelog: [
    { date: '2026-10-26', note: 'Initial verified record' },
    { date: '2026-10-27', note: 'Amounts, eligibility and stream status re-checked on business.gov.au' },
  ],
};

export default program;
