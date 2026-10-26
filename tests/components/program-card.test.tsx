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
});
