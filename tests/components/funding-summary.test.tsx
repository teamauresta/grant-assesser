// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { FUNDING_SUMMARY_ID, FundingSummary } from '@/components/results/funding-summary';
import type { FundingEstimate } from '@/lib/assess';

/** The text a screen reader gets from an element: everything except aria-hidden subtrees. */
function accessibleText(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) return node.textContent ?? '';
  if (node instanceof Element && node.getAttribute('aria-hidden') === 'true') return '';
  return [...node.childNodes].map(accessibleText).join('');
}

const figure = (term: string) => screen.getByText(term).nextElementSibling as HTMLElement;

const estimate = (aud: [number, number], credits: number): FundingEstimate => ({
  aud: { low: aud[0], high: aud[1] },
  creditsUsd: { low: 0, high: credits },
  includedSlugs: [],
});
afterEach(() => vi.unstubAllGlobals());

/** Captures requestAnimationFrame callbacks so a test can step through a tween. */
function stubFrames() {
  const frames: ((t: number) => void)[] = [];
  vi.stubGlobal('requestAnimationFrame', (cb: (t: number) => void) => { frames.push(cb); return frames.length; });
  vi.stubGlobal('cancelAnimationFrame', () => {});
  return (t: number) => act(() => { for (const f of frames.splice(0)) f(t); });
}

const counted = { funding: ['R&D Tax Incentive'], credits: ['AWS Activate'] };

describe('FundingSummary', () => {
  it('gives assistive technology the exact range and credits, once each', () => {
    render(<FundingSummary estimate={estimate([30_000, 45_000], 5_000)} counted={counted} />);
    expect(accessibleText(figure('Potential funding (not secured)'))).toBe('$30K–$45K');
    expect(accessibleText(figure('Credits'))).toBe('Up to US$5K');
  });

  it('shows a single figure when the range is one amount', () => {
    render(<FundingSummary estimate={estimate([45_000, 45_000], 0)} counted={counted} />);
    expect(accessibleText(figure('Potential funding (not secured)'))).toBe('$45K');
  });

  it('counts each money figure up (the visible copy is decorative)', () => {
    render(<FundingSummary estimate={estimate([30_000, 45_000], 5_000)} counted={counted} />);
    expect(figure('Potential funding (not secured)').querySelectorAll('[data-count]')).toHaveLength(2);
    expect(figure('Credits').querySelectorAll('[data-count]')).toHaveLength(1);
  });

  it('keeps "None counted yet" when nothing is counted', () => {
    render(<FundingSummary estimate={estimate([0, 0], 0)} counted={{ funding: [], credits: [] }} />);
    expect(accessibleText(figure('Potential funding (not secured)'))).toBe('None counted yet');
    expect(accessibleText(figure('Credits'))).toBe('None counted yet');
  });

  it('counts in the final unit and never wider than the final figure, so the dash never moves', () => {
    const step = stubFrames();
    render(<FundingSummary estimate={estimate([8_700, 43_500], 0)} counted={counted} />);
    const [low, high] = figure('Potential funding (not secured)').querySelectorAll<HTMLElement>('[data-count]');
    step(0);
    for (const t of [100, 300, 500, 700]) {
      step(t);
      expect(low.textContent).toMatch(/^\$\d+\.\dK$/);
      expect(high.textContent).toMatch(/^\$\d+\.\dK$/);
      expect(low.textContent!.length).toBeLessThanOrEqual('$8.7K'.length);
      expect(high.textContent!.length).toBeLessThanOrEqual('$43.5K'.length);
    }
    step(2000);
    expect(low).toHaveTextContent(/^\$8\.7K$/);
    expect(high).toHaveTextContent(/^\$43\.5K$/);
  });

  // The region was named by a hidden "Funding summary" heading; it is now a window titled "Your
  // funding estimate" (Billabong design doc, section 4: the results summary is a window; plan Task 7).
  // docs/art/billabong-prompts.md: the compass beside the figures, decorative, and from sm only, so on
  // a phone the figures keep the whole width.
  it('shows the compass beside the figures from sm, hidden from assistive technology', () => {
    render(<FundingSummary estimate={estimate([30_000, 45_000], 5_000)} counted={counted} />);
    const region = screen.getByRole('region', { name: 'Your funding estimate' });
    const art = region.querySelectorAll<HTMLElement>('[data-art]');
    expect(art).toHaveLength(1);
    expect(art[0]).toHaveAttribute('data-art', 'prop-compass');
    expect(art[0]).toHaveAttribute('aria-hidden', 'true');
    expect(art[0]).toHaveClass('hidden', 'sm:block', 'w-20');
    // Beside the figures, in the same row.
    expect(art[0].previousElementSibling?.tagName).toBe('DL');
  });

  it('puts an id on the section, for aiming the results burst', () => {
    render(<FundingSummary estimate={estimate([30_000, 45_000], 0)} counted={counted} />);
    expect(document.getElementById(FUNDING_SUMMARY_ID)).toBe(screen.getByRole('region', { name: 'Your funding estimate' }));
  });
});
