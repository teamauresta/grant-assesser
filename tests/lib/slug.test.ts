import { describe, it, expect } from 'vitest';
import { slugify } from '@/lib/slug';
import { reportFilename } from '@/lib/pdf/report-data';

describe('slugify', () => {
  it('keeps lowercase ascii letters and digits, removing accents', () => {
    expect(slugify('Société Générale AI')).toBe('societe-generale-ai');
    expect(slugify('Submit the R&D  registration — café!')).toBe('submit-the-r-d-registration-cafe');
    expect(slugify('  Acme AI Pty. Ltd! ')).toBe('acme-ai-pty-ltd');
  });
  it('caps the length without leaving a trailing hyphen', () => {
    expect(slugify('a'.repeat(59) + ' bcd')).toBe('a'.repeat(59));
    expect(slugify('abc def', { max: 4 })).toBe('abc');
  });
  it('falls back when nothing is left', () => {
    expect(slugify('!!!')).toBe('');
    expect(slugify('!!!', { fallback: 'event' })).toBe('event');
  });
  it('is the one the report filename uses', () => {
    expect(reportFilename('Société Générale AI', new Date('2026-10-27T00:00:00Z'))).toBe('societe-generale-ai-funding-report-2026-10-27.pdf');
  });
});
