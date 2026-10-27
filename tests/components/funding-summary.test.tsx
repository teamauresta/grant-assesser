// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FundingSummary } from '@/components/results/funding-summary';
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
});
