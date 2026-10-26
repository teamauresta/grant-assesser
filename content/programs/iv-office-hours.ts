import type { ProgramInput } from '@/lib/schema';

const program: ProgramInput = {
  slug: 'iv-office-hours',
  name: 'Innovation Victoria Office Hours',
  provider: 'Innovation Victoria',
  level: 'vic',
  type: 'service',
  benefit: { kind: 'service', currency: 'AUD',
    note: 'A free virtual call that points early founders to the Victorian programs, funding and networks that fit them. Navigation, not advice.' },
  status: { state: 'rolling', note: 'Book any time. Limited to one session per founder every six months.' },
  deadlines: [],
  gates: [
    { id: 'state-is', state: 'vic', severity: 'soft',
      note: 'Office Hours is open to founders with a meaningful connection to Victoria, not only Victorian companies' },
  ],
  scores: { funding: 0, value: 2, effort: 5, speed: 5 },
  goalTemplate: [
    { title: 'Write down your stage and the help you are looking for', offsetDays: 1 },
    { title: 'Book an Office Hours session', offsetDays: 2 },
    { title: 'Follow up on the programs suggested in the call', offsetDays: 14 },
  ],
  content: {
    summary: 'A free call with Innovation Victoria to find the Victorian programs, funding and networks that suit an early-stage founder.',
    howToApply: [
      'Pick a session: an introduction to the ecosystem, or getting started with your idea.',
      'Book online; the link arrives in your confirmation email.',
      'Join the virtual session with your questions ready.',
    ],
    prepare: [
      'A one-paragraph description of your venture and stage',
      'How your venture connects to Victoria',
      'Two or three specific questions about programs or funding',
    ],
    mistakes: [
      'Expecting business, legal or financial advice: the service is navigation only',
      'Booking before you can describe your venture, given one session per six months',
    ],
    caveats: [],
  },
  verification: {
    lastVerified: '2026-10-26',
    sources: [
      { url: 'https://www.innovationvictoria.com/programs', title: 'Innovation Victoria programs', official: true },
      { url: 'https://www.innovationvictoria.com/pathways/programs/office-hours', title: 'Office Hours', official: true },
    ],
  },
  changelog: [{ date: '2026-10-26', note: 'Initial verified record' }],
};

export default program;
