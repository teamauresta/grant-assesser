// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import NotFound from '@/app/not-found';
import { buttonClasses } from '@/components/ui/button';
import { WINDOW_BAR, WINDOW_FRAME } from '@/components/ui/window';

// The 404 (Billabong design doc sections 4, 7 and 11, Task 9): a window titled "Page not found", whose
// title is the page's one h1, a playful line, then the plain way out.
describe('NotFound', () => {
  it('is a window whose title is the page heading', () => {
    render(<NotFound />);
    const headings = screen.getAllByRole('heading', { level: 1 });
    expect(headings).toHaveLength(1);
    expect(headings[0]).toHaveTextContent('Page not found');
    expect(headings[0].parentElement).toHaveClass(...WINDOW_BAR.split(' '));
    const region = screen.getByRole('region', { name: 'Page not found' });
    expect(region).toHaveClass(...WINDOW_FRAME.split(' '), 'border-border');
  });

  it('says so playfully, then plainly, and links to the programs', () => {
    render(<NotFound />);
    const region = screen.getByRole('region', { name: 'Page not found' });
    expect(within(region).getByText('This page went for a swim.')).toBeInTheDocument();
    expect(within(region).getByText('The page may have moved, or the link may be mistyped.')).toBeInTheDocument();
    const link = within(region).getByRole('link', { name: 'Browse programs' });
    expect(link).toHaveAttribute('href', expect.stringMatching(/^\/programs\/?$/));
    expect(link).toHaveAttribute('class', buttonClasses({ variant: 'primary' }));
  });
});
