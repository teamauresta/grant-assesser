// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { Plan } from '@/components/plan/plan';
import { useWorkspace } from '@/lib/store/use-workspace';
import { emptyWorkspace } from '@/lib/store/workspace-store';
import { formatDate } from '@/lib/dates';
import type { Goal, Workspace } from '@/lib/schema';

vi.mock('next/navigation', () => ({ useSearchParams: () => new URLSearchParams() }));

const now = new Date('2026-10-27T00:00:00Z');
const t = now.toISOString();

function goal(id: string, title: string, status: Goal['status'], dueDate?: string, sequence = 0): Goal {
  return { id, applicationId: 'a', title, dueDate, status, steps: [], reminderOffsetsDays: [7], source: 'user', sequence, createdAt: t, updatedAt: t };
}

function filled(): Workspace {
  return {
    ...emptyWorkspace(now),
    pipeline: [{ id: 'a', programSlug: 'rdti', stage: 'preparing', notes: '', createdAt: t, updatedAt: t }],
    goals: [
      goal('g1', 'Register R&D activities', 'done', undefined, 0),
      // Far in the future, so "Due this week" stays empty whatever the real clock says.
      goal('g2', 'Draft the claim', 'todo', '2030-03-02', 1),
      goal('g3', 'Book the accountant', 'doing', '2030-04-01', 2),
      goal('g4', 'Collect timesheets', 'todo', undefined, 3),
    ],
  };
}

const header = () => screen.getByRole('heading', { level: 1, name: 'My plan' }).closest('header') as HTMLElement;

beforeEach(() => {
  useWorkspace.setState({ ws: emptyWorkspace(now), ready: false });
});

describe('Plan header', () => {
  it('shows the progress ring and the goals done, with the next goal as a link', () => {
    useWorkspace.setState({ ws: filled(), ready: true });
    render(<Plan />);
    const h = within(header());
    expect(h.getByText('25%', { selector: '.sr-only' })).toBeInTheDocument();
    // The counts sit in their own spans, so match the paragraph's whole text.
    const line = h.getByText((_, el) => el?.tagName === 'P' && /^1 of 4 goals done/.test(el.textContent ?? ''));
    expect(line).toHaveTextContent(`1 of 4 goals done. Next: Draft the claim, due ${formatDate('2030-03-02')}.`);
    expect(within(line).getByRole('link', { name: 'Draft the claim' })).toHaveAttribute('href', expect.stringMatching(/^\/plan\/?\?tab=goals&goal=g2$/));
  });

  it('leaves out "Next" when no open goal has a due date', () => {
    const ws = filled();
    useWorkspace.setState({ ws: { ...ws, goals: ws.goals.map((g) => (g.dueDate ? { ...g, status: 'done' as const } : g)) }, ready: true });
    render(<Plan />);
    const line = within(header()).getByText((_, el) => el?.tagName === 'P' && /goals done/.test(el.textContent ?? ''));
    expect(line).toHaveTextContent(/^3 of 4 goals done\.$/);
  });

  it('shows no ring and no progress line without goals', () => {
    useWorkspace.setState({ ws: { ...filled(), goals: [] }, ready: true });
    render(<Plan />);
    const h = within(header());
    expect(h.queryByText(/%$/, { selector: '.sr-only' })).toBeNull();
    expect(h.queryByText(/goals done/)).toBeNull();
  });
});
