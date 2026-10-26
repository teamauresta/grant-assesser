import type { ProgramInput } from '@/lib/schema';

const program: ProgramInput = {
  slug: 'crc-p',
  name: 'Cooperative Research Centres Projects (CRC-P)',
  provider: 'Department of Industry, Science and Resources',
  level: 'federal',
  type: 'grant',
  benefit: { kind: 'cash', min: 100_000, max: 3_000_000, currency: 'AUD', consortium: true,
    note: 'Grant to a consortium for up to 3 years. Partners must at least match it in cash and/or in-kind. It is shared across the project, not company cash.' },
  status: { state: 'unverified', note: 'Round 20 not confirmed on business.gov.au or GrantConnect. The official page says closed; Round 19 closed 12 May 2026 with outcomes expected October 2026.' },
  deadlines: [],
  gates: [
    'au-entity',
    'gst-registered',
    { id: 'research-partner', min: 'active' },
    { id: 'industry-partners', count: 1 },
    { id: 'cash-match', min: 100_000, severity: 'soft' },
  ],
  scores: { funding: 5, value: 5, effort: 1, speed: 1 },
  personas: {
    bootstrapped: 'Leading a bid is heavy. If you lack partners and contributions, look for an existing consortium to join instead.',
  },
  goalTemplate: [
    { title: 'Confirm whether a CRC-P round is open and read its guidelines', offsetDays: 3 },
    { title: 'Get a written commitment from an Australian research organisation', offsetDays: 21 },
    { title: 'Secure a second Australian industry partner', offsetDays: 30 },
    { title: 'Draft the contribution schedule in the CRC-P financial workbook', offsetDays: 45 },
  ],
  stacking: [
    { with: 'rdti', note: 'Possible. CRC Program recoupments are exempt from R&D Tax clawback; confirm with your adviser how that applies to your project.' },
    { with: 'csiro-kick-start', note: 'A Kick-Start project can prove the research case before a larger CRC-P bid. Avoid funding the same work twice.' },
  ],
  content: {
    summary: 'Matched funding for a short, industry-led research project run by an SME with another industry partner and a research organisation.',
    howToApply: [
      'Check business.gov.au and GrantConnect for an open round and its guidelines.',
      'Form the consortium: your SME as lead, a second Australian industry organisation and one Australian research organisation.',
      'Agree roles, contributions and IP in principle with every partner.',
      'The lead SME submits the application in the business grants portal before the round closes.',
    ],
    prepare: [
      'A real industry problem and a research plan to solve it',
      'Partner commitments with authorised sign-off',
      'A contribution schedule in the CRC-P application financial workbook',
      'Milestones, governance and IP arrangements',
      'Evidence you can deliver: people, facilities and cash',
    ],
    mistakes: [
      'Assembling nominal partners',
      'Overstating in-kind contributions',
      'Proposing routine implementation rather than research',
      'Treating the consortium\'s grant as startup working capital',
    ],
    caveats: [
      'Round 20 dates and terms are not confirmed. Flinders University lists Round 20 as "second half 2026" without dates. Do not reuse Round 19\'s dates.',
      'The cash-match check is soft: contributions can be cash and/or in-kind, but must at least match the grant.',
      'The lead must be an SME incorporated in Australia, a trading corporation, with an ABN and GST registration.',
    ],
  },
  verification: {
    lastVerified: '2026-10-26',
    sources: [
      { url: 'https://business.gov.au/grants-and-programs/cooperative-research-centres-projects-crcp-grants', title: 'CRC-P grants (business.gov.au)', official: true },
      { url: 'https://www.grants.gov.au/', title: 'GrantConnect', official: true },
      { url: 'https://staff.flinders.edu.au/research/funding/industry-and-government', title: 'Flinders University funding calendar', official: false },
    ],
  },
  changelog: [{ date: '2026-10-26', note: 'Initial verified record' }],
};

export default program;
