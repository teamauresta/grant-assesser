// @vitest-environment jsdom
import { describe, it, expect, afterEach, beforeAll, beforeEach, vi } from 'vitest';
import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PERSONA_NOW as now, bootstrappedVic } from '@/tests/fixtures/personas';

// One Date for every render, as the real hook keeps one until its clock ticks (results memoise on it).
const { stableNow } = vi.hoisted(() => ({ stableNow: new Date('2026-10-27T00:00:00Z') }));
vi.mock('@/lib/use-now', () => ({ useNow: () => stableNow }));

import { Results, ResultsHeading } from '@/components/results/results';
import { FUNDING_SUMMARY_ID } from '@/components/results/funding-summary';
import { buttonClasses } from '@/components/ui/button';
import { DEFAULT_RESULTS, PERSONA_RESULTS } from '@/lib/personas';
import { useWorkspace } from '@/lib/store/use-workspace';
import { emptyWorkspace } from '@/lib/store/workspace-store';

const has = (el: HTMLElement, classes: string) => {
  for (const c of classes.split(/\s+/).filter(Boolean)) expect(el).toHaveClass(c);
};

beforeAll(async () => { await useWorkspace.getState().init(); });
beforeEach(() => {
  useWorkspace.setState({ ws: { ...emptyWorkspace(now), profile: bootstrappedVic } });
  vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener() {}, removeEventListener() {} }));
});

