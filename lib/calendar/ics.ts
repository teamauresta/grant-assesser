import { addDays } from '@/lib/dates';
import { downloadFile } from '@/lib/download';

/** One calendar event. All-day events use `date`; timed events use `at` (an instant) and `durationMinutes`. */
export type CalEvent = {
  uid: string; title: string; description?: string; url?: string;
  allDay: boolean; date: string; at?: Date; durationMinutes?: number;
  alarmsDaysBefore: number[]; sequence: number;
};

const utc = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
const compactDate = (iso: string) => iso.replace(/-/g, '');

/** RFC 5545 TEXT escaping: backslash, semicolon, comma and newlines. */
export function escapeText(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
}

/** Folds a content line to at most 75 octets per line, never splitting a character. */
export function foldLine(line: string): string {
  const enc = new TextEncoder();
  const out: string[] = [];
  let cur = '';
  let bytes = 0;
  for (const ch of line) {
    const b = enc.encode(ch).length;
    const limit = out.length === 0 ? 75 : 74; // continuation lines start with a space
    if (bytes + b > limit) { out.push(cur); cur = ''; bytes = 0; }
    cur += ch; bytes += b;
  }
  out.push(cur);
  return out.map((l, i) => (i === 0 ? l : ' ' + l)).join('\r\n');
}

export function buildIcs(events: CalEvent[], now: Date): string {
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Grant Navigator//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH'];
  for (const e of events) {
    lines.push('BEGIN:VEVENT', `UID:${e.uid}`, `DTSTAMP:${utc(now)}`, `SEQUENCE:${e.sequence}`, `SUMMARY:${escapeText(e.title)}`);
    if (e.allDay || !e.at) {
      lines.push(`DTSTART;VALUE=DATE:${compactDate(e.date)}`, `DTEND;VALUE=DATE:${compactDate(addDays(e.date, 1))}`);
    } else {
      lines.push(`DTSTART:${utc(e.at)}`, `DTEND:${utc(new Date(e.at.getTime() + (e.durationMinutes ?? 30) * 60_000))}`);
    }
    const desc = [e.description, e.url].filter(Boolean).join('\n\n');
    if (desc) lines.push(`DESCRIPTION:${escapeText(desc)}`);
    if (e.url) lines.push(`URL:${e.url}`);
    for (const d of e.alarmsDaysBefore) {
      lines.push('BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${escapeText(`Reminder: ${e.title}`)}`, `TRIGGER:-P${d}D`, 'END:VALARM');
    }
    lines.push('END:VEVENT');
  }
  lines.push('END:VCALENDAR');
  return lines.map(foldLine).join('\r\n') + '\r\n';
}

/** Saves an .ics file in the browser. Client only. */
export function downloadIcs(filename: string, ics: string) {
  downloadFile(filename, ics, 'text/calendar;charset=utf-8');
}
