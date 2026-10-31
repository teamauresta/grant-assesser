// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { ProgramDetail } from '@/components/programs/program-detail';
import { PersonaNotes } from '@/components/programs/persona-notes';
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
      // Section titles at 16px, so they scan as headings (Window's titleSize="md").
      expect(heading).toHaveClass('text-base');
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
    // Deliberately rough: any class containing text-sm or text-xs on the step or an ancestor fails it.
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
    // The primary variant: the amber fill and the ledge marker (tests/components/button.test.tsx
    // covers the variant's classes).
    expect(screen.getByRole('button', { name: /^Add to pipeline/ })).toHaveClass('bg-primary', 'ledge');
  });

  // Inside a window the lists have no frame of their own: the body is the frame (design doc
  // section 11, Task 5 review).
  it('frames the eligibility and stacking lists only by their window', () => {
    render(<ProgramDetail program={program} />);
    for (const name of ['Eligibility', 'Stacking']) {
      const list = within(screen.getByRole('region', { name })).getByRole('list');
      expect(list).toHaveClass('divide-y');
      expect(list).not.toHaveClass('border');
      expect(list).not.toHaveClass('rounded-lg');
    }
  });

  it('lists the advice for every situation in its own window', () => {
    render(<ProgramDetail program={program} />);
    const region = screen.getByRole('region', { name: 'Advice by situation' });
    expect(within(region).getByRole('heading', { level: 2, name: 'Advice by situation' })).toHaveClass('text-base');
    expect(within(region).getByText('Bootstrapped')).toBeInTheDocument();
  });
});

// With a persona chosen, the advice stays one inline callout, not a section window.
describe('PersonaNotes for one persona', () => {
  it('is a single callout for that persona', () => {
    const { personas } = getProgram('csiro-kick-start')!;
    render(<PersonaNotes personas={personas} persona="bootstrapped" />);
    expect(screen.getByRole('complementary', { name: /^Advice for Bootstrapped/ })).toHaveTextContent(personas.bootstrapped!);
    expect(screen.queryByRole('region')).toBeNull();
  });
});