// The results page in the Billabong style (plan Task 7; design doc sections 4 and 11).
describe('Results page', () => {
  it('marks one phrase of the heading', async () => {
    render(<Results />);
    const copy = PERSONA_RESULTS.bootstrapped;
    const h1 = await screen.findByRole('heading', { level: 1, name: copy.title });
    const bands = h1.querySelectorAll('.highlight');
    expect(bands).toHaveLength(1);
    expect(bands[0]).toHaveTextContent(copy.highlight);
    expect(bands[0].tagName).toBe('SPAN');
  });

  it('marks one phrase of the empty state\'s heading too', async () => {
    useWorkspace.setState({ ws: emptyWorkspace(now) });
    render(<Results />);
    const h1 = await screen.findByRole('heading', { level: 1, name: 'Your results' });
    expect(h1.querySelectorAll('.highlight')).toHaveLength(1);
  });

  describe('in production, with a phrase missing from its title', () => {
    afterEach(() => vi.unstubAllEnvs());

    // A local copy of the default copy with a phrase that is not in its title: the shared
    // DEFAULT_RESULTS is never mutated, so no other test can see the change.
    it('shows the plain heading without a band', () => {
      vi.stubEnv('NODE_ENV', 'production');
      render(<ResultsHeading copy={{ ...DEFAULT_RESULTS, highlight: 'not in the title' }} />);
      const h1 = screen.getByRole('heading', { level: 1, name: DEFAULT_RESULTS.title });
      expect(h1).toHaveTextContent(/^Your results$/);
      expect(h1.querySelectorAll('.highlight')).toHaveLength(0);
    });
  });

  it('puts the funding summary in a window titled "Your funding estimate", with the summary\'s id', async () => {
    render(<Results />);
    const summary = await screen.findByRole('region', { name: 'Your funding estimate' });
    expect(summary.id).toBe(FUNDING_SUMMARY_ID);
    expect(within(summary).getByRole('heading', { level: 2, name: 'Your funding estimate' })).toBeVisible();
    expect(within(summary).getByText('Potential funding (not secured)')).toBeInTheDocument();
  });

  it('offers the suggested first goal with the primary Add goal button, then a quiet added state', async () => {
    const user = userEvent.setup();
    render(<Results />);
    const goals = await screen.findByRole('region', { name: 'Suggested first goal' });
    const add = within(goals).getByRole('button', { name: 'Add goal' });
    expect(add.className).toBe(buttonClasses({ variant: 'primary' }));
    await user.click(add);
    const added = within(goals).getByRole('button', { name: 'Goal added' });
    expect(added).toHaveAttribute('aria-disabled', 'true');
    expect(added.className).toBe(buttonClasses({ variant: 'secondary' }));
    expect(within(goals).getByRole('link', { name: 'View plan' })).toBeVisible();
  });

  // docs/art/billabong-prompts.md: with something to act on now, the suggested goal opens with the
  // celebrating platypus in place of the target icon; decorative, like the icon. Not in toasts. With
  // nothing in Act now it keeps the icon (tests/components/results-cheer-nothing.test.tsx).
  it('opens the suggested goal with the celebrating platypus when something can be acted on now', async () => {
    render(<Results />);
    const goals = await screen.findByRole('region', { name: 'Suggested first goal' });
    // bootstrappedVic meets every required check of several open programs (tests/content/personas.test.ts).
    expect(screen.getByRole('heading', { level: 2, name: /^Act now [1-9]/ })).toBeInTheDocument();
    const art = goals.querySelectorAll<HTMLElement>('[data-art]');
    expect(art).toHaveLength(1);
    expect(art[0]).toHaveAttribute('data-art', 'platypus-celebrate');
    expect(art[0]).toHaveAttribute('aria-hidden', 'true');
    // Square at the top of the row: a stretched box would grow as tall as the text on a phone.
    expect(art[0]).toHaveClass('w-14', 'self-start');
    // 72px from 640px wide, where the card has the room (design doc section 11, Art landed).
    expect(art[0]).toHaveClass('sm:w-18');
    expect(goals.querySelector('[data-icon="target"]')).toBeNull();
    // The only art on the page besides the funding summary's compass.
    expect([...document.querySelectorAll('[data-art]')].map((a) => a.getAttribute('data-art')).sort()).toEqual(['platypus-celebrate', 'prop-compass']);
  });

  it('lists results as cards, and Not a fit cards stay greyed with their reason', async () => {
    render(<Results />);
    // Bootstrapped opens on Quick wins.
    const actNow = await screen.findByRole('region', { name: /^Act now/ });
    const row = within(actNow).getAllByRole('listitem')[0];
    has(row, 'rounded-lg border border-border bg-surface');
    expect(row).not.toHaveClass('border-dashed');
    expect(row).not.toHaveClass('text-muted-fg');
    // The list holds separate cards, not one divided box, and keeps its list role in Safari.
    expect(row.parentElement).not.toHaveClass('divide-y');
    expect(row.parentElement).not.toHaveClass('border');
    expect(row.parentElement).toHaveAttribute('role', 'list');
    for (const toggle of within(row).getAllByRole('button', { expanded: false })) has(toggle, 'text-fg hover:text-accent');
    expect(within(row).getByRole('button', { name: /^Add to pipeline/ }).className).toBe(buttonClasses({ variant: 'secondary' }));

    const notFit = screen.getByRole('region', { name: /^Not a fit/ });
    const greyed = within(notFit).getAllByRole('listitem')[0];
    // Review of Task 7 (design doc section 11): the dashes are --border-strong, since --border dashes
    // read too weakly on the page; the toggles are muted and the Add button is a ghost.
    has(greyed, 'rounded-lg border border-dashed border-border-strong text-muted-fg');
    expect(greyed).not.toHaveClass('border-border');
    expect(greyed).not.toHaveClass('bg-surface');
    // Greyed by colour, not opacity, so the status pill keeps its full strength.
    expect(greyed.className).not.toMatch(/opacity/);
    const toggles = within(greyed).getAllByRole('button', { expanded: false });
    expect(toggles).toHaveLength(2);
    for (const toggle of toggles) {
      has(toggle, 'text-muted-fg hover:text-fg');
      expect(toggle).not.toHaveClass('text-fg');
    }
    expect(within(greyed).getByRole('button', { name: /^Add to pipeline/ }).className).toBe(buttonClasses({ variant: 'ghost' }));
    const reason = within(greyed).getByText('Not a fit:').closest('p')!;
    expect(reason).toHaveClass('text-fg');
    expect(reason.textContent!.length).toBeGreaterThan('Not a fit: '.length);
  });

  it('marks a row added to the pipeline as in your plan', async () => {
    const user = userEvent.setup();
    render(<Results />);
    const actNow = await screen.findByRole('region', { name: /^Act now/ });
    const row = within(actNow).getAllByRole('listitem')[0];
    await user.click(within(row).getByRole('button', { name: /^Add to pipeline/ }));
    expect(within(row).getByRole('button', { name: 'In your plan' })).toHaveAttribute('aria-disabled', 'true');
    expect(within(row).getByRole('link', { name: 'View plan' })).toBeVisible();
  });

  // Until the store has loaded: a skeleton announced as loading in text, not by naming a plain div.
  it('shows a loading skeleton that says so in text', () => {
    act(() => useWorkspace.setState({ ready: false }));
    try {
      render(<Results />);
      const status = screen.getByRole('status');
      expect(status).toHaveAttribute('aria-busy', 'true');
      expect(status).not.toHaveAttribute('aria-label');
      expect(status).toHaveTextContent('Loading your results');
    } finally {
      act(() => useWorkspace.setState({ ready: true }));
    }
  });
});
