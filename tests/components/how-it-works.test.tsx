// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { HowItWorks } from '@/components/home/how-it-works';

// next/link drops the trailing slash under Vitest (trailingSlash is a next.config setting).
const path = (p: string) => expect.stringMatching(new RegExp(`^${p}/?$`));

describe('HowItWorks', () => {
  it('is a "How it works" section with three ordered steps, each linking to its page', () => {
    render(<HowItWorks />);
    const region = screen.getByRole('region', { name: 'How it works' });
    const list = within(region).getByRole('list');
    expect(list.tagName).toBe('OL');
    const items = within(list).getAllByRole('listitem');
    expect(items).toHaveLength(3);
    const steps = [['Assess', '/assess'], ['Plan', '/plan'], ['Report', '/report']] as const;
    steps.forEach(([title, href], i) => {
      expect(within(items[i]).getByRole('heading', { level: 3 })).toHaveTextContent(title);
      expect(within(items[i]).getByRole('link')).toHaveAttribute('href', path(href));
    });
  });

  it('shows a decorative preview of the product in each step', () => {
    render(<HowItWorks />);
    const items = within(screen.getByRole('region', { name: 'How it works' })).getAllByRole('listitem');
    items.forEach((item) => {
      const preview = item.querySelector('[data-preview]');
      expect(preview).not.toBeNull();
      expect(preview).toHaveAttribute('aria-hidden', 'true');
    });
  });

  it('hides the step numerals from assistive technology', () => {
    render(<HowItWorks />);
    const items = within(screen.getByRole('region', { name: 'How it works' })).getAllByRole('listitem');
    items.forEach((item, i) => {
      const numeral = within(item).getByText(String(i + 1).padStart(2, '0'));
      expect(numeral).toHaveAttribute('aria-hidden', 'true');
    });
  });
});
