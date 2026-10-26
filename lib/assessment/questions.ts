import type { Profile } from '@/lib/schema';
import { PERSONAS, SECTORS, STACK, STATES } from '@/lib/schema';
import { PERSONAS_INFO } from '@/lib/personas';
import { SECTOR_LABELS, STACK_LABELS, STATE_LABELS, capitalise } from '@/lib/format';

export type Step = 1 | 2 | 3 | 4 | 5 | 6;
export type QuestionType = 'single' | 'multi' | 'boolean' | 'date' | 'month' | 'number' | 'text' | 'credits';
export type OptionValue = string | number | boolean;
export type QuestionOption = { value: OptionValue; label: string; description?: string };

export type Question = {
  id: keyof Profile;
  step: Step;
  type: QuestionType;
  label: string;
  /** Shown under the label. Every question has one. */
  help?: string;
  options?: QuestionOption[];
  /** Marked "(optional)" in the wizard. Every question can be skipped; this one is also personal. */
  optional?: boolean;
  /** Set when an option already lets the user decline (e.g. "Prefer not to say"), so no "Not sure" is added. */
  noUnsure?: boolean;
  /** Multi-choice only: adds a "None of these" choice, stored as an empty list. */
  noneOption?: string;
  /** The question is asked only when this returns true. */
  showIf?: (p: Profile) => boolean;
};

export const STEP_COUNT = 6;

export const STEPS: { step: Step; title: string; intro: string }[] = [
  { step: 1, title: 'You', intro: 'Where your company is today. This changes how results are ranked and worded.' },
  { step: 2, title: 'Company', intro: 'The basics most programs check first.' },
  { step: 3, title: 'Money', intro: 'Turnover, funding history and cash on hand. Bands are enough; nothing leaves this browser.' },
  { step: 4, title: 'Product and R&D', intro: 'What you build and how much of it is genuine R&D.' },
  { step: 5, title: 'Partners and market', intro: 'Research and industry partners, your sector and evidence from customers.' },
  { step: 6, title: 'Capacity', intro: 'How much time you can give applications, and how soon you need the money.' },
];

