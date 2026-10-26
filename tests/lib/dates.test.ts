import { describe, it, expect, vi, afterEach } from 'vitest';
import { addDays, addMonthsISO, daysBetween, endOfMonthISO, monthsBetween, subtractBusinessDays, todayISO, zonedToInstant } from '@/lib/dates';

describe('dates', () => {
  it('endOfMonthISO handles normal, leap and overflowing months', () => {
    expect(endOfMonthISO(2026, 6)).toBe('2026-06-30');
    expect(endOfMonthISO(2024, 2)).toBe('2024-02-29');
    expect(endOfMonthISO(2026, 16)).toBe('2027-04-30');
  });
  it('addDays and daysBetween', () => {
    expect(addDays('2026-10-27', 7)).toBe('2026-11-03');
    expect(daysBetween('2026-10-27', '2026-11-01')).toBe(5);
  });
  it('subtractBusinessDays skips weekends', () => {
    expect(subtractBusinessDays('2026-11-27', 5)).toBe('2026-11-20'); // Fri → previous Fri
    expect(subtractBusinessDays('2026-11-02', 1)).toBe('2026-10-30'); // Mon → Fri
  });
  it('monthsBetween counts whole months', () => {
    expect(monthsBetween('2025-04-27', '2026-10-27')).toBe(18);
    expect(monthsBetween('2025-04-28', '2026-10-27')).toBe(17);
  });
  it('zonedToInstant honours Melbourne daylight saving', () => {
    expect(zonedToInstant('2026-11-27', '14:00', 'Australia/Melbourne').toISOString()).toBe('2026-11-27T03:00:00.000Z');
    expect(zonedToInstant('2026-07-01', '09:00', 'Australia/Melbourne').toISOString()).toBe('2026-06-30T23:00:00.000Z');
  });
  it('todayISO uses the Melbourne calendar date', () => {
    expect(todayISO(new Date('2026-10-26T14:30:00Z'))).toBe('2026-10-27');
  });
  it('addMonthsISO uses calendar months and clamps to month end', () => {
    expect(addMonthsISO('2026-03-31', -1)).toBe('2026-02-28');
    expect(addMonthsISO('2024-02-29', 12)).toBe('2025-02-28');
    expect(addMonthsISO('2026-10-27', -24)).toBe('2024-10-27');
    expect(addMonthsISO('2026-01-15', -1)).toBe('2025-12-15');
    expect(addMonthsISO('2026-11-30', 3)).toBe('2027-02-28');
    expect(addMonthsISO('2026-10-27', 0)).toBe('2026-10-27');
  });
  describe('todayISO formatting', () => {
    afterEach(() => { vi.restoreAllMocks(); });
    it('builds the date from formatToParts, not locale-formatted output', () => {
      // `format` is an accessor on the prototype; simulate a runtime whose locale output is not YYYY-MM-DD.
      const proto = Intl.DateTimeFormat.prototype as unknown as Record<'format', unknown>;
      vi.spyOn(proto, 'format', 'get').mockReturnValue(() => '27/10/2026');
      expect(todayISO(new Date('2026-10-26T14:30:00Z'))).toBe('2026-10-27');
      expect(todayISO(new Date('2026-10-26T14:30:00Z'), 'UTC')).toBe('2026-10-26');
    });
  });
});
