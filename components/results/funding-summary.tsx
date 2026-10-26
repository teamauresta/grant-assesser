import type { FundingEstimate } from '@/lib/assess';
import { formatMoney } from '@/lib/format';

export type FundingSummaryProps = {
  estimate: FundingEstimate;
  /** Names of the programs behind each figure. */
  counted: { funding: string[]; credits: string[] };
};

function range(low: number, high: number, currency: 'AUD' | 'USD'): string {
  return low === high ? formatMoney(high, currency) : `${formatMoney(low, currency)}–${formatMoney(high, currency)}`;
}

/** The headline figures: potential cash and tax offsets (never "secured"), with credits kept separate. */
export function FundingSummary({ estimate, counted }: FundingSummaryProps) {
  const { aud, creditsUsd } = estimate;
  return (
    <section aria-labelledby="funding-summary-heading" className="flex flex-col gap-4 rounded-lg border border-border bg-surface p-4 md:p-6">
      <h2 id="funding-summary-heading" className="sr-only">Funding summary</h2>
      <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1">
          <dt className="text-sm text-muted-fg">Potential funding (not secured)</dt>
          <dd className="num font-mono text-2xl font-semibold tracking-tight">
            {aud.high > 0 ? range(aud.low, aud.high, 'AUD') : 'None counted yet'}
          </dd>
        </div>
        <div className="flex flex-col gap-1">
          <dt className="text-sm text-muted-fg">Credits</dt>
          <dd className="num font-mono text-2xl font-semibold tracking-tight">
            {creditsUsd.high > 0 ? `Up to ${formatMoney(creditsUsd.high, 'USD')}` : 'None counted yet'}
          </dd>
        </div>
      </dl>
      <div className="flex flex-col gap-1 text-sm text-muted-fg">
        <p>
          {counted.funding.length > 0
            ? <>Counted: {counted.funding.join(', ')}.</>
            : <>Only cash and tax offsets from open programs where you pass every required check are counted.</>}
          {counted.credits.length > 0 && <> Credits from: {counted.credits.join(', ')}.</>}
        </p>
        <p>Consortium awards and equity are not counted.</p>
      </div>
    </section>
  );
}
