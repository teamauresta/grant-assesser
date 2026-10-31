import { existsSync, mkdtempSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import sharp from 'sharp';
import { afterEach, describe, expect, it } from 'vitest';
import { ICON_NAMES, ICON_ORIGINAL_SIZE } from '@/lib/art';
import {
  FOLDER_ICONS, SHEET_ICONS, alphaBounds, iconPlacement, normaliseIcon, prepareIcons, removeGlow, sheetGrid,
} from '@/scripts/prepare-icons.mjs';

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

// The owner's icons (design doc section 11, Icons landed): sixteen single files and ten cells cut from
// the navigation sheet, together exactly the manifest's icons.
describe('the icon sources', () => {
  it('takes every manifest icon from exactly one source', () => {
    const fromSheet = Object.keys(SHEET_ICONS);
    expect([...FOLDER_ICONS, ...fromSheet].sort()).toEqual([...ICON_NAMES].sort());
    expect(FOLDER_ICONS).toHaveLength(16);
    expect(fromSheet).toHaveLength(10);
    expect(FOLDER_ICONS.filter((n: string) => fromSheet.includes(n))).toEqual([]);
  });

  it('cuts the sheet cells the owner named (row, column)', () => {
    expect(SHEET_ICONS).toEqual({
      grid: [0, 0], person: [0, 1], calendar: [1, 0], checklist: [1, 1], folder: [1, 2], download: [1, 5],
      report: [2, 3], link: [2, 4], lock: [2, 5], question: [3, 1],
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

describe('sheetGrid', () => {
  it('finds the columns and rows from the alpha, splitting the gaps between them', async () => {
    // Three columns and two rows of squares, unevenly placed.
    const squares = [[20, 30], [230, 30], [420, 30], [20, 220], [230, 220], [420, 220]]
      .map(([x, y]) => `<rect x="${x}" y="${y}" width="140" height="140" fill="#000"/>`).join('');
    const grid = sheetGrid(await raw(600, 400, squares));
    expect(grid.columns).toHaveLength(3);
    expect(grid.rows).toHaveLength(2);
    // Cells tile the sheet: each starts where the last ended, and the gaps are split at their middle.
    expect(grid.columns[0][0]).toBe(0);
    expect(grid.columns[2][1]).toBe(600);
    expect(grid.columns[1][0]).toBe(grid.columns[0][1]);
    expect(grid.columns[0][1]).toBe(Math.round((160 + 230) / 2));
    expect(grid.rows).toEqual([[0, Math.round((170 + 220) / 2)], [Math.round((170 + 220) / 2), 400]]);
  });
});

// The sheet's icons carry a dark glow baked into their alpha, outside a cream outline (design doc
// section 11, Icons landed). Only the icon may stay: no grey halo on either theme.
describe('removeGlow', () => {
  // A sage square in a cream outline, a hole in it, and a dark green glow all round and in the hole.
  const glowing = () => raw(120, 120, [
    '<rect x="0" y="0" width="120" height="120" fill="#2f3b2a"/>',
    '<rect x="20" y="20" width="80" height="80" rx="8" fill="#b9c8a8" stroke="#f4f1e2" stroke-width="6"/>',
    '<rect x="50" y="50" width="20" height="20" fill="#f4f1e2"/>',
    '<rect x="54" y="54" width="12" height="12" fill="#2f3b2a"/>',
    // An embossed detail's own shadow on the fill: darker than the fill, but part of the icon.
    '<rect x="30" y="80" width="12" height="8" fill="#7d8c72"/>',
  ].join(''));

  it('clears the dark glow outside the outline and in enclosed holes, and keeps the icon', async () => {
    const out = removeGlow(await glowing());
    expect(px(out, 5, 5)[3]).toBe(0); // the glow
    expect(px(out, 60, 60)[3]).toBe(0); // the glow inside the hole
    expect(px(out, 35, 35)).toEqual([0xb9, 0xc8, 0xa8, 255]); // the fill
    expect(px(out, 20, 60)).toEqual([0xf4, 0xf1, 0xe2, 255]); // the outline
    expect(px(out, 52, 60)[3]).toBe(255); // the hole's cream rim
    expect(px(out, 35, 84)).toEqual([0x7d, 0x8c, 0x72, 255]); // the detail's shadow, enclosed and not dark
  });

  // Ringing from a sharp resampling kernel would leave dark specks just outside the outline.
  it('leaves no dark pixel once the cleaned icon is scaled up onto its square', async () => {
    const out = await normaliseIcon(removeGlow(await glowing()));
    for (let i = 0; i < out.data.length; i += 4) {
      if (out.data[i + 3] > 0) expect(0.2126 * out.data[i] + 0.7152 * out.data[i + 1] + 0.0722 * out.data[i + 2]).toBeGreaterThan(110);
    }
  });

  it('keeps an anti-aliased edge as partly transparent cream, never as grey', async () => {
    const img = await glowing();
    // Blend one edge pixel halfway between the glow and the outline.
    const i = (60 * img.width + 16) * 4;
    img.data[i] = Math.round((0x2f + 0xf4) / 2);
    img.data[i + 1] = Math.round((0x3b + 0xf1) / 2);
    img.data[i + 2] = Math.round((0x2a + 0xe2) / 2);
    const [r, g, b, a] = px(removeGlow(img), 16, 60);
    expect(a).toBeGreaterThan(64);
    expect(a).toBeLessThan(192);
    // Its colour is the outline's (bright), not the grey of the blend.
    expect(0.2126 * r + 0.7152 * g + 0.0722 * b).toBeGreaterThan(200);
  });

  // The sheet's outline meets a near-black rim: its outermost pixels are opaque blends, bright enough
  // to count as icon, that read as a grey hairline on the light theme.
  it('turns the outline outermost blended pixels into partly transparent cream too', async () => {
    const img = await glowing();
    const i = (40 * img.width + 17) * 4;
    img.data[i] = Math.round(0.7 * 0xf4 + 0.3 * 0x2f);
    img.data[i + 1] = Math.round(0.7 * 0xf1 + 0.3 * 0x3b);
    img.data[i + 2] = Math.round(0.7 * 0xe2 + 0.3 * 0x2a);
    const [r, g, b, a] = px(removeGlow(img), 17, 40);
    expect(a).toBeLessThan(240);
    expect(a).toBeGreaterThan(128);
    expect(0.2126 * r + 0.7152 * g + 0.0722 * b).toBeGreaterThan(230);
  });

  it('drops pixels with too little alpha even when they are bright', async () => {
    const img = await raw(20, 20, '<rect x="0" y="0" width="20" height="20" fill="#ffffff" fill-opacity="0.2"/>');
    expect(alphaBounds(removeGlow(img), 0)).toBeNull();
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
  it('writes each icon it has a source for as a square PNG in the originals folder, and lists the rest', async () => {
    const icons = temp();
    const out = temp();
    await sharp({ create: { width: 1254, height: 1254, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
      .composite([{ input: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="1254" height="1254"><circle cx="500" cy="700" r="300" fill="#6f8f6a"/></svg>') }])
      .png().toFile(join(icons, 'icon-rocket.png'));
    // A 6 × 4 sheet of cream-outlined squares in a dark glow.
    const cells = Array.from({ length: 24 }, (_, i) => {
      const x = (i % 6) * 256 + 48;
      const y = Math.floor(i / 6) * 256 + 48;
      return `<rect x="${x - 20}" y="${y - 20}" width="200" height="200" fill="#2f3b2a"/><rect x="${x}" y="${y}" width="160" height="160" fill="#b9c8a8" stroke="#f4f1e2" stroke-width="6"/>`;
    }).join('');
    const sheet = join(temp(), 'sheet.png');
    await sharp({ create: { width: 1536, height: 1024, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
      .composite([{ input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1536" height="1024">${cells}</svg>`) }])
      .png().toFile(sheet);

    const report = await prepareIcons({ iconsDir: icons, sheet, out });
    const expected = ['icon-rocket.png', ...Object.keys(SHEET_ICONS).map((n) => `icon-${n}.png`)].sort();
    expect(report.written.sort()).toEqual(expected);
    expect(readdirSync(out).sort()).toEqual(expected);
    expect(report.missing).toEqual(FOLDER_ICONS.filter((n: string) => n !== 'rocket').map((n: string) => `icon-${n}.png`));
    for (const name of expected) {
      const meta = await sharp(join(out, name)).metadata();
      expect([meta.width, meta.height, meta.hasAlpha]).toEqual([ICON_ORIGINAL_SIZE, ICON_ORIGINAL_SIZE, true]);
    }
    // The sheet's glow is gone: no dark pixel shows anywhere in a cut cell.
    const { data } = await sharp(join(out, 'icon-grid.png')).raw().toBuffer({ resolveWithObject: true });
    expect(data[3]).toBe(0);
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] > 0) expect(0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]).toBeGreaterThan(120);
    }
  });

  it('writes nothing when the owner files are absent', async () => {
    const out = temp();
    const report = await prepareIcons({ iconsDir: join(temp(), 'absent'), sheet: join(temp(), 'absent.png'), out });
    expect(report.written).toEqual([]);
    expect(report.missing).toHaveLength(ICON_NAMES.length);
    expect(existsSync(out) ? readdirSync(out) : []).toEqual([]);
  });
});
