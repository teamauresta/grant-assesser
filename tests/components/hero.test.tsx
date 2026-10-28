// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import { render, screen, within } from '@testing-library/react';
import { Hero } from '@/components/home/hero';
import { PROGRAMS } from '@/content/programs';
import { latestVerified, programStats } from '@/lib/programs/stats';
import { formatDate } from '@/lib/dates';

// next/link drops the trailing slash under Vitest (trailingSlash is a next.config setting).
const path = (p: string) => expect.stringMatching(new RegExp(`^${p}/?$`));

describe('Hero', () => {
  it('has one h1, the two calls to action and the verification pill', () => {
    render(<Hero />);
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Find the funding your startup qualifies for');
    expect(screen.getByRole('link', { name: 'Start free assessment' })).toHaveAttribute('href', path('/assess'));
    expect(screen.getByRole('link', { name: 'Browse programs' })).toHaveAttribute('href', path('/programs'));
    expect(screen.getByRole('link', { name: new RegExp(`${PROGRAMS.length} programs checked ${formatDate(latestVerified(PROGRAMS))}`) })).toBeInTheDocument();
  });

  // The headline's two lines rise in as separate blocks; the space between them must survive, so
  // the heading still reads as one sentence.
  it('reads the headline as one sentence', () => {
    render(<Hero />);
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Find the funding your startup qualifies for');
  });

  it('never puts "now"-based numbers in the server HTML', () => {
    const html = renderToString(<Hero />);
    expect(html).toContain('Programs');
    expect(html).toContain('Open now');
    expect(html).toContain('Closing in 30 days');
    // A digit as the first text inside the stat's <dd>, however deeply CountUp nests it. The same
    // pattern finds the program count, which is in the HTML, so it would catch a "now" number too.
    const digitAfter = (label: string) => new RegExp(`${label}</dt><dd[^>]*>(?:<span[^>]*>)*\\d`);
    expect(html).toMatch(digitAfter('Programs'));
    expect(html).not.toMatch(digitAfter('Open now'));
    expect(html).not.toMatch(digitAfter('Closing in 30 days'));
    // The same check read as text: the server shows the program count but no "now"-based number.
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const dd = (label: string) => [...doc.querySelectorAll('dt')].find((dt) => dt.textContent === label)?.nextElementSibling?.textContent;
    expect(dd('Programs')).toContain(String(PROGRAMS.length));
    expect(dd('Open now')).not.toMatch(/\d/);
    expect(dd('Closing in 30 days')).not.toMatch(/\d/);
  });

  it('shows the live numbers once the client knows "now"', () => {
    render(<Hero />);
    const stats = programStats(PROGRAMS, new Date());
    const value = (label: string) => screen.getByText(label, { selector: 'dt' }).nextElementSibling as HTMLElement;
    expect(within(value('Programs')).getByText(String(stats.total), { selector: '.sr-only' })).toBeInTheDocument();
    expect(within(value('Open now')).getByText(String(stats.openNow), { selector: '.sr-only' })).toBeInTheDocument();
    expect(within(value('Closing in 30 days')).getByText(String(stats.closingSoon), { selector: '.sr-only' })).toBeInTheDocument();
  });
});
