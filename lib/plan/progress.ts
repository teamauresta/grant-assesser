import type { Goal, Workspace } from '@/lib/schema';
import { hasDueDate, type DatedGoal } from '@/lib/calendar/events';
import { isDropped } from './applications';

export type PlanProgress = { done: number; total: number; percent: number; next?: DatedGoal };

/**
 * Goals done across applications still being pursued (declined and withdrawn ones are left out),
 * plus goals not tied to an application, and the next open goal by due date.
 */
export function planProgress(ws: Workspace): PlanProgress {
  const dropped = new Set(ws.pipeline.filter(isDropped).map((a) => a.id));
  const goals = ws.goals.filter((g) => !g.applicationId || !dropped.has(g.applicationId));
  const done = goals.filter((g) => g.status === 'done').length;
  const next = goals
    .filter((g) => g.status !== 'done')
    .filter(hasDueDate)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate) || a.title.localeCompare(b.title))[0];
  return { done, total: goals.length, percent: goals.length ? Math.round((done / goals.length) * 100) : 0, next };
}

/** The application whose last open goal this status change completes, if any. */
export function completesApplication(goals: readonly Goal[], goalId: string, status: Goal['status']): string | undefined {
  const goal = goals.find((g) => g.id === goalId);
  if (status !== 'done' || !goal?.applicationId || goal.status === 'done') return undefined;
  const siblings = goals.filter((g) => g.applicationId === goal.applicationId && g.id !== goalId);
  return siblings.every((g) => g.status === 'done') ? goal.applicationId : undefined;
}
