/** The 24-bit value of a #rrggbb colour; throws on anything else. */
function rgb(hex: string): number {
  const m = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!m) throw new Error(`Not a #rrggbb colour: ${hex}`);
  return parseInt(m[1], 16);
}

/** WCAG 2 relative luminance of a #rrggbb colour. */
export function luminance(hex: string): number {
  const n = rgb(hex);
  const channel = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel((n >> 16) & 255) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255);
}

/** WCAG 2 contrast ratio between two #rrggbb colours, from 1 to 21. */
export function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** `base` blended towards `over` by `amount` (0..1), per sRGB channel, as #rrggbb. */
export function mixHex(base: string, over: string, amount: number): string {
  const [a, b] = [rgb(base), rgb(over)];
  const ch = (n: number, shift: number) => (n >> shift) & 255;
  return '#' + [16, 8, 0]
    .map((shift) => Math.round(ch(a, shift) + (ch(b, shift) - ch(a, shift)) * amount).toString(16).padStart(2, '0'))
    .join('');
}
