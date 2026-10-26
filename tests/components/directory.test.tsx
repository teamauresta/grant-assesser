// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Directory } from '@/components/programs/directory';
import { PROGRAMS } from '@/content/programs';

vi.mock('next/navigation', () => ({ useSearchParams: () => new URLSearchParams() }));
afterEach(() => vi.useRealTimers());

describe('Directory results count', () => {
  it('announces the count 500ms after typing stops, while the visible count updates at once', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<Directory />);
    const status = screen.getByRole('status');
    const before = status.textContent;
    expect(before).toMatch(new RegExp(`of ${PROGRAMS.length} programs`));

    await user.type(screen.getByRole('searchbox', { name: 'Search programs' }), 'zzzz-no-match');
    expect(screen.getByText(`Showing 0 of ${PROGRAMS.length} programs`, { ignore: '[role="status"]' })).toBeInTheDocument();
    expect(status.textContent).toBe(before);
    act(() => { vi.advanceTimersByTime(500); });
    expect(status).toHaveTextContent(`Showing 0 of ${PROGRAMS.length} programs`);
  });
});
