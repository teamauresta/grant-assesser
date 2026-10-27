// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import { render, screen } from '@testing-library/react';
import { Reveal } from '@/components/motion/reveal';

describe('Reveal', () => {
  it('never hides content in the exported HTML', () => {
    const html = renderToString(<Reveal><p>Hello</p></Reveal>);
    expect(html).toContain('Hello');
    expect(html).not.toContain('data-reveal');
    expect(html).not.toContain('opacity');
  });

  it('leaves content visible when IntersectionObserver is not available', () => {
    expect(typeof IntersectionObserver).toBe('undefined');
    render(<Reveal><p>Hello</p></Reveal>);
    const p = screen.getByText('Hello');
    expect(p).toBeVisible();
    expect(p.parentElement).not.toHaveAttribute('data-reveal');
  });
});
