import type { Goal, Program, Workspace } from '@/lib/schema';
import { getProgram } from '@/content/programs';
import { resolveDeadlines, type ResolvedDeadline } from '@/lib/status';
import type { CalEvent } from './ics';

export const DEADLINE_ALARM_DAYS = [14, 7, 1];

type DatedGoal = Goal & { dueDate: string };
const hasDueDate = (g: Goal): g is DatedGoal => g.dueDate !== undefined;

/** An all-day event on the goal's due date. The UID is stable, so re-importing updates the event. */
export function goalToEvent(goal: DatedGoal, appUrl: string): CalEvent {
  const openSteps = goal.steps.filter((s) => !s.done).map((s) => `- ${s.title}`);
  return {
    uid: `goal-${goal.id}@grant-navigator`,
    title: goal.title,
    description: openSteps.length ? `Steps:\n${openSteps.join('\n')}` : undefined,
    url: `${appUrl}/plan/?goal=${goal.id}`,
    allDay: true,
    date: goal.dueDate,
    alarmsDaysBefore: [...goal.reminderOffsetsDays],
    sequence: goal.sequence,
  };
}

/** A program deadline: timed when the deadline has a time, otherwise all-day. */
export function deadlineToEvent(program: Program, deadline: ResolvedDeadline, appUrl: string): CalEvent {
  const when = deadline.time ? ` at ${deadline.time} (${deadline.tz.split('/').at(-1)!.replace(/_/g, ' ')} time)` : '';
  return {
    uid: `deadline-${program.slug}-${deadline.date}@grant-navigator`,
    title: `${program.name}: ${deadline.label}`,
    description: `${deadline.label}${when}. Check the official guidelines for the current date.`,
    url: `${appUrl}/programs/${program.slug}/`,
    allDay: deadline.allDay,
    date: deadline.date,
    at: deadline.allDay ? undefined : deadline.at,
    alarmsDaysBefore: [...DEADLINE_ALARM_DAYS],
    // Program records only grow their changelog, so this rises when the data is corrected.
    sequence: program.changelog.length,
  };
}

const sortKey = (e: CalEvent) => (e.at ? e.at.toISOString() : `${e.date}T00:00`);

/**
 * Every open goal with a due date, plus every future deadline of each program in the pipeline.
 * A program in the pipeline more than once contributes its deadlines once. Sorted by date.
 */
export function workspaceEvents(ws: Workspace, now: Date, appUrl: string): CalEvent[] {
  const events: CalEvent[] = ws.goals
    .filter((g) => g.status !== 'done')
    .filter(hasDueDate)
    .map((g) => goalToEvent(g, appUrl));
  const slugs = new Set(ws.pipeline.map((a) => a.programSlug).filter((s): s is string => !!s));
  const seen = new Set<string>();
  for (const slug of slugs) {
    const program = getProgram(slug);
    if (!program) continue;
    for (const d of resolveDeadlines(program, now, ws.profile)) {
      if (d.at.getTime() <= now.getTime()) continue;
      const e = deadlineToEvent(program, d, appUrl);
      if (seen.has(e.uid)) continue;
      seen.add(e.uid);
      events.push(e);
    }
  }
  return events.sort((a, b) => a.date.localeCompare(b.date) || sortKey(a).localeCompare(sortKey(b)) || a.title.localeCompare(b.title));
}

/** Lowercase ASCII words joined by hyphens, for file names. */
export function slugify(s: string, max = 60): string {
  const slug = s.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, max).replace(/-+$/, '');
  return slug || 'event';
}

export const deadlineFilename = (program: Program, deadline: ResolvedDeadline) => `${program.slug}-${slugify(deadline.label)}.ics`;
export const goalFilename = (goal: Goal) => `${slugify(goal.title)}.ics`;

/** The app's absolute base URL, e.g. https://example.github.io/grant-assesser. Client only. */
export function appBaseUrl(): string {
  return window.location.origin + (process.env.NEXT_PUBLIC_BASE_PATH ?? '');
}
