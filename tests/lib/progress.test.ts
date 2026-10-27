import { describe, it, expect } from 'vitest';
import { completesApplication, planProgress } from '@/lib/plan/progress';
import { emptyWorkspace } from '@/lib/store/workspace-store';
import type { Goal, Workspace } from '@/lib/schema';

const now = new Date('2026-10-27T00:00:00Z');
const t = now.toISOString();
const goal = (id: string, fields: Partial<Goal>): Goal => ({ id, title: id, status: 'todo', steps: [], reminderOffsetsDays: [7], source: 'user', sequence: 0, createdAt: t, updatedAt: t, ...fields });

function ws(): Workspace {
  return {
    ...emptyWorkspace(now),
    pipeline: [
      { id: 'a', programSlug: 'rdti', stage: 'preparing', notes: '', createdAt: t, updatedAt: t },
      { id: 'b', programSlug: 'csiro-kick-start', stage: 'declined', notes: '', createdAt: t, updatedAt: t },
    ],
    goals: [
      goal('g1', { applicationId: 'a', status: 'done' }),
      goal('g2', { applicationId: 'a', dueDate: '2026-11-10' }),
      goal('g3', { applicationId: 'a', dueDate: '2026-11-02' }),
      goal('g4', { applicationId: 'b' }), // declined: not counted
      goal('g5', {}), // no application: counted
    ],
  };
}

describe('planProgress', () => {
  it('counts goals of applications still being pursued, plus unattached goals', () => {
    expect(planProgress(ws())).toMatchObject({ done: 1, total: 4, percent: 25 });
  });
  it('names the next open goal by due date', () => {
    expect(planProgress(ws()).next?.id).toBe('g3');
  });
  it('is 0% with nothing to do', () => {
    expect(planProgress(emptyWorkspace(now))).toEqual({ done: 0, total: 0, percent: 0, next: undefined });
  });
});

describe('completesApplication', () => {
  it('returns the application id when this change finishes its last open goal', () => {
    const w = ws();
    w.goals = w.goals.map((g) => (g.id === 'g2' ? { ...g, status: 'done' } : g));
    expect(completesApplication(w.goals, 'g3', 'done')).toBe('a');
  });
  it('is undefined while other goals stay open, when un-completing, or for unattached goals', () => {
    expect(completesApplication(ws().goals, 'g3', 'done')).toBeUndefined();
    expect(completesApplication(ws().goals, 'g1', 'todo')).toBeUndefined();
    expect(completesApplication(ws().goals, 'g5', 'done')).toBeUndefined();
  });
});
