// @vitest-environment jsdom
import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// The step lives in ?step=; the wizard pushes it with history.pushState, which Next.js turns into a
// new useSearchParams value. Here the mock reads the URL and the test re-renders.
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }), useSearchParams: () => new URLSearchParams(window.location.search) }));
vi.mock('@/lib/use-now', () => ({ useNow: () => new Date('2026-10-27T00:00:00Z') }));

import { Wizard } from '@/components/assess/wizard';
import { buttonClasses } from '@/components/ui/button';
import { useWorkspace } from '@/lib/store/use-workspace';
import { emptyWorkspace } from '@/lib/store/workspace-store';

const now = new Date('2026-10-27T00:00:00Z');

beforeAll(async () => { await useWorkspace.getState().init(); });
beforeEach(() => {
  window.history.replaceState(null, '', '/?step=2');
  useWorkspace.setState({ ws: emptyWorkspace(now) });
  window.scrollTo = vi.fn() as typeof window.scrollTo;
});

// The wizard in a window (Billabong plan, Task 6; design doc section 11): the step is the window's
// title, an h2 under the page's h1, and the text equivalent of the progress bar.
describe('Wizard window', () => {
  it('is a region titled with the step, and its title is the step heading', async () => {
    render(<Wizard />);
    const heading = await screen.findByRole('heading', { level: 2, name: 'Step 2 of 6: Company' });
    const region = screen.getByRole('region', { name: 'Step 2 of 6: Company' });
    expect(region).toContainElement(heading);
    expect(heading).toHaveAttribute('tabindex', '-1');
    // The step's questions and its Back and Next buttons are inside the window.
    expect(within(region).getByRole('group', { name: /^Do you have an Australian company with an ACN\?/ })).toBeInTheDocument();
    expect(within(region).getByRole('button', { name: 'Next' })).toBeInTheDocument();
    expect(within(region).getByRole('button', { name: 'Back' })).toBeInTheDocument();
  });

  it('keeps the progress in text: the bar itself is hidden from assistive tech', async () => {
    render(<Wizard />);
    await screen.findByRole('heading', { name: 'Step 2 of 6: Company' });
    const bar = document.querySelector('[data-wizard-progress]')!;
    expect(bar).toHaveAttribute('aria-hidden', 'true');
    // Amber fill (--primary) on a --border track (visible on the --surface body), a third of the way
    // at step 2.
    expect(bar).toHaveClass('bg-border');
    const fill = bar.firstElementChild as HTMLElement;
    expect(fill).toHaveClass('bg-primary');
    expect(fill.style.transform).toBe(`scaleX(${2 / 6})`);
  });

  it('moves focus to the new step title after Next and Back', async () => {
    const user = userEvent.setup();
    const { rerender } = render(<Wizard />);
    await screen.findByRole('heading', { name: 'Step 2 of 6: Company' });

    await user.click(screen.getByRole('button', { name: 'Next' }));
    expect(window.location.search).toBe('?step=3');
    rerender(<Wizard />);
    expect(screen.getByRole('heading', { level: 2, name: 'Step 3 of 6: Money' })).toHaveFocus();

    await user.click(screen.getByRole('button', { name: 'Back' }));
    rerender(<Wizard />);
    expect(screen.getByRole('heading', { level: 2, name: 'Step 2 of 6: Company' })).toHaveFocus();
  });

  it('does not take focus on first load', async () => {
    render(<Wizard />);
    const heading = await screen.findByRole('heading', { name: 'Step 2 of 6: Company' });
    expect(heading).not.toHaveFocus();
  });

  it('makes Next the primary button and Back the secondary one', async () => {
    render(<Wizard />);
    await screen.findByRole('heading', { name: 'Step 2 of 6: Company' });
    // Each carries every class of its variant, as buttonClasses() gives them.
    const has = (el: HTMLElement, variant: 'primary' | 'secondary') => {
      for (const c of buttonClasses({ variant }).split(' ')) expect(el).toHaveClass(c);
    };
    has(screen.getByRole('button', { name: 'Next' }), 'primary');
    has(screen.getByRole('button', { name: 'Back' }), 'secondary');
  });

  // Until the store has loaded: the window's frame, announced as loading without naming a plain div.
  it('shows a loading window that says so in text', () => {
    useWorkspace.setState({ ready: false });
    try {
      render(<Wizard />);
      const status = screen.getByRole('status');
      expect(status).toHaveAttribute('aria-busy', 'true');
      expect(status).not.toHaveAttribute('aria-label');
      expect(status).toHaveTextContent('Loading your answers');
    } finally {
      useWorkspace.setState({ ready: true });
    }
  });
});
