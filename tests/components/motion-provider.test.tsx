// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MotionProvider, useMotionFeaturesLoaded, useMotionReady } from '@/components/motion/motion-provider';
import { Directory } from '@/components/programs/directory';

vi.mock('next/navigation', () => ({ useSearchParams: () => new URLSearchParams() }));

function Probe() {
  return <p data-testid="probe">{`${useMotionFeaturesLoaded()} ${useMotionReady()}`}</p>;
}

describe('MotionProvider', () => {
  it('reports ready once the features load, and new directory cards then fade in', async () => {
    render(<MotionProvider><Probe /><Directory /></MotionProvider>);
    await waitFor(() => expect(screen.getByTestId('probe')).toHaveTextContent('true true'));
    // Narrow the list with a search, then clear it: the cards that come back mount anew.
    const user = userEvent.setup();
    const search = screen.getByRole('searchbox', { name: 'Search programs' });
    await user.type(search, 'csiro');
    // Cleared in one synchronous change, so the cards are checked as they mount, before any frame.
    fireEvent.change(search, { target: { value: '' } });
    const cards = screen.getAllByRole('listitem').filter((li) => li.querySelector('article'));
    // The cards that came back are part-way through their fade in; the ones already shown are not.
    const entering = cards.filter((li) => li.style.opacity !== '' && Number(li.style.opacity) < 1);
    expect(entering.length).toBeGreaterThan(0);
    expect(entering.length).toBeLessThan(cards.length);
  });
});
