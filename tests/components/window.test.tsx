// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Window } from '@/components/ui/window';

const FOCUSABLE = 'a[href], button, input, select, textarea, summary, [tabindex], [contenteditable]';

// Windows (Billabong design doc sections 4 and 9): the title labels the region; the controls are
// decoration that assistive tech never meets.
describe('Window', () => {
  it('is a region named by its title, an h2 by default', () => {
    render(<Window title="Your results"><p>Body</p></Window>);
    const region = screen.getByRole('region', { name: 'Your results' });
    expect(region.tagName).toBe('SECTION');
    const heading = screen.getByRole('heading', { level: 2, name: 'Your results' });
    expect(region).toHaveAttribute('aria-labelledby', heading.id);
    expect(heading.id).not.toBe('');
  });

  it('takes an h3 title with `as`', () => {
    render(<Window title="Eligibility" as="h3"><p>Body</p></Window>);
    expect(screen.getByRole('heading', { level: 3, name: 'Eligibility' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { level: 2 })).toBeNull();
    expect(screen.getByRole('region', { name: 'Eligibility' })).toBeInTheDocument();
  });

  it('gives each window its own title id', () => {
    render(<><Window title="One"><p>1</p></Window><Window title="Two"><p>2</p></Window></>);
    expect(screen.getByRole('region', { name: 'One' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Two' })).toBeInTheDocument();
  });

  it('hides the decorative controls from assistive tech, with nothing focusable inside', () => {
    const { container } = render(<Window title="Plan"><p>Body</p></Window>);
    // The outermost hidden elements (lucide marks its own icons aria-hidden as well).
    const controls = [...container.querySelectorAll('[aria-hidden="true"]')]
      .filter((el) => !el.parentElement?.closest('[aria-hidden="true"]'));
    expect(controls).toHaveLength(1);
    expect(controls[0].querySelectorAll('svg')).toHaveLength(3);
    expect(controls[0].querySelectorAll(FOCUSABLE)).toHaveLength(0);
    // Nothing in the window is a control except what the caller passes.
    expect(screen.queryAllByRole('button')).toHaveLength(0);
  });

  it('renders the children in the body and the actions in the title bar, outside the hidden controls', () => {
    render(
      <Window title="Pipeline" actions={<button type="button">Add</button>} bodyClassName="p-0">
        <p>Body text</p>
      </Window>,
    );
    const body = screen.getByText('Body text').parentElement!;
    expect(body).toHaveClass('p-0');
    const add = screen.getByRole('button', { name: 'Add' });
    expect(add.closest('[aria-hidden="true"]')).toBeNull();
    expect(add.parentElement).toBe(screen.getByRole('heading', { name: 'Pipeline' }).parentElement);
    expect(body.contains(add)).toBe(false);
  });

  // No coloured strip (CLAUDE.md, design doc section 5): the title bar is the neutral fill with a
  // neutral border, the body is the surface.
  it('draws a neutral title bar over a surface body', () => {
    render(<Window title="Report" className="mt-4"><p>Body</p></Window>);
    const region = screen.getByRole('region', { name: 'Report' });
    expect(region).toHaveClass('bg-surface', 'border-border', 'mt-4');
    const bar = screen.getByRole('heading', { name: 'Report' }).parentElement!;
    expect(bar).toHaveClass('bg-neutral-bg', 'border-border');
    expect(bar.className).not.toMatch(/\b(bg|border)-(primary|accent|brand|spark|ok|warn|danger|hl)/);
  });

  // It uses no client-only hook (useId is allowed in Server Components), so a server page can render
  // it without shipping it to the browser.
  it('is not a client component', () => {
    expect(readFileSync('components/ui/window.tsx', 'utf8')).not.toMatch(/^\s*['"]use client['"]/m);
  });
});
