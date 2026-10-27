// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ProgressRing } from '@/components/plan/progress-ring';

describe('ProgressRing', () => {
  it('shows the final percentage as text and hides the ring graphic', () => {
    const { container } = render(<ProgressRing percent={42} />);
    // CountUp's sr-only copy holds the final value from the first render.
    expect(screen.getByText('42%', { selector: '.sr-only' })).toBeInTheDocument();
    const svg = container.querySelector('svg');
    expect(svg).not.toBeNull();
    expect(svg).toHaveAttribute('aria-hidden', 'true');
  });

  it('clamps the percentage to 0–100', () => {
    const { unmount } = render(<ProgressRing percent={140} />);
    expect(screen.getByText('100%', { selector: '.sr-only' })).toBeInTheDocument();
    unmount();
    render(<ProgressRing percent={-5} />);
    expect(screen.getByText('0%', { selector: '.sr-only' })).toBeInTheDocument();
  });
});
