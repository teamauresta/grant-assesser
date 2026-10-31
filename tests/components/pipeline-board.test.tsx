// @vitest-environment jsdom
import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// `confetti` is the fire function that confetti.create(canvas) returns.
const { confetti, create } = vi.hoisted(() => {
  const confetti = vi.fn();
  return { confetti, create: vi.fn(() => confetti) };
});
vi.mock('canvas-confetti', () => ({ default: Object.assign(vi.fn(), { create }) }));

import { useWorkspace } from '@/lib/store/use-workspace';
import { PipelineBoard } from '@/components/plan/pipeline-board';
import { Toaster } from '@/components/ui/toast';
import { resetCelebrations } from '@/lib/celebrate';
import { useToasts } from '@/lib/toast';
import { WINDOW_BAR } from '@/components/ui/window';
import { buttonClasses } from '@/components/ui/button';

const now = new Date('2026-10-27T00:00:00Z');
const column = (name: string) => screen.getByRole('region', { name: new RegExp(`^${name}`) });
/** A stand-in for the drag events' DataTransfer (jsdom has none). */
const dragData = () => {
  const data: Record<string, string> = {};
  return { setData: (k: string, v: string) => { data[k] = v; }, getData: (k: string) => data[k] ?? '', effectAllowed: '', dropEffect: '' };
};

beforeAll(async () => { await useWorkspace.getState().init(); });
beforeEach(() => {
  useWorkspace.getState().reset();
  resetCelebrations();
  useToasts.setState({ toasts: [] });
  confetti.mockClear();
});

