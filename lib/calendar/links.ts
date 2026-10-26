import { addDays } from '@/lib/dates';
import type { CalEvent } from './ics';

const utc = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
const details = (e: CalEvent) => [e.description, e.url].filter(Boolean).join('\n\n');

/** Google Calendar "create event" link. All-day ends are exclusive (the next day). */
export function googleCalendarUrl(e: CalEvent): string {
  const dates = e.allDay || !e.at
    ? `${e.date.replace(/-/g, '')}/${addDays(e.date, 1).replace(/-/g, '')}`
    : `${utc(e.at)}/${utc(new Date(e.at.getTime() + (e.durationMinutes ?? 30) * 60_000))}`;
  const p = new URLSearchParams({ action: 'TEMPLATE', text: e.title, dates, details: details(e) });
  return `https://calendar.google.com/calendar/render?${p}`;
}

/** Outlook.com "compose event" deep link. */
export function outlookCalendarUrl(e: CalEvent): string {
  const start = e.allDay || !e.at ? e.date : e.at.toISOString();
  const end = e.allDay || !e.at ? addDays(e.date, 1) : new Date(e.at.getTime() + (e.durationMinutes ?? 30) * 60_000).toISOString();
  const p = new URLSearchParams({ path: '/calendar/action/compose', rru: 'addevent', subject: e.title, startdt: start, enddt: end, allday: String(e.allDay || !e.at), body: details(e) });
  return `https://outlook.live.com/calendar/0/deeplink/compose?${p}`;
}
