import type { ProgramInput } from '@/lib/schema';

const program: ProgramInput = {
  slug: 'iv-basecamp-ascent',
  name: 'Innovation Victoria Basecamp: Ascent',
  provider: 'Innovation Victoria',
  level: 'vic',
  type: 'service',
  benefit: { kind: 'service', currency: 'AUD',
    note: 'A free, short cohort program on hiring and team growth for Victorian founders and CEOs.' },
  status: { state: 'open', note: 'Applications open now. The program starts online on 10 November 2026.' },
  deadlines: [
    { label: 'Applications close', kind: 'close', date: '2026-10-29', time: '13:00', tz: 'Australia/Melbourne' },
  ],
  gates: [
    { id: 'state-is', state: 'vic', note: 'You must live in Victoria or run a Victorian-based company' },
  ],
  scores: { funding: 0, value: 3, effort: 4, speed: 4 },
  personas: {
    bootstrapped: 'Worth it only if you plan to hire in the next three to six months and can fund the role.',
  },
  goalTemplate: [
    { title: 'Create or update your company\'s Dealroom profile', beforeDeadlineBusinessDays: 1 },
    { title: 'Apply with the hiring decision you will work on', beforeDeadlineBusinessDays: 0 },
  ],
  content: {
    summary: 'A free Innovation Victoria program that helps founders plan their first or next hires, using a live hiring decision in their own company.',
    howToApply: [
      'Check you live in Victoria or your company is Victorian-based.',
      'Make sure your company has a current Dealroom profile.',
      'Apply through the Basecamp: Ascent page before the closing time.',
      'If selected, attend the kick-off, three online sessions and the closing event.',
    ],
    prepare: [
      'A genuine hiring or workforce decision for the next three to six months',
      'Evidence of funding or revenue to support the hire',
      'A current Dealroom profile for your company',
      'Time for a kick-off, three 90-minute sessions and an in-person closing event',
    ],
    mistakes: [
      'Applying without a near-term hire to work on',
      'Missing the Dealroom profile requirement',
    ],
    caveats: [
      'The Innovation Victoria programs list shows no close date, but the program page (checked 27 October 2026) says applications close at 1pm on 29 October 2026.',
    ],
  },
  verification: {
    lastVerified: '2026-10-26',
    sources: [
      { url: 'https://www.innovationvictoria.com/programs', title: 'Innovation Victoria programs', official: true },
      { url: 'https://www.innovationvictoria.com/pathways/programs/basecamp-ascent', title: 'Basecamp: Ascent', official: true },
    ],
  },
  changelog: [
    { date: '2026-10-26', note: 'Initial verified record' },
    { date: '2026-10-27', note: 'Close date and eligibility added from the program page' },
  ],
};

export default program;
