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

  it('has no coloured edge: only the icon badge and the hover glow carry the tone', () => {
    render(<PersonaCards />);
    for (const link of screen.getAllByRole('link')) expect(link.className).not.toMatch(/border-[tlrb]-/);
  });
});
