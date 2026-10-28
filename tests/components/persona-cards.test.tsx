// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PersonaCards } from '@/components/home/persona-cards';
import { PERSONAS } from '@/lib/schema';
import { PERSONAS_INFO } from '@/lib/personas';

describe('PersonaCards', () => {
  it('names each link by its persona label first (the icon badge is hidden) and colours it by its tone', () => {
    render(<PersonaCards />);
    for (const value of PERSONAS) {
      const { label, tone } = PERSONAS_INFO[value];
      // The e2e journey clicks getByRole('link', { name: /^Bootstrapped/ }).
      const link = screen.getByRole('link', { name: new RegExp(`^${label}`) });
      expect(link).toHaveAttribute('href', expect.stringMatching(new RegExp(`^/assess/?\\?persona=${value}$`)));
      expect(link.style.getPropertyValue('--tone')).toBe(tone);
      expect(link.firstElementChild).toHaveAttribute('aria-hidden', 'true');
      expect(link.firstElementChild?.querySelector('svg')).not.toBeNull();
    }
  });

  // A one-sided border utility (border-t, border-l-4, border-s-2, border-x...) is how a coloured edge
  // would come back; the full border (border, border-border, border-accent) is fine.
  const ONE_SIDED = /\bborder-(?:[tlrbxyse])(?:-|\b)/;
  it('the one-sided border check catches every side and spares the full border', () => {
    for (const c of ['border-t', 'border-l-4', 'border-b-[var(--tone)]', 'border-s-2', 'border-e', 'border-x', 'border-y-2']) expect(c).toMatch(ONE_SIDED);
    for (const c of ['border', 'border-border', 'border-border-strong', 'border-accent', 'border-surface', 'border-transparent', 'hover:border-accent']) expect(c).not.toMatch(ONE_SIDED);
  });

  it('has no one-sided border (no coloured edge): only the icon badge and the hover glow carry the tone', () => {
    render(<PersonaCards />);
    for (const link of screen.getAllByRole('link')) expect(link.className).not.toMatch(ONE_SIDED);
  });

  it('gives each card the cursor spotlight', () => {
    render(<PersonaCards />);
    for (const link of screen.getAllByRole('link')) {
      expect(link).toHaveAttribute('data-spotlight');
      expect(link).toHaveClass('spotlight');
    }
  });
});
