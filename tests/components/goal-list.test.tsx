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
    expect(await screen.findByText('All goals done for Angel round.')).toBeInTheDocument();
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
    expect(await screen.findByText('All goals done for Angel round.')).toBeInTheDocument();
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
