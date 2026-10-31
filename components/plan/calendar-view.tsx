'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { CalendarClock, ChevronLeft, ChevronRight, CircleAlert, CircleCheck, Download, Info, Target } from 'lucide-react';
import { formatDate, todayISO } from '@/lib/dates';
import { buildIcs, downloadIcs } from '@/lib/calendar/ics';
import { appBaseUrl, workspaceEvents } from '@/lib/calendar/events';
import { agenda, monthGrid, planItems, type PlanItem } from '@/lib/plan/selectors';
import { useWorkspace } from '@/lib/store/use-workspace';
import { cn } from '@/lib/cn';
import { Button } from '@/components/ui/button';
import { focusRing } from '@/components/ui/focus-ring';
import { LIST_FRAME } from '@/components/ui/list';
import { goalHref } from '@/lib/plan/routes';

const PLAN_ICS_FILENAME = 'grant-navigator-plan.ics';
const AGENDA_DAYS = 90;
const MAX_CHIPS = 3;
const WEEKDAYS = [['Mon', 'Monday'], ['Tue', 'Tuesday'], ['Wed', 'Wednesday'], ['Thu', 'Thursday'], ['Fri', 'Friday'], ['Sat', 'Saturday'], ['Sun', 'Sunday']] as const;

const monthTitle = (year: number, month: number) =>
  new Intl.DateTimeFormat('en-AU', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(Date.UTC(year, month - 1, 1)));
