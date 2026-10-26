import type { ProgramInput } from '@/lib/schema';

const program: ProgramInput = {
  slug: 'csiro-innovate-to-grow',
  name: 'CSIRO Innovate to Grow',
  provider: 'CSIRO',
  level: 'federal',
  type: 'service',
  benefit: { kind: 'service', currency: 'AUD',
    note: 'Free 8-week online program with expert facilitators and an R&D coach, to help you plan a collaborative R&D project.' },
  status: { state: 'upcoming', note: 'Intakes are monthly and sector-specific. The DigiTech & AI intake was Queensland-only and closed 27 September 2026. No Victorian or national intake is open.' },
  deadlines: [],
  gates: ['au-entity'],
  scores: { funding: 0, value: 3, effort: 3, speed: 2 },
  goalTemplate: [
    { title: 'Subscribe to Innovate to Grow updates for your sector', offsetDays: 3 },
    { title: 'Write down the innovation challenge question you want to work on', offsetDays: 14 },
  ],
  stacking: [
    { with: 'csiro-kick-start', note: 'Use the program to shape an R&D question, then take it to a Kick-Start EOI.' },
  ],
  content: {
    summary: 'A free 8-week online CSIRO course that helps SMEs plan an R&D project and a funding application.',
    howToApply: [
      'Subscribe for updates or follow CSIRO on LinkedIn to see when your sector\'s intake opens.',
      'Submit an expression of interest during an open intake for your sector.',
      'Complete the eight weeks with a facilitator and R&D coach.',
    ],
    prepare: [
      'An innovation challenge or idea you want to test',
      'About eight weeks of founder time for the course',
      'Notes on what you already know and what is uncertain',
    ],
    mistakes: [
      'Applying to an intake for another state or sector',
      'Expecting funding: it is training, not a grant',
    ],
  },
  verification: {
    lastVerified: '2026-10-26',
    sources: [
      { url: 'https://www.csiro.au/en/work-with-us/funding-programs/SME/Innovate-to-Grow', title: 'Innovate to Grow (CSIRO)', official: true },
    ],
  },
  changelog: [
    { date: '2026-10-26', note: 'Initial verified record' },
    { date: '2026-10-27', note: 'Course format checked on the CSIRO program page' },
  ],
};

export default program;
