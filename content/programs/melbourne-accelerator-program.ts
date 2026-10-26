import type { ProgramInput } from '@/lib/schema';

const program: ProgramInput = {
  slug: 'melbourne-accelerator-program',
  name: 'Melbourne Accelerator Program (MAP)',
  provider: 'University of Melbourne',
  level: 'university',
  type: 'accelerator',
  benefit: { kind: 'cash', currency: 'AUD',
    note: 'Mentorship, strategic guidance and funding for early startups. The funding amount is not verified here.' },
  status: { state: 'closed', note: '2026 applications closed 14 June. You can register interest for the next cohort.' },
  deadlines: [],
  gates: [
    { id: 'state-is', state: 'vic', severity: 'soft',
      note: 'MAP is based in Melbourne; its apply page does not state a Victorian requirement' },
  ],
  scores: { funding: 2, value: 4, effort: 3, speed: 3 },
  goalTemplate: [
    { title: 'Check which MAP eligibility pathway you fit', offsetDays: 7 },
    { title: 'Register interest for the next MAP cohort', offsetDays: 10 },
  ],
  content: {
    summary: 'The University of Melbourne\'s accelerator, offering mentorship and funding. The 2026 round has closed.',
    howToApply: [
      'Check you fit one of the three eligibility pathways.',
      'Register interest on the MAP apply page.',
      'Apply when the next cohort opens.',
    ],
    prepare: [
      'Evidence of your eligibility pathway (University affiliation, social impact or climate focus)',
      'A clear problem worth solving and early traction',
      'Plans for growing the team',
    ],
    mistakes: [
      'Applying without fitting one of the three pathways',
      'Waiting for the next round without registering interest',
    ],
    caveats: [
      'MAP has three eligibility pathways: University of Melbourne affiliated; social impact at the core (sponsored by the Cameron Foundation); or addressing the climate crisis (sponsored by Melbourne Climate Futures). This tool does not check them.',
    ],
  },
  verification: {
    lastVerified: '2026-10-26',
    sources: [
      { url: 'https://www.themap.co/apply', title: 'Melbourne Accelerator Program: Apply', official: true },
    ],
  },
  changelog: [{ date: '2026-10-26', note: 'Initial verified record' }],
};

export default program;
