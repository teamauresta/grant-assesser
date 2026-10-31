'use client';

import type { ReactNode } from 'react';
import type { FundingEstimate } from '@/lib/assess';
import { formatMoney, moneyCounter } from '@/lib/format';
import { CountUp } from '@/components/motion/count-up';
import { Window } from '@/components/ui/window';

export type FundingSummaryProps = {
  estimate: FundingEstimate;
  /** Names of the programs behind each figure. */
  counted: { funding: string[]; credits: string[] };
};

type Currency = 'AUD' | 'USD';

/** The window's id, so Results can aim its burst at the summary. */
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

/** The figures: large, bold and in tabular digits, so a count-up never shifts the line. */
const FIGURE = 'num text-3xl font-bold tracking-tight md:text-4xl';

/** No figure yet: words, not a number, so a size down. */
const NONE = <span className="text-2xl font-semibold">None counted yet</span>;

/**
 * The headline figures: potential cash and tax offsets (never "secured"), with credits kept separate.
 * A window titled "Your funding estimate" (Billabong design doc, section 4: the results summary), its
 * title at 'md' like the program page's sections.
 */
export function FundingSummary({ estimate, counted }: FundingSummaryProps) {
  const { aud: funding, creditsUsd } = estimate;
  return (
    <Window id={FUNDING_SUMMARY_ID} title="Your funding estimate" titleSize="md" bodyClassName="flex flex-col gap-4">
      <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1">
          <dt className="text-sm text-muted-fg">Potential funding (not secured)</dt>
          <dd className={FIGURE}>
            {funding.high > 0 ? (
              <Figure label={range(funding.low, funding.high, 'AUD')}>
                {funding.low === funding.high
                  ? <CountUp value={funding.high} format={moneyCounter(funding.high, 'AUD')} />
                  : <><CountUp value={funding.low} format={moneyCounter(funding.low, 'AUD')} />–<CountUp value={funding.high} format={moneyCounter(funding.high, 'AUD')} /></>}
              </Figure>
            ) : NONE}
          </dd>
        </div>
        <div className="flex flex-col gap-1">
          <dt className="text-sm text-muted-fg">Credits</dt>
          <dd className={FIGURE}>
            {creditsUsd.high > 0 ? (
              <Figure label={`Up to ${formatMoney(creditsUsd.high, 'USD')}`}>Up to <CountUp value={creditsUsd.high} format={moneyCounter(creditsUsd.high, 'USD')} /></Figure>
            ) : NONE}
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
    </Window>
  );
}
