#!/usr/bin/env node
// Gzipped size of the JavaScript the home page references up front (out/index.html), against a
// budget. Chunks loaded later with import() are not referenced there, so they do not count. Also
// prints the same figure for a few other pages, for information only.
import { readFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

/** Home first-load JS before Liftoff (256,123 bytes on 27 Oct 2026) plus 40 KiB. */
export const BUDGET_BYTES = 256_123 + 40 * 1024;

/**
 * Script paths (relative to out/) referenced anywhere in the page, without duplicates. A path must
 * end at `.js` followed by a quote, `?`, whitespace or a backslash (escaped quotes in the RSC
 * payload), so `.json` or `.jsx` paths are never cut short to `.js`.
 * @param {string} html
 * @returns {string[]}
 */
export function firstLoadScripts(html) {
  return [...new Set([...html.matchAll(/\/grant-assesser\/(_next\/static\/[^"'\s]+?\.js)(?=["'?\s\\])/g)].map((m) => m[1]))];
}

/**
 * The line to print and whether the check passes, from each first-load script's gzipped size.
 * No scripts at all means the page or base path changed, so it fails rather than passing on 0 bytes.
 * @param {number[]} sizes
 * @returns {{ ok: boolean, message: string }}
 */
export function verdict(sizes) {
  if (sizes.length === 0) {
    return { ok: false, message: 'No first-load scripts found in out/index.html. Did the build or the base path change?' };
  }
  const total = sizes.reduce((sum, n) => sum + n, 0);
  const ok = total <= BUDGET_BYTES;
  return {
    ok,
    message: `Home first-load JS: ${total.toLocaleString('en-AU')} bytes gzipped, ${ok ? 'within' : 'OVER'} the ${BUDGET_BYTES.toLocaleString('en-AU')} byte budget.`,
  };
}

/** Other pages whose first-load JS is printed for information. Only the home page has a budget. */
export const INFO_PAGES = ['programs/', 'plan/', 'report/', 'assess/results/'];

/**
 * The information line for one page, from its first-load scripts' gzipped sizes. Never fails.
 * @param {string} page
 * @param {number[]} sizes
 * @returns {string}
 */
export function infoLine(page, sizes) {
  const what = sizes.length
    ? `${sizes.reduce((sum, n) => sum + n, 0).toLocaleString('en-AU')} bytes gzipped`
    : 'no scripts found';
  return `/${page} first-load JS: ${what} (information only).`;
}

function main() {
  const out = join(fileURLToPath(new URL('..', import.meta.url)), 'out');
  /** @param {string} page */
  const sizes = (page) => firstLoadScripts(readFileSync(join(out, page, 'index.html'), 'utf8'))
    .map((path) => gzipSync(readFileSync(join(out, path)), { level: 9 }).length);
  const { ok, message } = verdict(sizes(''));
  if (ok) console.log(message);
  else {
    console.error(message);
    process.exitCode = 1;
  }
  for (const page of INFO_PAGES) console.log(infoLine(page, sizes(page)));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