const dayLabel = (iso: string) =>
  new Intl.DateTimeFormat('en-AU', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' }).format(new Date(`${iso}T00:00:00Z`));

const itemHref = (i: PlanItem) => (i.kind === 'goal' ? goalHref(i.id) : `/programs/${i.program.slug}/`);
function ItemIcon({ item: i, className }: { item: PlanItem; className?: string }) {
  const props = { 'aria-hidden': true, size: 16, className: cn('shrink-0', className) } as const;
  if (i.kind === 'deadline') return <CalendarClock {...props} />;
  if (i.done) return <CircleCheck {...props} />;
  return i.overdue ? <CircleAlert {...props} /> : <Target {...props} />;
}
const itemLabel = (i: PlanItem) => {
  const kind = i.kind === 'deadline' ? 'Deadline' : i.done ? 'Goal, done' : i.overdue ? 'Goal, overdue' : 'Goal';
  return `${kind}: ${i.context ? `${i.context}, ` : ''}${i.title}`;
};

/** Month grid and agenda of goals and pipeline deadlines, with the all-in-one .ics export. */
export function CalendarView({ now }: { now: Date }) {
  const ws = useWorkspace((s) => s.ws);
  const markCalendarExported = useWorkspace((s) => s.markCalendarExported);
  const today = todayISO(now);
  const [view, setView] = useState(() => ({ year: Number(today.slice(0, 4)), month: Number(today.slice(5, 7)) }));
  const [announcement, setAnnouncement] = useState('');

  const items = useMemo(() => planItems(ws, now), [ws, now]);
  const upcoming = useMemo(() => agenda(ws, now, AGENDA_DAYS), [ws, now]);
  const byDate = useMemo(() => {
    const m = new Map<string, PlanItem[]>();
    for (const i of items) m.set(i.date, [...(m.get(i.date) ?? []), i]);
    return m;
  }, [items]);
  const weeks = monthGrid(view.year, view.month);
  const monthPrefix = `${view.year}-${String(view.month).padStart(2, '0')}`;
  const inMonth = items.filter((i) => i.date.startsWith(monthPrefix)).length;

  const step = (n: number) => setView(({ year, month }) => {
    const m = month - 1 + n;
    return { year: year + Math.floor(m / 12), month: ((m % 12) + 12) % 12 + 1 };
  });
  const isCurrentMonth = today.startsWith(monthPrefix);

  const exportAll = () => {
    const events = workspaceEvents(ws, now, appBaseUrl());
    downloadIcs(PLAN_ICS_FILENAME, buildIcs(events, now));
    markCalendarExported();
    setAnnouncement(`Downloaded ${PLAN_ICS_FILENAME} with ${events.length} ${events.length === 1 ? 'event' : 'events'}.`);
  };
  const eventCount = useMemo(() => workspaceEvents(ws, now, '').length, [ws, now]);
  const changes = ws.changesSinceCalendarExport;

  return (
    <div className="flex flex-col gap-6">
      <p role="status" className="sr-only">{announcement}</p>

      {changes > 0 && ws.lastCalendarExportAt && (
        <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="flex items-start gap-2 text-sm">
            <Info aria-hidden="true" size={16} className="mt-[3px] shrink-0 text-accent" />
            <span>
              <span className="num font-medium">{changes}</span> {changes === 1 ? 'change' : 'changes'} since your last calendar export
              {' '}on <time dateTime={ws.lastCalendarExportAt} className="num">{formatDate(todayISO(new Date(ws.lastCalendarExportAt)))}</time>.
              {' '}Re-import the file to update your calendar.
            </span>
          </p>
          <Button onClick={exportAll} className="shrink-0">
            <Download aria-hidden="true" size={16} />
            Re-export
          </Button>
        </div>
      )}

      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <p className="max-w-prose text-sm text-muted-fg">
          One file with every open goal that has a due date and every upcoming deadline in your pipeline, with reminders.
          Apple Calendar and Outlook update existing events when you import it again; Google may add duplicates.
        </p>
        <div className="flex shrink-0 flex-col gap-1 sm:items-end">
          <Button variant="primary" onClick={exportAll} disabled={eventCount === 0} aria-describedby={eventCount === 0 ? 'export-help' : undefined}>
            <Download aria-hidden="true" size={16} />
            Export all to calendar (.ics)
          </Button>
          <p id="export-help" className="text-xs text-muted-fg">
            {eventCount === 0
              ? 'Add a goal with a due date or a program with a deadline first.'
              : <><span className="num">{eventCount}</span> {eventCount === 1 ? 'event' : 'events'}</>}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <section aria-labelledby="month-heading" className="flex min-w-0 flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 id="month-heading" className="text-xl" aria-live="polite">
              {monthTitle(view.year, view.month)}
              <span className="sr-only">, {inMonth} {inMonth === 1 ? 'item' : 'items'}</span>
            </h2>
            <div className="flex items-center gap-1">
              <Button variant="ghost" onClick={() => step(-1)} aria-label="Previous month" iconOnly>
                <ChevronLeft aria-hidden="true" size={20} />
              </Button>
              <Button onClick={() => setView({ year: Number(today.slice(0, 4)), month: Number(today.slice(5, 7)) })} aria-current={isCurrentMonth ? 'date' : undefined}>Today</Button>
              <Button variant="ghost" onClick={() => step(1)} aria-label="Next month" iconOnly>
                <ChevronRight aria-hidden="true" size={20} />
              </Button>
            </div>
          </div>
          <table className="w-full table-fixed border-collapse text-left">
            <caption className="sr-only">Goals and deadlines in {monthTitle(view.year, view.month)}</caption>
            <thead>
              <tr>
                {WEEKDAYS.map(([short, long]) => (
                  <th key={short} scope="col" abbr={long} className="pb-1 text-center text-xs font-medium text-muted-fg">
                    <span aria-hidden="true"><span className="sm:hidden">{short[0]}</span><span className="hidden sm:inline">{short}</span></span>
                    <span className="sr-only">{long}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {weeks.map((week) => (
                <tr key={week[0]}>
                  {week.map((d) => {
                    const dayItems = byDate.get(d) ?? [];
                    const outside = !d.startsWith(monthPrefix);
                    const isToday = d === today;
                    const extra = dayItems.length - MAX_CHIPS;
                    return (
                      <td
                        key={d}
                        aria-current={isToday ? 'date' : undefined}
                        className={cn('h-16 border border-border p-0.5 align-top sm:h-24 sm:p-1', outside ? 'bg-bg' : 'bg-surface')}
                      >
                        <div className="flex flex-col gap-0.5">
                          <span
                            className={cn(
                              'num inline-flex size-6 items-center justify-center self-center rounded-full text-xs sm:self-start',
                              isToday ? 'bg-accent font-semibold text-bg' : outside ? 'text-muted-fg' : 'text-fg',
                            )}
                          >
                            <span aria-hidden="true">{Number(d.slice(8))}</span>
                            <span className="sr-only">{dayLabel(d)}{isToday ? ', today' : ''}</span>
                          </span>
                          {dayItems.length > 0 && (
                            <ul className="flex flex-wrap justify-center gap-0.5 sm:flex-col sm:flex-nowrap">
                              {dayItems.slice(0, MAX_CHIPS).map((i) => <Chip key={i.id} item={i} />)}
                              {extra > 0 && (
                                <li className="num px-1 text-center text-xs text-muted-fg sm:text-left">
                                  +{extra}<span className="sr-only"> more, listed in the agenda</span>
                                </li>
                              )}
                            </ul>
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          <p className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-fg">
            <span className="inline-flex items-center gap-1"><Target aria-hidden="true" size={16} />Goal</span>
            <span className="inline-flex items-center gap-1"><CalendarClock aria-hidden="true" size={16} />Program deadline</span>
            <span className="inline-flex items-center gap-1 text-danger"><CircleAlert aria-hidden="true" size={16} />Overdue</span>
            <span className="inline-flex items-center gap-1"><CircleCheck aria-hidden="true" size={16} />Done</span>
          </p>
        </section>

        <Agenda items={upcoming} today={today} />
      </div>
    </div>
  );
}

function Chip({ item }: { item: PlanItem }) {
  const label = itemLabel(item);
  const done = item.kind === 'goal' && item.done;
  const overdue = item.kind === 'goal' && item.overdue;
  return (
    <li className="min-w-0">
      <Link
        href={itemHref(item)}
        title={label}
        className={cn(
          // A small pill (Billabong design doc section 4): an outline on --surface from sm up, the
          // icon alone on phones. Deadlines are medium weight; the icon tells the kinds apart.
          'flex min-h-6 min-w-6 items-center justify-center gap-1 rounded-full px-0.5 text-xs leading-5 sm:justify-start sm:border sm:border-border-strong sm:bg-surface sm:px-2',
          item.kind === 'deadline' && 'font-medium',
          overdue && 'text-danger',
          done && 'text-muted-fg',
          'hover:bg-neutral-bg',
          focusRing,
        )}
      >
        <ItemIcon item={item} />
        <span aria-hidden="true" className={cn('hidden truncate sm:inline', done && 'line-through')}>{item.title}</span>
        <span className="sr-only">{label}</span>
      </Link>
    </li>
  );
}

function Agenda({ items, today }: { items: PlanItem[]; today: string }) {
  const groups = useMemo(() => {
    const m = new Map<string, PlanItem[]>();
    for (const i of items) {
      // Overdue goals are listed together at the top.
      const key = i.date < today ? 'overdue' : i.date;
      m.set(key, [...(m.get(key) ?? []), i]);
    }
    return [...m.entries()];
  }, [items, today]);

  return (
    <section aria-labelledby="agenda-heading" className="flex flex-col gap-3">
      <h2 id="agenda-heading" className="text-xl">Next {AGENDA_DAYS} days</h2>
      {groups.length === 0 ? (
        <p className="rounded-lg border border-border bg-surface px-4 py-6 text-sm text-muted-fg">Nothing due in the next {AGENDA_DAYS} days.</p>
      ) : (
        <ol className="flex flex-col gap-4">
          {groups.map(([key, list]) => (
            <li key={key} className="flex flex-col gap-1.5">
              <h3 className={cn('text-sm font-medium', key === 'overdue' ? 'flex items-center gap-1 text-danger' : 'text-muted-fg')}>
                {key === 'overdue'
                  ? <><CircleAlert aria-hidden="true" size={16} />Overdue</>
                  : <time dateTime={key} className="num">{key === today ? 'Today' : formatDate(key)}</time>}
              </h3>
              <ul className={LIST_FRAME}>
                {list.map((i) => <AgendaRow key={i.id} item={i} />)}
              </ul>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

function AgendaRow({ item }: { item: PlanItem }) {
  const overdue = item.kind === 'goal' && item.overdue;
  return (
    <li className="relative flex gap-2 px-3 py-2.5 hover:bg-neutral-bg has-[a:focus-visible]:outline-2 has-[a:focus-visible]:outline-offset-2 has-[a:focus-visible]:outline-accent">
      <ItemIcon item={item} className={cn('mt-[3px]', overdue ? 'text-danger' : 'text-muted-fg')} />
      <div className="flex min-w-0 flex-col">
        <Link href={itemHref(item)} className="break-words text-sm font-medium after:absolute after:inset-0 focus-visible:outline-none">
          <span className="sr-only">{item.kind === 'deadline' ? 'Deadline: ' : 'Goal: '}</span>
          {item.title}
        </Link>
        <span className="text-xs text-muted-fg">
          {item.context}
          {item.kind === 'deadline' && item.deadline.time && (
            <>{item.context && ' · '}<span className="num">{item.deadline.time}</span> {item.deadline.tz.split('/').at(-1)!.replace(/_/g, ' ')} time</>
          )}
          {overdue && item.kind === 'goal' && <>{item.context && ' · '}due <span className="num">{formatDate(item.date)}</span></>}
        </span>
      </div>
    </li>
  );
}
