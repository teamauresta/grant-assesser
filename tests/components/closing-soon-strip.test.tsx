// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { ClosingSoonStrip } from '@/components/programs/closing-soon-strip';
import { makeProgram } from '../helpers/program';

vi.mock('@/lib/use-now', () => ({ useNow: () => new Date('2026-10-27T00:00:00Z') }));
afterEach(() => { vi.restoreAllMocks(); });

const close = (date: string) => [{ label: 'Applications close', kind: 'close' as const, date }];

describe('ClosingSoonStrip', () => {
  it('shows the derived status and leaves out programs that are not open', () => {
    render(<ClosingSoonStrip programs={[
      makeProgram({ slug: 'open-near', name: 'Open Near', status: { state: 'open' }, deadlines: close('2026-10-30') }),
      makeProgram({ slug: 'unv-near', name: 'Unverified Near', status: { state: 'unverified' }, deadlines: close('2026-10-29') }),
      makeProgram({ slug: 'roll-later', name: 'Rolling Later', status: { state: 'rolling' }, deadlines: close('2026-11-20') }),
    ]} />);
    const items = screen.getAllByRole('listitem');
    expect(items.map((li) => within(li).getByRole('link').textContent)).toEqual(['Open Near', 'Rolling Later']);
    expect(screen.queryByText('Unverified Near')).not.toBeInTheDocument();
    const pill = within(items[0]).getByTestId('status-pill');
    expect(pill).toHaveAttribute('data-state', 'closing-soon');
    expect(pill).toHaveTextContent('Closes in 3 days');
    expect(within(items[1]).getByText('In 24 days')).toBeInTheDocument();
    expect(within(items[1]).getByTestId('status-pill')).toHaveAttribute('data-state', 'rolling');
  });
});
