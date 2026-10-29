// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ProgressRing } from '@/components/plan/progress-ring';

describe('ProgressRing', () => {
  it('shows the final percentage as text and hides the ring graphic', () => {
    const { container } = render(<ProgressRing percent={42} />);
    // CountUp's sr-only copy holds the final value from the first render.
    expect(screen.getByText('42%', { selector: '.sr-only' })).toBeInTheDocument();
    // Assistive tech reads the ring as one image with a full sentence, not a bare "42%".
    expect(screen.getByRole('img', { name: '42% of goals done' })).toBeInTheDocument();
    const svg = container.querySelector('svg');
    expect(svg).not.toBeNull();
    expect(svg).toHaveAttribute('aria-hidden', 'true');
  });

  // Eucalyptus: a solid arc, no gradient (design doc, section 2).
  it('draws the arc in solid --brand', () => {
    const { container } = render(<ProgressRing percent={42} />);
    expect(container.querySelector('linearGradient')).toBeNull();
    const [, arc] = container.querySelectorAll('circle');
    expect(arc).toHaveAttribute('stroke', 'var(--brand)');
  });

  it('clamps the percentage to 0–100', () => {
    const { unmount } = render(<ProgressRing percent={140} />);
    expect(screen.getByText('100%', { selector: '.sr-only' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: '100% of goals done' })).toBeInTheDocument();
    unmount();
    render(<ProgressRing percent={-5} />);
    expect(screen.getByText('0%', { selector: '.sr-only' })).toBeInTheDocument();
  });
});
