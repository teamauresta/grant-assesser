import { describe, it, expect } from 'vitest';
import { BUDGET_BYTES, firstLoadScripts } from '@/scripts/js-size.mjs';

describe('firstLoadScripts', () => {
  it('lists each script under the base path once', () => {
    const html = `<script src="/grant-assesser/_next/static/chunks/a.js"></script>
      <link rel="preload" href="/grant-assesser/_next/static/chunks/b.js">
      <script>self.__next_f.push([1,"/grant-assesser/_next/static/chunks/a.js"])</script>
      <link href="/grant-assesser/_next/static/chunks/c.css">`;
    expect(firstLoadScripts(html)).toEqual(['_next/static/chunks/a.js', '_next/static/chunks/b.js']);
  });

  it('keeps the budget at the pre-Liftoff size plus 40 KiB', () => {
    expect(BUDGET_BYTES).toBe(256_123 + 40 * 1024);
  });
});
