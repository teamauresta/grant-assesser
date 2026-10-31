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

  // Billabong (design doc section 8; it replaces the Eucalyptus accent phrase and the eucalyptus glow
  // under the call to action, a requirement change): one amber marker highlight on "qualifies for",
  // in the headline's own --fg, never gradient text, and the second line keeps its rise.
  it('highlights "qualifies for" once, in amber, and keeps the rise on both lines', () => {
    const { container } = render(<Hero />);
    const h1 = screen.getByRole('heading', { level: 1 });
    const bands = h1.querySelectorAll('.highlight');
    expect(bands).toHaveLength(1);
    expect(bands[0]).toHaveTextContent(/^qualifies for$/);
    expect(bands[0]).toHaveClass('[--hl:var(--hl-amber)]');
    expect(container.querySelectorAll('.highlight')).toHaveLength(1);
    const lines = [...h1.children];
    expect(lines.map((l) => l.className)).toEqual([expect.stringContaining('motion-safe:animate-rise'), expect.stringContaining('motion-safe:animate-rise-late')]);
    for (const line of lines) expect(line).not.toHaveClass('text-accent');
    expect(h1.querySelector('.text-lift, .text-accent')).toBeNull();
  });

  // The amber button is the call to action; the eucalyptus glow under it is gone (Billabong plan,
  // Task 11 step 6; design doc section 11).
  it('draws the primary call to action as the large amber button, with no glow', () => {
    render(<Hero />);
    const start = screen.getByRole('link', { name: 'Start free assessment' });
    expect(start).toHaveClass('bg-primary', 'min-h-12');
    expect(start).not.toHaveClass('glow-brand');
    expect(screen.getByRole('link', { name: 'Browse programs' })).toHaveClass('bg-surface', 'min-h-12');
  });

  // The diorama (design doc section 8: "the day or dusk diorama to the right (below on phones)"):
  // fetched with priority, last in the DOM, so on phones it comes after the text, the calls to action
  // and the numbers; from md it is placed in the right column beside both, and the numbers in the
  // left column's second row.
  it('shows the hero diorama last on phones and beside the text and numbers from md', () => {
    const { container } = render(<Hero />);
    const section = screen.getByRole('region', { name: 'Find the funding your startup qualifies for' });
    const art = section.querySelector<HTMLElement>('[data-art]')!;
    expect(art).toHaveAttribute('data-art', 'hero-diorama');
    expect(art).toHaveClass('w-full', 'md:col-start-2', 'md:row-span-2', 'md:row-start-1');
    const order = [...section.children];
    const cta = screen.getByRole('link', { name: 'Start free assessment' });
    const stats = order.find((c) => c.contains(container.querySelector('dl')))!;
    expect(stats).toHaveClass('md:col-start-1', 'md:row-start-2');
    expect(order.findIndex((c) => c.contains(cta))).toBeLessThan(order.indexOf(stats));
    expect(order.indexOf(stats)).toBeLessThan(order.indexOf(art));
    expect(order.at(-1)).toBe(art);
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

  // Counts in tabular digits (Billabong plan, conventions: `num`), so a count-up never jitters.
  it('sets the numbers and the verification date in tabular digits', () => {
    const { container } = render(<Hero />);
    const dds = container.querySelectorAll('dd');
    expect(dds).toHaveLength(3);
    for (const dd of dds) expect(dd).toHaveClass('num');
    expect(container.querySelector('time')).toHaveClass('num');
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
