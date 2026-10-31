// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { HowItWorks } from '@/components/home/how-it-works';

// next/link drops the trailing slash under Vitest (trailingSlash is a next.config setting).
const path = (p: string) => expect.stringMatching(new RegExp(`^${p}/?$`));

const items = () => within(screen.getByRole('region', { name: 'How it works' })).getAllByRole('listitem');

// Billabong (design doc section 8; Billabong plan, Task 11 step 5): the forest-green panel became
// three windows on the page background, one per step, numbered in their titles. The panel's tests
// (its --panel-fg focus ring and --panel-spark numerals) went with it (feature replaced; design doc
// section 11, Task 11).
describe('HowItWorks', () => {
  it('is a "How it works" section with three ordered steps, each linking to its page', () => {
    render(<HowItWorks />);
    const region = screen.getByRole('region', { name: 'How it works' });
    const list = within(region).getByRole('list');
    expect(list.tagName).toBe('OL');
    expect(items()).toHaveLength(3);
    const steps = [['1. Answer six questions', '/assess'], ['2. See what fits', '/programs'], ['3. Plan the applications', '/plan']] as const;
    steps.forEach(([title, href], i) => {
      expect(within(items()[i]).getByRole('heading', { level: 3 })).toHaveTextContent(new RegExp(`^${title.replace('.', '\\.')}$`));
      expect(within(items()[i]).getByRole('link')).toHaveAttribute('href', path(href));
    });
  });

  it('draws each step as a window that is not a landmark: the section is the one region', () => {
    render(<HowItWorks />);
    expect(screen.getAllByRole('region')).toHaveLength(1);
    for (const item of items()) {
      const heading = within(item).getByRole('heading', { level: 3 });
      const frame = heading.closest('.shadow-window')!;
      expect(frame).not.toBeNull();
      expect(frame.tagName).toBe('DIV');
      expect(frame).not.toHaveAttribute('aria-labelledby');
      // The decorative window glyphs are hidden.
      expect(frame.querySelector('svg.lucide-x')!.closest('[aria-hidden="true"]')).not.toBeNull();
    }
  });

  it('sits on the page background: no forest panel and no --panel-* colours', () => {
    const { container } = render(<HowItWorks />);
    const region = screen.getByRole('region', { name: 'How it works' });
    expect(region.className).not.toMatch(/bg-/);
    expect(container.innerHTML).not.toMatch(/panel-/);
  });

  it('gives each step its spot illustration, decorative, in order', () => {
    render(<HowItWorks />);
    const art = items().map((item) => item.querySelectorAll('[data-art]'));
    expect(art.map((a) => a.length)).toEqual([1, 1, 1]);
    expect(art.map((a) => a[0].getAttribute('data-art'))).toEqual(['step-answer', 'step-sort', 'step-plan']);
    for (const a of art) expect(a[0]).toHaveAttribute('aria-hidden', 'true');
  });

  it('shows a decorative preview of the product in each step', () => {
    render(<HowItWorks />);
    items().forEach((item) => {
      const preview = item.querySelector('[data-preview]');
      expect(preview).not.toBeNull();
      expect(preview).toHaveAttribute('aria-hidden', 'true');
    });
    expect(items().map((item) => item.querySelector('[data-preview]')!.textContent)).toEqual([
      expect.stringContaining('Assessment'),
      expect.stringContaining('Results'),
      expect.stringContaining('My plan'),
    ]);
  });

  it('outlines the step links in the accent on focus', () => {
    render(<HowItWorks />);
    const links = within(screen.getByRole('region', { name: 'How it works' })).getAllByRole('link');
    expect(links).toHaveLength(3);
    for (const link of links) expect(link.className).toContain('focus-visible:outline-accent');
  });
});
