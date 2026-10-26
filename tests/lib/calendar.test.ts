import { describe, it, expect } from 'vitest';
import { buildIcs, escapeText, foldLine } from '@/lib/calendar/ics';
import { googleCalendarUrl } from '@/lib/calendar/links';

const now = new Date('2026-10-27T00:00:00Z');
const allDay = { uid: 'g1@grant-navigator', title: 'Submit EOI', date: '2026-11-20', allDay: true, alarmsDaysBefore: [7, 1], sequence: 2, description: 'Kick-Start', url: 'https://x.test/plan/?goal=g1' };
const timed = { uid: 'd1@grant-navigator', title: 'WorkSafe closes', date: '2026-11-27', allDay: false, at: new Date('2026-11-27T03:00:00Z'), alarmsDaysBefore: [], sequence: 0 };

describe('ics', () => {
  const ics = buildIcs([allDay, timed], now);
  it('uses CRLF and wraps a VCALENDAR', () => {
    expect(ics.startsWith('BEGIN:VCALENDAR\r\n')).toBe(true);
    expect(ics.trimEnd().endsWith('END:VCALENDAR')).toBe(true);
  });
  it('all-day events use DATE values with exclusive end', () => {
    expect(ics).toContain('DTSTART;VALUE=DATE:20261120');
    expect(ics).toContain('DTEND;VALUE=DATE:20261121');
  });
  it('timed events use UTC', () => { expect(ics).toContain('DTSTART:20261127T030000Z'); });
  it('includes alarms, stable UID and sequence', () => {
    expect(ics).toContain('TRIGGER:-P7D'); expect(ics).toContain('TRIGGER:-P1D');
    expect(ics).toContain('UID:g1@grant-navigator'); expect(ics).toContain('SEQUENCE:2');
  });
  it('escapes text and folds long lines to 75 octets', () => {
    expect(escapeText('a, b; c\\d\ne')).toBe('a\\, b\\; c\\\\d\\ne');
    const folded = foldLine('DESCRIPTION:' + 'x'.repeat(200));
    for (const l of folded.split('\r\n')) expect(new TextEncoder().encode(l).length).toBeLessThanOrEqual(75);
    expect(folded.split('\r\n')[1].startsWith(' ')).toBe(true);
  });
});

describe('links', () => {
  it('google all-day link uses exclusive end date', () => {
    const u = new URL(googleCalendarUrl(allDay));
    expect(u.searchParams.get('dates')).toBe('20261120/20261121');
    expect(u.searchParams.get('text')).toBe('Submit EOI');
  });
});
