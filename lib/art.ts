/**
 * The artwork manifest (Billabong design doc section 6): every image in docs/art/billabong-prompts.md
 * that ships, with its base file name, intrinsic size, default alt text (null when decorative) and,
 * for the hero, its dark-theme partner. The character sheet (platypus-reference.png) is a generation
 * aid and is not listed.
 *
 * Plain TypeScript with no imports, so scripts/process-art.mjs can import it under Node's type
 * stripping. Which processed files exist is in lib/art-ready.json, written by `pnpm art`.
 */

export type ArtName =
  | 'hero-diorama'
  | 'platypus-wave'
  | 'platypus-reading'
  | 'platypus-celebrate'
  | 'platypus-search'
  | 'prop-filing-cabinet'
  | 'prop-compass'
  | 'prop-stamp'
  | 'step-answer'
  | 'step-sort'
  | 'step-plan';

export type ArtAsset = {
  /** Base name of the original (art/originals/<file>.png) and of its outputs (public/art/<file>-<width>.<format>). */
  file: string;
  /** Base name of the dark-theme partner, shown instead of `file` under the dark theme. */
  dark?: string;
  /** Intrinsic size of the original, in pixels. */
  width: number;
  height: number;
  /** Default alt text, or null when the image is decorative. */
  alt: string | null;
};

export type ArtFormat = 'avif' | 'webp';

export const ART: Record<ArtName, ArtAsset> = {
  'hero-diorama': {
    file: 'hero-diorama-day',
    dark: 'hero-diorama-dusk',
    width: 1536,
    height: 1024,
    alt: 'A clay platypus at a small desk beside a billabong, sorting paper forms into three wooden trays',
  },
  'platypus-wave': { file: 'platypus-wave', width: 1024, height: 1024, alt: 'A platypus waving hello, holding a clipboard' },
  'platypus-reading': { file: 'platypus-reading', width: 1024, height: 1024, alt: 'A platypus reading a very long paper form' },
  'platypus-celebrate': { file: 'platypus-celebrate', width: 1024, height: 1024, alt: 'A platypus jumping for joy among confetti, holding a rubber stamp' },
  'platypus-search': { file: 'platypus-search', width: 1024, height: 1024, alt: 'A platypus peering through a magnifying glass' },
  'prop-filing-cabinet': { file: 'prop-filing-cabinet', width: 1024, height: 1024, alt: null },
  'prop-compass': { file: 'prop-compass', width: 1024, height: 1024, alt: null },
  'prop-stamp': { file: 'prop-stamp', width: 1024, height: 1024, alt: null },
  'step-answer': { file: 'step-answer', width: 1024, height: 1024, alt: null },
  'step-sort': { file: 'step-sort', width: 1024, height: 1024, alt: null },
  'step-plan': { file: 'step-plan', width: 1024, height: 1024, alt: null },
};

/** Output widths. An original gets each one not larger than itself (1x and 2x for the sizes used). */
export const ART_WIDTHS = [480, 960, 1440] as const;

export const ART_FORMATS: readonly ArtFormat[] = ['avif', 'webp'];

/** The widths written for an original `width` pixels wide. */
export function artWidths(width: number): number[] {
  return ART_WIDTHS.filter((w) => w <= width);
}

/** A processed file's name in public/art. */
export function artFileName(file: string, width: number, format: ArtFormat): string {
  return `${file}-${width}.${format}`;
}

/** Every base file name in the manifest, each asset's light file then its dark partner, in manifest order. */
export function artFiles(manifest: Record<string, ArtAsset> = ART): string[] {
  return Object.values(manifest).flatMap((a) => (a.dark ? [a.file, a.dark] : [a.file]));
}
