// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import { render, screen } from '@testing-library/react';
import { CountUp } from '@/components/motion/count-up';

const fmt = (n: number) => `$${Math.round(n).toLocaleString('en-AU')}`;

describe('CountUp', () => {
  it('puts the final value in the server HTML', () => {
    expect(renderToString(<CountUp value={45000} format={fmt} />)).toContain('$45,000');
  });
  it('always exposes the final value to assistive technology', () => {
    render(<CountUp value={45000} format={fmt} />);
    expect(screen.getByText('$45,000', { selector: '.sr-only' })).toBeInTheDocument();
  });
});
