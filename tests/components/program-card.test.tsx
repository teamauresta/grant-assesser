// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ProgramCard } from '@/components/programs/program-card';
import { makeProgram } from '../helpers/program';

describe('ProgramCard', () => {
  const program = makeProgram({ name: 'Cloud AI tier' });
  it('shows no fit notice by default', () => {
    render(<ProgramCard program={program} />);
    expect(screen.queryByText(/not a fit/i)).toBeNull();
  });
  it('stays listed and linked but explains why it is not a fit', () => {
    const { container } = render(<ProgramCard program={program} notFitReason="Needs institutional VC funding" />);
    expect(screen.getByRole('link', { name: 'Cloud AI tier' })).toHaveAttribute('href', expect.stringMatching(/\/programs\/test\/?$/));
    const notice = screen.getByText('Not a fit:').parentElement!.parentElement!;
    expect(notice).toHaveTextContent('Not a fit: Needs institutional VC funding');
    expect(notice).toHaveClass('text-fg');
    expect(notice.querySelector('svg')).not.toBeNull();
    expect(container.querySelector('article')).toHaveClass('text-muted-fg');
  });
  // Not a fit cards are Card emphasis="quiet", as on the results page (Billabong plan, Task 13
  // leftovers from the Task 7 review): a dashed --border-strong outline and no fill of their own.
  it('draws a Not a fit card as a quiet card, like the results page', () => {
    const { container } = render(<ProgramCard program={program} notFitReason="Needs institutional VC funding" />);
    const card = container.querySelector('article')!;
    expect(card).toHaveClass('border-dashed', 'border-border-strong', 'text-muted-fg');
    for (const c of ['bg-bg', 'bg-surface', 'border-border']) expect(card).not.toHaveClass(c);
  });
  // Cards (Billabong design doc, section 4): --surface, a 1px --border outline, an 8px radius; the
  // title semibold and the amount in tabular digits.
  it('is a surface card with a semibold title and the amount in tabular digits', () => {
    const { container } = render(<ProgramCard program={program} />);
    expect(container.querySelector('article')).toHaveClass('bg-surface', 'border', 'border-border', 'rounded-lg');
    expect(screen.getByRole('heading', { name: 'Cloud AI tier' })).toHaveClass('font-semibold');
    expect(screen.getByText(/^\$10K/)).toHaveClass('num');
  });
});
