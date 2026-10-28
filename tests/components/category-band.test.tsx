// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { CategoryBand } from '@/components/home/category-band';
import { PROGRAM_TYPES } from '@/lib/programs/filter';
import { TYPE_LABELS } from '@/lib/format';

describe('CategoryBand', () => {
  it('links each program type to the directory filtered by it, inside a "Browse by type" region', () => {
    render(<CategoryBand />);
    const region = screen.getByRole('region', { name: 'Browse by type' });
    const links = within(region).getAllByRole('link');
    expect(links).toHaveLength(PROGRAM_TYPES.length);
    for (const type of PROGRAM_TYPES) {
      // next/link may drop the trailing slash under Vitest (trailingSlash is a next.config setting).
      expect(within(region).getByRole('link', { name: TYPE_LABELS[type] }))
        .toHaveAttribute('href', expect.stringMatching(new RegExp(`^/programs/?\\?type=${type}$`)));
    }
  });

  it('gives each type link the cursor spotlight', () => {
    render(<CategoryBand />);
    for (const link of within(screen.getByRole('region', { name: 'Browse by type' })).getAllByRole('link')) {
      expect(link).toHaveAttribute('data-spotlight');
      expect(link).toHaveClass('spotlight');
    }
  });
});
