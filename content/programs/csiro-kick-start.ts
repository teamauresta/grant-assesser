import type { ProgramInput } from '@/lib/schema';

const program: ProgramInput = {
  slug: 'csiro-kick-start',
  name: 'CSIRO Kick-Start',
  provider: 'CSIRO',
  level: 'federal',
  type: 'voucher',
  benefit: { kind: 'cash', min: 20_000, max: 60_000, currency: 'AUD',
    note: 'CSIRO matches your cash dollar for dollar, paid to CSIRO for research. Up to two vouchers.' },
  status: { state: 'rolling', note: 'Year-round expressions of interest. Approval depends on CSIRO capability and funds.' },
  deadlines: [],
  gates: [
    'au-entity', 'gst-registered', 'not-foreign-subsidiary',
    { id: 'turnover-or-age', turnoverUnder: 10_000_000, yearsUnder: 3 },
    { id: 'cash-match', min: 20_000 },
    'experimental-activities',
  ],
  scores: { funding: 3, value: 5, effort: 3, speed: 3 },
  personas: {
    bootstrapped: 'The cash match is the binding constraint: budget it before the EOI.',
    'vc-backed': 'Use it to de-risk one technical question investors keep asking about.',
  },
  goalTemplate: [
    { title: 'Write a 2–3 page EOI around one research question', offsetDays: 7 },
    { title: 'Submit the Kick-Start EOI', offsetDays: 10 },
    { title: 'Meet the matched CSIRO researcher', offsetDays: 45 },
    { title: 'Agree IP and commercial-use terms', offsetDays: 60 },
    { title: 'Sign the agreement (within 60 days of offer)', offsetDays: 90 },
  ],
  stacking: [{ with: 'rdti', note: 'Possible, but the grant can trigger an R&D Tax clawback adjustment. Get advice.' }],
  content: {
    summary: 'A matched voucher that pays CSIRO to research one technical problem with you.',
    howToApply: [
      'Submit an expression of interest describing the research question.',
      'CSIRO reviews it within about five working days.',
      'CSIRO matches you with a researcher, usually within two to six weeks.',
      'Develop the full application with the researcher, then sign within 60 days.',
    ],
    prepare: [
      'One commercially decisive technical uncertainty',
      'Dataset description and permission to use it',
      'Evidence of ACN, GST registration and eligibility',
      'Cash for the match (in-kind does not count)',
    ],
    mistakes: [
      'Asking for routine app development or customer introductions',
      'Signing before agreeing IP and commercial-use rights',
    ],
    caveats: [
      'CSIRO words the turnover test two ways: the guidelines say the last complete financial year; the FAQ says the current and two previous years. Confirm with kickstart@csiro.au.',
    ],
  },
  verification: {
    lastVerified: '2026-10-26',
    sources: [
      { url: 'https://www.csiro.au/en/work-with-us/funding-programs/SME/CSIRO-Kick-Start/Eligibility-and-funding', title: 'Kick-Start eligibility and funding', official: true },
      { url: 'https://www.csiro.au/en/work-with-us/funding-programs/SME/CSIRO-Kick-Start/FAQs', title: 'Kick-Start FAQs', official: true },
    ],
  },
  changelog: [{ date: '2026-10-26', note: 'Initial verified record' }],
};

export default program;
