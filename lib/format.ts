import type { Program } from '@/lib/schema';

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

