import type { Program } from '@/lib/schema';
import type { EVIDENCE_LEVELS, FUNDING_STAGES, RESEARCH_LEVELS, SECTORS, STACK, STATES } from '@/lib/schema';

type Benefit = Program['benefit'];
type Currency = Benefit['currency'];

const SYMBOL: Record<Currency, string> = { AUD: '$', USD: 'US$' };

/** Up to two decimals, trailing zeros trimmed: 1.25, 2.5, 5. */
const trim = (n: number) => String(Number(n.toFixed(2)));

/** Compact money: $500, $20K, $2.5K, $1.25M, US$150K. */
export function formatMoney(n: number, currency: Currency): string {
  const sym = SYMBOL[currency];
  if (n >= 1_000_000) return `${sym}${trim(n / 1_000_000)}M`;
  if (n >= 1_000) return `${sym}${trim(n / 1_000)}K`;
  return `${sym}${Math.round(n)}`;
}

/**
 * A CountUp format that ends on exactly `formatMoney(final)`. On the way it keeps the final value's
 * unit and number of decimals ("$8.7K" counts "$0.0K", "$4.4K", ...), so the text never grows
 * wider than the final figure and nothing beside it moves.
 */
export function moneyCounter(final: number, currency: Currency): (n: number) => string {
  const [div, unit] = final >= 1_000_000 ? [1_000_000, 'M'] : final >= 1_000 ? [1_000, 'K'] : [1, ''];
  const decimals = div === 1 ? 0 : (trim(final / div).split('.')[1] ?? '').length;
  const end = formatMoney(final, currency);
  return (n) => (n >= final ? end : `${SYMBOL[currency]}${(n / div).toFixed(decimals)}${unit}`);
}

/** The amount part only, or undefined when the record has no usable amount. */
function amount({ min, max, currency }: Benefit): string | undefined {
  const lo = min ? min : undefined; // a minimum of 0 reads as "up to"
  if (lo !== undefined && max !== undefined) {
    return lo === max ? formatMoney(max, currency) : `${formatMoney(lo, currency)}–${formatMoney(max, currency)}`;
  }
  if (max !== undefined) return `Up to ${formatMoney(max, currency)}`;
  if (lo !== undefined) return `From ${formatMoney(lo, currency)}`;
  return undefined;
}

/**
 * One short line for a program's benefit, e.g. "$20K–$60K", "Up to US$150K credits", "$120K for equity".
 * Consortium awards are marked so they are never read as money the company receives.
 */
export function formatBenefit(benefit: Benefit): string {
  const a = amount(benefit);
  let text: string;
  switch (benefit.kind) {
    case 'cash': text = a ?? 'Amount varies'; break;
    case 'credits': text = a ? `${a} credits` : 'Credits'; break;
    case 'equity': text = a ? `${a} for equity` : 'Equity investment'; break;
    case 'debt': text = a ? `${a} venture debt` : 'Venture debt'; break;
    case 'service': text = a ? `${a} in services` : 'Free service'; break;
    case 'tax-offset': text = a ?? 'Tax offset'; break;
    case 'investor': text = 'Investor tax offset'; break;
  }
  return benefit.consortium ? `${text} (consortium)` : text;
}

export const TYPE_LABELS: Record<Program['type'], string> = {
  'tax-incentive': 'Tax incentive',
  grant: 'Grant',
  voucher: 'Voucher',
  credits: 'Credits',
  accelerator: 'Accelerator',
  capital: 'Capital',
  service: 'Service',
  'investor-incentive': 'Investor incentive',
};

export const LEVEL_LABELS: Record<Program['level'], string> = {
  federal: 'Federal',
  vic: 'Victoria',
  industry: 'Industry',
  university: 'University',
};


type Stack = (typeof STACK)[number];
type FundingStage = (typeof FUNDING_STAGES)[number];
type EvidenceLevel = (typeof EVIDENCE_LEVELS)[number];
type ResearchLevel = (typeof RESEARCH_LEVELS)[number];
type State = (typeof STATES)[number];
type Sector = (typeof SECTORS)[number];

/** Product names for stack and credit-provider ids. */
export const STACK_LABELS: Record<Stack, string> = {
  aws: 'AWS', azure: 'Azure', gcp: 'Google Cloud', gemini: 'Gemini',
  nvidia: 'NVIDIA', cloudflare: 'Cloudflare', openai: 'OpenAI', anthropic: 'Anthropic',
};

/** Funding stages as they read mid-sentence ("Funding stage: Series A"). */
export const FUNDING_STAGE_LABELS: Record<FundingStage, string> = {
  none: 'no funding', angel: 'angel', 'pre-seed': 'pre-seed', seed: 'seed',
  'series-a': 'Series A', 'series-b': 'Series B', 'series-c-plus': 'Series C+',
};

export const EVIDENCE_LABELS: Record<EvidenceLevel, string> = {
  none: 'no customer evidence', interviews: 'customer interviews', pilots: 'pilots', revenue: 'paying customers',
};

export const RESEARCH_LABELS: Record<ResearchLevel, string> = {
  none: 'none', informal: 'informal contact', active: 'active collaboration', formal: 'formal agreement',
};

export const STATE_LABELS: Record<State, string> = {
  vic: 'Victoria', nsw: 'New South Wales', qld: 'Queensland', wa: 'Western Australia', sa: 'South Australia',
  tas: 'Tasmania', act: 'Australian Capital Territory', nt: 'Northern Territory',
};

/** "in Victoria", "in the Northern Territory". */
export const inState = (s: State) => `in ${s === 'act' || s === 'nt' ? 'the ' : ''}${STATE_LABELS[s]}`;

export const SECTOR_LABELS: Record<Sector, string> = {
  energy: 'energy', health: 'health', manufacturing: 'manufacturing', construction: 'construction',
  agriculture: 'agriculture', defence: 'defence', fintech: 'fintech', education: 'education',
  'social-impact': 'social impact', other: 'other',
};

/** "a, b or c". */
export function listOr(items: string[]): string {
  return items.length < 2 ? (items[0] ?? '') : `${items.slice(0, -1).join(', ')} or ${items[items.length - 1]}`;
}

export const capitalise = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
