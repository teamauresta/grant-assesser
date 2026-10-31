import { ART, artSrcSet } from '@/lib/art';
import artReady from '@/lib/art-ready.json';

/**
 * The hero diorama's `sizes` (components/home/hero.tsx): 100vw less the gutters on phones, about 45%
 * of the window beside the text, and at most 33rem inside the 1120px column. The preload below uses
 * the same string, so the browser picks the same candidate for both.
 */
export const HERO_SIZES = '(min-width: 70rem) 33rem, (min-width: 48rem) 45vw, calc(100vw - 2rem)';

/** Where the diorama is the largest paint: from md, beside the headline. On phones it comes last. */
export const HERO_PRELOAD_MEDIA = '(min-width: 48rem)';

type Ready = Readonly<Record<string, unknown>>;

const widthsOf = (ready: Ready, file: string): number[] => {
  const widths = ready[file];
  return Array.isArray(widths) ? widths.filter((w): w is number => typeof w === 'number') : [];
};

/**
 * JavaScript for the pre-paint theme script (app/layout.tsx), run with the theme in `t`: on the home
 * page only, it adds one `<link rel="preload" as="image" type="image/avif">` for the active theme's
 * diorama, from md and at high priority. Both pictures of the pair stay lazy (so each theme fetches
 * only its own), which would otherwise hold the fetch until layout; the lazy `<img>` then takes the
 * preloaded response. AVIF only: a browser without it skips the link and loads the WebP as before.
 * Empty while the day picture does not exist (the hero shows a placeholder). Design doc section 11,
 * Art landed: the desktop LCP before and after.
 */
export function heroPreloadScript(basePath: string, ready: Ready = artReady): string {
  const { file, dark } = ART['hero-diorama'];
  const day = widthsOf(ready, file);
  if (day.length === 0) return '';
  const dusk = dark ? widthsOf(ready, dark) : [];
  const base = `${basePath}/art/`;
  const light = artSrcSet(base, file, day, 'avif');
  const night = dusk.length && dark ? artSrcSet(base, dark, dusk, 'avif') : light;
  const home = `${basePath}/`;
  return `var p=location.pathname;if(p===${JSON.stringify(home)}||p===${JSON.stringify(`${home}index.html`)}){var l=document.createElement('link'),a={rel:'preload',as:'image',type:'image/avif',media:${JSON.stringify(HERO_PRELOAD_MEDIA)},imagesrcset:t==='dark'?${JSON.stringify(night)}:${JSON.stringify(light)},imagesizes:${JSON.stringify(HERO_SIZES)},fetchpriority:'high'};for(var k in a)l.setAttribute(k,a[k]);document.head.appendChild(l)}`;
}
