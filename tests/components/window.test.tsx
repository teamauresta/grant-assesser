// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { createRef } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { WINDOW_BAR, Window } from '@/components/ui/window';

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
    expect(region).toHaveClass('bg-surface', 'border-border', 'shadow-window', 'mt-4');
    const bar = screen.getByRole('heading', { name: 'Report' }).parentElement!;
    expect(bar).toHaveClass('bg-neutral-bg', 'border-border');
    expect(bar.className).not.toMatch(/\b(bg|border)-(primary|accent|brand|spark|ok|warn|danger|hl)/);
  });

  // It uses no client-only hook (useId is allowed in Server Components), so a server page can render
  // it without shipping it to the browser.
  it('is not a client component', () => {
    expect(readFileSync('components/ui/window.tsx', 'utf8')).not.toMatch(/^\s*['"]use client['"]/m);
  });

  it('takes h1 and h4 titles too', () => {
    render(<><Window title="Top" as="h1"><p>1</p></Window><Window title="Deep" as="h4"><p>4</p></Window></>);
    expect(screen.getByRole('heading', { level: 1, name: 'Top' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 4, name: 'Deep' })).toBeInTheDocument();
  });

  it('passes other section props to the frame', () => {
    const onDragOver = vi.fn();
    render(<Window title="Column" data-column="preparing" onDragOver={onDragOver}><p>Body</p></Window>);
    const region = screen.getByRole('region', { name: 'Column' });
    expect(region).toHaveAttribute('data-column', 'preparing');
    fireEvent.dragOver(region);
    expect(onDragOver).toHaveBeenCalledOnce();
  });

  it('gives callers the heading to focus', () => {
    const ref = createRef<HTMLHeadingElement>();
    render(<Window title="Step 2" headingRef={ref} headingProps={{ tabIndex: -1 }}><p>Body</p></Window>);
    const heading = screen.getByRole('heading', { name: 'Step 2' });
    expect(ref.current).toBe(heading);
    expect(heading).toHaveAttribute('tabindex', '-1');
    ref.current!.focus();
    expect(heading).toHaveFocus();
  });

  // A heading that takes focus only from script (the wizard's step title, design doc section 11,
  // Task 6) is a starting point for reading, not a control: no focus outline, as before it moved into
  // a window. A heading without tabIndex={-1} keeps the default.
  it('draws no focus outline on a heading that only script focuses', () => {
    const { rerender } = render(<Window title="Step 2" headingProps={{ tabIndex: -1 }}><p>Body</p></Window>);
    expect(screen.getByRole('heading', { name: 'Step 2' })).toHaveClass('focus:outline-none');
    rerender(<Window title="Step 2"><p>Body</p></Window>);
    expect(screen.getByRole('heading', { name: 'Step 2' })).not.toHaveClass('focus:outline-none');
  });

  // cn() does not merge Tailwind classes, so the border colour is replaced, never added to.
  it('replaces the border colour with borderClassName', () => {
    render(<Window title="Drop here" borderClassName="border-accent"><p>Body</p></Window>);
    const region = screen.getByRole('region', { name: 'Drop here' });
    expect(region).toHaveClass('border', 'border-accent');
    expect(region).not.toHaveClass('border-border');
  });

  // Focus outlines and cards moving between pipeline columns must not be clipped; the bar rounds its
  // own top corners inside the frame's 1px border instead.
  it('does not clip its content', () => {
    render(<Window title="Pipeline"><p>Body</p></Window>);
    expect(screen.getByRole('region', { name: 'Pipeline' }).className).not.toMatch(/overflow-/);
    expect(screen.getByRole('heading', { name: 'Pipeline' }).parentElement).toHaveClass('rounded-t-[7px]');
  });

  // Enlarged text (WCAG 1.4.4): a long title wraps rather than being cut off.
  it('wraps a long title, with the controls at the top', () => {
    const { container } = render(<Window title="A very long window title"><p>Body</p></Window>);
    const heading = screen.getByRole('heading', { name: 'A very long window title' });
    expect(heading).toHaveClass('min-w-0', 'flex-1', 'break-words');
    expect(heading).not.toHaveClass('truncate');
    expect(container.querySelector('span[aria-hidden="true"]')).toHaveClass('self-start');
  });

  it('drops the decorative controls with controls={false}', () => {
    const { container } = render(<Window title="Dialog-like" controls={false}><p>Body</p></Window>);
    expect(container.querySelector('[aria-hidden="true"]')).toBeNull();
  });

  it('uses titleId for the heading when given', () => {
    render(<Window title="Named" titleId="named-title"><p>Body</p></Window>);
    expect(screen.getByRole('heading', { name: 'Named' })).toHaveAttribute('id', 'named-title');
    expect(screen.getByRole('region', { name: 'Named' })).toHaveAttribute('aria-labelledby', 'named-title');
  });

  it('exports the title bar classes for other frames (dialogs) to reuse', () => {
    render(<Window title="Bar"><p>Body</p></Window>);
    const bar = screen.getByRole('heading', { name: 'Bar' }).parentElement!;
    expect(WINDOW_BAR.split(' ').every((c) => bar.classList.contains(c))).toBe(true);
    expect(WINDOW_BAR).toMatch(/\bbg-neutral-bg\b/);
  });

  // The title names the region; the frame's own props come first, so a caller's name would be
  // silently replaced. The props are not accepted (typecheck fails on these lines without the
  // directives), and the region stays named by its title.
  it('accepts no aria-labelledby or aria-label of its own', () => {
    render(
      <>
        {/* @ts-expect-error: the title names the window. */}
        <Window title="Named by title" aria-label="Another name"><p>1</p></Window>
        {/* @ts-expect-error: the title names the window. */}
        <Window title="Also by title" aria-labelledby="elsewhere"><p>2</p></Window>
      </>,
    );
    expect(screen.getByRole('region', { name: 'Named by title' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Also by title' })).toBeInTheDocument();
  });

  it('draws the title at 14px by default and 16px with titleSize="md"', () => {
    render(<><Window title="Small"><p>1</p></Window><Window title="Section" titleSize="md"><p>2</p></Window></>);
    const small = screen.getByRole('heading', { name: 'Small' });
    expect(small).toHaveClass('text-sm');
    expect(small).not.toHaveClass('text-base');
    const section = screen.getByRole('heading', { name: 'Section' });
    expect(section).toHaveClass('text-base');
    expect(section).not.toHaveClass('text-sm');
  });

  // Narrow windows (the plan's pipeline columns, design doc section 11, Task 8) take a tighter body:
  // a prop, since cn() does not merge a caller's padding with the default p-4 md:p-6.
  it('pads the body p-4 md:p-6 by default and p-3 with padding="sm"', () => {
    render(<><Window title="Wide"><p>Wide body</p></Window><Window title="Narrow" padding="sm"><p>Narrow body</p></Window></>);
    const wide = screen.getByText('Wide body').parentElement!;
    expect(wide).toHaveClass('p-4', 'md:p-6');
    const narrow = screen.getByText('Narrow body').parentElement!;
    expect(narrow).toHaveClass('p-3');
    expect(narrow).not.toHaveClass('p-4');
    expect(narrow).not.toHaveClass('md:p-6');
  });

  // A step in a sequence (How it works) is not a landmark: a plain div, its heading kept.
  it('renders a div with no region landmark when landmark={false}', () => {
    render(<Window title="Step one" landmark={false}><p>Body</p></Window>);
    expect(screen.queryByRole('region')).toBeNull();
    const heading = screen.getByRole('heading', { level: 2, name: 'Step one' });
    const frame = heading.parentElement!.parentElement!;
    expect(frame.tagName).toBe('DIV');
    expect(frame).not.toHaveAttribute('aria-labelledby');
    expect(frame).toHaveClass('bg-surface');
  });
});
