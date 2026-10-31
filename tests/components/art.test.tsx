// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Art } from '@/components/ui/art';

// Which processed files exist (lib/art-ready.json, written by `pnpm art`), set per test.
const ready = vi.hoisted(() => ({}) as Record<string, false | number[]>);
vi.mock('@/lib/art-ready.json', () => ({ default: ready }));

afterEach(() => {
  for (const key of Object.keys(ready)) delete ready[key];
  vi.unstubAllEnvs();
});

const box = (container: HTMLElement) => container.firstElementChild as HTMLElement;

// The Art component (Billabong design doc section 6): a <picture> with AVIF and WebP when the
// processed files exist, otherwise a neutral placeholder of the same size. The build never waits on art.
describe('Art placeholder', () => {
  it('renders a neutral box with a centred image icon, hidden from assistive tech, when the files are missing', () => {
    const { container } = render(<Art name="platypus-search" sizes="160px" className="w-40" />);
    expect(container.querySelector('img, picture')).toBeNull();
    const placeholder = box(container).firstElementChild as HTMLElement;
    expect(placeholder).toHaveClass('bg-neutral-bg', 'rounded-lg', 'flex', 'items-center', 'justify-center');
    expect(placeholder).toHaveAttribute('aria-hidden', 'true');
    const icon = placeholder.querySelector('svg')!;
    expect(icon).toHaveAttribute('width', '16');
    // Lucide's default stroke, 2, since the line glyphs were matched to the sage icons (Icons landed).
    expect(icon).toHaveAttribute('stroke-width', '2');
  });

  it('keeps the same box as the image: the asset aspect ratio, with the caller classes on it', () => {
    const missing = box(render(<Art name="hero-diorama" sizes="50vw" className="w-full max-w-xl" />).container);
    ready['hero-diorama-day'] = [480, 960, 1440];
    ready['hero-diorama-dusk'] = [480, 960, 1440];
    const present = box(render(<Art name="hero-diorama" sizes="50vw" className="w-full max-w-xl" />).container);
    for (const el of [missing, present]) {
      // data-art names the asset, so tests and pages can find a slot by what it shows.
      expect(el).toHaveAttribute('data-art', 'hero-diorama');
      expect(el.style.aspectRatio).toBe('1536 / 1024');
      expect(el).toHaveClass('w-full', 'max-w-xl');
    }
    const img = present.querySelector('img')!;
    expect(img).toHaveAttribute('width', '1536');
    expect(img).toHaveAttribute('height', '1024');
  });
});

describe('Art image', () => {
  it('renders AVIF and WebP sources at the processed widths, under the base path', () => {
    vi.stubEnv('NEXT_PUBLIC_BASE_PATH', '/grant-assesser');
    ready['platypus-search'] = [480, 960];
    const { container } = render(<Art name="platypus-search" sizes="160px" />);
    const sources = container.querySelectorAll('picture > source');
    expect(sources).toHaveLength(2);
    expect(sources[0]).toHaveAttribute('type', 'image/avif');
    expect(sources[0]).toHaveAttribute('srcset', '/grant-assesser/art/platypus-search-480.avif 480w, /grant-assesser/art/platypus-search-960.avif 960w');
    expect(sources[0]).toHaveAttribute('sizes', '160px');
    expect(sources[1]).toHaveAttribute('type', 'image/webp');
    expect(sources[1]).toHaveAttribute('srcset', '/grant-assesser/art/platypus-search-480.webp 480w, /grant-assesser/art/platypus-search-960.webp 960w');
    const img = container.querySelector('picture > img')!;
    expect(img).toHaveAttribute('src', '/grant-assesser/art/platypus-search-960.webp');
    expect(img).toHaveAttribute('width', '1024');
    expect(img).toHaveAttribute('height', '1024');
  });

  it('uses the manifest alt by default, and is lazy and async unless priority', () => {
    ready['platypus-search'] = [480];
    const { container } = render(<Art name="platypus-search" sizes="160px" />);
    const img = container.querySelector('img')!;
    expect(img.getAttribute('alt')).toMatch(/platypus/i);
    expect(img).toHaveAttribute('loading', 'lazy');
    expect(img).toHaveAttribute('decoding', 'async');
    expect(img).not.toHaveAttribute('fetchpriority');
    expect(box(container)).not.toHaveAttribute('aria-hidden');

    const eager = render(<Art name="platypus-search" sizes="160px" priority />).container.querySelector('img')!;
    expect(eager).toHaveAttribute('loading', 'eager');
    expect(eager).toHaveAttribute('fetchpriority', 'high');
  });

  // The logo (LogoMark): in the top bar on every page and tiny, so it loads at once without taking
  // fetch priority from the hero.
  it('loads eagerly without raising the fetch priority with eager', () => {
    ready['logo-emblem'] = [32, 64, 128];
    const img = render(<Art name="logo-emblem" sizes="32px" eager />).container.querySelector('img')!;
    expect(img).toHaveAttribute('loading', 'eager');
    expect(img).not.toHaveAttribute('fetchpriority');
  });

  it('hides a decorative image from assistive tech: alt="" from the caller or a null manifest alt', () => {
    ready['platypus-search'] = [480];
    ready['step-plan'] = [480];
    for (const el of [<Art key="a" name="platypus-search" sizes="160px" alt="" />, <Art key="b" name="step-plan" sizes="160px" />]) {
      const { container } = render(el);
      expect(container.querySelector('img')).toHaveAttribute('alt', '');
      expect(box(container)).toHaveAttribute('aria-hidden', 'true');
    }
  });

  it('works without a base path (dev without one, tests)', () => {
    ready['platypus-search'] = [480];
    const { container } = render(<Art name="platypus-search" sizes="160px" />);
    expect(container.querySelector('img')).toHaveAttribute('src', '/art/platypus-search-480.webp');
  });
});

