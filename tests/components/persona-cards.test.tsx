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
      // The persona's sage icon (design doc section 11, Icons landed), on its tone-tinted badge.
      const icon = link.firstElementChild?.querySelector('[data-icon]');
      expect(icon).toHaveAttribute('data-icon', { bootstrapped: 'sprout', 'pre-raise': 'target', 'vc-backed': 'rocket' }[value]);
      expect(icon!.parentElement!.className).toContain('var(--tone)');
    }
  });

  // A one-sided border utility (border-t, border-l-4, border-s-2, border-x...) is how a coloured edge
  // would come back; the full border (border, border-border, border-accent) is fine.
  const ONE_SIDED = /\bborder-(?:[tlrbxyse])(?:-|\b)/;
  it('the one-sided border check catches every side and spares the full border', () => {
    for (const c of ['border-t', 'border-l-4', 'border-b-[var(--tone)]', 'border-s-2', 'border-e', 'border-x', 'border-y-2']) expect(c).toMatch(ONE_SIDED);
    for (const c of ['border', 'border-border', 'border-border-strong', 'border-accent', 'border-surface', 'border-transparent', 'hover:border-accent']) expect(c).not.toMatch(ONE_SIDED);
  });

  it('has no one-sided border (no coloured edge): only the icon badge carries the tone', () => {
    render(<PersonaCards />);
    for (const link of screen.getAllByRole('link')) expect(link.className).not.toMatch(ONE_SIDED);
  });

  // CLAUDE.md: the only hover shadow is the interactive card's neutral lift (Card interactive), so the
  // persona cards use the same --scrim shadow, not one tinted by the persona's tone.
  it("lifts on hover with the interactive card's neutral shadow, never a tinted one", () => {
    render(<PersonaCards />);
    for (const link of screen.getAllByRole('link')) {
      expect(link).toHaveClass('hover:shadow-[0_8px_24px_-12px_var(--scrim)]', 'motion-safe:hover:-translate-y-0.5');
      expect(link.className).not.toContain('var(--tone)');
    }
  });

  // Billabong design doc section 8: the platypus waves from the first card. Decorative (the card's
  // label says what it is), so it is inside the hidden badge row and the link's name is unchanged.
  it('shows the waving platypus on the first card only, hidden from assistive technology', () => {
    render(<PersonaCards />);
    const links = screen.getAllByRole('link');
    const art = links.map((l) => l.querySelectorAll('[data-art]'));
    expect(art.map((a) => a.length)).toEqual([1, 0, 0]);
    expect(art[0][0]).toHaveAttribute('data-art', 'platypus-wave');
    expect(art[0][0].closest('[aria-hidden="true"]')).not.toBeNull();
    // The art's box is a div, so the row holding it is a div too (no block inside a span).
    expect(art[0][0].parentElement!.tagName).toBe('DIV');
    expect(art[0][0].parentElement).toBe(links[0].firstElementChild);
    expect(links[0]).toHaveAccessibleName(new RegExp(`^${PERSONAS_INFO[PERSONAS[0]].label}`));
  });

  it('gives each card the cursor spotlight', () => {
    render(<PersonaCards />);
    for (const link of screen.getAllByRole('link')) {
      expect(link).toHaveAttribute('data-spotlight');
      expect(link).toHaveClass('spotlight');
    }
  });
});
