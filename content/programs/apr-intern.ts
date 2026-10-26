import type { ProgramInput } from '@/lib/schema';

const program: ProgramInput = {
  slug: 'apr-intern',
  name: 'APR.Intern',
  provider: 'APR.Intern (Australian Mathematical Sciences Institute)',
  level: 'federal',
  type: 'service',
  benefit: { kind: 'service', currency: 'AUD',
    note: 'A paid service, not a grant. Ex-GST costs: 3 months $19,900; 4 months $23,200; 5 months $26,500; 6 months $29,800. Custom internships cost $2,500 less.' },
  status: { state: 'rolling', note: 'Year-round paid PhD research internships.' },
  deadlines: [],
  gates: ['au-entity'],
  scores: { funding: 0, value: 3, effort: 3, speed: 3 },
  personas: {
    bootstrapped: 'You pay the full cost; subsidies only cover some Defence and space businesses in particular states.',
  },
  goalTemplate: [
    { title: 'Scope a 3–6 month research project for a PhD intern', offsetDays: 7 },
    { title: 'Submit a project enquiry to APR.Intern', offsetDays: 14 },
    { title: 'Interview shortlisted candidates', offsetDays: 45 },
  ],
  content: {
    summary: 'Hire a PhD student for a 3–6 month research internship. You pay the stipend and a management fee.',
    howToApply: [
      'Scope a research project with a clear question and deliverable.',
      'Submit a project enquiry through APR.Intern.',
      'Review matched candidates and agree terms with the university.',
    ],
    prepare: [
      'A defined research question and deliverable',
      'Budget for the internship cost (from $19,900 ex GST for 3 months)',
      'A supervisor in your team',
      'IP and confidentiality terms you can accept',
    ],
    mistakes: [
      'Treating it as a rebate: most AI startups pay the full cost',
      'Using an intern for routine development rather than research',
    ],
    caveats: [
      'Subsidies are sector- and state-specific (for example Defence in WA).',
    ],
  },
  verification: {
    lastVerified: '2026-10-26',
    sources: [
      { url: 'https://aprintern.org.au/business-info/costs-rebates/', title: 'APR.Intern costs and subsidies', official: true },
    ],
  },
  changelog: [{ date: '2026-10-26', note: 'Initial verified record' }],
};

export default program;
