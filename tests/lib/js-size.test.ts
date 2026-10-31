import { describe, it, expect } from 'vitest';
import { BUDGET_BYTES, INFO_PAGES, LAZY_ONLY, chunkFiles, firstLoadScripts, infoLine, lazyLeaks, missingMarkers, verdict } from '@/scripts/js-size.mjs';

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
  // Settings and the wizard too: they share only the layout's chunks with home, so they show what the
  // layout alone ships (the review of the sage icons found the art manifest there).
  it('reports programs, plan, report, results, settings and the wizard', () => {
    expect(INFO_PAGES).toEqual(['programs/', 'plan/', 'report/', 'assess/results/', 'settings/', 'assess/']);
  });
  it('prints the total for a page and never fails, however large', () => {
    expect(infoLine('plan/', [1_000, 234])).toBe('/plan/ first-load JS: 1,234 bytes gzipped (information only).');
    expect(infoLine('report/', [BUDGET_BYTES * 2])).toMatch(/^\/report\/ first-load JS: [\d,]+ bytes gzipped \(information only\)\.$/);
  });
  it('says so when a page references no scripts', () => {
    expect(infoLine('programs/', [])).toBe('/programs/ first-load JS: no scripts found (information only).');
  });
});

describe('lazyLeaks', () => {
  // The aurora shader's marker (gl_FragColor) went with the contour hero (Billabong design doc
  // sections 5 and 8; section 11, Task 11). The check now guards the remaining code that must load
  // with import() only (CLAUDE.md, Bundle): canvas-confetti, the PDF renderer and the sorting
  // story's checks.
  it('guards confetti, the PDF renderer and the sorting story checks, and no longer the shader', () => {
    expect(LAZY_ONLY).toEqual(['__confetti_initialized', 'react-pdf', 'DEMO_PROFILE']);
    expect(LAZY_ONLY).not.toContain('gl_FragColor');
  });
  it('names each first-load chunk that contains a lazy-only marker, and nothing when clean', () => {
    const FIXTURE = 'lazy-only-fixture-marker';
    const chunks = [
      { path: 'a.js', source: 'console.log(1)' },
      { path: 'b.js', source: `const s = "${FIXTURE}"` },
    ];
    expect(lazyLeaks(chunks, [FIXTURE])).toEqual([{ path: 'b.js', marker: FIXTURE }]);
    expect(lazyLeaks(chunks.slice(0, 1), [FIXTURE])).toEqual([]);
  });
  it('checks LAZY_ONLY by default, every marker in every chunk', () => {
    const chunks = [
      { path: 'a.js', source: 'console.log(1)' },
      { path: 'b.js', source: 'x.__confetti_initialized=!0;e.s(["DEMO_PROFILE",0,n])' },
    ];
    expect(lazyLeaks(chunks)).toEqual([{ path: 'b.js', marker: '__confetti_initialized' }, { path: 'b.js', marker: 'DEMO_PROFILE' }]);
  });
});

// A canary for LAZY_ONLY: a marker that is in no chunk at all (a library renamed its flag, an export
// was renamed) would let the leak check pass on nothing, so `pnpm size` fails and asks for a new one.
describe('missingMarkers', () => {
  const FIXTURE = 'lazy-only-fixture-marker';
  const chunks = [
    { path: 'a.js', source: 'console.log(1)' },
    { path: 'lazy/b.js', source: `const s = "${FIXTURE}"` },
  ];
  it('names each marker found in no chunk, with a message saying what to do', () => {
    expect(missingMarkers(chunks, [FIXTURE, 'gone-marker'])).toEqual([
      { marker: 'gone-marker', message: 'Marker "gone-marker" not found in any chunk; LAZY_ONLY needs a new marker.' },
    ]);
  });
  it('is empty when every marker is in some chunk, first-load or lazy', () => {
    expect(missingMarkers(chunks, [FIXTURE])).toEqual([]);
    expect(missingMarkers([], [])).toEqual([]);
  });
  it('treats no chunks at all as every marker missing', () => {
    expect(missingMarkers([], [FIXTURE]).map((m) => m.marker)).toEqual([FIXTURE]);
  });
});

describe('chunkFiles', () => {
  it('lists every .js file under a folder, nested folders included, as paths relative to it', () => {
    const list = (dir: string) => (dir === '/o' ? ['a.js', 'b.css', 'sub', 'sub/c.js', 'sub/d.json', 'e.js.map'] : []);
    expect(chunkFiles('/o', list)).toEqual(['a.js', 'sub/c.js']);
  });
});
