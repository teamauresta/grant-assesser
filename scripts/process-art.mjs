#!/usr/bin/env node
// Processes the artwork (Billabong design doc section 6; art/README.md). Reads each original named
// in the manifest (lib/art.ts) from art/originals/<file>.png, writes public/art/<file>-<width>.avif
// and .webp at each width in ART_WIDTHS not larger than the original (alpha kept), then writes
// lib/art-ready.json from what is in public/art, so the Art component renders an image for each
// processed asset and a placeholder for the rest. Missing originals are listed, never errors.
// Fails if a hero diorama's 1440px AVIF is over 120KB.
import { existsSync, mkdirSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { ART, ART_FORMATS, ART_WIDTHS, artFileName, artFiles, artWidths } from '../lib/art.ts';

/** The hero's AVIF budget at its largest width (design doc section 6: about 120KB). */
export const HERO_AVIF_LIMIT = 120 * 1024;

const HERO_FILES = [ART['hero-diorama'].file, ART['hero-diorama'].dark];

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
 * What lib/art-ready.json holds: for each base file, the widths with both an AVIF and a WebP among
 * `files` (the names in public/art), or false when there are none.
 * @param {Record<string, import('../lib/art.ts').ArtAsset>} manifest
 * @param {readonly string[]} files
 * @returns {Record<string, false | number[]>}
 */
export function readiness(manifest, files) {
  const present = new Set(files);
  return Object.fromEntries(artFiles(manifest).map((file) => {
    const widths = outputsFor(file, ART_WIDTHS).filter((o) => present.has(o.avif) && present.has(o.webp)).map((o) => o.width);
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

/** @param {string} dir */
const list = (dir) => (existsSync(dir) ? readdirSync(dir) : []);

/**
 * Processes every original present in `originals` into `out` and reports what it did. Earlier
 * outputs of a processed file are removed first, so a smaller replacement leaves no stale width.
 * @param {{ originals: string, out: string, manifest: Record<string, import('../lib/art.ts').ArtAsset> }} options
 */
export async function processArt({ originals, out, manifest }) {
  const sources = list(originals);
  const { default: sharp } = await import('sharp');
  /** @type {{ name: string, width: number, bytes: number }[]} */
  const written = [];
  /** @type {string[]} */
  const tooSmall = [];
  for (const file of artFiles(manifest)) {
    const source = `${file}.png`;
    if (!sources.includes(source)) continue;
    const input = join(originals, source);
    const { width = 0 } = await sharp(input).metadata();
    const widths = artWidths(width);
    if (widths.length === 0) {
      tooSmall.push(source);
      continue;
    }
    mkdirSync(out, { recursive: true });
    for (const old of outputsFor(file, ART_WIDTHS)) {
      for (const format of ART_FORMATS) rmSync(join(out, old[format]), { force: true });
    }
    for (const o of outputsFor(file, widths)) {
      const resized = () => sharp(input).resize({ width: o.width });
      await resized().avif({ quality: 55 }).toFile(join(out, o.avif));
      await resized().webp({ quality: 78 }).toFile(join(out, o.webp));
      for (const name of [o.avif, o.webp]) written.push({ name, width: o.width, bytes: statSync(join(out, name)).size });
    }
  }
  return {
    written,
    tooSmall,
    missing: missing(manifest, sources),
    unexpected: unexpected(manifest, sources),
    ready: readiness(manifest, list(out)),
  };
}

/** @param {number} bytes */
const kb = (bytes) => `${(bytes / 1024).toFixed(1)} KB`;

async function main() {
  const root = fileURLToPath(new URL('..', import.meta.url));
  const originals = join(root, 'art', 'originals');
  const out = join(root, 'public', 'art');
  const report = await processArt({ originals, out, manifest: ART });

  if (report.written.length) {
    console.log('Wrote public/art/:');
    for (const { name, bytes } of report.written) console.log(`  ${name.padEnd(36)} ${kb(bytes).padStart(10)}`);
  } else {
    console.log('No originals to process in art/originals/.');
  }
  if (report.missing.length) {
    console.log(`\nMissing originals (${report.missing.length}), shown as placeholders until added:`);
    for (const name of report.missing) console.log(`  ${name}`);
  }
  if (report.unexpected.length) {
    console.log('\nNot in the manifest, ignored (check the name against docs/art/billabong-prompts.md):');
    for (const name of report.unexpected) console.log(`  ${name}`);
  }
  for (const name of report.tooSmall) {
    console.error(`${name} is narrower than ${ART_WIDTHS[0]}px; regenerate it at the size in docs/art/billabong-prompts.md.`);
    process.exitCode = 1;
  }

  writeFileSync(join(root, 'lib', 'art-ready.json'), `${JSON.stringify(report.ready, null, 2)}\n`);
  const done = Object.values(report.ready).filter(Boolean).length;
  console.log(`\nWrote lib/art-ready.json: ${done} of ${Object.keys(report.ready).length} files ready.`);

  const sizes = list(out).map((name) => ({ name, bytes: statSync(join(out, name)).size }));
  for (const name of heroOverLimit(sizes)) {
    const { bytes } = sizes.find((s) => s.name === name) ?? { bytes: 0 };
    console.error(`${name} is ${kb(bytes)}, over the hero's ${kb(HERO_AVIF_LIMIT)} AVIF budget. Simplify the image or lower its AVIF quality.`);
    process.exitCode = 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