// The light/dark pair switches by CSS only (the theme is set before paint), so there is no
// hydration flash: both pictures are in the HTML and one is hidden by the dark variant.
describe('Art light/dark pair', () => {
  it('renders the day picture for the light theme and the dusk one for dark, swapped by class', () => {
    ready['hero-diorama-day'] = [480, 960, 1440];
    ready['hero-diorama-dusk'] = [480, 960, 1440];
    const { container } = render(<Art name="hero-diorama" sizes="50vw" priority />);
    const pictures = container.querySelectorAll('picture');
    expect(pictures).toHaveLength(2);
    expect(pictures[0]).toHaveClass('block', 'dark:hidden');
    expect(pictures[0].querySelector('img')).toHaveAttribute('src', '/art/hero-diorama-day-1440.webp');
    expect(pictures[1]).toHaveClass('hidden', 'dark:block');
    expect(pictures[1].querySelector('img')).toHaveAttribute('src', '/art/hero-diorama-dusk-1440.webp');
    // Both describe the same scene.
    expect(pictures[0].querySelector('img')!.alt).toBe(pictures[1].querySelector('img')!.alt);
  });

  // A lazy image inside display:none is never fetched, so each theme downloads only the picture it
  // shows. An eager one would be fetched in both themes, so a pair is lazy even with priority.
  it('keeps both pictures of a pair lazy, even with priority, which still raises their fetch priority', () => {
    ready['hero-diorama-day'] = [480];
    ready['hero-diorama-dusk'] = [480];
    const plain = render(<Art name="hero-diorama" sizes="50vw" />).container.querySelectorAll('img');
    const hero = render(<Art name="hero-diorama" sizes="50vw" priority />).container.querySelectorAll('img');
    for (const imgs of [plain, hero]) {
      expect(imgs).toHaveLength(2);
      for (const img of imgs) expect(img).toHaveAttribute('loading', 'lazy');
    }
    for (const img of plain) expect(img).not.toHaveAttribute('fetchpriority');
    for (const img of hero) expect(img).toHaveAttribute('fetchpriority', 'high');
  });

  it('loads the day picture eagerly with priority while it is the only one', () => {
    ready['hero-diorama-day'] = [480];
    const img = render(<Art name="hero-diorama" sizes="50vw" priority />).container.querySelector('img')!;
    expect(img).toHaveAttribute('loading', 'eager');
  });

  it('shows the day picture in both themes until the dusk one exists', () => {
    ready['hero-diorama-day'] = [480];
    const { container } = render(<Art name="hero-diorama" sizes="50vw" />);
    const pictures = container.querySelectorAll('picture');
    expect(pictures).toHaveLength(1);
    expect(pictures[0]).not.toHaveClass('dark:hidden');
  });

  it('keeps the day placeholder for the light theme when only the dusk picture exists', () => {
    ready['hero-diorama-dusk'] = [480];
    const { container } = render(<Art name="hero-diorama" sizes="50vw" />);
    const placeholder = box(container).querySelector('.bg-neutral-bg')!;
    expect(placeholder).toHaveClass('dark:hidden');
    expect(container.querySelector('picture')).toHaveClass('hidden', 'dark:block');
  });

  it('renders the same HTML on the server, with no client code (no hooks, no effects)', () => {
    ready['hero-diorama-day'] = [480];
    ready['hero-diorama-dusk'] = [480];
    const html = renderToStaticMarkup(<Art name="hero-diorama" sizes="50vw" />);
    expect(html).toContain('aspect-ratio:1536 / 1024');
    expect(html.match(/<picture/g)).toHaveLength(2);
  });
});
