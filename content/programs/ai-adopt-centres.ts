import type { ProgramInput } from '@/lib/schema';

const program: ProgramInput = {
  slug: 'ai-adopt-centres',
  name: 'AI Adopt Centres',
  provider: 'Department of Industry, Science and Resources',
  level: 'federal',
  type: 'service',
  benefit: { kind: 'service', currency: 'AUD',
    note: 'Free specialist services: training, one-on-one consultations, AI adoption roadmaps, technology demonstrations and AI safety guidance.' },
  status: { state: 'rolling', note: 'Centres provide free services to eligible SMEs. The grant that set up the centres is closed.' },
  deadlines: [],
  gates: [
    'au-entity',
    { id: 'sector-any', sectors: ['health', 'manufacturing', 'energy', 'agriculture', 'defence'], severity: 'soft' },
  ],
  scores: { funding: 0, value: 3, effort: 4, speed: 4 },
  goalTemplate: [
    { title: 'Pick the AI Adopt Centre that covers your sector', offsetDays: 3 },
    { title: 'Book a consultation or roadmap session', offsetDays: 14 },
  ],
  content: {
    summary: 'Free AI adoption help for SMEs in National Reconstruction Fund priority sectors. It is a service, not a grant.',
    howToApply: [
      'Read the centre list on business.gov.au: SMEC AI, ARM Hub, SAAM and ARAIN.',
      'Choose the centre that matches your sector or region.',
      'Contact the centre and check its eligibility for your business.',
    ],
    prepare: [
      'A short description of your business and sector',
      'One or two problems you want AI help with',
      'Evidence that you trade interstate or internationally',
    ],
    mistakes: [
      'Treating the closed centre-establishment grant as a startup grant',
      'Expecting funding: the centres provide services, not cash',
    ],
    caveats: [
      'Centres serve SMEs that trade interstate or internationally in NRF priority sectors. Each centre sets its own focus (for example ARM Hub: manufacturing; ARAIN: regional agriculture, forestry, fisheries and renewables). The sector check is a guide only.',
      'Some centre services carry a fee (for example ARM Hub\'s AI-as-a-service).',
    ],
  },
  verification: {
    lastVerified: '2026-10-26',
    sources: [
      { url: 'https://business.gov.au/expertise-and-advice/ai-adopt-centres', title: 'AI Adopt Centres (business.gov.au)', official: true },
      { url: 'https://business.gov.au/grants-and-programs/artificial-intelligence-ai-adopt-program', title: 'AI Adopt Program (business.gov.au)', official: true },
    ],
  },
  changelog: [{ date: '2026-10-26', note: 'Initial verified record' }],
};

export default program;