describe('PipelineBoard', () => {
  it('shows an empty state with links to programs and results', () => {
    render(<PipelineBoard now={now} />);
    expect(screen.getByText('Every funded startup started with one application.')).toBeInTheDocument();
    expect(screen.getByText('Add your first from your results, or browse programs.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /browse programs/i })).toHaveAttribute('href', expect.stringMatching(/^\/programs\/?$/));
    expect(screen.getByRole('link', { name: /see your results/i })).toHaveAttribute('href', expect.stringMatching(/^\/assess\/results\/?$/));
  });

  it('"Move to…" changes the stage, moves the card to its column and keeps focus on it', async () => {
    const id = useWorkspace.getState().addCustomApplication('Angel round');
    useWorkspace.getState().addApplication('csiro-kick-start');
    render(<PipelineBoard now={now} />);
    const user = userEvent.setup();
    expect(within(column('Considering')).getAllByRole('article')).toHaveLength(2);

    await user.click(screen.getByRole('button', { name: 'Move Angel round to…' }));
    const items = screen.getAllByRole('menuitem').map((i) => i.textContent);
    expect(items).toEqual(['Preparing', 'Submitted', 'Outcome: Awarded', 'Outcome: Declined', 'Outcome: Withdrawn']);
    await user.click(screen.getByRole('menuitem', { name: 'Submitted' }));

    expect(useWorkspace.getState().ws.pipeline.find((a) => a.id === id)?.stage).toBe('submitted');
    const card = within(column('Submitted')).getByRole('article', { name: 'Angel round' });
    expect(card).toHaveFocus();
    expect(within(column('Considering')).getAllByRole('article')).toHaveLength(1);
    expect(screen.getByRole('status')).toHaveTextContent('Moved Angel round to Submitted.');
  });

  it('is keyboard operable and shows the outcome as a sub-badge', async () => {
    useWorkspace.getState().addCustomApplication('Angel round');
    render(<PipelineBoard now={now} />);
    const user = userEvent.setup();
    screen.getByRole('button', { name: 'Move Angel round to…' }).focus();
    await user.keyboard('{ArrowUp}{Enter}'); // last item: Outcome: Withdrawn
    expect(useWorkspace.getState().ws.pipeline[0].stage).toBe('withdrawn');
    expect(within(column('Outcome')).getByText('Withdrawn')).toBeInTheDocument();
  });

  it('asks before removing an application and its goals', async () => {
    useWorkspace.getState().addApplication('csiro-kick-start');
    const goals = useWorkspace.getState().ws.goals.length;
    render(<PipelineBoard now={now} />);
    const user = userEvent.setup();
    const more = screen.getByRole('button', { name: /more actions for/i });

    await user.click(more);
    await user.click(screen.getByRole('menuitem', { name: /remove from pipeline/i }));
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAccessibleDescription(new RegExp(`deletes its ${goals} goals`));
    expect(within(dialog).getByRole('button', { name: 'Cancel' })).toHaveFocus();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(useWorkspace.getState().ws.pipeline).toHaveLength(1);
    expect(more).toHaveFocus();

    await user.click(more);
    await user.click(screen.getByRole('menuitem', { name: /remove from pipeline/i }));
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Remove' }));
    expect(useWorkspace.getState().ws.pipeline).toHaveLength(0);
    expect(useWorkspace.getState().ws.goals).toHaveLength(0);
  });

  it('edits the expected amount in place', async () => {
    useWorkspace.getState().addCustomApplication('Angel round');
    render(<PipelineBoard now={now} />);
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Set expected amount for Angel round' }));
    await user.type(screen.getByLabelText('Expected amount (AUD)'), 'lots{Enter}');
    expect(screen.getByText(/enter an amount in dollars/i)).toBeInTheDocument();
    await user.clear(screen.getByLabelText('Expected amount (AUD)'));
    await user.type(screen.getByLabelText('Expected amount (AUD)'), '50k{Enter}');
    expect(useWorkspace.getState().ws.pipeline[0].expectedAmount).toBe(50_000);
    expect(screen.getByText('$50K')).toBeInTheDocument();
  });
});

// The columns are windows and the cards sit on --surface (Billabong design doc section 4 and
// section 11, Task 8).
describe('PipelineBoard windows', () => {
  it('draws each column as a window titled with its stage and count', () => {
    useWorkspace.getState().addCustomApplication('Angel round');
    useWorkspace.getState().addCustomApplication('Seed round');
    render(<PipelineBoard now={now} />);
    for (const [name, count] of [['Considering', '2 applications'], ['Preparing', '0 applications'], ['Submitted', '0 applications'], ['Outcome', '0 applications']]) {
      const region = column(name);
      const heading = within(region).getByRole('heading', { level: 2, name: `${name} ${count}` });
      expect(region).toHaveAttribute('aria-labelledby', heading.id);
      expect(heading.id).toBe(`column-${name.toLowerCase()}`);
      expect(WINDOW_BAR.split(' ').every((c) => heading.parentElement!.classList.contains(c))).toBe(true);
      expect(heading.querySelector('.num')).not.toBeNull();
      expect(region).toHaveClass('bg-surface', 'shadow-window', 'border-border');
    }
  });

  it('marks drop targets on the window frame while a card is dragged', () => {
    useWorkspace.getState().addCustomApplication('Angel round');
    render(<PipelineBoard now={now} />);
    const dataTransfer = dragData();
    fireEvent.dragStart(screen.getByRole('article', { name: 'Angel round' }), { dataTransfer });
    // The card's own column is not a target; the others are dashed, and the one under the pointer is accent.
    expect(column('Considering')).toHaveClass('border-border');
    expect(column('Preparing')).toHaveClass('border-dashed', 'border-border-strong');
    fireEvent.dragOver(column('Preparing'), { dataTransfer });
    expect(column('Preparing')).toHaveClass('border-accent');
    // One call per class: not.toHaveClass with several passes when any one of them is missing.
    expect(column('Preparing')).not.toHaveClass('border-border');
    expect(column('Preparing')).not.toHaveClass('border-border-strong');
    fireEvent.drop(column('Preparing'), { dataTransfer });
    expect(useWorkspace.getState().ws.pipeline[0].stage).toBe('preparing');
    expect(column('Preparing')).toHaveClass('border-border');
  });

  it('focuses the column heading after removing a card from it', async () => {
    useWorkspace.getState().addCustomApplication('Angel round');
    useWorkspace.getState().addCustomApplication('Seed round');
    render(<PipelineBoard now={now} />);
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'More actions for Angel round' }));
    await user.click(screen.getByRole('menuitem', { name: /remove from pipeline/i }));
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Remove' }));
    await waitFor(() => expect(screen.getByRole('heading', { level: 2, name: /^Considering/ })).toHaveFocus());
    expect(screen.getByRole('heading', { level: 2, name: /^Considering/ })).toHaveAttribute('tabindex', '-1');
  });

  it('draws cards on --surface with a neutral outline, Move to… a secondary button', () => {
    useWorkspace.getState().addCustomApplication('Angel round');
    render(<PipelineBoard now={now} />);
    const card = screen.getByRole('article', { name: 'Angel round' });
    expect(card).toHaveClass('bg-surface', 'border', 'border-border', 'rounded-lg');
    expect(card).not.toHaveClass('bg-bg');
    expect(within(card).getByRole('button', { name: 'Move Angel round to…' })).toHaveAttribute('class', buttonClasses());
  });

  // The outcome dialog's choices are cards on the dialog's --surface body.
  it('offers the outcomes as outlined choices on the dialog body', () => {
    useWorkspace.getState().addCustomApplication('Angel round');
    render(<PipelineBoard now={now} />);
    const dataTransfer = dragData();
    fireEvent.dragStart(screen.getByRole('article', { name: 'Angel round' }), { dataTransfer });
    fireEvent.dragOver(column('Outcome'), { dataTransfer });
    fireEvent.drop(column('Outcome'), { dataTransfer });
    const dialog = screen.getByRole('dialog', { name: 'What was the outcome?' });
    for (const name of [/^Awarded/, /^Declined/, /^Withdrawn/]) {
      const choice = within(dialog).getByRole('button', { name });
      expect(choice).toHaveClass('bg-surface', 'border-border-strong', 'hover:bg-bg');
    }
  });
});

