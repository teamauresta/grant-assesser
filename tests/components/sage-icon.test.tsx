// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';
import { SageIcon } from '@/components/ui/sage-icon';

afterEach(() => vi.unstubAllEnvs());

// The owner's sage icons (design doc section 11, Icons landed): a picture beside a visible label,
// usable from client components because it never reads lib/art-ready.json (every icon is committed at
// every width; tests/lib/process-art.test.ts checks that).
describe('SageIcon', () => {
  it('renders AVIF then WebP at the icon widths, under the base path, sized for its slot', () => {
    vi.stubEnv('NEXT_PUBLIC_BASE_PATH', '/grant-assesser');
    const { container } = render(<SageIcon name="sprout" size={32} />);
    const picture = container.firstElementChild as HTMLElement;
    expect(picture.tagName).toBe('PICTURE');
    expect(picture).toHaveAttribute('data-icon', 'sprout');
    const [avif, webp] = picture.querySelectorAll('source');
    expect(avif).toHaveAttribute('type', 'image/avif');
    expect(avif).toHaveAttribute('srcset', '/grant-assesser/art/icon-sprout-48.avif 48w, /grant-assesser/art/icon-sprout-96.avif 96w, /grant-assesser/art/icon-sprout-144.avif 144w');
    expect(avif).toHaveAttribute('sizes', '32px');
    expect(webp).toHaveAttribute('type', 'image/webp');
    expect(webp).toHaveAttribute('srcset', '/grant-assesser/art/icon-sprout-48.webp 48w, /grant-assesser/art/icon-sprout-96.webp 96w, /grant-assesser/art/icon-sprout-144.webp 144w');
    const img = picture.querySelector('img')!;
    expect(img).toHaveAttribute('src', '/grant-assesser/art/icon-sprout-96.webp');
  });

  // Lazy everywhere, the nav too: the hidden bar's icons are then never fetched.
  it('is decorative, with explicit dimensions, lazy and async', () => {
    const { container } = render(<SageIcon name="lock" size={24} />);
    const picture = container.firstElementChild as HTMLElement;
    expect(picture.style.width).toBe('24px');
    expect(picture.style.height).toBe('24px');
    expect(picture).toHaveClass('block', 'shrink-0');
    const img = picture.querySelector('img')!;
    expect(img).toHaveAttribute('alt', '');
    expect(img).toHaveAttribute('aria-hidden', 'true');
    expect(img).toHaveAttribute('width', '24');
    expect(img).toHaveAttribute('height', '24');
    expect(img).toHaveAttribute('loading', 'lazy');
    expect(img).toHaveAttribute('decoding', 'async');
  });

  it('takes layout classes on its box', () => {
    const { container } = render(<SageIcon name="grid" size={20} className="mt-0.5" />);
    expect(container.firstElementChild).toHaveClass('mt-0.5', 'block', 'shrink-0');
  });

  // The scan in tests/components/icons.test.ts sees only literal sizes; a computed one is caught here,
  // in development and tests (the check is dead code in a production build, so it ships nothing).
  it('complains in development when drawn under 20px', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(<SageIcon name="grid" size={16} />);
    expect(error).toHaveBeenCalledWith(expect.stringMatching(/SageIcon "grid" at 16px.*20px/));
    error.mockClear();
    render(<SageIcon name="grid" size={20} />);
    expect(error).not.toHaveBeenCalled();
    error.mockRestore();
  });

  // The nav bars and cards that show it are client components, on every route: neither the readiness
  // JSON nor the manifest (lib/art.ts, whose ART the bundler cannot drop) may come along, only the
  // import-free file names in lib/art-files.ts (review of 60136e5: the manifest was in the layout chunk).
  it('imports only lib/art-files from the art modules, and lib/art-files imports nothing', () => {
    const read = (...p: string[]) => readFileSync(join(import.meta.dirname, '..', '..', ...p), 'utf8');
    const imports = [...read('components', 'ui', 'sage-icon.tsx').matchAll(/^import[^;]+;/gm)].map((m) => m[0]);
    expect(imports.length).toBeGreaterThan(0);
    for (const line of imports) {
      expect(line).not.toMatch(/art-ready/);
      expect(line).not.toMatch(/['"]@\/lib\/art['"]/);
      expect(line).not.toMatch(/['"]\.{1,2}\/[^'"]*\/art['"]/);
    }
    expect(imports.some((line) => /['"]@\/lib\/art-files['"]/.test(line))).toBe(true);
    expect(read('lib', 'art-files.ts')).not.toMatch(/^\s*import\b/m);
  });
});
