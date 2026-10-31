// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { act, render, screen, within } from '@testing-library/react';
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

// Empty results (Billabong design doc, section 7): a playful line, and the plain way out.
describe('Directory with no results', () => {
  it('says so playfully and keeps Clear filters', async () => {
    const user = userEvent.setup();
    render(<Directory />);
    await user.type(screen.getByRole('searchbox', { name: 'Search programs' }), 'zzzz-no-match');
    expect(screen.getByText('No programs match.')).toBeInTheDocument();
    expect(screen.getByText(/Even the platypus couldn't find one\./)).toBeInTheDocument();
    // The searching platypus (Task 10), decorative: the copy already says it.
    const art = screen.getByText('No programs match.').parentElement!.querySelector<HTMLElement>('[style*="aspect-ratio"]')!;
    expect(art.style.aspectRatio).toBe('1024 / 1024');
    expect(art).toHaveAttribute('aria-hidden', 'true');
    // The empty state's own button (the results bar has another), and it brings the programs back.
    const empty = screen.getByText('No programs match.').parentElement!;
    await user.click(within(empty).getByRole('button', { name: 'Clear filters' }));
    expect(screen.getByRole('searchbox', { name: 'Search programs' })).toHaveValue('');
    expect(screen.queryByText('No programs match.')).toBeNull();
    expect(screen.getByText(/^Showing [1-9]\d* of \d+ programs$/, { ignore: '[role="status"]' })).toBeInTheDocument();
  });
});
