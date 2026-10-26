import type { ProgramInput } from '@/lib/schema';

const program: ProgramInput = {
  slug: 'worksafe-rtw-trials',
  name: 'WorkSafe Return to Work Innovation Trials',
  provider: 'WorkSafe Victoria',
  level: 'vic',
  type: 'grant',
  benefit: { kind: 'cash', max: 1_250_000, currency: 'AUD', consortium: true,
    note: 'Up to $1.25M per trial, paid to a lead organisation running a consortium. It funds the trial, not company working capital.' },
  status: { state: 'open', note: 'Competitive round. Applications close 2pm, 27 November 2026 (Melbourne time).' },
  deadlines: [
    { label: 'Applications close', kind: 'close', date: '2026-11-27', time: '14:00', tz: 'Australia/Melbourne' },
  ],
  gates: [
    { id: 'sector-any', sectors: ['construction', 'manufacturing', 'health'],
      note: 'Eligible industries are construction, manufacturing, and health care and social assistance' },
    { id: 'industry-partners', count: 2,
      note: 'The consortium must include industry or sector bodies, union representation and trial workplaces' },
    { id: 'research-partner', min: 'active', severity: 'soft',
      note: 'Every consortium needs an independent evaluation partner' },
    { id: 'gst-registered', note: 'The lead applicant needs an ABN and GST registration' },
  ],
  scores: { funding: 5, value: 4, effort: 1, speed: 2 },
  personas: {
    bootstrapped: 'Leading a trial needs experience running large projects. Consider joining a consortium as the technology partner instead.',
  },
  goalTemplate: [
    { title: 'Read the trial guidelines and pick an eligible industry or cohort', beforeDeadlineBusinessDays: 20 },
    { title: 'Secure an independent evaluator, industry bodies, a union and experts', beforeDeadlineBusinessDays: 15 },
    { title: 'Agree trial workplaces and IP terms with partners', beforeDeadlineBusinessDays: 10 },
    { title: 'Submit the application a day early', beforeDeadlineBusinessDays: 1 },
  ],
  stacking: [
    { with: 'rdti', note: 'Possible, but the grant can trigger an R&D Tax clawback adjustment. Get advice.' },
  ],
  content: {
    summary: 'WorkSafe Victoria funds consortium-led trials of new ways to help injured workers recover and return to work, up to $1.25M each.',
    howToApply: [
      'Read the guidelines and choose an eligible industry or cohort.',
      'Build a consortium with every required partner.',
      'Design a trial delivered in Victoria for Victorian workers and employers.',
      'The lead organisation applies through WorkSafe\'s online application portal before the close.',
    ],
    prepare: [
      'A recovery or return-to-work problem in an eligible industry',
      'An independent evaluation partner',
      'Industry or sector bodies, union representation and subject matter experts',
      'Trial workplaces willing to take part',
      'Evidence of experience leading complex, large-scale projects',
    ],
    mistakes: [
      'Pitching generic workplace AI instead of recovery and return-to-work outcomes',
      'Treating the consortium\'s grant as startup cash',
      'Submitting close to the deadline while the time zone is unclear',
    ],
    caveats: [
      'The page says 2pm AEST, but daylight saving applies on 27 November, so the real close is 2pm AEDT (Melbourne time). Submit early and confirm with WorkSafe.',
      'Organisations can be based outside Victoria, but the trial must be delivered in Victoria.',
    ],
  },
  verification: {
    lastVerified: '2026-10-26',
    sources: [
      { url: 'https://www.worksafe.vic.gov.au/return-work-innovations-trials', title: 'Return to Work Innovation Trials (WorkSafe Victoria)', official: true },
    ],
  },
  changelog: [
    { date: '2026-10-26', note: 'Initial verified record' },
    { date: '2026-10-27', note: 'Added the GST registration check from the "Who can apply?" FAQ on the WorkSafe page' },
  ],
};

export default program;
