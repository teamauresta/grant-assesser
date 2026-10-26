// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatusPill, statusLabel } from '@/components/ui/status-pill';

function pill() {
  return screen.getByTestId('status-pill');
}

describe('StatusPill', () => {
  it('renders the countdown for a closing-soon program', () => {
    render(<StatusPill declared="open" derived="closing-soon" daysToClose={5} />);
    expect(pill()).toHaveTextContent('Closes in 5 days');
  });

  it('says "Closes today" and "Closes tomorrow" for 0 and 1 days', () => {
    expect(statusLabel('closing-soon', 0)).toBe('Closes today');
    expect(statusLabel('closing-soon', 1)).toBe('Closes tomorrow');
    expect(statusLabel('closing-soon', 2)).toBe('Closes in 2 days');
  });

  it('renders "Unverified" with an icon', () => {
    render(<StatusPill declared="unverified" />);
    expect(pill()).toHaveTextContent('Unverified');
    const icon = pill().querySelector('svg');
    expect(icon).not.toBeNull();
    expect(icon).toHaveAttribute('aria-hidden', 'true');
  });

  it('falls back to the declared state when no derived state is given', () => {
    render(<StatusPill declared="rolling" />);
    expect(pill()).toHaveTextContent('Rolling');
  });

  it('prefers the derived state over the declared state', () => {
    render(<StatusPill declared="open" derived="closed" />);
    expect(pill()).toHaveTextContent('Closed');
    expect(pill()).not.toHaveTextContent('Open');
  });

  it('strikes through the label when closed', () => {
    render(<StatusPill declared="closed" />);
    expect(screen.getByText('Closed')).toHaveClass('line-through');
  });

  it.each([
    ['open', 'Open'],
    ['rolling', 'Rolling'],
    ['upcoming', 'Upcoming'],
    ['unverified', 'Unverified'],
    ['paused', 'Paused'],
    ['closed', 'Closed'],
  ] as const)('never relies on colour alone: %s has an icon and the text "%s"', (state, label) => {
    const { unmount } = render(<StatusPill declared={state} />);
    expect(pill()).toHaveTextContent(label);
    expect(pill().querySelector('svg')).not.toBeNull();
    expect(pill()).toHaveAttribute('data-state', state);
    unmount();
  });

  it('falls back to a generic label for closing-soon without a day count', () => {
    render(<StatusPill declared="open" derived="closing-soon" />);
    expect(pill()).toHaveTextContent('Closing soon');
  });
});
