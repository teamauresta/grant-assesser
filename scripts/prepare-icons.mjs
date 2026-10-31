#!/usr/bin/env node
// Prepares the owner's sage icons for `pnpm art` (art/README.md, The icons; design doc section 11,
// Icons landed). It reads two untracked sources from the repo root, which are never committed:
//
// - Sage_Icons_16_Shadow/icon-<name>.png: sixteen 1254px squares, transparent and clean, but placed
//   unevenly (the ticket fills 1036 × 532 of its square, off centre);
// - "Sage web app navigation icons.png": a 6 × 4 sheet (1536 × 1024) with a dark glow baked into
//   its alpha around each icon. Ten of its cells are used (SHEET_ICONS).
//
// Each icon is trimmed to its solid pixels and centred on a transparent ICON_ORIGINAL_SIZE square
// (iconPlacement), the sheet's after its glow is removed (removeGlow), and written to
// art/originals/icon-<name>.png, which `pnpm art` then turns into AVIF and WebP. The output depends
// only on the sources, so the committed public/art/icon-* files can be made again from them. Missing
// sources are listed, never errors, so a clone without them still runs `pnpm art`.
import { existsSync, mkdirSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { ICON_NAMES, ICON_ORIGINAL_SIZE, iconFile } from '../lib/art.ts';

/** @typedef {{ data: Buffer, width: number, height: number }} Raw RGBA pixels, 4 bytes each. */
/** @typedef {{ left: number, top: number, width: number, height: number }} Box */

/** The navigation sheet's cells, as [row, column] from the top left, by icon name. */
export const SHEET_ICONS = /** @type {const} */ ({
  grid: [0, 0], person: [0, 1], calendar: [1, 0], checklist: [1, 1], folder: [1, 2], download: [1, 5],
  report: [2, 3], link: [2, 4], lock: [2, 5], question: [3, 1],
});

/** The icons that come one per file from Sage_Icons_16_Shadow/: every other manifest icon. */
export const FOLDER_ICONS = ICON_NAMES.filter((name) => !(name in SHEET_ICONS));

/** Alpha at or above which a pixel is part of an icon's solid shape (its shadow and glow fade below). */
const SOLID_ALPHA = 128;

/** A square icon fills this share of the square; a wide or tall one may grow to ICON_FILL_MAX. */
const ICON_FILL_AREA = 0.8;
const ICON_FILL_MAX = 0.9;

/** @param {number} r @param {number} g @param {number} b */
const luminance = (r, g, b) => 0.2126 * r + 0.7152 * g + 0.0722 * b;

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
 * The runs of non-zero entries in `counts`, as [first, last] indices.
 * @param {number[]} counts
 * @returns {[number, number][]}
 */
function runs(counts) {
  /** @type {[number, number][]} */
  const found = [];
  let start = -1;
  counts.forEach((n, i) => {
    if (n > 0 && start < 0) start = i;
    if (n === 0 && start >= 0) {
      found.push([start, i - 1]);
      start = -1;
    }
  });
  if (start >= 0) found.push([start, counts.length - 1]);
  return found;
}

/**
 * Splits runs into cells that tile [0, size): each gap between two runs is split at its middle.
 * @param {[number, number][]} found
 * @param {number} size
 * @returns {[number, number][]} half-open [start, end) cells
 */
function tile(found, size) {
  return found.map(([, last], i) => {
    const start = i === 0 ? 0 : Math.round((found[i - 1][1] + 1 + found[i][0]) / 2);
    const end = i === found.length - 1 ? size : Math.round((last + 1 + found[i + 1][0]) / 2);
    return /** @type {[number, number]} */ ([start, end]);
  });
}

/**
 * The sheet's columns and rows, found from its alpha rather than assumed: the icons (and their glow)
 * are opaque, the space between them is not. Each is a half-open [start, end) range; together they
 * tile the sheet.
 * @param {Raw} img
 * @param {number} [threshold] alpha above which a pixel counts
 */
export function sheetGrid(img, threshold = 200) {
  const cols = new Array(img.width).fill(0);
  const rows = new Array(img.height).fill(0);
  for (let y = 0; y < img.height; y++) {
    for (let x = 0; x < img.width; x++) {
      if (img.data[(y * img.width + x) * 4 + 3] > threshold) {
        cols[x]++;
        rows[y]++;
      }
    }
  }
  return { columns: tile(runs(cols), img.width), rows: tile(runs(rows), img.height) };
}

/** A pixel is part of a sheet icon (its sage fill or cream outline) at or above this luminance. */
const ICON_LUM = 170;
/**
 * A dark region enclosed by an icon is a hole full of glow (the lock's shackle and keyhole) when its
 * mean luminance is below HOLE_LUM or its mean alpha below HOLE_ALPHA; otherwise it is the icon's own
 * embossed shading (the shadows under the checks, the bars, the calendar's days), which stays.
 */
const HOLE_LUM = 100;
const HOLE_ALPHA = 240;
/** An edge pixel's coverage runs from 0 at the glow's luminance to 1 at the outline's. */
const EDGE_FROM = 80;
const EDGE_TO = 230;

/**
 * Which pixels of a sheet cell belong to the icon. Every sheet icon is a sage fill inside a cream
 * outline, both bright; the glow is dark green, outside the outline. So the bright, solid pixels are
 * the icon, and so is any region of other pixels they enclose, unless it is a dark or see-through
 * hole (HOLE_LUM, HOLE_ALPHA). Regions are 4-connected; one touching the cell's edge is glow.
 * @param {Raw} img
 * @returns {Uint8Array} 1 for the icon's pixels
 */
function iconMask({ data, width, height }) {
  const keep = new Uint8Array(width * height);
  for (let i = 0; i < width * height; i++) {
    const o = i * 4;
    if (data[o + 3] >= SOLID_ALPHA && luminance(data[o], data[o + 1], data[o + 2]) >= ICON_LUM) keep[i] = 1;
  }
  const seen = new Uint8Array(width * height);
  for (let start = 0; start < width * height; start++) {
    if (keep[start] || seen[start]) continue;
    const region = [start];
    seen[start] = 1;
    let edge = false, lum = 0, alpha = 0;
    for (let k = 0; k < region.length; k++) {
      const i = region[k];
      const x = i % width, y = (i - x) / width;
      const o = i * 4;
      lum += luminance(data[o], data[o + 1], data[o + 2]);
      alpha += data[o + 3];
      if (x === 0 || y === 0 || x === width - 1 || y === height - 1) edge = true;
      for (const n of [x > 0 ? i - 1 : -1, x < width - 1 ? i + 1 : -1, y > 0 ? i - width : -1, y < height - 1 ? i + width : -1]) {
        if (n >= 0 && !keep[n] && !seen[n]) {
          seen[n] = 1;
          region.push(n);
        }
      }
    }
    if (!edge && lum / region.length >= HOLE_LUM && alpha / region.length >= HOLE_ALPHA) for (const i of region) keep[i] = 1;
  }
  return keep;
}

/**
 * Removes the sheet's dark glow (iconMask), from around each icon and from its holes (the link's,
 * the lock's). The pixels on either side of the icon's boundary are its anti-aliased edge, blends of
 * the cream outline and the near-black rim of the glow: each keeps a share of its alpha by its
 * luminance (its coverage) and takes the colour of the bright outline pixels beside it, so the edge
 * is cream fading out, never a grey hairline. The rest is cleared to transparent black.
 * @param {Raw} img
 * @returns {Raw}
 */
export function removeGlow(img) {
  const { data, width, height } = img;
  const keep = iconMask(img);
  const out = Buffer.alloc(data.length);
  const lumAt = (/** @type {number} */ o) => luminance(data[o], data[o + 1], data[o + 2]);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      const o = i * 4;
      // The neighbours on the icon's side, the bright ones among them, and whether any is glow.
      let r = 0, g = 0, b = 0, n = 0, br = 0, bg = 0, bb = 0, bn = 0, boundary = false;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx, ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
          const ni = ny * width + nx;
          if (!keep[ni]) {
            boundary = true;
            continue;
          }
          const no = ni * 4;
          r += data[no]; g += data[no + 1]; b += data[no + 2]; n++;
          if (lumAt(no) >= EDGE_TO) {
            br += data[no]; bg += data[no + 1]; bb += data[no + 2]; bn++;
          }
        }
      }
      if (keep[i] && !boundary) {
        data.copy(out, o, o, o + 4);
        continue;
      }
      if (n === 0) continue;
      const coverage = Math.min(1, Math.max(0, (lumAt(o) - EDGE_FROM) / (EDGE_TO - EDGE_FROM)));
      const alpha = Math.round(data[o + 3] * coverage);
      if (alpha === 0) continue;
      const [cr, cg, cb, cn] = bn ? [br, bg, bb, bn] : [r, g, b, n];
      out[o] = Math.round(cr / cn);
      out[o + 1] = Math.round(cg / cn);
      out[o + 2] = Math.round(cb / cn);
      out[o + 3] = alpha;
    }
  }
  return { data: out, width, height };
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
  // Enlarging (the sheet's small cells) uses a linear kernel: Lanczos rings at the hard edges of a
  // cleaned icon, which leaves dark specks just outside its outline.
  const scaled = await sharp(img.data, { raw: { width: img.width, height: img.height, channels: 4 } })
    .resize(scaledWidth, scaledHeight, { kernel: scale > 1 ? 'linear' : 'lanczos3' })
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
 * Cuts one cell out of a raw image.
 * @param {Raw} img
 * @param {[number, number]} columns half-open x range
 * @param {[number, number]} rows half-open y range
 * @returns {Raw}
 */
