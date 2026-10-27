#!/usr/bin/env node
// Gzipped size of the JavaScript the home page references up front (out/index.html), against a
// budget. Chunks loaded later with import() are not referenced there, so they do not count.
import { readFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

/** Home first-load JS before Liftoff (256,123 bytes on 27 Oct 2026) plus 40 KiB. */
export const BUDGET_BYTES = 256_123 + 40 * 1024;

/**
 * Script paths (relative to out/) referenced anywhere in the page, without duplicates.
 * @param {string} html
 * @returns {string[]}
 */
export function firstLoadScripts(html) {
  return [...new Set([...html.matchAll(/\/grant-assesser\/(_next\/static\/[^"'\s]+?\.js)/g)].map((m) => m[1]))];
}

function main() {
  const out = join(fileURLToPath(new URL('..', import.meta.url)), 'out');
  const scripts = firstLoadScripts(readFileSync(join(out, 'index.html'), 'utf8'));
  const total = scripts.reduce((sum, path) => sum + gzipSync(readFileSync(join(out, path)), { level: 9 }).length, 0);
  const verdict = total <= BUDGET_BYTES ? 'within' : 'OVER';
  console.log(`Home first-load JS: ${total.toLocaleString('en-AU')} bytes gzipped, ${verdict} the ${BUDGET_BYTES.toLocaleString('en-AU')} byte budget.`);
  if (total > BUDGET_BYTES) process.exitCode = 1;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main();
