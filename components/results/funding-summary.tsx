'use client';

import type { ReactNode } from 'react';
import type { FundingEstimate } from '@/lib/assess';
import { formatMoney, moneyCounter } from '@/lib/format';
import { CountUp } from '@/components/motion/count-up';

export type FundingSummaryProps = {
  estimate: FundingEstimate;
  /** Names of the programs behind each figure. */
  counted: { funding: string[]; credits: string[] };
};

type Currency = 'AUD' | 'USD';

/** The section's id, so Results can aim its burst at the summary. */
export const FUNDING_SUMMARY_ID = 'funding-summary';

function range(low: number, high: number, currency: Currency): string {
  return low === high ? formatMoney(high, currency) : `${formatMoney(low, currency)}–${formatMoney(high, currency)}`;
}

/**
 * A figure that counts up on screen, with its exact text for assistive technology. The counting
 * copy is hidden from screen readers so they read one string, not the parts of a range.
 */
function Figure({ label, children }: { label: string; children: ReactNode }) {
  return (
    <>
      <span aria-hidden="true">{children}</span>
      <span className="sr-only">{label}</span>
    </>
  );
}

/** The headline figures: potential cash and tax offsets (never "secured"), with credits kept separate. */
export function FundingSummary({ estimate, counted }: FundingSummaryProps) {
  const { aud: funding, creditsUsd } = estimate;
  return (
    <section id={FUNDING_SUMMARY_ID} aria-labelledby="funding-summary-heading" className="flex flex-col gap-4 rounded-lg border border-border bg-surface p-4 md:p-6">
      <h2 id="funding-summary-heading" className="sr-only">Funding summary</h2>
      <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1">
          <dt className="text-sm text-muted-fg">Potential funding (not secured)</dt>
          <dd className="num text-2xl font-semibold tracking-tight">
            {funding.high > 0 ? (
              <Figure label={range(funding.low, funding.high, 'AUD')}>
                {funding.low === funding.high
                  ? <CountUp value={funding.high} format={moneyCounter(funding.high, 'AUD')} />
                  : <><CountUp value={funding.low} format={moneyCounter(funding.low, 'AUD')} />–<CountUp value={funding.high} format={moneyCounter(funding.high, 'AUD')} /></>}
              </Figure>
            ) : 'None counted yet'}
          </dd>
        </div>
        <div className="flex flex-col gap-1">
          <dt className="text-sm text-muted-fg">Credits</dt>
          <dd className="num text-2xl font-semibold tracking-tight">
            {creditsUsd.high > 0 ? (
              <Figure label={`Up to ${formatMoney(creditsUsd.high, 'USD')}`}>Up to <CountUp value={creditsUsd.high} format={moneyCounter(creditsUsd.high, 'USD')} /></Figure>
            ) : 'None counted yet'}
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
