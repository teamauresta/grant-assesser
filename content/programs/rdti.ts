import type { ProgramInput } from '@/lib/schema';

const program: ProgramInput = {
  slug: 'rdti',
  name: 'R&D Tax Incentive',
  provider: 'Department of Industry, Science and Resources and the ATO',
  level: 'federal',
  type: 'tax-incentive',
  benefit: { kind: 'tax-offset', currency: 'AUD', estimator: 'rdti',
    note: 'Refundable offset of your company tax rate plus 18.5 points (43.5% at a 25% rate) if aggregated turnover is under $20M and exempt entities do not control you. Claimed after year-end in your tax return.' },
  status: { state: 'rolling', note: 'Legislated and ongoing. Register each year within 10 months of your income-year end.' },
  deadlines: [{ label: 'R&D registration due', kind: 'milestone', relative: 'fyEnd+10m' }],
  gates: [
    'au-entity',
    'experimental-activities',
    { id: 'rd-spend-over', aud: 20_000 },
    { id: 'turnover-under', aud: 20_000_000, severity: 'soft',
      note: 'At $20M turnover or more the offset is non-refundable (tax rate + 8.5 pts)' },
    'contemporaneous-records',
  ],
  scores: { funding: 3, value: 4, effort: 3, speed: 2 },
  personas: {
    bootstrapped: 'The refund arrives only after you lodge your tax return for the year. Do not count it as runway until then.',
  },
  goalTemplate: [
    { title: 'Start a log of hypotheses, experiments and results', offsetDays: 7 },
    { title: 'Split this year\'s work into core and supporting R&D activities', offsetDays: 30 },
    { title: 'Reconcile R&D costs: payroll, invoices and time allocations', beforeDeadlineBusinessDays: 40 },
    { title: 'Register R&D activities with the department', beforeDeadlineBusinessDays: 10 },
    { title: 'Claim the offset in the company tax return', beforeDeadlineBusinessDays: 0 },
  ],
  stacking: [
    { with: 'csiro-kick-start', note: 'Possible. Grants and recoupments can trigger a clawback adjustment to the offset. Get advice.' },
  ],
  content: {
    summary: 'A tax offset for eligible R&D spending. Small companies under $20M turnover can get it as a cash refund, but only after the year ends.',
    howToApply: [
      'Self-assess that your company is an R&D entity doing eligible, experimental R&D.',
      'Keep records before, during and after each activity.',
      'Register the year\'s activities with the department within 10 months of your income-year end (30 April 2027 for a 30 June 2026 year).',
      'Enter the registration number in the R&D schedule of your company tax return and lodge it with the ATO.',
    ],
    prepare: [
      'Hypotheses, prior-knowledge searches, experiments, results and conclusions',
      'A list of activities split into core and supporting R&D',
      'Time records allocating staff hours to each activity',
      'Payroll, invoices and contracts for R&D costs',
      'Notional R&D deductions above $20,000 (unless paid to a research service provider or CRC)',
    ],
    mistakes: [
      'Claiming all engineering work as R&D',
      'Reconstructing records after the fact',
      'Confusing market uncertainty with technical uncertainty',
      'Treating registration as approval: it does not confirm eligibility',
    ],
    caveats: [
      'At $20M aggregated turnover or more, or if exempt entities control you, the offset is non-refundable: tax rate plus 8.5% on R&D up to 2% of total expenses, plus 16.5% above that. That is why the turnover check is soft here.',
      'Grants and other recoupments for the same spending can trigger a clawback adjustment (Subdivision 355-G). CRC Program recoupments are exempt.',
      'Proposed from 1 July 2028, not yet law: core offset up 4.5 points; supporting R&D no longer eligible; intensity threshold 2% to 1.5%; refunds only in a company\'s first 10 years (15 for therapeutic goods); minimum spend $20K to $50K; refundable turnover threshold $20M to $50M; expenditure cap $150M to $200M.',
    ],
  },
  verification: {
    lastVerified: '2026-10-26',
    sources: [
      { url: 'https://business.gov.au/grants-and-programs/research-and-development-tax-incentive', title: 'R&D Tax Incentive (business.gov.au)', official: true },
      { url: 'https://business.gov.au/grants-and-programs/research-and-development-tax-incentive/overview-of-rd-tax-incentive', title: 'Overview of the R&D Tax Incentive', official: true },
      { url: 'https://www.ato.gov.au/businesses-and-organisations/income-deductions-and-concessions/incentives-and-concessions/research-and-development-tax-incentive/r-d-tax-incentive-rates-and-entitlements/rates-of-r-d-tax-incentive-offset', title: 'ATO: Rates of R&D tax incentive offset', official: true },
      { url: 'https://www.ato.gov.au/businesses-and-organisations/income-deductions-and-concessions/incentives-and-concessions/research-and-development-tax-incentive/steps-for-claiming-r-d-tax-offset', title: 'ATO: Steps for claiming R&D tax offset', official: true },
      { url: 'https://www.ato.gov.au/about-ato/new-legislation/in-detail/businesses/tax-reform-better-targeting-the-research-and-development-tax-incentive', title: 'ATO: Better targeting the R&D Tax Incentive (proposed)', official: true },
    ],
  },
  changelog: [{ date: '2026-10-26', note: 'Initial verified record' }],
};

export default program;
