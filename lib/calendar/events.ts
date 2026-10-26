import type { Goal, Program, Workspace } from '@/lib/schema';
import { getProgram } from '@/content/programs';
import { resolveDeadlines, type ResolvedDeadline } from '@/lib/status';
import { applicationName, isDropped } from '@/lib/plan/applications';
import { slugify } from '@/lib/slug';
import type { CalEvent } from './ics';

export const DEADLINE_ALARM_DAYS = [14, 7, 1];

const eventSlug = (s: string) => slugify(s, { fallback: 'event' });

export type DatedGoal = Goal & { dueDate: string };
export const hasDueDate = (g: Goal): g is DatedGoal => g.dueDate !== undefined;

/**
 * An all-day event on the goal's due date. The UID is stable, so re-importing updates the event.
 * `context` (the program or application name) prefixes the title, e.g. "CSIRO Kick-Start: Submit EOI".
 */
export function goalToEvent(goal: DatedGoal, appUrl: string, context?: string): CalEvent {
  const openSteps = goal.steps.filter((s) => !s.done).map((s) => `- ${s.title}`);
  return {
    uid: `goal-${goal.id}@grant-navigator`,
    title: context ? `${context}: ${goal.title}` : goal.title,
    description: openSteps.length ? `Steps:\n${openSteps.join('\n')}` : undefined,
    url: `${appUrl}/plan/?goal=${goal.id}`,
    allDay: true,
    date: goal.dueDate,
    alarmsDaysBefore: [...goal.reminderOffsetsDays],
    sequence: goal.sequence,
  };
}

/** Keyed by label, not date, so a corrected date updates the same calendar event. */
export const deadlineUid = (program: Pick<Program, 'slug'>, deadline: Pick<ResolvedDeadline, 'label'>) =>
  `deadline-${program.slug}-${eventSlug(deadline.label)}@grant-navigator`;

/** A program deadline: timed when the deadline has a time, otherwise all-day. */
export function deadlineToEvent(program: Program, deadline: ResolvedDeadline, appUrl: string): CalEvent {
  const when = deadline.time ? ` at ${deadline.time} (${deadline.tz.split('/').at(-1)!.replace(/_/g, ' ')} time)` : '';
  return {
    uid: deadlineUid(program, deadline),
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

/** The name a goal's linked application goes by, for event titles. Undefined for unlinked goals. */
export function goalContext(ws: Workspace, goal: Goal): string | undefined {
  const app = goal.applicationId ? ws.pipeline.find((a) => a.id === goal.applicationId) : undefined;
  return app ? applicationName(app) : undefined;
}

/** A goal's calendar event with its application's name in the title. */
export const workspaceGoalEvent = (ws: Workspace, goal: DatedGoal, appUrl: string) => goalToEvent(goal, appUrl, goalContext(ws, goal));

/**
 * Every open goal with a due date, plus every future deadline of each program in the pipeline that is
 * still being pursued (declined and withdrawn applications are skipped). A program in the pipeline
 * more than once contributes its deadlines once. Sorted by date.
 */
export function workspaceEvents(ws: Workspace, now: Date, appUrl: string): CalEvent[] {
  const events: CalEvent[] = ws.goals
    .filter((g) => g.status !== 'done')
    .filter(hasDueDate)
    .map((g) => workspaceGoalEvent(ws, g, appUrl));
  const slugs = new Set(ws.pipeline.filter((a) => !isDropped(a)).map((a) => a.programSlug).filter((s): s is string => !!s));
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

export const deadlineFilename = (program: Program, deadline: ResolvedDeadline) => `${program.slug}-${eventSlug(deadline.label)}.ics`;
export const goalFilename = (goal: Goal) => `${eventSlug(goal.title)}.ics`;

/** The app's absolute base URL, e.g. https://example.github.io/grant-assesser. Client only. */
export function appBaseUrl(): string {
  return window.location.origin + (process.env.NEXT_PUBLIC_BASE_PATH ?? '');
}
