import type { ProgramInput } from '@/lib/schema';

const program: ProgramInput = {
  slug: 'industry-growth-program',
  name: 'Industry Growth Program',
  provider: 'Department of Industry, Science and Resources',
  level: 'federal',
  type: 'grant',
  benefit: { kind: 'cash', min: 50_000, max: 5_000_000, currency: 'AUD',
    note: 'After an adviser service: grants of $50K–$250K for early-stage commercialisation, or $100K–$5M for commercialisation and growth.' },
  status: { state: 'paused', note: 'Paused to new applications. No reopening date.' },
  deadlines: [],
  gates: [
    'au-entity',
    { id: 'turnover-under', aud: 20_000_000 },
  ],
  scores: { funding: 4, value: 4, effort: 2, speed: 1 },
  goalTemplate: [
    { title: 'Watch business.gov.au for the program to reopen', offsetDays: 30 },
    { title: 'Map your product to a National Reconstruction Fund priority area', offsetDays: 30 },
  ],
  stacking: [
    { with: 'rdti', note: 'Possible, but the grant can trigger an R&D Tax clawback adjustment. Get advice.' },
  ],
  content: {
    summary: 'Advice, then possible grants, for SMEs commercialising an innovative product in a National Reconstruction Fund priority area. Currently paused.',
    howToApply: [
      'Wait for the program to reopen.',
      'Apply for the Advisory Service and work with an Industry Growth Program Adviser.',
      'Receive the adviser\'s report with recommended priorities.',
      'If eligible, apply for a grant; awards go to the applications with the most merit.',
    ],
    prepare: [
      'A link from your product to an NRF priority area',
      'Evidence the product is new or significantly different, not a minor change',
      'Turnover figures for the last three financial years',
      'ABN and GST registration',
    ],
    mistakes: [
      'Presenting minor improvements to an existing product as innovation',
      'Planning around the grant while the program is paused',
    ],
    caveats: [
      'Must be in an NRF priority area: resources, agriculture, forestry and fisheries value-add; transport; medical science; renewables and low emissions; defence capability; or enabling capabilities. This tool does not check that.',
      'Turnover must be under $20M in each of the three financial years before applying.',
    ],
  },
  verification: {
    lastVerified: '2026-10-26',
    sources: [
      { url: 'https://business.gov.au/grants-and-programs/industry-growth-program', title: 'Industry Growth Program (business.gov.au)', official: true },
    ],
  },
  changelog: [{ date: '2026-10-26', note: 'Initial verified record' }],
};

export default program;
