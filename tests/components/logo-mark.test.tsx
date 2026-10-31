// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { renderToStaticMarkup } from 'react-dom/server';
import { LogoMark } from '@/components/layout/logo-mark';

vi.mock('@/lib/art-ready.json', () => ({ default: { 'logo-emblem': [32, 64, 128] } }));

// The logo is the owner's platypus emblem (design doc section 11, Art landed), cropped from the lockup
// and processed by `pnpm art`. It replaced the SVG compass tile, and with it the --logo and --on-logo
// tokens and their checks: the emblem is a picture, so it has no token colours to keep in contrast.
describe('LogoMark', () => {
  it('is the decorative emblem picture: hidden from assistive tech, alt=""', () => {
    const { container } = render(<LogoMark />);
    const box = container.firstElementChild as HTMLElement;
    expect(box).toHaveAttribute('data-art', 'logo-emblem');
    expect(box).toHaveAttribute('aria-hidden', 'true');
    expect(container.querySelector('img')).toHaveAttribute('alt', '');
    expect(container.querySelector('svg')).toBeNull();
  });

  it('shows at 32px, square, with explicit dimensions so nothing shifts', () => {
    const { container } = render(<LogoMark />);
    const box = container.firstElementChild as HTMLElement;
    expect(box).toHaveClass('size-8', 'shrink-0');
    expect(box.style.aspectRatio).toBe('668 / 668');
    const img = container.querySelector('img')!;
    expect(img).toHaveAttribute('width', '668');
    expect(img).toHaveAttribute('height', '668');
  });

  it('loads eagerly, AVIF then WebP, at the logo widths for 32px', () => {
    const { container } = render(<LogoMark />);
    const [avif, webp] = container.querySelectorAll('picture > source');
    expect(avif).toHaveAttribute('type', 'image/avif');
    expect(avif).toHaveAttribute('srcset', '/art/logo-emblem-32.avif 32w, /art/logo-emblem-64.avif 64w, /art/logo-emblem-128.avif 128w');
    expect(avif).toHaveAttribute('sizes', '32px');
    expect(webp).toHaveAttribute('type', 'image/webp');
    const img = container.querySelector('img')!;
    expect(img).toHaveAttribute('loading', 'eager');
    expect(img).not.toHaveAttribute('fetchpriority');
  });

  // Rendered in BrandLink, a client component, so it is in the exported HTML: the picture must render on
  // the server (no hooks, no effects), eager, so the bar never waits for hydration to show the logo.
  it('renders the picture on the server', () => {
    const html = renderToStaticMarkup(<LogoMark />);
    expect(html).toContain('data-art="logo-emblem"');
    expect(html).toContain('loading="eager"');
    expect(html).toContain('/art/logo-emblem-64.avif 64w');
    expect(html).not.toMatch(/fetchpriority/i);
  });
});
