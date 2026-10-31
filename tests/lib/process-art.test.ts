import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import sharp from 'sharp';
import { afterEach, describe, expect, it } from 'vitest';
import { ART, ART_WIDTHS, LOGO_WIDTHS, artFileName, artFiles, artWidths, assetWidths, type ArtName } from '@/lib/art';
import { APPLE_ICON_BACKGROUND, HERO_AVIF_LIMIT, avifQuality, heroOverLimit, leftovers, missing, outputsFor, processArt, readiness, shapeMatches, unexpected, writeIcons } from '@/scripts/process-art.mjs';
import committedReady from '@/lib/art-ready.json';

const ROOT = join(import.meta.dirname, '..', '..');

// The artwork (Billabong design doc section 6; docs/art/billabong-prompts.md): 13 images, of which the
// character sheet is not shipped and the two hero dioramas are one light/dark pair, plus the logo
// emblem cropped from the owner's lockup (design doc section 11, Art landed: a twelfth asset).
describe('ART manifest', () => {
  it('lists the eleven illustrations and the logo emblem, with the hero as a day/dusk pair', () => {
    expect(Object.keys(ART)).toHaveLength(12);
    expect(ART['hero-diorama']).toMatchObject({ file: 'hero-diorama-day', dark: 'hero-diorama-dusk', width: 1536, height: 1024 });
    for (const name of Object.keys(ART) as ArtName[]) {
      if (name === 'hero-diorama' || name === 'logo-emblem') continue;
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

  // The logo sits beside the live "Grant Navigator" text, so it is decorative; it shows at 32px, so
  // its widths are 1x to 4x of that, not the illustrations' 480 to 1440.
  it('lists the logo emblem as a decorative square with logo-sized widths', () => {
    expect(ART['logo-emblem']).toMatchObject({ file: 'logo-emblem', alt: null, widths: LOGO_WIDTHS });
    expect(ART['logo-emblem'].width).toBe(ART['logo-emblem'].height);
    expect(ART['logo-emblem'].width).toBeGreaterThanOrEqual(512);
    expect(LOGO_WIDTHS).toEqual([32, 64, 128]);
    expect(ART['logo-emblem'].dark).toBeUndefined();
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

  it('uses an asset own widths when it lists them, else ART_WIDTHS', () => {
    expect(assetWidths(ART['platypus-search'])).toEqual(ART_WIDTHS);
    expect(assetWidths(ART['logo-emblem'])).toEqual([32, 64, 128]);
    expect(artWidths(668, LOGO_WIDTHS)).toEqual([32, 64, 128]);
    expect(artWidths(100, LOGO_WIDTHS)).toEqual([32, 64]);
    expect(artWidths(20, LOGO_WIDTHS)).toEqual([]);
  });

  it('names a processed file <file>-<width>.<format>', () => {
    expect(artFileName('platypus-search', 480, 'avif')).toBe('platypus-search-480.avif');
    expect(artFileName('hero-diorama-dusk', 1440, 'webp')).toBe('hero-diorama-dusk-1440.webp');
  });

  it('lists the base files light then dark, in manifest order', () => {
    expect(artFiles().slice(0, 3)).toEqual(['hero-diorama-day', 'hero-diorama-dusk', 'platypus-wave']);
    expect(artFiles()).toHaveLength(13);
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
    expect(missing(ART, [])).toHaveLength(13);
    expect(missing(ART, []).slice(0, 2)).toEqual(['hero-diorama-day.png', 'hero-diorama-dusk.png']);
    const present = ['hero-diorama-day.png', 'platypus-search.png', '.gitkeep'];
    const left = missing(ART, present);
    expect(left).toHaveLength(11);
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

  it('reads the logo emblem at its own widths', () => {
    const files = ['logo-emblem-64.avif', 'logo-emblem-64.webp', 'logo-emblem-480.avif', 'logo-emblem-480.webp'];
    expect(readiness(ART, files)['logo-emblem']).toEqual([64]);
  });

  // The Art component reads lib/art-ready.json at build time. It must match public/art, so a fresh
  // clone (originals are not committed) builds placeholders or images, never broken image links.
  it('matches the committed lib/art-ready.json to the files in public/art', () => {
    const dir = join(ROOT, 'public', 'art');
    const files = existsSync(dir) ? readdirSync(dir) : [];
    expect(committedReady).toEqual(readiness(ART, files));
  });
});

describe('shapeMatches', () => {
  it('accepts an original within 1% of the asset aspect ratio, and nothing further off', () => {
    const hero = ART['hero-diorama'];
    expect(shapeMatches(1536, 1024, hero)).toBe(true);
    expect(shapeMatches(3072, 2048, hero)).toBe(true);
    expect(shapeMatches(1536, 1030, hero)).toBe(true); // 0.6% off
    expect(shapeMatches(1024, 1024, hero)).toBe(false);
    expect(shapeMatches(1024, 1024, ART['platypus-wave'])).toBe(true);
    expect(shapeMatches(1024, 1040, ART['platypus-wave'])).toBe(false); // 1.5% off
    expect(shapeMatches(1024, 1536, ART['platypus-wave'])).toBe(false);
  });
});

describe('leftovers', () => {
  it('lists public/art files no manifest file produces, ignoring dotfiles', () => {
    const files = ['platypus-search-480.avif', 'platypus-search-480.webp', 'hero-diorama-dusk-1440.avif',
      'old-mascot-480.avif', 'platypus-search-1200.webp', 'platypus-search.png', '.DS_Store'];
    expect(leftovers(ART, files)).toEqual(['old-mascot-480.avif', 'platypus-search-1200.webp', 'platypus-search.png']);
  });

  it('expects the logo emblem only at its own widths', () => {
    expect(leftovers(ART, ['logo-emblem-32.avif', 'logo-emblem-128.webp', 'logo-emblem-480.avif', 'platypus-search-64.avif']))
      .toEqual(['logo-emblem-480.avif', 'platypus-search-64.avif']);
  });

  // An interrupted run (Ctrl-C) leaves its temporary folder behind (Task 10 review): it is a dotfile
  // but still a leftover, so the committed-files check below and `pnpm art` both report it.
  it('flags a stale .tmp-<file> folder, though it is a dotfile', () => {
    expect(leftovers(ART, ['.tmp-platypus-search', '.DS_Store', 'platypus-search-480.avif'])).toEqual(['.tmp-platypus-search']);
  });

  it('finds none among the committed files in public/art', () => {
    const dir = join(ROOT, 'public', 'art');
    expect(leftovers(ART, existsSync(dir) ? readdirSync(dir) : [])).toEqual([]);
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

// The real dioramas (Art landed, design doc section 11) came out at about 154KB at the default AVIF
// quality 55, over the hero budget; at 45 they are about 114KB with no visible loss at 1440px.
describe('avifQuality', () => {
  it('encodes the hero dioramas at 45 and everything else at 55', () => {
    expect(avifQuality('hero-diorama-day')).toBe(45);
    expect(avifQuality('hero-diorama-dusk')).toBe(45);
    expect(avifQuality('platypus-search')).toBe(55);
    expect(avifQuality('prop-stamp')).toBe(55);
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
    expect(report.failed).toEqual([]);
    expect(report.wrongShape).toEqual([]);
    expect(report.leftovers).toEqual([]);
    expect(report.missing).toHaveLength(13);
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

  const png = (path: string, width: number, height: number) =>
    sharp({ create: { width, height, channels: 4, background: { r: 64, g: 128, b: 96, alpha: 0.5 } } }).png().toFile(path);

  it('skips an original of the wrong shape, keeping its earlier outputs', async () => {
    const originals = temp();
    const out = temp();
    writeFileSync(join(out, 'platypus-search-480.avif'), 'old');
    writeFileSync(join(out, 'platypus-search-480.webp'), 'old');
    await png(join(originals, 'platypus-search.png'), 900, 600);
    const report = await processArt({ originals, out, manifest: ART });
    expect(report.wrongShape).toEqual(['platypus-search.png']);
    expect(report.written).toEqual([]);
    expect(readFileSync(join(out, 'platypus-search-480.avif'), 'utf8')).toBe('old');
    expect(report.ready['platypus-search']).toEqual([480]);
  });

  it('skips an original narrower than the smallest width, keeping its earlier outputs', async () => {
    const originals = temp();
    const out = temp();
    writeFileSync(join(out, 'platypus-search-480.avif'), 'old');
    writeFileSync(join(out, 'platypus-search-480.webp'), 'old');
    await png(join(originals, 'platypus-search.png'), 300, 300);
    const report = await processArt({ originals, out, manifest: ART });
    expect(report.tooSmall).toEqual(['platypus-search.png']);
    expect(readdirSync(out).sort()).toEqual(['platypus-search-480.avif', 'platypus-search-480.webp']);
    expect(report.ready['platypus-search']).toEqual([480]);
  });

  it('reports an unreadable original and carries on with the rest, keeping its earlier outputs', async () => {
    const originals = temp();
    const out = temp();
    writeFileSync(join(out, 'platypus-wave-480.avif'), 'old');
    writeFileSync(join(out, 'platypus-wave-480.webp'), 'old');
    writeFileSync(join(originals, 'platypus-wave.png'), 'not a png');
    await png(join(originals, 'platypus-search.png'), 600, 600);
    const report = await processArt({ originals, out, manifest: ART });
    expect(report.failed).toHaveLength(1);
    expect(report.failed[0]).toMatch(/^platypus-wave\.png: \S/);
    expect(report.written.map((w: { name: string }) => w.name)).toEqual(['platypus-search-480.avif', 'platypus-search-480.webp']);
    expect(report.ready['platypus-wave']).toEqual([480]);
    expect(report.ready['platypus-search']).toEqual([480]);
    // No temporary files are left behind.
    expect(readdirSync(out).sort()).toEqual(['platypus-search-480.avif', 'platypus-search-480.webp', 'platypus-wave-480.avif', 'platypus-wave-480.webp']);
  });

  // A failure while encoding, after the file's temporary folder exists (Task 10 review): the PNG's
  // header reads, so the size and shape checks pass, but its pixel data is cut off.
  it('reports a failure during encoding, keeping earlier outputs and removing its temporary folder', async () => {
    const originals = temp();
    const out = temp();
    writeFileSync(join(out, 'platypus-search-480.avif'), 'old');
    writeFileSync(join(out, 'platypus-search-480.webp'), 'old');
    const full = join(temp(), 'full.png');
    await sharp({ create: { width: 600, height: 600, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 1 }, noise: { type: 'gaussian', mean: 128, sigma: 40 } } }).png().toFile(full);
    const bytes = readFileSync(full);
    writeFileSync(join(originals, 'platypus-search.png'), bytes.subarray(0, Math.floor(bytes.length / 2)));
    expect((await sharp(join(originals, 'platypus-search.png')).metadata()).width).toBe(600);
    const report = await processArt({ originals, out, manifest: ART });
    expect(report.failed).toHaveLength(1);
    expect(report.failed[0]).toMatch(/^platypus-search\.png: \S/);
    expect(report.written).toEqual([]);
    expect(readdirSync(out).sort()).toEqual(['platypus-search-480.avif', 'platypus-search-480.webp']);
    expect(readFileSync(join(out, 'platypus-search-480.avif'), 'utf8')).toBe('old');
    expect(report.leftovers).toEqual([]);
  });

  it('deletes stale temporary folders from an interrupted run before it starts', async () => {
    const out = temp();
    mkdirSync(join(out, '.tmp-platypus-search'));
    writeFileSync(join(out, '.tmp-platypus-search', 'platypus-search-480.avif'), 'half');
    mkdirSync(join(out, '.tmp-gone'));
    writeFileSync(join(out, '.keep'), '');
    const report = await processArt({ originals: join(temp(), 'absent'), out, manifest: ART });
    expect(readdirSync(out)).toEqual(['.keep']);
    expect(report.leftovers).toEqual([]);
  });

  it('writes the logo emblem at its own widths, keeping alpha', async () => {
    const originals = temp();
    const out = temp();
    await png(join(originals, 'logo-emblem.png'), 600, 600);
    const report = await processArt({ originals, out, manifest: ART });
    expect(report.tooSmall).toEqual([]);
    expect(readdirSync(out).sort()).toEqual(['logo-emblem-128.avif', 'logo-emblem-128.webp', 'logo-emblem-32.avif',
      'logo-emblem-32.webp', 'logo-emblem-64.avif', 'logo-emblem-64.webp']);
    expect(report.ready['logo-emblem']).toEqual([32, 64, 128]);
    const meta = await sharp(join(out, 'logo-emblem-64.webp')).metadata();
    expect(meta.width).toBe(64);
    expect(meta.hasAlpha).toBe(true);
  });

  it('replaces every earlier output of a reprocessed file, so no stale width stays', async () => {
    const originals = temp();
    const out = temp();
    mkdirSync(out, { recursive: true });
    for (const name of ['platypus-search-960.avif', 'platypus-search-960.webp']) writeFileSync(join(out, name), 'old');
    await png(join(originals, 'platypus-search.png'), 600, 600);
    const report = await processArt({ originals, out, manifest: ART });
    expect(readdirSync(out).sort()).toEqual(['platypus-search-480.avif', 'platypus-search-480.webp']);
    expect(report.ready['platypus-search']).toEqual([480]);
  });
});

// The browser icons come from the logo emblem (design doc section 11, Art landed): Next's app-dir file
// conventions emit their <link> tags under the base path. The tab icon keeps the emblem's
// transparency; the home-screen icon is opaque (iOS fills transparency with black).
describe('writeIcons', () => {
  const dirs: string[] = [];
  afterEach(() => {
    for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
  });

  it('writes a 192px transparent icon.png and a 180px opaque apple-icon.png from the emblem', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'gn-icons-'));
    dirs.push(dir);
    const emblem = join(dir, 'logo-emblem.png');
    await sharp({ create: { width: 668, height: 668, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
      .composite([{ input: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="668" height="668"><circle cx="334" cy="334" r="300" fill="#1f5c4a"/></svg>') }])
      .png().toFile(emblem);
    const app = join(dir, 'app');
    mkdirSync(app);
    const written = await writeIcons(emblem, app);
    expect(written.sort()).toEqual(['apple-icon.png', 'icon.png']);

    const icon = await sharp(join(app, 'icon.png')).metadata();
    expect([icon.width, icon.height, icon.hasAlpha]).toEqual([192, 192, true]);
    const corner = await sharp(join(app, 'icon.png')).extract({ left: 0, top: 0, width: 1, height: 1 }).raw().toBuffer();
    expect(corner[3]).toBe(0);

    const apple = await sharp(join(app, 'apple-icon.png')).metadata();
    expect([apple.width, apple.height, apple.hasAlpha]).toEqual([180, 180, false]);
    const appleCorner = await sharp(join(app, 'apple-icon.png')).extract({ left: 0, top: 0, width: 1, height: 1 }).raw().toBuffer();
    const hex = `#${[...appleCorner.subarray(0, 3)].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
    expect(hex).toBe(APPLE_ICON_BACKGROUND);
  });
});

// The committed icons are the ones writeIcons makes; the old SVG compass icon is gone with the
// compass mark (design doc section 11, Art landed), so it cannot win over the PNG.
it('ships the PNG icons and no SVG icon in app/', () => {
  expect(existsSync(join(ROOT, 'app', 'icon.png'))).toBe(true);
  expect(existsSync(join(ROOT, 'app', 'apple-icon.png'))).toBe(true);
  expect(existsSync(join(ROOT, 'app', 'icon.svg'))).toBe(false);
});
