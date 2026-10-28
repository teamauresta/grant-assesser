import { describe, it, expect } from 'vitest';
import { REPORT_PALETTE, REPORT_STYLES } from '@/lib/pdf/report-document';

describe('PDF report rules', () => {
  it('uses neutral hairlines, never the accent, under the cover title and section headings', () => {
    expect(REPORT_STYLES.coverRule.backgroundColor).toBe(REPORT_PALETTE.hairline);
    expect(REPORT_STYLES.rule.backgroundColor).toBe(REPORT_PALETTE.hairline);
  });

  it('has no accent colour in its palette: every colour is a neutral grey', () => {
    expect(REPORT_PALETTE).not.toHaveProperty('accent');
    // Tailwind's zinc greys lean a touch blue (channels up to 9 apart); any real colour, such as the
    // teal accent #0f766e, is far beyond that.
    for (const [name, hex] of Object.entries(REPORT_PALETTE)) {
      expect(hex, name).toMatch(/^#[0-9a-f]{6}$/i);
      const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
      expect(Math.max(r, g, b) - Math.min(r, g, b), name).toBeLessThanOrEqual(12);
    }
  });
});
