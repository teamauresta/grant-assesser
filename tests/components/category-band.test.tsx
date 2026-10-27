// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderToString } from 'react-dom/server';
import { hydrateRoot } from 'react-dom/client';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import { CategoryBand } from '@/components/home/category-band';
import { MotionProvider } from '@/components/motion/motion-provider';
import { PROGRAM_TYPES } from '@/lib/programs/filter';
import { TYPE_LABELS } from '@/lib/format';

const media = (matching: string[]) => vi.stubGlobal('matchMedia', (q: string) => ({
  matches: matching.includes(q), addEventListener: () => {}, removeEventListener: () => {},
}));

afterEach(() => {
  vi.unstubAllGlobals();
});

/** Gives effects and a few animation frames time to run, so a "still not moving" check means something. */
const settle = () => act(() => new Promise((resolve) => setTimeout(resolve, 100)));

const list = (root: ParentNode) => root.querySelector('ul') as HTMLUListElement;

describe('CategoryBand', () => {
  it('links each program type to the directory filtered by it, inside a "Browse by type" region', () => {
    render(<MotionProvider><CategoryBand /></MotionProvider>);
    const region = screen.getByRole('region', { name: 'Browse by type' });
    const links = within(region).getAllByRole('link');
    expect(links).toHaveLength(PROGRAM_TYPES.length);
    for (const type of PROGRAM_TYPES) {
      // next/link may drop the trailing slash under Vitest (trailingSlash is a next.config setting).
      expect(within(region).getByRole('link', { name: TYPE_LABELS[type] }))
        .toHaveAttribute('href', expect.stringMatching(new RegExp(`^/programs/?\\?type=${type}$`)));
    }
  });

  it('drifts sideways only on wide screens that allow motion, and never in the server HTML', async () => {
    const html = renderToString(<MotionProvider><CategoryBand /></MotionProvider>);
    expect(html).not.toMatch(/translateX\((?!0)/);

    media(['(min-width: 48rem)', '(prefers-reduced-motion: no-preference)']);
    const wide = render(<MotionProvider><CategoryBand /></MotionProvider>);
    // The drift is switched on in an effect and written on the next animation frame.
    await waitFor(() => expect(list(wide.container).style.transform).toMatch(/translateX\(24px\)/));
    wide.unmount();

    media(['(min-width: 48rem)']);
    const reduced = render(<MotionProvider><CategoryBand /></MotionProvider>);
    await settle();
    expect(list(reduced.container).style.transform).not.toMatch(/translateX\((?!0)/);
    reduced.unmount();

    media(['(prefers-reduced-motion: no-preference)']);
    const phone = render(<MotionProvider><CategoryBand /></MotionProvider>);
    await settle();
    expect(list(phone.container).style.transform).not.toMatch(/translateX\((?!0)/);
  });

  it('starts drifting right after hydration on a wide screen, without waiting for a scroll', async () => {
    const tree = <MotionProvider><CategoryBand /></MotionProvider>;
    const container = document.createElement('div');
    container.innerHTML = renderToString(tree);
    document.body.append(container);
    expect(list(container).style.transform).not.toMatch(/translateX\((?!0)/);

    media(['(min-width: 48rem)', '(prefers-reduced-motion: no-preference)']);
    const root = await act(async () => hydrateRoot(container, tree));
    await waitFor(() => expect(list(container).style.transform).toMatch(/translateX\((?!0)[\d.]+px\)/));
    act(() => root.unmount());
    container.remove();
  });
});
