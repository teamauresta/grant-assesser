// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatusPill, statusLabel } from '@/components/ui/status-pill';
import { Badge } from '@/components/ui/badge';

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

// Billabong pills (design doc section 4): fully rounded with a 1px outline. Filled status tones keep
// their colours with a transparent outline; the neutral and outline tones are outlined in
// --border-strong (3:1, WCAG 1.4.11).
describe('pill shape', () => {
  it.each([
    ['open', 'border-transparent', 'bg-ok-bg'],
    ['closing-soon', 'border-transparent', 'bg-warn-bg'],
    ['paused', 'border-border-strong', 'bg-neutral-bg'],
    ['closed', 'border-border-strong', 'bg-neutral-bg'],
    ['unverified', 'border-border-strong', 'bg-transparent'],
    ['upcoming', 'border-border-strong', 'bg-transparent'],
  ] as const)('StatusPill %s is rounded, outlined %s, filled %s', (state, border, bg) => {
    render(<StatusPill declared="open" derived={state} />);
    expect(pill()).toHaveClass('rounded-full', 'border', border, bg, 'text-xs', 'font-medium');
    expect(pill().querySelector('svg')).toHaveAttribute('width', '16');
  });

  it.each(['outline', 'subtle'] as const)('Badge %s is rounded with a --border-strong outline', (variant) => {
    render(<Badge variant={variant}>Official</Badge>);
    expect(screen.getByText('Official')).toHaveClass('rounded-full', 'border', 'border-border-strong', 'text-xs', 'font-medium');
  });
});
