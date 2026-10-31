#!/usr/bin/env node
// Processes the artwork (Billabong design doc section 6; art/README.md). Reads each original named
// in the manifest (lib/art.ts) from art/originals/<file>.png, writes public/art/<file>-<width>.avif
// and .webp at each width in ART_WIDTHS (the logo emblem: LOGO_WIDTHS; the icons, which
// scripts/prepare-icons.mjs writes first: ICON_WIDTHS) not larger than the original (alpha kept),
// then writes lib/art-ready.json from what is in public/art, so the Art component renders an image
// for each processed asset and a placeholder for the rest. From the logo emblem it
// also writes the browser icons, app/icon.png and app/apple-icon.png. Missing originals are listed,
// never errors.
// Fails (after processing the rest, and still writing lib/art-ready.json) if an original is too
// small, the wrong shape or unreadable, or if a hero diorama's 1440px AVIF is over 120KB.
import { existsSync, mkdirSync, readdirSync, renameSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { ART, ART_FORMATS, ART_WIDTHS, artFileName, artFiles, artWidths, assetWidths } from '../lib/art.ts';

/** The hero's AVIF budget at its largest width (design doc section 6: about 120KB). */
export const HERO_AVIF_LIMIT = 120 * 1024;

const HERO_FILES = [ART['hero-diorama'].file, ART['hero-diorama'].dark];

/**
 * The AVIF quality for one base file: 45 for the hero dioramas, 55 for the rest. At 55 the real
 * dioramas were about 154KB at 1440px, over HERO_AVIF_LIMIT; at 45 they are about 114KB with no
 * visible loss (design doc section 11, Art landed).
 * @param {string} file
 */
export function avifQuality(file) {
  return HERO_FILES.includes(file) ? 45 : 55;
}

/**
 * The AVIF and WebP names (in public/art) for one base file at each width.
 * @param {string} file
 * @param {readonly number[]} widths
 * @returns {{ width: number, avif: string, webp: string }[]}
 */
export function outputsFor(file, widths) {
  return widths.map((width) => ({ width, avif: artFileName(file, width, 'avif'), webp: artFileName(file, width, 'webp') }));
}

/**
 * The originals the manifest names that are not among `files` (the names in art/originals), as PNG
 * names in manifest order.
 * @param {Record<string, import('../lib/art.ts').ArtAsset>} manifest
 * @param {readonly string[]} files
 * @returns {string[]}
 */
export function missing(manifest, files) {
  const present = new Set(files);
  return artFiles(manifest).map((f) => `${f}.png`).filter((name) => !present.has(name));
}

/**
 * PNGs in art/originals that the manifest does not name: a misspelt file, or the character sheet,
 * which is a generation aid only. They are not processed.
 * @param {Record<string, import('../lib/art.ts').ArtAsset>} manifest
 * @param {readonly string[]} files
 * @returns {string[]}
 */
export function unexpected(manifest, files) {
  const known = new Set(artFiles(manifest).map((f) => `${f}.png`));
  return files.filter((name) => name.toLowerCase().endsWith('.png') && !known.has(name));
}

/**
 * Each base file in the manifest with its asset's output widths, light then dark, in manifest order.
 * @param {Record<string, import('../lib/art.ts').ArtAsset>} manifest
 * @returns {[string, readonly number[]][]}
 */
function fileWidths(manifest) {
  return Object.values(manifest).flatMap((a) => (a.dark ? [a.file, a.dark] : [a.file]).map((file) => /** @type {[string, readonly number[]]} */ ([file, assetWidths(a)])));
}

/**
 * What lib/art-ready.json holds: for each base file, the widths (of its asset's) with both an AVIF
 * and a WebP among `files` (the names in public/art), or false when there are none.
 * @param {Record<string, import('../lib/art.ts').ArtAsset>} manifest
 * @param {readonly string[]} files
 * @returns {Record<string, false | number[]>}
 */
export function readiness(manifest, files) {
  const present = new Set(files);
  return Object.fromEntries(fileWidths(manifest).map(([file, all]) => {
    const widths = outputsFor(file, all).filter((o) => present.has(o.avif) && present.has(o.webp)).map((o) => o.width);
    return [file, widths.length ? widths : false];
  }));
}

/**
 * The hero 1440px AVIFs over HERO_AVIF_LIMIT.
 * @param {{ name: string, bytes: number }[]} sizes
 * @returns {string[]}
 */
export function heroOverLimit(sizes) {
  const heroes = new Set(HERO_FILES.map((file) => artFileName(file, 1440, 'avif')));
  return sizes.filter(({ name, bytes }) => heroes.has(name) && bytes > HERO_AVIF_LIMIT).map(({ name }) => name);
}

/**
 * Whether an original `width` × `height` has the asset's aspect ratio, within 1%. A different shape
 * would be letterboxed in the asset's box.
 * @param {number} width
 * @param {number} height
 * @param {import('../lib/art.ts').ArtAsset} asset
 */
export function shapeMatches(width, height, asset) {
  const want = asset.width / asset.height;
  return height > 0 && Math.abs(width / height - want) / want <= 0.01;
}

/** The prefix of a file's temporary output folder in public/art (gitignored). */
const TEMP_PREFIX = '.tmp-';

/**
 * Entries in public/art that no manifest file produces at any width (a renamed or removed asset, a
 * stray file), ignoring dotfiles other than a temporary folder left by an interrupted run. They
 * would be deployed for nothing.
 * @param {Record<string, import('../lib/art.ts').ArtAsset>} manifest
 * @param {readonly string[]} files
 * @returns {string[]}
 */
export function leftovers(manifest, files) {
  const expected = new Set(fileWidths(manifest).flatMap(([file, widths]) => outputsFor(file, widths).flatMap((o) => [o.avif, o.webp])));
  return files.filter((name) => (!name.startsWith('.') || name.startsWith(TEMP_PREFIX)) && !expected.has(name));
}

/** @param {string} dir */
const list = (dir) => (existsSync(dir) ? readdirSync(dir) : []);

/**
 * Processes every original present in `originals` into `out` and reports what it did. Stale
 * temporary folders from an interrupted run are deleted first. Each file's outputs are written to a
 * temporary folder first and replace all its earlier outputs only when every
 * one succeeded, so a skipped (too small, wrong shape) or failed original keeps what was there. One
 * bad original never stops the others.
 * @param {{ originals: string, out: string, manifest: Record<string, import('../lib/art.ts').ArtAsset> }} options
 */
export async function processArt({ originals, out, manifest }) {
  // An interrupted run (Ctrl-C) skips the finally below and leaves its temporary folder behind.
  for (const name of list(out)) {
    if (name.startsWith(TEMP_PREFIX)) rmSync(join(out, name), { recursive: true, force: true });
  }
  const sources = list(originals);
  const { default: sharp } = await import('sharp');
  /** @type {{ name: string, width: number, bytes: number }[]} */
  const written = [];
  /** @type {string[]} */
  const tooSmall = [];
  /** @type {string[]} */
  const wrongShape = [];
  /** @type {string[]} */
  const failed = [];
  for (const asset of Object.values(manifest)) {
    for (const file of asset.dark ? [asset.file, asset.dark] : [asset.file]) {
      const source = `${file}.png`;
      if (!sources.includes(source)) continue;
      const input = join(originals, source);
      const temp = join(out, `${TEMP_PREFIX}${file}`);
      try {
        const { width = 0, height = 0 } = await sharp(input).metadata();
        const widths = artWidths(width, assetWidths(asset));
        if (widths.length === 0) {
          tooSmall.push(source);
          continue;
        }
        if (!shapeMatches(width, height, asset)) {
          wrongShape.push(source);
          continue;
        }
        mkdirSync(temp, { recursive: true });
        const outputs = outputsFor(file, widths);
        for (const o of outputs) {
          const resized = () => sharp(input).resize({ width: o.width });
          await resized().avif({ quality: avifQuality(file) }).toFile(join(temp, o.avif));
          await resized().webp({ quality: 78 }).toFile(join(temp, o.webp));
        }
        for (const old of outputsFor(file, assetWidths(asset))) {
          for (const format of ART_FORMATS) rmSync(join(out, old[format]), { force: true });
        }
        for (const o of outputs) {
          for (const name of [o.avif, o.webp]) {
            renameSync(join(temp, name), join(out, name));
            written.push({ name, width: o.width, bytes: statSync(join(out, name)).size });
          }
        }
      } catch (err) {
        failed.push(`${source}: ${err instanceof Error ? err.message : String(err)}`);
      } finally {
        rmSync(temp, { recursive: true, force: true });
      }
    }
  }
  const outputs = list(out);
  return {
    written,
    tooSmall,
    wrongShape,
    failed,
    missing: missing(manifest, sources),
    unexpected: unexpected(manifest, sources),
    leftovers: leftovers(manifest, outputs),
    ready: readiness(manifest, outputs),
  };
}

/** The home-screen icon's background: the light --surface (iOS fills transparency with black). */
export const APPLE_ICON_BACKGROUND = '#fafaf7';

/**
 * Writes the browser icons from the logo emblem into `appDir` (Next's app-dir file conventions, which
 * emit the <link> tags under the base path): icon.png, 192px with the emblem's transparency (the tab
 * icon), and apple-icon.png, 180px with the emblem on APPLE_ICON_BACKGROUND, inset 10px (the
 * home-screen icon, which iOS rounds and which must be opaque). Returns the names written.
 * @param {string} emblem
 * @param {string} appDir
 * @returns {Promise<string[]>}
 */
export async function writeIcons(emblem, appDir) {
  const { default: sharp } = await import('sharp');
  // A palette PNG keeps the tab icon small (it is fetched on every first visit).
  await sharp(emblem).resize(192, 192).png({ palette: true, quality: 90, compressionLevel: 9 }).toFile(join(appDir, 'icon.png'));
  const inner = await sharp(emblem).resize(160, 160).png().toBuffer();
  // The canvas has three channels, so the composite is already opaque.
  await sharp({ create: { width: 180, height: 180, channels: 3, background: APPLE_ICON_BACKGROUND } })
    .composite([{ input: inner, left: 10, top: 10 }])
    .png({ palette: true, quality: 90, compressionLevel: 9 })
    .toFile(join(appDir, 'apple-icon.png'));
  return ['icon.png', 'apple-icon.png'];
}

/** @param {number} bytes */
const kb = (bytes) => `${(bytes / 1024).toFixed(1)} KB`;

async function main() {
  const root = fileURLToPath(new URL('..', import.meta.url));
  const originals = join(root, 'art', 'originals');
  const out = join(root, 'public', 'art');
  const report = await processArt({ originals, out, manifest: ART });
  /** @param {string} message */
  const fail = (message) => {
    console.error(message);
    process.exitCode = 1;
  };

  if (report.written.length) {
    console.log('Wrote public/art/:');
    for (const { name, bytes } of report.written) console.log(`  ${name.padEnd(36)} ${kb(bytes).padStart(10)}`);
  } else {
    console.log('No originals processed from art/originals/.');
  }
  if (report.missing.length) {
    console.log(`\nMissing originals (${report.missing.length}), shown as placeholders until added:`);
    for (const name of report.missing) console.log(`  ${name}`);
  }
  if (report.unexpected.length) {
    console.log('\nNot in the manifest, ignored (check the name against docs/art/billabong-prompts.md):');
    for (const name of report.unexpected) console.log(`  ${name}`);
  }
  if (report.leftovers.length) {
    console.log('\nIn public/art/ but made from no manifest file (delete them unless you know why they are there):');
    for (const name of report.leftovers) console.log(`  ${name}`);
  }
  const kept = 'skipped; its earlier outputs in public/art/, if any, were kept.';
  for (const name of report.tooSmall) {
    fail(`${name} is narrower than its smallest output width (${ART_WIDTHS[0]}px for the illustrations), ${kept} Regenerate it at the size in docs/art/billabong-prompts.md.`);
  }
  for (const name of report.wrongShape) {
    fail(`${name} is not the shape docs/art/billabong-prompts.md gives (within 1%), ${kept}`);
  }
  for (const line of report.failed) fail(`Could not process ${line}. Its earlier outputs, if any, were kept.`);

  const sizes = list(out).map((name) => ({ name, bytes: statSync(join(out, name)).size }));
  for (const name of heroOverLimit(sizes)) {
    const { bytes } = sizes.find((s) => s.name === name) ?? { bytes: 0 };
    fail(`${name} is ${kb(bytes)}, over the hero's ${kb(HERO_AVIF_LIMIT)} AVIF budget. Simplify the image or lower its AVIF quality.`);
  }

  const emblem = join(originals, `${ART['logo-emblem'].file}.png`);
  if (report.written.some((w) => w.name.startsWith(`${ART['logo-emblem'].file}-`))) {
    try {
      const icons = await writeIcons(emblem, join(root, 'app'));
      console.log(`\nWrote the browser icons from the logo emblem: ${icons.map((n) => `app/${n}`).join(', ')}.`);
    } catch (err) {
      fail(`Could not write the browser icons from the logo emblem: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // Always written, even after a failure above, so it matches public/art.
  writeFileSync(join(root, 'lib', 'art-ready.json'), `${JSON.stringify(report.ready, null, 2)}\n`);
  const done = Object.values(report.ready).filter(Boolean).length;
  console.log(`\nWrote lib/art-ready.json: ${done} of ${Object.keys(report.ready).length} files ready.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
