// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Toaster } from '@/components/ui/toast';
import { TOAST_MS, toast, useToasts } from '@/lib/toast';

beforeEach(() => useToasts.setState({ toasts: [] }));
afterEach(() => vi.useRealTimers());

describe('Toaster', () => {
  it('announces politely without taking focus, and dismisses itself after 4 seconds', () => {
    vi.useFakeTimers();
    render(<><button>Elsewhere</button><Toaster /></>);
    screen.getByRole('button', { name: 'Elsewhere' }).focus();
    act(() => { toast('Submitted. That\'s the hardest part done.'); });
    const region = screen.getByRole('status');
    expect(region).toHaveAttribute('aria-live', 'polite');
    expect(region).toHaveTextContent('Submitted.');
    expect(screen.getByRole('button', { name: 'Elsewhere' })).toHaveFocus();
    act(() => { vi.advanceTimersByTime(TOAST_MS); });
    expect(region).not.toHaveTextContent('Submitted.');
  });

  it('shows an action link and a close button', async () => {
    render(<Toaster />);
    act(() => { toast('Awarded.', { label: 'Open calendar', href: '/plan/?tab=calendar' }); });
    // next/link drops the trailing slash under Vitest (trailingSlash is a next.config setting).
    expect(screen.getByRole('link', { name: 'Open calendar' })).toHaveAttribute('href', expect.stringMatching(/^\/plan\/?\?tab=calendar$/));
    await userEvent.click(screen.getByRole('button', { name: 'Dismiss' }));
    expect(screen.queryByText('Awarded.')).not.toBeInTheDocument();
  });

  it('waits while hovered and starts its 4 seconds again when the pointer leaves (WCAG 2.2.1)', () => {
    vi.useFakeTimers();
    render(<Toaster />);
    act(() => { toast('Paused.'); });
    const item = screen.getByText('Paused.').closest('div.animate-toast-in')!;
    fireEvent.mouseEnter(item);
    act(() => { vi.advanceTimersByTime(TOAST_MS * 2); });
    expect(screen.getByText('Paused.')).toBeInTheDocument();
    fireEvent.mouseLeave(item);
    act(() => { vi.advanceTimersByTime(TOAST_MS - 1); });
    expect(screen.getByText('Paused.')).toBeInTheDocument();
    act(() => { vi.advanceTimersByTime(1); });
    expect(screen.queryByText('Paused.')).not.toBeInTheDocument();
  });

  it('keeps at most three', () => {
    for (let i = 0; i < 5; i++) toast(`t${i}`);
    expect(useToasts.getState().toasts.map((t) => t.message)).toEqual(['t2', 't3', 't4']);
  });
});
