// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { LogoMark } from '@/components/layout/logo-mark';

describe('LogoMark', () => {
  it('is decorative and uses the logo tokens, not raw colours', () => {
    const { container } = render(<><LogoMark /><LogoMark /></>);
    const svgs = container.querySelectorAll('svg');
    expect(svgs[0]).toHaveAttribute('aria-hidden', 'true');
    // The logo is the light --brand in both themes, so the sand compass keeps 3:1 (see
    // tests/lib/tokens.test.ts).
    expect(container.innerHTML).toContain('var(--logo)');
    expect(container.innerHTML).toContain('var(--on-logo)');
    expect(container.innerHTML).not.toMatch(/#[0-9a-f]{3,8}\b/i);
  });

  // Eucalyptus: one solid colour, no gradient (design doc, section 2).
  it('is a solid tile: no gradient, tile and centre dot in --logo, compass in --on-logo', () => {
    const { container } = render(<LogoMark />);
    expect(container.querySelector('linearGradient')).toBeNull();
    expect(container.querySelector('rect')).toHaveAttribute('fill', 'var(--logo)');
    const [ring, dot] = container.querySelectorAll('circle');
    expect(ring).toHaveAttribute('stroke', 'var(--on-logo)');
    expect(dot).toHaveAttribute('fill', 'var(--logo)');
    expect(container.querySelector('path')).toHaveAttribute('fill', 'var(--on-logo)');
  });
});
