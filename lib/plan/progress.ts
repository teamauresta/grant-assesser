import type { Goal, Workspace } from '@/lib/schema';
import { hasDueDate, type DatedGoal } from '@/lib/calendar/events';
import { isDropped } from './applications';

export type PlanProgress = { done: number; total: number; percent: number; next?: DatedGoal };

/**
 * Goals done across applications still being pursued (declined and withdrawn ones are left out),
 * plus goals not tied to an application, and the next open goal by due date. The percentage rounds
 * down, so 100% means every goal is done.
 */
export function planProgress(ws: Pick<Workspace, 'goals' | 'pipeline'>): PlanProgress {
  const dropped = new Set(ws.pipeline.filter(isDropped).map((a) => a.id));
  const goals = ws.goals.filter((g) => !g.applicationId || !dropped.has(g.applicationId));
  const done = goals.filter((g) => g.status === 'done').length;
  const next = goals
    .filter((g) => g.status !== 'done')
    .filter(hasDueDate)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate) || a.title.localeCompare(b.title))[0];
  return { done, total: goals.length, percent: goals.length ? Math.floor((done / goals.length) * 100) : 0, next };
}

/**
 * The application whose last open goal this status change completes, if any. Call it before the
 * change is saved. Declined and withdrawn applications never count: there is no celebration for them.
 */
export function completesApplication(ws: Pick<Workspace, 'goals' | 'pipeline'>, goalId: string, status: Goal['status']): string | undefined {
  const { goals } = ws;
  const goal = goals.find((g) => g.id === goalId);
  if (status !== 'done' || !goal?.applicationId || goal.status === 'done') return undefined;
  const app = ws.pipeline.find((a) => a.id === goal.applicationId);
  if (!app || isDropped(app)) return undefined;
  const siblings = goals.filter((g) => g.applicationId === goal.applicationId && g.id !== goalId);
  return siblings.every((g) => g.status === 'done') ? goal.applicationId : undefined;
}
