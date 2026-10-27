// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { ResumeCard } from '@/components/home/resume-card';
import { useWorkspace } from '@/lib/store/use-workspace';
import { emptyWorkspace } from '@/lib/store/workspace-store';
import { formatDate } from '@/lib/dates';
import type { Workspace } from '@/lib/schema';

const now = new Date('2026-10-27T00:00:00Z');
const t = now.toISOString();

function filled(): Workspace {
  return {
    ...emptyWorkspace(now),
    pipeline: [{ id: 'a', programSlug: 'rdti', stage: 'preparing', notes: '', createdAt: t, updatedAt: t }],
    goals: [
      { id: 'g1', applicationId: 'a', title: 'Register R&D activities', status: 'done', steps: [], reminderOffsetsDays: [7], source: 'user', sequence: 0, createdAt: t, updatedAt: t },
      { id: 'g2', applicationId: 'a', title: 'Draft the claim', dueDate: '2026-11-02', status: 'todo', steps: [], reminderOffsetsDays: [7], source: 'user', sequence: 1, createdAt: t, updatedAt: t },
    ],
  };
}

beforeEach(() => {
  useWorkspace.setState({ ws: emptyWorkspace(now), ready: false });
});

describe('ResumeCard', () => {
  it('renders nothing before the workspace loads, or with an empty pipeline', () => {
    useWorkspace.setState({ ws: filled() });
    const { container } = render(<ResumeCard />);
    expect(container).toBeEmptyDOMElement();
    act(() => useWorkspace.setState({ ws: emptyWorkspace(now), ready: true }));
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing when the applications have no goals to count, never "0 of 0 goals done"', () => {
    useWorkspace.setState({ ws: { ...filled(), goals: [] }, ready: true });
    const { container } = render(<ResumeCard />);
    expect(container).toBeEmptyDOMElement();
    expect(screen.queryByText(/0 of 0 goals done/)).toBeNull();
  });

  it('shows goal progress, the next goal and a link to the plan', () => {
    useWorkspace.setState({ ws: filled(), ready: true });
    render(<ResumeCard />);
    expect(screen.getByRole('region', { name: 'Pick up where you left off' })).toBeInTheDocument();
    expect(screen.getByText('50%', { selector: '.sr-only' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: '50% of goals done' })).toBeInTheDocument();
    // The counts sit in their own spans, so match the paragraph's whole text.
    const line = screen.getByText((_, el) => el?.tagName === 'P' && /^1 of 2 goals done/.test(el.textContent ?? ''));
    expect(line).toHaveTextContent(`1 of 2 goals done. Next: Draft the claim, due ${formatDate('2026-11-02')}`);
    expect(screen.getByRole('link', { name: 'Open My plan' })).toHaveAttribute('href', expect.stringMatching(/^\/plan\/?$/));
  });
});
