/**
 * The art's file names, apart from the manifest (lib/art.ts, which re-exports all of this): the sage
 * icons' names and widths, and how a processed file and a `srcset` are named. SageIcon
 * (components/ui/sage-icon.tsx) imports only this file, so the manifest, with its alt text, stays out
 * of the client chunks every route loads: `ART` is built with an expression the bundler cannot drop.
 *
 * Like lib/art.ts, keep it import-free and to erasable TypeScript only: scripts/process-art.mjs and
 * scripts/prepare-icons.mjs reach it through lib/art.ts, under tsx or Node's own type stripping.
 */

/**
 * The owner's sage icons (design doc section 11, Icons landed): sixteen from Sage_Icons_16_Shadow/ and
 * ten cut from the navigation sheet by scripts/prepare-icons.mjs, which writes each to
 * art/originals/icon-<name>.png as an ICON_ORIGINAL_SIZE square. Shown by SageIcon, always decorative
 * beside a visible label.
 */
export const ICON_NAMES = [
  'backup', 'banknote', 'cloud', 'handshake', 'landmark', 'notebook', 'plan-board', 'receipt',
  'rocket', 'shield', 'sprout', 'target', 'ticket', 'trending-up', 'trophy', 'verified',
  'grid', 'person', 'calendar', 'checklist', 'folder', 'download', 'report', 'link', 'lock', 'question',
] as const;

export type IconName = (typeof ICON_NAMES)[number];

/**
 * The icons' widths: they show at 20 to 40px (the nav at 20 and 24, the home page's cards at 36 and
 * 40), so 48 covers 1x and 2x of the nav, 96 2x of the cards, and 144 a 3x screen.
 */
export const ICON_WIDTHS = [48, 96, 144] as const;

/** The side of each prepared icon original (art/originals/icon-<name>.png), in pixels. */
export const ICON_ORIGINAL_SIZE = 512;

/** An icon's base file name (art/originals/<file>.png, public/art/<file>-<width>.<format>). */
export function iconFile<N extends IconName>(name: N): `icon-${N}` {
  return `icon-${name}` as `icon-${N}`;
}

export type ArtFormat = 'avif' | 'webp';

/** A processed file's name in public/art. */
export function artFileName(file: string, width: number, format: ArtFormat): string {
  return `${file}-${width}.${format}`;
}

/** A `srcset` of one base file's processed widths in one format, under `base` (which ends in a slash). */
export function artSrcSet(base: string, file: string, widths: readonly number[], format: ArtFormat): string {
  return widths.map((w) => `${base}${artFileName(file, w, format)} ${w}w`).join(', ');
}