function cut(img, [x0, x1], [y0, y1]) {
  const width = x1 - x0;
  const height = y1 - y0;
  const data = Buffer.alloc(width * height * 4);
  for (let y = 0; y < height; y++) img.data.copy(data, y * width * 4, ((y + y0) * img.width + x0) * 4, ((y + y0) * img.width + x1) * 4);
  return { data, width, height };
}

/**
 * Writes art/originals/icon-<name>.png for every icon whose source is present, and lists the PNG
 * names of those whose source is missing (in manifest order).
 * @param {{ iconsDir: string, sheet: string, out: string }} options
 */
export async function prepareIcons({ iconsDir, sheet, out }) {
  const { default: sharp } = await import('sharp');
  /** @type {string[]} */
  const written = [];
  /** @type {string[]} */
  const missing = [];
  /** @type {Map<string, Raw>} */
  const prepared = new Map();

  const inFolder = existsSync(iconsDir) ? readdirSync(iconsDir) : [];
  for (const name of FOLDER_ICONS) {
    const source = `${iconFile(name)}.png`;
    if (inFolder.includes(source)) prepared.set(name, await normaliseIcon(await readRaw(join(iconsDir, source))));
  }
  if (existsSync(sheet)) {
    const img = await readRaw(sheet);
    const grid = sheetGrid(img);
    for (const [name, [row, column]] of Object.entries(SHEET_ICONS)) {
      if (!grid.rows[row] || !grid.columns[column]) throw new Error(`the sheet has no cell at row ${row}, column ${column}`);
      prepared.set(name, await normaliseIcon(removeGlow(cut(img, grid.columns[column], grid.rows[row]))));
    }
  }

  for (const name of ICON_NAMES) {
    const file = `${iconFile(name)}.png`;
    const icon = prepared.get(name);
    if (!icon) {
      missing.push(file);
      continue;
    }
    mkdirSync(out, { recursive: true });
    await sharp(icon.data, { raw: { width: icon.width, height: icon.height, channels: 4 } }).png({ compressionLevel: 9 }).toFile(join(out, file));
    written.push(file);
  }
  return { written, missing };
}

async function main() {
  const root = fileURLToPath(new URL('..', import.meta.url));
  const report = await prepareIcons({
    iconsDir: join(root, 'Sage_Icons_16_Shadow'),
    sheet: join(root, 'Sage web app navigation icons.png'),
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
