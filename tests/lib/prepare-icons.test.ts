import { existsSync, mkdtempSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import sharp from 'sharp';
import { afterEach, describe, expect, it } from 'vitest';
import { ICON_NAMES, ICON_ORIGINAL_SIZE } from '@/lib/art';
import { NAVIGATION_ICONS, SHADOW_ICONS, alphaBounds, iconPlacement, normaliseIcon, prepareIcons } from '@/scripts/prepare-icons.mjs';

type Raw = { data: Buffer; width: number; height: number };

/** A raw RGBA image from an SVG drawn on a transparent canvas. */
async function raw(width: number, height: number, svg: string): Promise<Raw> {
  const { data, info } = await sharp({ create: { width, height, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">${svg}</svg>`) }])
    .raw().toBuffer({ resolveWithObject: true });
  return { data, width: info.width, height: info.height };
}

const px = (img: Raw, x: number, y: number) => [...img.data.subarray((y * img.width + x) * 4, (y * img.width + x) * 4 + 4)];

const dirs: string[] = [];
const temp = () => {
  const dir = mkdtempSync(join(tmpdir(), 'gn-icons-'));
  dirs.push(dir);
  return dir;
};
afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

// The owner's icons (design doc section 11, Icons landed and Icons regenerated): sixteen from
// Sage_Icons_16_Shadow/ under their own names and ten from Sage_Navigation_24_Individual/ under the
// owner's names, together exactly the manifest's icons. (The navigation sheet, with its glow removal
// and cell detection, is no longer a source: the owner redrew its icons as single files.)
describe('the icon sources', () => {
  it('takes every manifest icon from exactly one source', () => {
    const navigation: string[] = Object.values(NAVIGATION_ICONS);
    expect([...SHADOW_ICONS, ...navigation].sort()).toEqual([...ICON_NAMES].sort());
    expect(SHADOW_ICONS).toHaveLength(16);
    expect(navigation).toHaveLength(10);
    expect(SHADOW_ICONS.filter((n: string) => navigation.includes(n))).toEqual([]);
  });

  it('maps the owner navigation file names to the manifest names', () => {
    expect(NAVIGATION_ICONS).toEqual({
      'icon-dashboard.png': 'grid', 'icon-profile.png': 'person', 'icon-calendar.png': 'calendar',
      'icon-tasks.png': 'checklist', 'icon-files.png': 'folder', 'icon-download.png': 'download',
      'icon-reports.png': 'report', 'icon-integrations.png': 'link', 'icon-security.png': 'lock',
      'icon-help.png': 'question',
    });
  });
});

describe('alphaBounds', () => {
  it('finds the box of pixels above the alpha threshold, or null', async () => {
    const img = await raw(100, 80, '<rect x="10" y="20" width="30" height="40" fill="#000"/><rect x="60" y="5" width="4" height="4" fill="#000" fill-opacity="0.2"/>');
    expect(alphaBounds(img, 128)).toEqual({ left: 10, top: 20, width: 30, height: 40 });
    expect(alphaBounds(img, 16)).toEqual({ left: 10, top: 5, width: 54, height: 55 });
    expect(alphaBounds(await raw(10, 10, ''), 0)).toBeNull();
  });
});

describe('iconPlacement', () => {
  it('fills 80% of the square for a square icon, centred', () => {
    expect(iconPlacement({ left: 0, top: 0, width: 1000, height: 1000 }, 512)).toEqual({ width: 410, height: 410, left: 51, top: 51 });
  });

  // Wide icons (the ticket, the banknote) would look small at the square ones' size: they grow to 90%
  // of the square on their long side, so they read at the same optical size.
  it('lets a wide or tall icon grow to 90% on its long side, never further', () => {
    const wide = iconPlacement({ left: 0, top: 0, width: 1036, height: 532 }, 512);
    expect(wide.width).toBe(461);
    expect(wide.height).toBe(237);
    expect(wide.left).toBe(26);
    expect(wide.top).toBe(Math.round((512 - 237) / 2));
    const tall = iconPlacement({ left: 0, top: 0, width: 791, height: 1022 }, 512);
    expect(tall.height).toBe(461);
    // A slightly oblong icon stays under 90% by area.
    const near = iconPlacement({ left: 0, top: 0, width: 985, height: 959 }, 512);
    expect(Math.max(near.width, near.height)).toBeLessThan(461);
  });
});

describe('normaliseIcon', () => {
  it('trims an off-centre icon and centres it on a transparent square of ICON_ORIGINAL_SIZE', async () => {
    const img = await raw(1254, 1254, '<rect x="700" y="100" width="500" height="250" fill="#6f8f6a"/>');
    const out = await normaliseIcon(img);
    expect([out.width, out.height]).toEqual([ICON_ORIGINAL_SIZE, ICON_ORIGINAL_SIZE]);
    const box = alphaBounds(out, 128)!;
    expect(Math.abs(box.left + box.width / 2 - ICON_ORIGINAL_SIZE / 2)).toBeLessThanOrEqual(1);
    expect(Math.abs(box.top + box.height / 2 - ICON_ORIGINAL_SIZE / 2)).toBeLessThanOrEqual(1);
    expect(Math.abs(box.width - 461)).toBeLessThanOrEqual(1);
    expect(px(out, 0, 0)[3]).toBe(0);
  });

  it('keeps a faint shadow inside the square, so nothing is cut at its edge', async () => {
    const img = await raw(1254, 1254, '<rect x="130" y="380" width="1030" height="530" fill="#6f8f6a"/><rect x="146" y="396" width="1030" height="530" fill="#000" fill-opacity="0.1"/>');
    const out = await normaliseIcon(img);
    for (let i = 0; i < ICON_ORIGINAL_SIZE; i++) {
      for (const [x, y] of [[i, 0], [i, ICON_ORIGINAL_SIZE - 1], [0, i], [ICON_ORIGINAL_SIZE - 1, i]]) expect(px(out, x, y)[3]).toBe(0);
    }
  });
});

describe('prepareIcons', () => {
  /** A 1254px transparent square with one off-centre sage disc, like the owner's files. */
  const icon = (path: string) => sharp({ create: { width: 1254, height: 1254, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="1254" height="1254"><circle cx="500" cy="700" r="300" fill="#6f8f6a"/></svg>') }])
    .png().toFile(path);

  it('writes each icon it has a source for as a square PNG under its manifest name, and lists the rest', async () => {
    const shadow = temp();
    const navigation = temp();
    const out = temp();
    await icon(join(shadow, 'icon-rocket.png'));
    await icon(join(navigation, 'icon-dashboard.png'));
    await icon(join(navigation, 'icon-help.png'));
    // One of the owner's unused navigation icons: not in the map, so not prepared.
    await icon(join(navigation, 'icon-team.png'));

    const report = await prepareIcons({ shadowDir: shadow, navigationDir: navigation, out });
    const expected = ['icon-grid.png', 'icon-question.png', 'icon-rocket.png'];
    expect([...report.written].sort()).toEqual(expected);
    expect(readdirSync(out).sort()).toEqual(expected);
    expect(report.missing).toHaveLength(ICON_NAMES.length - 3);
    expect(report.missing).toContain('icon-person.png');
    expect(report.missing).not.toContain('icon-grid.png');
    for (const name of expected) {
      const meta = await sharp(join(out, name)).metadata();
      expect([meta.width, meta.height, meta.hasAlpha]).toEqual([ICON_ORIGINAL_SIZE, ICON_ORIGINAL_SIZE, true]);
    }
  });

  it('writes nothing when the owner files are absent', async () => {
    const out = temp();
    const report = await prepareIcons({ shadowDir: join(temp(), 'absent'), navigationDir: join(temp(), 'absent'), out });
    expect(report.written).toEqual([]);
    expect(report.missing).toHaveLength(ICON_NAMES.length);
    expect(existsSync(out) ? readdirSync(out) : []).toEqual([]);
  });
});
