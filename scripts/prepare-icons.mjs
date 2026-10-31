#!/usr/bin/env node
// Prepares the owner's sage icons for `pnpm art` (art/README.md, The icons; design doc section 11,
// Icons landed and Icons regenerated). It reads two untracked folders at the repo root, which are
// never committed, both of 1254px transparent squares, clean but placed unevenly (the ticket fills
// 1036 × 532 of its square, off centre):
//
// - Sage_Icons_16_Shadow/icon-<name>.png: sixteen icons under their manifest names (SHADOW_ICONS);
// - Sage_Navigation_24_Individual/: twenty-four icons under the owner's names, of which ten are used,
//   by the map NAVIGATION_ICONS (the owner's icon-dashboard.png is our grid, and so on).
//
// Each icon is trimmed to its solid pixels, centred on a transparent ICON_ORIGINAL_SIZE square
// (iconPlacement) and written to art/originals/icon-<name>.png, which `pnpm art` then turns into AVIF
// and WebP. The output depends only on the sources, so the committed public/art/icon-* files can be
// made again from them. Missing sources are listed, never errors, so a clone without them still runs
// `pnpm art`.
import { existsSync, mkdirSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { ICON_NAMES, ICON_ORIGINAL_SIZE, iconFile } from '../lib/art.ts';

/** @typedef {{ data: Buffer, width: number, height: number }} Raw RGBA pixels, 4 bytes each. */
/** @typedef {{ left: number, top: number, width: number, height: number }} Box */

/**
 * The owner's navigation icons that are used (Sage_Navigation_24_Individual/), by file, with their
 * manifest names. Its fourteen others (activity, billing, bookmark, email, favourites, filter, gallery,
 * language, login, logout, messages, notifications, team, video) are not in the manifest.
 */
export const NAVIGATION_ICONS = /** @type {const} */ ({
  'icon-dashboard.png': 'grid', 'icon-profile.png': 'person', 'icon-calendar.png': 'calendar',
  'icon-tasks.png': 'checklist', 'icon-files.png': 'folder', 'icon-download.png': 'download',
  'icon-reports.png': 'report', 'icon-integrations.png': 'link', 'icon-security.png': 'lock',
  'icon-help.png': 'question',
});

/** The icons from Sage_Icons_16_Shadow/, each as icon-<name>.png: every other manifest icon. */
export const SHADOW_ICONS = ICON_NAMES.filter((name) => !Object.values(NAVIGATION_ICONS).includes(name));

/** Alpha at or above which a pixel is part of an icon's solid shape (its soft shadow fades below). */
const SOLID_ALPHA = 128;

/** A square icon fills this share of the square; a wide or tall one may grow to ICON_FILL_MAX. */
const ICON_FILL_AREA = 0.8;
const ICON_FILL_MAX = 0.9;

/**
 * The box of pixels whose alpha is above `threshold`, or null when there are none.
 * @param {Raw} img
 * @param {number} threshold
 * @returns {Box | null}
 */
export function alphaBounds(img, threshold) {
  let left = img.width, top = img.height, right = -1, bottom = -1;
  for (let y = 0; y < img.height; y++) {
    for (let x = 0; x < img.width; x++) {
      if (img.data[(y * img.width + x) * 4 + 3] > threshold) {
        if (x < left) left = x;
        if (x > right) right = x;
        if (y < top) top = y;
        if (y > bottom) bottom = y;
      }
    }
  }
  return right < 0 ? null : { left, top, width: right - left + 1, height: bottom - top + 1 };
}

/**
 * Where an icon whose solid shape is `box` goes on a `size` square: scaled so a square icon fills
 * ICON_FILL_AREA of the side and a wide or tall one (the ticket, the banknote) fills up to
 * ICON_FILL_MAX on its long side, so they read at about the same optical size; centred.
 * @param {Box} box
 * @param {number} size
 * @returns {Box}
 */
export function iconPlacement(box, size) {
  const scale = Math.min((ICON_FILL_MAX * size) / Math.max(box.width, box.height), (ICON_FILL_AREA * size) / Math.sqrt(box.width * box.height));
  const width = Math.round(box.width * scale);
  const height = Math.round(box.height * scale);
  return { width, height, left: Math.round((size - width) / 2), top: Math.round((size - height) / 2) };
}

/**
 * Trims an icon to its solid shape and centres it on a transparent ICON_ORIGINAL_SIZE square
 * (iconPlacement). Its faint shadow comes along, inside the square's margin.
 * @param {Raw} img
 * @returns {Promise<Raw>}
 */
export async function normaliseIcon(img) {
  const { default: sharp } = await import('sharp');
  const size = ICON_ORIGINAL_SIZE;
  const box = alphaBounds(img, SOLID_ALPHA);
  if (!box) throw new Error('the icon has no solid pixels');
  const place = iconPlacement(box, size);
  const scale = place.width / box.width;
  const scaledWidth = Math.max(1, Math.round(img.width * scale));
  const scaledHeight = Math.max(1, Math.round(img.height * scale));
  const scaled = await sharp(img.data, { raw: { width: img.width, height: img.height, channels: 4 } })
    .resize(scaledWidth, scaledHeight, { kernel: 'lanczos3' })
    .raw().toBuffer();
  // Where the scaled image's origin lands on the square.
  const dx = place.left - Math.round(box.left * scale);
  const dy = place.top - Math.round(box.top * scale);
  const out = Buffer.alloc(size * size * 4);
  for (let y = Math.max(0, dy); y < Math.min(size, dy + scaledHeight); y++) {
    const from = (y - dy) * scaledWidth;
    const x0 = Math.max(0, dx);
    const x1 = Math.min(size, dx + scaledWidth);
    scaled.copy(out, (y * size + x0) * 4, (from + x0 - dx) * 4, (from + x1 - dx) * 4);
  }
  // Resampling leaves a few pixels at alpha 1 to 3 with no colour (black): invisible, but cleared.
  for (let o = 0; o < out.length; o += 4) if (out[o + 3] < 4) out.fill(0, o, o + 4);
  return { data: out, width: size, height: size };
}

/**
 * Reads a PNG as raw RGBA.
 * @param {string} path
 * @returns {Promise<Raw>}
 */
async function readRaw(path) {
  const { default: sharp } = await import('sharp');
  const { data, info } = await sharp(path).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return { data, width: info.width, height: info.height };
}

/**
 * Writes art/originals/icon-<name>.png for every icon whose source is present, and lists the PNG
 * names of those whose source is missing (in manifest order).
 * @param {{ shadowDir: string, navigationDir: string, out: string }} options
 */
export async function prepareIcons({ shadowDir, navigationDir, out }) {
  const { default: sharp } = await import('sharp');
  /** @type {string[]} */
  const written = [];
  /** @type {string[]} */
  const missing = [];
  /** @type {Map<string, string>} manifest name to source path */
  const sources = new Map();
  const list = (/** @type {string} */ dir) => (existsSync(dir) ? readdirSync(dir) : []);
  const inShadow = list(shadowDir);
  for (const name of SHADOW_ICONS) {
    const file = `${iconFile(name)}.png`;
    if (inShadow.includes(file)) sources.set(name, join(shadowDir, file));
  }
  const inNavigation = list(navigationDir);
  for (const [file, name] of Object.entries(NAVIGATION_ICONS)) {
    if (inNavigation.includes(file)) sources.set(name, join(navigationDir, file));
  }

  for (const name of ICON_NAMES) {
    const file = `${iconFile(name)}.png`;
    const source = sources.get(name);
    if (!source) {
      missing.push(file);
      continue;
    }
    const icon = await normaliseIcon(await readRaw(source));
    mkdirSync(out, { recursive: true });
    await sharp(icon.data, { raw: { width: icon.width, height: icon.height, channels: 4 } }).png({ compressionLevel: 9 }).toFile(join(out, file));
    written.push(file);
  }
  return { written, missing };
}

async function main() {
  const root = fileURLToPath(new URL('..', import.meta.url));
  const report = await prepareIcons({
    shadowDir: join(root, 'Sage_Icons_16_Shadow'),
    navigationDir: join(root, 'Sage_Navigation_24_Individual'),
    out: join(root, 'art', 'originals'),
  });
  console.log(report.written.length
    ? `Prepared ${report.written.length} icons in art/originals/ from the owner's sage icons.`
    : 'No sage icon sources found at the repo root; the icon originals were left as they are.');
  if (report.written.length && report.missing.length) {
    console.log(`Sources missing for (${report.missing.length}):`);
    for (const name of report.missing) console.log(`  ${name}`);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
