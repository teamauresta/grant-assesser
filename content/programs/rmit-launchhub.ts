import type { ProgramInput } from '@/lib/schema';

const program: ProgramInput = {
  slug: 'rmit-launchhub',
  name: 'RMIT Activator LaunchHUB',
  provider: 'RMIT University',
  level: 'university',
  type: 'accelerator',
  benefit: { kind: 'service', currency: 'AUD',
    note: 'A 12-week pre-accelerator for impact-driven startups. Participants can pitch for equity-free, interest-free funding of up to $20K.' },
  status: { state: 'closed', note: 'Applications are closed. The next intake opens in 2027.' },
  deadlines: [],
  gates: [
    { id: 'state-is', state: 'vic', severity: 'soft',
      note: 'LaunchHUB is run by RMIT in Melbourne; its page does not state a Victorian requirement' },
  ],
  scores: { funding: 1, value: 3, effort: 3, speed: 3 },
  goalTemplate: [
    { title: 'Confirm an RMIT-affiliated co-founder holds an equal or majority stake', offsetDays: 7 },
    { title: 'Map your impact to a UN Sustainable Development Goal', offsetDays: 14 },
  ],
  content: {
    summary: 'RMIT\'s 12-week pre-accelerator for social and environmental impact startups with an RMIT-affiliated founder. The next intake opens in 2027.',
    howToApply: [
      'Check you have an RMIT-affiliated co-founder and a clear social or environmental impact.',
      'Watch the LaunchHUB page for the 2027 intake.',
      'Apply when applications open.',
    ],
    prepare: [
      'An RMIT student, staff member or alumnus as co-founder',
      'A clear social or environmental impact, ideally linked to a UN Sustainable Development Goal',
      'A mission-driven team',
    ],
    mistakes: [
      'Applying with a purely commercial idea and no impact focus',
      'Applying without an RMIT-affiliated founder holding enough equity',
    ],
    caveats: [
      'Needs an RMIT-affiliated co-founder, and RMIT-affiliated founders must hold an equal or combined majority stake. This tool does not check RMIT affiliation.',
    ],
  },
  verification: {
    lastVerified: '2026-10-26',
    sources: [
      { url: 'https://www.rmit.edu.au/partner/hubs/activator/launch-hub', title: 'RMIT Activator LaunchHUB', official: true },
    ],
  },
  changelog: [{ date: '2026-10-26', note: 'Initial verified record' }],
};

export default program;
