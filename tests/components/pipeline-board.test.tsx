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

const now = new Date('2026-10-27T00:00:00Z');
const column = (name: string) => screen.getByRole('region', { name: new RegExp(`^${name}`) });

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
    const data: Record<string, string> = {};
    const dataTransfer = { setData: (k: string, v: string) => { data[k] = v; }, getData: (k: string) => data[k] ?? '', effectAllowed: '', dropEffect: '' };
    fireEvent.dragStart(screen.getByRole('article', { name: 'Angel round' }), { dataTransfer });
    fireEvent.dragOver(column('Outcome'), { dataTransfer });
    fireEvent.drop(column('Outcome'), { dataTransfer });
    const dialog = screen.getByRole('dialog', { name: 'What was the outcome?' });
    await userEvent.setup().click(within(dialog).getByRole('button', { name: /^Awarded/ }));
    expect(useWorkspace.getState().ws.pipeline.find((a) => a.id === id)?.stage).toBe('awarded');
    expect(await screen.findByText('Awarded. Add the reporting dates to your calendar.')).toBeInTheDocument();
    await waitFor(() => expect(confetti).toHaveBeenCalledTimes(2));
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
