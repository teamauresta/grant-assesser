// @vitest-environment jsdom
import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// `confetti` is the fire function that confetti.create(canvas) returns.
const { confetti, create } = vi.hoisted(() => {
  const confetti = vi.fn();
  return { confetti, create: vi.fn(() => confetti) };
});
vi.mock('canvas-confetti', () => ({ default: Object.assign(vi.fn(), { create }) }));

import { GoalList } from '@/components/plan/goal-list';
import { Toaster } from '@/components/ui/toast';
import { resetCelebrations } from '@/lib/celebrate';
import { useToasts } from '@/lib/toast';
import { useWorkspace } from '@/lib/store/use-workspace';

const now = new Date('2026-10-27T00:00:00Z');
const toasts = () => useToasts.getState().toasts.map((t) => t.message);
const settle = () => new Promise((r) => setTimeout(r, 20));

beforeAll(async () => { await useWorkspace.getState().init(); });
beforeEach(() => {
  useWorkspace.getState().reset();
  resetCelebrations();
  useToasts.setState({ toasts: [] });
  confetti.mockClear();
});

/** "Angel round" with two open goals. */
function seed() {
  const { addCustomApplication, addGoal } = useWorkspace.getState();
  const appId = addCustomApplication('Angel round');
  addGoal({ title: 'Write the deck', applicationId: appId });
  addGoal({ title: 'Book pitch meetings', applicationId: appId });
  return appId;
}

describe('GoalList milestone cheer', () => {
  it('cheers when the last open goal of an application is ticked, and not before', async () => {
    seed();
    render(<><GoalList now={now} /><Toaster /></>);
    const user = userEvent.setup();

    await user.click(screen.getByRole('checkbox', { name: 'Done: Write the deck' }));
    await settle();
    expect(toasts()).toEqual([]);

    await user.click(screen.getByRole('checkbox', { name: 'Done: Book pitch meetings' }));
    // Copy from the Billabong copy pass (design doc, section 7); the application's name stays in it.
    expect(await screen.findByText('All goals done for Angel round. Not a box left unticked.')).toBeInTheDocument();
    await waitFor(() => expect(confetti).toHaveBeenCalledTimes(1));
  });

  it('cheers when the status select marks the last goal done', async () => {
    seed();
    render(<><GoalList now={now} /><Toaster /></>);
    const user = userEvent.setup();
    await user.selectOptions(screen.getByLabelText('Status of Write the deck'), 'done');
    await user.selectOptions(screen.getByLabelText('Status of Book pitch meetings'), 'doing');
    await settle();
    expect(toasts()).toEqual([]);
    await user.selectOptions(screen.getByLabelText('Status of Book pitch meetings'), 'done');
    // Copy from the Billabong copy pass (design doc, section 7); the application's name stays in it.
    expect(await screen.findByText('All goals done for Angel round. Not a box left unticked.')).toBeInTheDocument();
  });

  it('does not cheer for a declined application', async () => {
    const appId = seed();
    useWorkspace.getState().moveApplication(appId, 'declined');
    render(<><GoalList now={now} /><Toaster /></>);
    const user = userEvent.setup();
    await user.click(screen.getByRole('checkbox', { name: 'Done: Write the deck' }));
    await user.click(screen.getByRole('checkbox', { name: 'Done: Book pitch meetings' }));
    await settle();
    expect(toasts()).toEqual([]);
    expect(confetti).not.toHaveBeenCalled();
  });
});

// docs/art/billabong-prompts.md: the searching platypus on the empty goals list, as on the
// directory's empty state; decorative, the copy says it.
describe('GoalList empty state', () => {
  it('opens with the searching platypus, hidden from assistive technology', () => {
    render(<GoalList now={now} />);
    const empty = screen.getByText('Big applications get done one small goal at a time.').parentElement!;
    const art = empty.querySelectorAll<HTMLElement>('[data-art]');
    expect(art).toHaveLength(1);
    expect(art[0]).toHaveAttribute('data-art', 'platypus-search');
    expect(art[0]).toHaveAttribute('aria-hidden', 'true');
    expect(art[0]).toHaveClass('w-24', 'md:w-32');
  });

  it('shows no art once there are goals', () => {
    seed();
    const { container } = render(<GoalList now={now} />);
    expect(container.querySelector('[data-art]')).toBeNull();
  });
});
