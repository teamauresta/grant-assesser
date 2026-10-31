// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { HERO_PRELOAD_MEDIA, HERO_SIZES, heroPreloadScript } from '@/lib/hero-preload';
import { artSrcSet } from '@/lib/art';

// The hero diorama is the home page's largest contentful paint on desktop, and both pictures of its
// day/dusk pair are lazy (so each theme fetches only its own), which delays the fetch until layout.
// The pre-paint theme script preloads the active theme's picture (design doc section 11, Art landed).
const READY = { 'hero-diorama-day': [480, 960, 1440], 'hero-diorama-dusk': [480, 960, 1440] };

const run = (script: string, theme: 'light' | 'dark', path: string) => {
  window.history.replaceState(null, '', path);
  new Function('t', script)(theme);
  return [...document.head.querySelectorAll('link[rel="preload"]')];
};

afterEach(() => {
  document.head.innerHTML = '';
});

describe('artSrcSet', () => {
  it('lists each width of one file and format under the base', () => {
    expect(artSrcSet('/grant-assesser/art/', 'hero-diorama-day', [480, 960], 'avif'))
      .toBe('/grant-assesser/art/hero-diorama-day-480.avif 480w, /grant-assesser/art/hero-diorama-day-960.avif 960w');
  });
});

describe('heroPreloadScript', () => {
  const script = heroPreloadScript('/grant-assesser', READY);

  it('preloads the day AVIF on the home page in the light theme, from md, at high priority', () => {
    const [link, ...rest] = run(script, 'light', '/grant-assesser/');
    expect(rest).toHaveLength(0);
    expect(link.getAttribute('as')).toBe('image');
    expect(link.getAttribute('type')).toBe('image/avif');
    expect(link.getAttribute('media')).toBe(HERO_PRELOAD_MEDIA);
    expect(link.getAttribute('fetchpriority')).toBe('high');
    // The same candidates and sizes as the hero's <picture>, so the lazy <img> reuses the response.
    expect(link.getAttribute('imagesrcset')).toBe(artSrcSet('/grant-assesser/art/', 'hero-diorama-day', [480, 960, 1440], 'avif'));
    expect(link.getAttribute('imagesizes')).toBe(HERO_SIZES);
  });

  it('preloads only the dusk AVIF in the dark theme', () => {
    const links = run(script, 'dark', '/grant-assesser/');
    expect(links).toHaveLength(1);
    expect(links[0].getAttribute('imagesrcset')).toContain('hero-diorama-dusk-960.avif 960w');
    expect(links[0].getAttribute('imagesrcset')).not.toContain('day');
  });

  it('also matches /index.html, and nothing on other pages', () => {
    expect(run(script, 'light', '/grant-assesser/index.html')).toHaveLength(1);
    document.head.innerHTML = '';
    for (const path of ['/grant-assesser/programs/', '/grant-assesser/plan/', '/other/']) {
      expect(run(script, 'light', path)).toHaveLength(0);
    }
  });

  it('falls back to the day picture in the dark theme until the dusk one exists', () => {
    const links = run(heroPreloadScript('/grant-assesser', { 'hero-diorama-day': [480, 960] }), 'dark', '/grant-assesser/');
    expect(links[0].getAttribute('imagesrcset')).toBe(artSrcSet('/grant-assesser/art/', 'hero-diorama-day', [480, 960], 'avif'));
  });

  it('is empty when the day picture is missing (the hero is a placeholder)', () => {
    expect(heroPreloadScript('/grant-assesser', { 'hero-diorama-day': false, 'hero-diorama-dusk': [480] })).toBe('');
  });

  it('works without a base path', () => {
    expect(run(heroPreloadScript('', READY), 'light', '/')).toHaveLength(1);
  });
});
