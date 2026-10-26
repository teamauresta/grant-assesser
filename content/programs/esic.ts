import type { ProgramInput } from '@/lib/schema';

const program: ProgramInput = {
  slug: 'esic',
  name: 'Early Stage Innovation Company (ESIC) incentives',
  provider: 'Australian Taxation Office',
  level: 'federal',
  type: 'investor-incentive',
  benefit: { kind: 'investor', currency: 'AUD',
    note: 'Your investors, not your company, get a 20% non-refundable tax offset on new shares, capped at $200K per investor and affiliates per year, plus modified CGT treatment.' },
  status: { state: 'rolling', note: 'Ongoing. Companies self-assess; there is no application round.' },
  deadlines: [],
  gates: [
    { id: 'incorporated-within', months: 36, severity: 'soft' },
  ],
  scores: { funding: 2, value: 3, effort: 4, speed: 3 },
  personas: {
    bootstrapped: 'Only useful once you raise equity from outside investors.',
    'pre-raise': 'Check ESIC status before your round closes: it is tested right after shares are issued.',
  },
  goalTemplate: [
    { title: 'Check the early stage test against last year\'s expenses and income', offsetDays: 7 },
    { title: 'Score the 100-point innovation test and keep the evidence', offsetDays: 14 },
    { title: 'Tell investors the company\'s ESIC position before shares are issued', offsetDays: 21 },
  ],
  stacking: [
    { with: 'rdti', note: 'Spending that counts for the R&D Tax Incentive earns points in the ESIC 100-point innovation test.' },
  ],
  content: {
    summary: 'A tax incentive for people who invest in you, not money for your company. Qualifying investors get a 20% tax offset, which can make your round easier to raise.',
    howToApply: [
      'Check the early stage test as at the moment new shares are issued.',
      'Check the innovation test: the 100-point test, or the principles-based test.',
      'Optionally ask the ATO for a ruling on the principles-based test.',
      'Issue new shares to investors, who claim the offset in their own tax returns.',
      'Lodge the ESIC report with the ATO by 31 days after the end of the financial year (usually 31 July).',
    ],
    prepare: [
      'Previous-year expenses (must be $1M or less) and assessable income ($200K or less)',
      'Incorporation date or ABR registration date',
      'Evidence for the 100-point test, such as R&D spend, accelerator completion, prior third-party investment or IP',
      'Investor details for the ESIC report',
    ],
    mistakes: [
      'Thinking the company receives the benefit',
      'Testing eligibility at the wrong time: it is tested immediately after shares are issued',
      'Letting non-sophisticated investors exceed the $50K a year limit, which removes both the offset and the CGT treatment',
    ],
    caveats: [
      'Company tests checked on the ATO page "Qualifying as an early stage innovation company" (last updated 9 September 2024): not a foreign company; incorporated or registered on the ABR within the last 3 income years (or within 6 income years with expenses of $1M or less across the previous 3); previous-year expenses $1M or less; previous-year assessable income $200K or less; not listed; plus an innovation test.',
      'The incorporation check here is an approximation of the 3-income-year rule and is soft. This tool does not check the expenses, income or innovation tests.',
      'The investor carries the onus of confirming the company qualifies. Get tax advice before promoting ESIC status.',
    ],
  },
  verification: {
    lastVerified: '2026-10-26',
    sources: [
      { url: 'https://www.ato.gov.au/businesses-and-organisations/income-deductions-and-concessions/incentives-and-concessions/tax-incentives-for-innovation/tax-incentives-for-early-stage-investors', title: 'ATO: Tax incentives for early stage investors', official: true },
      { url: 'https://www.ato.gov.au/businesses-and-organisations/income-deductions-and-concessions/incentives-and-concessions/tax-incentives-for-innovation/tax-incentives-for-early-stage-investors/qualifying-as-an-early-stage-innovation-company', title: 'ATO: Qualifying as an early stage innovation company', official: true },
      { url: 'https://www.ato.gov.au/businesses-and-organisations/income-deductions-and-concessions/incentives-and-concessions/tax-incentives-for-innovation/tax-incentives-for-early-stage-investors/for-early-stage-innovation-companies-esics', title: 'ATO: For early stage innovation companies', official: true },
    ],
  },
  changelog: [
    { date: '2026-10-26', note: 'Initial verified record' },
    { date: '2026-10-27', note: 'Company eligibility tests checked on the ATO qualifying page' },
  ],
};

export default program;
