// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { LogoMark } from '@/components/layout/logo-mark';

describe('LogoMark', () => {
  it('is decorative and uses the Liftoff tokens, not raw colours', () => {
    const { container } = render(<><LogoMark /><LogoMark /></>);
    const svgs = container.querySelectorAll('svg');
    expect(svgs[0]).toHaveAttribute('aria-hidden', 'true');
    // The logo stops are the light Liftoff stops in both themes, so the white compass keeps 3:1
    // (the dark-theme --lift-* stops are too light for white; see tests/lib/tokens.test.ts).
    expect(container.innerHTML).toContain('var(--logo-1)');
    expect(container.innerHTML).toContain('var(--on-lift)');
    expect(container.innerHTML).not.toMatch(/#[0-9a-f]{6}/i);
    // Two marks on one page must not share a gradient id.
    const ids = [...container.querySelectorAll('linearGradient')].map((g) => g.id);
    expect(new Set(ids).size).toBe(2);
  });
});