const yesNo = (yes = 'Yes', no = 'No'): QuestionOption[] => [{ value: true, label: yes }, { value: false, label: no }];

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export const QUESTIONS: Question[] = [
  // Step 1: You
  {
    id: 'persona', step: 1, type: 'single', label: 'Which best describes your company?',
    help: 'You can change this at any time. It sets which programs are ranked first; nothing is hidden.',
    options: PERSONAS.map((p) => ({ value: p, label: PERSONAS_INFO[p].label, description: PERSONAS_INFO[p].description })),
  },
  {
    id: 'companyName', step: 1, type: 'text', label: 'Company name',
    help: 'Used only to title your plan and report.',
  },

  // Step 2: Company
  {
    id: 'hasAcn', step: 2, type: 'boolean', label: 'Do you have an Australian company with an ACN?',
    help: 'Most grants and the R&D Tax Incentive need an Australian Pty Ltd company, not a sole trader or trust.',
    options: yesNo('Yes', 'Not yet'),
  },
  {
    id: 'gstRegistered', step: 2, type: 'boolean', label: 'Is the company registered for GST?',
    help: 'Several state and federal grants require GST registration at the time you apply.',
    options: yesNo(),
  },
  {
    id: 'incorporatedOn', step: 2, type: 'date', label: 'When was the company incorporated?',
    help: 'The date on your ASIC certificate of registration. Many startup programs have an age limit.',
  },
  {
    id: 'foreignSubsidiary', step: 2, type: 'boolean', label: 'Is the company a subsidiary of a foreign company?',
    help: 'Answer yes if an overseas entity owns or controls the Australian company.',
    options: yesNo('Yes, a foreign company controls it', 'No'),
  },
  {
    id: 'state', step: 2, type: 'single', label: 'Where is the company based?',
    help: 'The state of your main place of business. State programs are only open to local companies.',
    options: STATES.map((s) => ({ value: s, label: STATE_LABELS[s] })),
  },
  {
    id: 'fyEndMonth', step: 2, type: 'month', label: 'When does your financial year end?',
    help: 'Used to work out R&D Tax Incentive registration deadlines. If you are not sure, we use 30 June, the standard Australian year.',
    options: MONTHS.map((m, i) => ({ value: i + 1, label: i === 5 ? `${m} (standard)` : m })),
  },

  // Step 3: Money
  {
    id: 'turnover', step: 3, type: 'single', label: 'Aggregated annual turnover',
    help: 'Revenue across the company and any connected or affiliated entities, for the last financial year.',
    options: [
      { value: 'under-1m', label: 'Under $1M' },
      { value: '1m-10m', label: '$1M to $10M' },
      { value: '10m-20m', label: '$10M to $20M' },
      { value: '20m-50m', label: '$20M to $50M' },
      { value: 'over-50m', label: 'Over $50M' },
    ],
  },
  {
    id: 'fundingStage', step: 3, type: 'single', label: 'Latest funding round',
    help: 'The most recent round you have closed, not one you are raising now.',
    options: [
      { value: 'none', label: 'None yet', description: 'Self-funded or customer-funded' },
      { value: 'angel', label: 'Angel', description: 'Individuals, friends and family' },
      { value: 'pre-seed', label: 'Pre-seed' },
      { value: 'seed', label: 'Seed' },
      { value: 'series-a', label: 'Series A' },
      { value: 'series-b', label: 'Series B' },
      { value: 'series-c-plus', label: 'Series C or later' },
    ],
  },
  {
    id: 'lastRoundOn', step: 3, type: 'date', label: 'When did that round close?',
    help: 'Some credit programs only accept rounds closed within a set time, for example Series A within 12 months.',
    showIf: (p) => p.fundingStage !== undefined && p.fundingStage !== 'none',
  },
  {
    id: 'vcBacked', step: 3, type: 'boolean', label: 'Is an institutional venture capital fund an investor?',
    help: 'A VC fund, not angels, grants or crowdfunding. Pre-filled from your persona; change it if it is wrong.',
    options: yesNo('Yes, a VC fund has invested', 'No'),
  },
  {
    id: 'acceleratorMember', step: 3, type: 'boolean', label: 'Are you in, or have you completed, an accelerator?',
    help: 'Some credit programs accept a referral from a partner accelerator instead of a VC.',
    options: yesNo(),
  },
  {
    id: 'cashMatch', step: 3, type: 'single', label: 'Cash you could put towards a matched grant',
    help: 'Matched grants pay part of a project and you fund the rest. Count cash you could commit in the next 12 months.',
    options: [
      { value: 'none', label: 'None' },
      { value: 'under-20k', label: 'Under $20K' },
      { value: '20k-60k', label: '$20K to $60K' },
      { value: '60k-250k', label: '$60K to $250K' },
      { value: 'over-250k', label: 'Over $250K' },
    ],
  },
  {
    id: 'priorCreditsUsd', step: 3, type: 'credits', label: 'Cloud credits already received',
    help: 'Total credits each provider has given you, in US dollars. Enter 0 if none; leave blank if you do not know. Most startup tiers cap prior credits.',
  },

  // Step 4: Product and R&D
  {
    id: 'businessModel', step: 4, type: 'single', label: 'How do you make money?',
    help: 'Several programs exclude consultancies and agencies that build for clients.',
    options: [
      { value: 'product', label: 'Our own product', description: 'Software or hardware we own and sell' },
      { value: 'services', label: 'Services', description: 'Consulting, agency or contract development' },
      { value: 'mixed', label: 'Both', description: 'A product, plus some services revenue' },
    ],
  },
  {
    id: 'hasMvp', step: 4, type: 'boolean', label: 'Do you have a working MVP?',
    help: 'Something real users can use today, even in a limited pilot.',
    options: yesNo(),
  },
  {
    id: 'hasWebsite', step: 4, type: 'boolean', label: 'Do you have a working website on your company domain?',
    help: 'Credit programs often check this to confirm the company is real.',
    options: yesNo(),
  },
  {
    id: 'stack', step: 4, type: 'multi', label: 'Which platforms and models do you build on?',
    help: 'Choose all that apply. Some credit programs expect their platform in your product.',
    options: STACK.map((s) => ({ value: s, label: STACK_LABELS[s] })),
    noneOption: 'None of these',
  },
  {
    id: 'experimental', step: 4, type: 'boolean', label: 'Is some of your work genuinely experimental?',
    help: "Work where the outcome can't be known in advance, even by an expert, and you run experiments to find out.",
    options: yesNo(),
  },
  {
    id: 'rdSpend', step: 4, type: 'single', label: 'R&D spend this financial year',
    help: 'Salaries, contractors and cloud costs for the experimental work. The R&D Tax Incentive needs more than $20K.',
    options: [
      { value: 'under-20k', label: 'Under $20K' },
      { value: '20k-100k', label: '$20K to $100K' },
      { value: '100k-500k', label: '$100K to $500K' },
      { value: 'over-500k', label: 'Over $500K' },
    ],
  },
  {
    id: 'contemporaneousRecords', step: 4, type: 'boolean', label: 'Do you record R&D as it happens?',
    help: 'Hypotheses, experiments and results logged at the time, for example in tickets, notebooks or commits.',
    options: yesNo(),
  },

  // Step 5: Partners and market
  {
    id: 'researchPartner', step: 5, type: 'single', label: 'Relationship with a university or research organisation',
    help: 'CSIRO and university programs need a research partner; collaborative grants need a committed one.',
    options: [
      { value: 'none', label: 'None' },
      { value: 'informal', label: 'Informal contact', description: 'Conversations, no project yet' },
      { value: 'active', label: 'Active collaboration', description: 'Working together on a project' },
      { value: 'formal', label: 'Formal agreement', description: 'Signed research agreement' },
    ],
  },
  {
    id: 'industryPartners', step: 5, type: 'number', label: 'Committed industry partners',
    help: 'Other companies that would formally join a collaborative project. Enter 0 if none.',
  },
  {
    id: 'sectors', step: 5, type: 'multi', label: 'Which sectors do you serve?',
    help: 'Choose all that apply. Some grants are limited to priority sectors.',
    options: SECTORS.map((s) => ({ value: s, label: capitalise(SECTOR_LABELS[s]) })),
  },
  {
    id: 'customerEvidence', step: 5, type: 'single', label: 'Strongest evidence from customers',
    help: 'Assessors weigh real demand heavily.',
    options: [
      { value: 'none', label: 'None yet' },
      { value: 'interviews', label: 'Customer interviews' },
      { value: 'pilots', label: 'Pilots', description: 'Paid or unpaid trials with real users' },
      { value: 'revenue', label: 'Paying customers' },
    ],
  },
  {
    id: 'womenLed', step: 5, type: 'single', label: 'Is the company women-led?',
    help: 'Used only for programs reserved for women founders, such as the Press Play AI Pre-Accelerator and the Alice Anderson Fund. Leave it, or choose "Prefer not to say", and those programs show as unknown.',
    optional: true,
    noUnsure: true,
    options: [
      { value: 'yes', label: 'Yes', description: 'A woman is a founder or leads the company' },
      { value: 'no', label: 'No' },
      { value: 'prefer-not', label: 'Prefer not to say' },
    ],
  },

  // Step 6: Capacity
  {
    id: 'founderHoursPerWeek', step: 6, type: 'single', label: 'Founder hours per week for applications',
    help: 'Be realistic. With little time, quick and simple programs are ranked higher.',
    options: [
      { value: 'under-2', label: 'Under 2 hours' },
      { value: '2-5', label: '2 to 5 hours' },
      { value: '5-10', label: '5 to 10 hours' },
      { value: 'over-10', label: 'More than 10 hours' },
    ],
  },
  {
    id: 'urgency', step: 6, type: 'single', label: 'When do you need the funding?',
    help: 'If you need it now, faster programs are ranked higher.',
    options: [
      { value: 'now', label: 'Now', description: 'Within 3 months' },
      { value: '3-6m', label: 'In 3 to 6 months' },
      { value: '6-12m', label: 'In 6 to 12 months' },
      { value: 'none', label: 'No rush' },
    ],
  },
];

/** Single-choice questions get a "Not sure" choice that clears the answer, unless an option already declines. */
export const hasUnsure = (q: Question): boolean =>
  (q.type === 'single' || q.type === 'boolean' || q.type === 'month') && !q.noUnsure;

/** The questions to show on a step, given the answers so far. */
export const visibleQuestions = (step: Step, profile: Profile): Question[] =>
  QUESTIONS.filter((q) => q.step === step && (!q.showIf || q.showIf(profile)));

/** `?step=` → 1–6. Anything that isn't a whole number starts at step 1; out-of-range numbers are clamped. */
export function parseStep(raw: string | null | undefined): Step {
  if (!raw || !/^\d+$/.test(raw)) return 1;
  return Math.min(STEP_COUNT, Math.max(1, Number(raw))) as Step;
}
