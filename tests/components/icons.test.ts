import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = join(import.meta.dirname, '..', '..');

function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sources(path);
    return /\.tsx?$/.test(name) ? [path] : [];
  });
}

const FILES = ['app', 'components', 'lib'].flatMap((dir) => sources(join(ROOT, dir)));

// Icons (CLAUDE.md, Design system; design doc section 11, Icons landed). The owner asked for the line
// glyphs to match the chunkier sage icons: lucide's own default stroke, 2, replaced the old 1.5, so no
// call site sets a stroke width (it would have to be set at all ~100 of them to stay consistent).
describe('lucide line glyphs', () => {
  it('use lucide’s default stroke width (2): no file that imports lucide-react sets one', () => {
    const lucide = FILES.filter((f) => readFileSync(f, 'utf8').includes("from 'lucide-react'"));
    expect(lucide.length).toBeGreaterThan(20);
    for (const file of lucide) {
      expect(readFileSync(file, 'utf8'), file).not.toMatch(/strokeWidth|absoluteStrokeWidth/);
    }
  });
});

// A sage icon is a picture with detail: below 20px it does not read, so smaller slots (inline in text,
// in buttons, pills and menus) keep the line glyphs. This scan sees only literal `size={N}`; a computed
// size is caught by SageIcon's own development check (tests/components/sage-icon.test.tsx).
describe('SageIcon call sites', () => {
  it('are 20px or larger', () => {
    const sizes = FILES.flatMap((f) => [...readFileSync(f, 'utf8').matchAll(/<SageIcon\b[^>]*?\bsize=\{(\d+)\}/g)].map((m) => [f, Number(m[1])] as const));
    expect(sizes.length).toBeGreaterThan(10);
    for (const [file, size] of sizes) expect(size, file).toBeGreaterThanOrEqual(20);
  });
});
