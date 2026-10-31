import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import sharp from 'sharp';
import { afterEach, describe, expect, it } from 'vitest';
import { ART, ART_WIDTHS, artFileName, artFiles, artWidths, type ArtName } from '@/lib/art';
import { HERO_AVIF_LIMIT, heroOverLimit, missing, outputsFor, processArt, readiness, unexpected } from '@/scripts/process-art.mjs';
import committedReady from '@/lib/art-ready.json';

const ROOT = join(import.meta.dirname, '..', '..');

// The artwork (Billabong design doc section 6; docs/art/billabong-prompts.md): 13 images, of which the
// character sheet is not shipped and the two hero dioramas are one light/dark pair.
describe('ART manifest', () => {
  it('lists the eleven shipped assets, with the hero as a day/dusk pair', () => {
    expect(Object.keys(ART)).toHaveLength(11);
    expect(ART['hero-diorama']).toMatchObject({ file: 'hero-diorama-day', dark: 'hero-diorama-dusk', width: 1536, height: 1024 });
    for (const name of Object.keys(ART) as ArtName[]) {
      if (name === 'hero-diorama') continue;
      expect(ART[name]).toMatchObject({ file: name, width: 1024, height: 1024 });
      expect(ART[name].dark).toBeUndefined();
    }
  });

  it('names every file the prompts doc asks for, except the character sheet', () => {
    const doc = readFileSync(join(ROOT, 'docs', 'art', 'billabong-prompts.md'), 'utf8');
    const named = [...doc.matchAll(/\*\*File:\*\* `([a-z-]+)\.png`/g)].map((m) => m[1]).filter((f) => f !== 'platypus-reference');
    expect(artFiles().sort()).toEqual(named.sort());
  });

  it('gives each asset real alt text or marks it decorative with null', () => {
    for (const { alt } of Object.values(ART)) {
      expect(alt === null || alt.trim().length > 0).toBe(true);
    }
    expect(ART['platypus-search'].alt).toMatch(/platypus/i);
    expect(ART['step-plan'].alt).toBeNull();
  });
});

describe('artWidths and artFileName', () => {
  it('keeps each output width not larger than the original', () => {
    expect(ART_WIDTHS).toEqual([480, 960, 1440]);
    expect(artWidths(1536)).toEqual([480, 960, 1440]);
    expect(artWidths(1440)).toEqual([480, 960, 1440]);
    expect(artWidths(1024)).toEqual([480, 960]);
    expect(artWidths(479)).toEqual([]);
  });

  it('names a processed file <file>-<width>.<format>', () => {
    expect(artFileName('platypus-search', 480, 'avif')).toBe('platypus-search-480.avif');
    expect(artFileName('hero-diorama-dusk', 1440, 'webp')).toBe('hero-diorama-dusk-1440.webp');
  });

  it('lists the base files light then dark, in manifest order', () => {
    expect(artFiles().slice(0, 3)).toEqual(['hero-diorama-day', 'hero-diorama-dusk', 'platypus-wave']);
    expect(artFiles()).toHaveLength(12);
  });
});

describe('outputsFor', () => {
  it('gives the AVIF and WebP names at each width', () => {
    expect(outputsFor('platypus-wave', [480, 960])).toEqual([
      { width: 480, avif: 'platypus-wave-480.avif', webp: 'platypus-wave-480.webp' },
      { width: 960, avif: 'platypus-wave-960.avif', webp: 'platypus-wave-960.webp' },
    ]);
    expect(outputsFor('platypus-wave', [])).toEqual([]);
  });
});

describe('missing and unexpected', () => {
  it('lists the originals not yet in art/originals, as PNG names, in manifest order', () => {
    expect(missing(ART, [])).toHaveLength(12);
    expect(missing(ART, []).slice(0, 2)).toEqual(['hero-diorama-day.png', 'hero-diorama-dusk.png']);
    const present = ['hero-diorama-day.png', 'platypus-search.png', '.gitkeep'];
    const left = missing(ART, present);
    expect(left).toHaveLength(10);
    expect(left).not.toContain('hero-diorama-day.png');
    expect(left).toContain('hero-diorama-dusk.png');
  });

  it('lists PNGs the manifest does not name (misspelt, or the character sheet), ignoring other files', () => {
    expect(unexpected(ART, ['platypus-search.png', 'platypus-reference.png', 'Platypus-Wave.png', '.gitkeep', 'notes.txt']))
      .toEqual(['platypus-reference.png', 'Platypus-Wave.png']);
  });
});

