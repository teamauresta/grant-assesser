// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { ProgramDetail } from '@/components/programs/program-detail';
import { getProgram } from '@/content/programs';
import { makeProgram } from '../helpers/program';

// The program page's sections are windows (Billabong design doc, section 4): each a region named by
// its h2 title, under the page's one h1, with the decorative controls hidden.
describe('ProgramDetail sections', () => {
  const program = getProgram('csiro-kick-start')!;

  it('are regions named by h2 window titles, under the h1', () => {
    render(<ProgramDetail program={program} />);
    expect(screen.getAllByRole('heading', { level: 1 }).map((h) => h.textContent)).toEqual(['CSIRO Kick-Start']);
    for (const name of ['What it is', 'Eligibility', 'How to apply', 'Sources']) {
      const region = screen.getByRole('region', { name });
      const heading = within(region).getByRole('heading', { level: 2, name });
      expect(region).toHaveAttribute('aria-labelledby', heading.id);
      // The window frame: title bar on --neutral-bg over a --surface body.
      expect(region).toHaveClass('bg-surface');
      expect(heading.parentElement).toHaveClass('bg-neutral-bg');
    }
  });

  it('keeps each heading linkable by a stable id', () => {
    render(<ProgramDetail program={program} />);
    expect(screen.getByRole('heading', { level: 2, name: 'Eligibility' })).toHaveAttribute('id', 'eligibility');
    expect(screen.getByRole('heading', { level: 2, name: 'How to apply' })).toHaveAttribute('id', 'how-to-apply');
  });

  it('shows the how-to-apply steps in full, at body size', () => {
    render(<ProgramDetail program={program} />);
    const steps = within(screen.getByRole('region', { name: 'How to apply' })).getAllByRole('listitem');
    expect(steps.map((li) => li.textContent)).toEqual(program.content.howToApply);
    for (const li of steps) expect(li.closest('[class*="text-sm"], [class*="text-xs"]')).toBeNull();
  });

  it('leaves out sections with nothing to show', () => {
    render(<ProgramDetail program={makeProgram({ name: 'Bare' })} />);
    expect(screen.queryByRole('region', { name: 'How to apply' })).toBeNull();
    expect(screen.queryByRole('region', { name: 'Caveats' })).toBeNull();
    expect(screen.getByRole('region', { name: 'Sources' })).toBeInTheDocument();
  });

  it('offers Add to pipeline as the primary button', () => {
    render(<ProgramDetail program={program} />);
    const add = screen.getByRole('button', { name: /^Add to pipeline/ });
    expect(add).toHaveClass('bg-primary', 'text-on-primary');
  });
});
