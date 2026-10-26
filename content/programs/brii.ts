import type { ProgramInput } from '@/lib/schema';

const program: ProgramInput = {
  slug: 'brii',
  name: 'Business Research and Innovation Initiative (BRII)',
  provider: 'Department of Industry, Science and Resources',
  level: 'federal',
  type: 'grant',
  benefit: { kind: 'cash', max: 100_000, currency: 'AUD',
    note: 'Up to $100K to test feasibility of a solution to a government challenge. Successful grantees may be invited to apply for up to $1M for a proof of concept.' },
  status: { state: 'closed', note: 'No rounds currently open.' },
  deadlines: [],
  gates: ['au-entity'],
  scores: { funding: 3, value: 4, effort: 2, speed: 2 },
  goalTemplate: [
    { title: 'Check business.gov.au for a new BRII challenge round', offsetDays: 30 },
    { title: 'Note government challenges your product already solves', offsetDays: 30 },
  ],
  content: {
    summary: 'Competitive grants for startups and SMEs to solve a specific government policy or service-delivery challenge. No round is open.',
    howToApply: [
      'Watch for a new round and its published challenges.',
      'Apply for a feasibility grant against a challenge that fits your product.',
      'If feasibility succeeds, you may be invited to apply for proof-of-concept funding.',
    ],
    prepare: [
      'A product that answers a published government challenge',
      'A feasibility plan with clear tests',
      'Evidence of your team\'s ability to deliver',
    ],
    mistakes: [
      'Bending the product to fit a challenge that does not match your customers',
      'Planning on the $1M stage: it is by invitation only',
    ],
  },
  verification: {
    lastVerified: '2026-10-26',
    sources: [
      { url: 'https://business.gov.au/grants-and-programs/business-research-and-innovation-initiative', title: 'BRII (business.gov.au)', official: true },
    ],
  },
  changelog: [{ date: '2026-10-26', note: 'Initial verified record' }],
};

export default program;
