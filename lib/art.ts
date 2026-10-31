/**
 * The artwork manifest (Billabong design doc section 6): every image in docs/art/billabong-prompts.md
 * that ships, with its base file name, intrinsic size, default alt text (null when decorative) and,
 * for the hero, its dark-theme partner; plus the logo emblem, cropped from the owner's lockup, and the
 * owner's sage icons (ICON_NAMES), each at its own small widths. The character sheet
 * (platypus-reference.png) is a generation aid and is not listed.
 *
 * scripts/process-art.mjs imports this file (`pnpm art` runs it with tsx). Keep it to erasable
 * TypeScript syntax only (annotations, `type`, `as const`; no enums, namespaces or parameter
 * properties), and its one import, lib/art-files.ts (the file names, which client code imports on its
 * own), with its `.ts` extension, so the script also runs under Node's own type stripping. Which
 * processed files exist is in lib/art-ready.json, written by `pnpm art`.
 */

import { ICON_NAMES, ICON_ORIGINAL_SIZE, ICON_WIDTHS, iconFile, type ArtFormat, type IconName } from './art-files.ts';

export { ICON_NAMES, ICON_ORIGINAL_SIZE, ICON_WIDTHS, artFileName, artSrcSet, iconFile } from './art-files.ts';
export type { ArtFormat, IconName } from './art-files.ts';

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
  | 'step-plan'
  | 'logo-emblem'
  | `icon-${IconName}`;

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
  /** Output widths, when not ART_WIDTHS (the logo, shown at 32px, and the icons). */
  widths?: readonly number[];
};

/** Output widths. An original gets each one not larger than itself (1x and 2x for the sizes used). */
export const ART_WIDTHS = [480, 960, 1440] as const;

/** The logo emblem's widths: 1x, 2x and 4x of its 32px in the top bar (a 3x screen takes 128). */
export const LOGO_WIDTHS = [32, 64, 128] as const;

const ICONS = Object.fromEntries(ICON_NAMES.map((name): [string, ArtAsset] => [iconFile(name), {
  file: iconFile(name), width: ICON_ORIGINAL_SIZE, height: ICON_ORIGINAL_SIZE, alt: null, widths: ICON_WIDTHS,
}])) as Record<`icon-${IconName}`, ArtAsset>;

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
  // Decorative: the live "Grant Navigator" text sits beside it (LogoMark).
  'logo-emblem': { file: 'logo-emblem', width: 668, height: 668, alt: null, widths: LOGO_WIDTHS },
  // Decorative: each sits beside a visible label (SageIcon).
  ...ICONS,
};

export const ART_FORMATS: readonly ArtFormat[] = ['avif', 'webp'];

/** An asset's output widths: its own, or ART_WIDTHS. */
export function assetWidths(asset: ArtAsset): readonly number[] {
  return asset.widths ?? ART_WIDTHS;
}

/** The widths written for an original `width` pixels wide, from `widths` (ART_WIDTHS by default). */
export function artWidths(width: number, widths: readonly number[] = ART_WIDTHS): number[] {
  return widths.filter((w) => w <= width);
}

/**
 * The processed widths of one base file in `ready` (lib/art-ready.json, written by `pnpm art`): its
 * list, or none when it is false, missing or not a list. The Art component and the hero preload
 * (lib/hero-preload.ts) both read it this way.
 */
export function readyWidths(ready: Readonly<Record<string, unknown>>, file: string): number[] {
  const widths = ready[file];
  return Array.isArray(widths) ? widths.filter((w): w is number => typeof w === 'number') : [];
}

/** Every base file name in the manifest, each asset's light file then its dark partner, in manifest order. */
export function artFiles(manifest: Record<string, ArtAsset> = ART): string[] {
  return Object.values(manifest).flatMap((a) => (a.dark ? [a.file, a.dark] : [a.file]));
}