describe('PipelineBoard milestone cheers', () => {
  const toasts = () => useToasts.getState().toasts.map((t) => t.message);
  /** Renders the board with the toaster and moves "Angel round" through Move to… */
  async function setup() {
    const id = useWorkspace.getState().addCustomApplication('Angel round');
    render(<><PipelineBoard now={now} /><Toaster /></>);
    const user = userEvent.setup();
    const moveTo = async (item: string) => {
      await user.click(screen.getByRole('button', { name: 'Move Angel round to…' }));
      await user.click(screen.getByRole('menuitem', { name: item }));
    };
    return { id, moveTo };
  }

  it('cheers a submission with a toast and a burst', async () => {
    const { id, moveTo } = await setup();
    await moveTo('Submitted');
    expect(await screen.findByText("Submitted. That's the hardest part done.")).toBeInTheDocument();
    await waitFor(() => expect(confetti).toHaveBeenCalledTimes(1));
    expect(document.querySelector(`li[data-app-id="${id}"]`)).toContainElement(screen.getByRole('article', { name: 'Angel round' }));
  });

  it('cheers an award and links to the calendar', async () => {
    const { moveTo } = await setup();
    await moveTo('Outcome: Awarded');
    expect(await screen.findByText('Awarded. Add the reporting dates to your calendar.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open calendar' })).toHaveAttribute('href', expect.stringMatching(/^\/plan\/?\?tab=calendar$/));
    await waitFor(() => expect(confetti).toHaveBeenCalledTimes(2));
  });

  it('is supportive after a decline, without confetti', async () => {
    const { moveTo } = await setup();
    await moveTo('Outcome: Declined');
    expect(await screen.findByText('Most funded startups applied more than once. See what else fits.')).toBeInTheDocument();
    await new Promise((r) => setTimeout(r, 20));
    expect(confetti).not.toHaveBeenCalled();
  });

  it('says nothing for a move to Preparing', async () => {
    const { moveTo } = await setup();
    await moveTo('Preparing');
    await new Promise((r) => setTimeout(r, 20));
    expect(toasts()).toEqual([]);
    expect(confetti).not.toHaveBeenCalled();
  });

  it('cheers an award chosen in the outcome dialog after a drop on Outcome', async () => {
    const { id } = await setup();
    const dataTransfer = dragData();
    fireEvent.dragStart(screen.getByRole('article', { name: 'Angel round' }), { dataTransfer });
    fireEvent.dragOver(column('Outcome'), { dataTransfer });
    fireEvent.drop(column('Outcome'), { dataTransfer });
    const dialog = screen.getByRole('dialog', { name: 'What was the outcome?' });
    await userEvent.setup().click(within(dialog).getByRole('button', { name: /^Awarded/ }));
    expect(useWorkspace.getState().ws.pipeline.find((a) => a.id === id)?.stage).toBe('awarded');
    expect(await screen.findByText('Awarded. Add the reporting dates to your calendar.')).toBeInTheDocument();
    await waitFor(() => expect(confetti).toHaveBeenCalledTimes(2));
  });

  // A toast fired while a dialog is open would be inert (the dialog makes everything else inert), so
  // never announced and its link unreachable. The award chosen in the outcome dialog cheers only once
  // the dialog has closed and the page is live again.
  it('cheers an award from the outcome dialog only after the dialog has closed', async () => {
    await setup();
    const seen: { dialogOpen: boolean; toasterInert: boolean }[] = [];
    // Recorded only when a toast is added: other store updates (a dismissal, a re-render) are not
    // the moment that matters.
    const unsubscribe = useToasts.subscribe((s, prev) => {
      if (s.toasts.length <= prev.toasts.length) return;
      const region = document.querySelector('[data-toaster]');
      expect(region).toHaveAttribute('aria-live', 'polite');
      let inert = false;
      for (let el = region as HTMLElement | null; el; el = el.parentElement) inert ||= el.inert === true;
      seen.push({ dialogOpen: document.querySelector('[role="dialog"]') !== null, toasterInert: inert });
    });
    try {
      const dataTransfer = dragData();
      fireEvent.dragStart(screen.getByRole('article', { name: 'Angel round' }), { dataTransfer });
      fireEvent.dragOver(column('Outcome'), { dataTransfer });
      fireEvent.drop(column('Outcome'), { dataTransfer });
      await userEvent.setup().click(within(screen.getByRole('dialog')).getByRole('button', { name: /^Awarded/ }));
      await screen.findByText('Awarded. Add the reporting dates to your calendar.');
      expect(seen.length).toBeGreaterThanOrEqual(1);
      for (const moment of seen) expect(moment).toEqual({ dialogOpen: false, toasterInert: false });
    } finally {
      unsubscribe();
    }
  });

  it('says nothing for Withdrawn', async () => {
    const { moveTo } = await setup();
    await moveTo('Outcome: Withdrawn');
    await new Promise((r) => setTimeout(r, 20));
    expect(toasts()).toEqual([]);
    expect(confetti).not.toHaveBeenCalled();
  });

  it('cheers a submission once, even after moving back and submitting again', async () => {
    const { moveTo } = await setup();
    await moveTo('Submitted');
    await screen.findByText("Submitted. That's the hardest part done.");
    await moveTo('Considering');
    await moveTo('Submitted');
    await new Promise((r) => setTimeout(r, 20));
    expect(toasts()).toEqual(["Submitted. That's the hardest part done."]);
    expect(confetti).toHaveBeenCalledTimes(1);
  });

  it('starts the burst from the card in its new column', async () => {
    // Give each column its own place on a 1000px-wide screen: Considering 0, Preparing 250, Submitted 500, Outcome 750.
    const lefts: Record<string, number> = { 'column-considering': 0, 'column-preparing': 250, 'column-submitted': 500, 'column-outcome': 750 };
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (this: Element) {
      const left = lefts[this.closest('section[aria-labelledby]')?.getAttribute('aria-labelledby') ?? ''] ?? 0;
      return { left, top: 100, width: 250, height: 100, right: left + 250, bottom: 200, x: left, y: 100, toJSON() {} } as DOMRect;
    });
    vi.stubGlobal('innerWidth', 1000);
    vi.stubGlobal('innerHeight', 1000);
    try {
      const { moveTo } = await setup();
      await moveTo('Submitted');
      await waitFor(() => expect(confetti).toHaveBeenCalledTimes(1));
      expect(confetti.mock.calls[0][0].origin).toEqual({ x: 0.625, y: 0.15 });
    } finally {
      vi.restoreAllMocks();
      vi.unstubAllGlobals();
    }
  });
});
