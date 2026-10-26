import type { Application, Goal, Program, Workspace } from '@/lib/schema';
import { getProgram } from '@/content/programs';
import { addDays, parseISODate, todayISO, toISODate } from '@/lib/dates';
import { resolveDeadlines, type ResolvedDeadline } from '@/lib/status';
import { deadlineUid, hasDueDate, type DatedGoal } from '@/lib/calendar/events';
import { applicationName, isDropped } from './applications';

const isOpen = (g: Goal) => g.status !== 'done';

/** True when an open goal's due date is before today's (Melbourne) date. */
export function isOverdue(goal: Goal, now: Date): boolean {
  return isOpen(goal) && goal.dueDate !== undefined && goal.dueDate < todayISO(now);
}

const byDueThenTitle = (a: DatedGoal, b: DatedGoal) => a.dueDate.localeCompare(b.dueDate) || a.title.localeCompare(b.title);

/** Open goals due within `days` days of today, plus overdue ones, sorted by due date. */
export function dueWithin(goals: readonly Goal[], now: Date, days: number): DatedGoal[] {
  const last = addDays(todayISO(now), days);
  return goals.filter(isOpen).filter(hasDueDate).filter((g) => g.dueDate <= last).sort(byDueThenTitle);
}

/** Open goals by due date (undated after dated), then done goals; ties keep their stored order. */
function sortGoals(goals: Goal[]): Goal[] {
  const rank = (g: Goal) => (isOpen(g) ? (g.dueDate ? 0 : 1) : 2);
  return goals
    .map((g, i) => ({ g, i }))
    .sort((a, b) => rank(a.g) - rank(b.g) || (a.g.dueDate ?? '').localeCompare(b.g.dueDate ?? '') || a.i - b.i)
    .map(({ g }) => g);
}

export const OTHER_GROUP_ID = 'other';

export type GoalGroup = { id: string; name: string; application?: Application; goals: Goal[] };

/**
 * One group per pipeline application (in pipeline order, even when empty), then "Other goals" for
 * goals with no application or whose application was removed, when there are any.
 */
export function goalsByApplication(ws: Workspace): GoalGroup[] {
  const ids = new Set(ws.pipeline.map((a) => a.id));
  const groups: GoalGroup[] = ws.pipeline.map((a) => ({
    id: a.id,
    name: applicationName(a) ?? 'Untitled application',
    application: a,
    goals: sortGoals(ws.goals.filter((g) => g.applicationId === a.id)),
  }));
  const other = ws.goals.filter((g) => !g.applicationId || !ids.has(g.applicationId));
  if (other.length) groups.push({ id: OTHER_GROUP_ID, name: 'Other goals', goals: sortGoals(other) });
  return groups;
}

export type ApplicationProgress = { done: number; total: number; next?: DatedGoal };

/** "2 of 5 goals done" and the next open goal with a due date (overdue ones first). */
export function applicationProgress(goals: readonly Goal[], applicationId: string): ApplicationProgress {
  const mine = goals.filter((g) => g.applicationId === applicationId);
  const next = mine.filter(isOpen).filter(hasDueDate).sort(byDueThenTitle)[0];
  return { done: mine.filter((g) => !isOpen(g)).length, total: mine.length, next };
}

/**
 * Calendar weeks for a month (1–12), Monday first, as ISO dates. Only weeks that contain a day of
 * the month are included, so a month has 4–6 rows; leading and trailing days belong to the
 * neighbouring months.
 */
export function monthGrid(year: number, month: number): string[][] {
  const first = toISODate(new Date(Date.UTC(year, month - 1, 1)));
  const last = toISODate(new Date(Date.UTC(year, month, 0)));
  const mondayOffset = (parseISODate(first).getUTCDay() + 6) % 7;
  const weeks: string[][] = [];
  for (let start = addDays(first, -mondayOffset); start <= last; start = addDays(start, 7)) {
    weeks.push(Array.from({ length: 7 }, (_, i) => addDays(start, i)));
  }
  return weeks;
}

export type GoalItem = {
  kind: 'goal'; id: string; date: string; title: string; context?: string;
  goal: DatedGoal; done: boolean; overdue: boolean;
};
export type DeadlineItem = {
  kind: 'deadline'; id: string; date: string; title: string; context: string;
  program: Program; deadline: ResolvedDeadline; past: boolean;
};
export type PlanItem = GoalItem | DeadlineItem;

const itemOrder = (a: PlanItem, b: PlanItem) =>
  a.date.localeCompare(b.date)
  || (a.kind === b.kind ? 0 : a.kind === 'deadline' ? -1 : 1)
  || (a.kind === 'deadline' && b.kind === 'deadline' ? a.deadline.at.getTime() - b.deadline.at.getTime() : 0)
  || a.title.localeCompare(b.title);

/**
 * Everything with a date: every goal with a due date (done ones flagged) and every deadline, past or
 * future, of each program whose application is still being pursued. Sorted by date; on the same day
 * deadlines come before goals. Deadline ids match their calendar event UIDs.
 */
export function planItems(ws: Workspace, now: Date): PlanItem[] {
  const names = new Map(ws.pipeline.map((a) => [a.id, applicationName(a)]));
  const items: PlanItem[] = ws.goals.filter(hasDueDate).map((g) => ({
    kind: 'goal', id: g.id, date: g.dueDate, title: g.title,
    context: g.applicationId ? names.get(g.applicationId) : undefined,
    goal: g, done: !isOpen(g), overdue: isOverdue(g, now),
  }));
  const slugs = new Set(ws.pipeline.filter((a) => !isDropped(a)).flatMap((a) => (a.programSlug ? [a.programSlug] : [])));
  for (const slug of slugs) {
    const program = getProgram(slug);
    if (!program) continue;
    for (const d of resolveDeadlines(program, now, ws.profile)) {
      items.push({
        kind: 'deadline', id: deadlineUid(program, d), date: d.date,
        title: d.label, context: program.name, program, deadline: d, past: d.at.getTime() <= now.getTime(),
      });
    }
  }
  return items.sort(itemOrder);
}

/** Open goals due within `days` (overdue included) and future pipeline deadlines in the same window. */
export function agenda(ws: Workspace, now: Date, days = 90): PlanItem[] {
  const last = addDays(todayISO(now), days);
  return planItems(ws, now).filter((i) => i.date <= last && (i.kind === 'goal' ? !i.done : !i.past));
}