describe('readiness', () => {
  it('marks every asset false when no processed files exist', () => {
    const ready = readiness(ART, []);
    expect(Object.keys(ready)).toEqual(artFiles());
    expect(Object.values(ready).every((v) => v === false)).toBe(true);
  });

  it('lists the widths that have both an AVIF and a WebP', () => {
    const files = ['platypus-search-480.avif', 'platypus-search-480.webp', 'platypus-search-960.avif', 'platypus-search-960.webp',
      'step-plan-480.avif', 'hero-diorama-day-1440.webp', 'hero-diorama-day-1440.avif'];
    const ready = readiness(ART, files);
    expect(ready['platypus-search']).toEqual([480, 960]);
    expect(ready['step-plan']).toBe(false); // no WebP partner
    expect(ready['hero-diorama-day']).toEqual([1440]);
    expect(ready['hero-diorama-dusk']).toBe(false);
  });

  // The Art component reads lib/art-ready.json at build time. It must match public/art, so a fresh
  // clone (originals are not committed) builds placeholders or images, never broken image links.
  it('matches the committed lib/art-ready.json to the files in public/art', () => {
    const dir = join(ROOT, 'public', 'art');
    const files = existsSync(dir) ? readdirSync(dir) : [];
    expect(committedReady).toEqual(readiness(ART, files));
  });
});

describe('heroOverLimit', () => {
  it('flags a hero 1440 AVIF over 120KB, and nothing else', () => {
    expect(HERO_AVIF_LIMIT).toBe(120 * 1024);
    const sizes = [
      { name: 'hero-diorama-day-1440.avif', bytes: HERO_AVIF_LIMIT },
      { name: 'hero-diorama-dusk-1440.avif', bytes: HERO_AVIF_LIMIT + 1 },
      { name: 'hero-diorama-dusk-1440.webp', bytes: 500_000 },
      { name: 'hero-diorama-day-960.avif', bytes: 500_000 },
      { name: 'platypus-wave-960.avif', bytes: 500_000 },
    ];
    expect(heroOverLimit(sizes)).toEqual(['hero-diorama-dusk-1440.avif']);
  });

  // The same budget, on what is committed: the script fails over it, and so does this test.
  it('keeps any committed hero 1440 AVIF within the limit', () => {
    const dir = join(ROOT, 'public', 'art');
    const files = existsSync(dir) ? readdirSync(dir) : [];
    const sizes = files.map((name) => ({ name, bytes: statSync(join(dir, name)).size }));
    expect(heroOverLimit(sizes)).toEqual([]);
  });
});

describe('processArt', () => {
  const dirs: string[] = [];
  const temp = () => {
    const dir = mkdtempSync(join(tmpdir(), 'gn-art-'));
    dirs.push(dir);
    return dir;
  };
  afterEach(() => {
    for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
  });

  it('writes nothing and marks nothing ready when there are no originals', async () => {
    const out = temp();
    const report = await processArt({ originals: join(temp(), 'absent'), out, manifest: ART });
    expect(report.written).toEqual([]);
    expect(report.missing).toHaveLength(12);
    expect(report.ready).toEqual(readiness(ART, []));
    expect(readdirSync(out)).toEqual([]);
  });

  it('writes AVIF and WebP at each width not larger than the original, keeping alpha', async () => {
    const originals = temp();
    const out = temp();
    // 600px wide, half transparent: only the 480 width fits.
    await sharp({ create: { width: 600, height: 600, channels: 4, background: { r: 64, g: 128, b: 96, alpha: 0.5 } } })
      .png().toFile(join(originals, 'platypus-search.png'));
    writeFileSync(join(originals, 'platypus-reference.png'), '');
    const report = await processArt({ originals, out, manifest: ART });
    expect(readdirSync(out).sort()).toEqual(['platypus-search-480.avif', 'platypus-search-480.webp']);
    expect(report.written.map((w: { name: string }) => w.name)).toEqual(['platypus-search-480.avif', 'platypus-search-480.webp']);
    expect(report.unexpected).toEqual(['platypus-reference.png']);
    expect(report.missing).not.toContain('platypus-search.png');
    expect(report.ready['platypus-search']).toEqual([480]);
    for (const name of readdirSync(out)) {
      const meta = await sharp(join(out, name)).metadata();
      expect(meta.width).toBe(480);
      expect(meta.hasAlpha).toBe(true);
    }
  });
});
