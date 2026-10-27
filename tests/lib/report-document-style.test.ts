import { describe, it, expect } from 'vitest';
import { REPORT_PALETTE, REPORT_STYLES } from '@/lib/pdf/report-document';

describe('PDF report rules', () => {
  it('uses neutral hairlines, never the accent, under the cover title and section headings', () => {
    expect(REPORT_STYLES.coverRule.backgroundColor).toBe(REPORT_PALETTE.hairline);
    expect(REPORT_STYLES.rule.backgroundColor).toBe(REPORT_PALETTE.hairline);
  });
});
