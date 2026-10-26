import type { ProgramInput } from '@/lib/schema';

const program: ProgramInput = {
  slug: 'crc-ai-accelerator',
  name: 'CRC AI Accelerator (Round 28)',
  provider: 'Department of Industry, Science and Resources',
  level: 'federal',
  type: 'grant',
  benefit: { kind: 'cash', currency: 'AUD', consortium: true,
    note: 'About $50M for one new AI-focused Cooperative Research Centre. Awarded to a large consortium, not to a single company.' },
  status: { state: 'upcoming', note: 'About $50M round opening in 2027. No dates or guidelines yet.' },
  deadlines: [],
  gates: [
    'au-entity',
    { id: 'research-partner', min: 'active' },
  ],
  scores: { funding: 5, value: 5, effort: 1, speed: 1 },
  personas: {
    bootstrapped: 'A startup is far more likely to join a bid as a participant than to lead one.',
  },
  goalTemplate: [
    { title: 'Subscribe to CRC Program updates', offsetDays: 7 },
    { title: 'Ask your research partners whether they are forming an AI CRC bid', offsetDays: 60 },
  ],
  stacking: [
    { with: 'crc-p', note: 'Different program: CRC-P funds short projects; this round funds a long-term centre.' },
  ],
  content: {
    summary: 'A 2027 round of the Cooperative Research Centres program for one new AI centre. This is the long-term CRC program, not CRC-P.',
    howToApply: [
      'Wait for the round guidelines, expected in 2027.',
      'Find out which universities and industry groups are forming a bid.',
      'Join a consortium as a participant with a clear contribution.',
    ],
    prepare: [
      'A research problem that fits a national AI centre',
      'Relationships with likely lead universities',
      'An idea of the cash or in-kind contribution you could commit',
    ],
    mistakes: [
      'Confusing it with CRC-P',
      'Counting the consortium\'s funding as company cash',
    ],
    caveats: [
      'Announced in a ministerial release on 11 March 2026. Amounts, dates and eligibility will be set by the round guidelines.',
    ],
  },
  verification: {
    lastVerified: '2026-10-26',
    sources: [
      { url: 'https://www.minister.industry.gov.au/t-ayres/media/albanese-government-backing-cooperative-research-66-million-grant-funding', title: 'Ministerial release, 11 March 2026', official: true },
      { url: 'https://www.industry.gov.au/science-technology-and-innovation/industry-innovation/cooperative-research-centres-program', title: 'Cooperative Research Centres program', official: true },
    ],
  },
  changelog: [{ date: '2026-10-26', note: 'Initial verified record' }],
};

export default program;
