// @vitest-environment jsdom
import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { CalendarView } from '@/components/plan/calendar-view';
import { useWorkspace } from '@/lib/store/use-workspace';

const now = new Date('2026-10-27T00:00:00Z');

beforeAll(async () => { await useWorkspace.getState().init(); });
beforeEach(() => { useWorkspace.getState().reset(); });

// The month grid in the Billabong style (design doc section 11, Task 8): days of the month on
// --surface, today's number on the accent (the --bg on --accent pair in tests/lib/tokens.test.ts),
// and each goal or deadline a small outlined pill.
describe('CalendarView month grid', () => {
  it('marks today with --bg text on the accent', () => {
    render(<CalendarView now={now} />);
    const today = screen.getByText(/, today$/).parentElement!;
    expect(today).toHaveClass('bg-accent', 'text-bg', 'rounded-full');
    expect(today.closest('td')).toHaveAttribute('aria-current', 'date');
  });

  it('draws the days of the month on --surface and the others on the page', () => {
    render(<CalendarView now={now} />);
    const table = screen.getByRole('table');
    const cell = (label: RegExp) => within(table).getByText(label).closest('td')!;
    expect(cell(/^Tuesday,? 27 October/)).toHaveClass('bg-surface');
    // The grid starts on Monday 28 September.
    expect(cell(/^Monday,? 28 September/)).toHaveClass('bg-bg');
  });

  it('shows goals as small outlined pills', () => {
    useWorkspace.getState().addGoal({ title: 'Draft the budget', dueDate: '2026-10-29' });
    render(<CalendarView now={now} />);
    const pill = within(screen.getByRole('table')).getByRole('link', { name: 'Goal: Draft the budget' });
    expect(pill).toHaveClass('rounded-full', 'text-xs', 'sm:border', 'sm:border-border-strong', 'sm:bg-surface');
    expect(pill).toHaveClass('hover:bg-neutral-bg');
  });
});
