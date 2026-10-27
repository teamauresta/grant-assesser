import { describe, it, expect } from 'vitest';
import { BUDGET_BYTES, INFO_PAGES, firstLoadScripts, infoLine, verdict } from '@/scripts/js-size.mjs';

describe('firstLoadScripts', () => {
  it('lists each script under the base path once', () => {
    const html = `<script src="/grant-assesser/_next/static/chunks/a.js"></script>
      <link rel="preload" href="/grant-assesser/_next/static/chunks/b.js">
      <script>self.__next_f.push([1,"/grant-assesser/_next/static/chunks/a.js"])</script>
      <link href="/grant-assesser/_next/static/chunks/c.css">`;
    expect(firstLoadScripts(html)).toEqual(['_next/static/chunks/a.js', '_next/static/chunks/b.js']);
  });

  it('ends each path at .js, so .json and other extensions are never cut short', () => {
    const html = `<link href="/grant-assesser/_next/static/data/x.json">
      <script src="/grant-assesser/_next/static/chunks/q.js?v=1"></script>
      <script>self.__next_f.push([1,"[\\"/grant-assesser/_next/static/chunks/rsc.js\\"]"])</script>
      <script src='/grant-assesser/_next/static/chunks/s.jsx'></script>`;
    expect(firstLoadScripts(html)).toEqual(['_next/static/chunks/q.js', '_next/static/chunks/rsc.js']);
  });

  it('keeps the budget at the pre-Liftoff size plus 40 KiB', () => {
    expect(BUDGET_BYTES).toBe(256_123 + 40 * 1024);
  });
});

describe('verdict', () => {
  it('fails when the page references no scripts, instead of passing on 0 bytes', () => {
    const v = verdict([]);
    expect(v.ok).toBe(false);
    expect(v.message).toMatch(/No first-load scripts/);
  });
  it('passes at the budget and fails one byte over', () => {
    expect(verdict([BUDGET_BYTES - 10, 10])).toMatchObject({ ok: true, message: expect.stringMatching(/within/) });
    expect(verdict([BUDGET_BYTES, 1])).toMatchObject({ ok: false, message: expect.stringMatching(/OVER/) });
  });
});

describe('other pages (information only, no budget)', () => {
  it('reports programs, plan, report and results', () => {
    expect(INFO_PAGES).toEqual(['programs/', 'plan/', 'report/', 'assess/results/']);
  });
  it('prints the total for a page and never fails, however large', () => {
    expect(infoLine('plan/', [1_000, 234])).toBe('/plan/ first-load JS: 1,234 bytes gzipped (information only).');
    expect(infoLine('report/', [BUDGET_BYTES * 2])).toMatch(/^\/report\/ first-load JS: [\d,]+ bytes gzipped \(information only\)\.$/);
  });
  it('says so when a page references no scripts', () => {
    expect(infoLine('programs/', [])).toBe('/programs/ first-load JS: no scripts found (information only).');
  });
});
