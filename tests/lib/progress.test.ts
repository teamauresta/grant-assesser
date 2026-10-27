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
  it('rounds down, so 100% shows only when every goal is done', () => {
    const many: Workspace = {
      ...emptyWorkspace(now),
      goals: Array.from({ length: 200 }, (_, i) => goal(`m${i}`, { status: i < 199 ? 'done' : 'todo' })),
    };
    expect(planProgress(many)).toMatchObject({ done: 199, total: 200, percent: 99 });
  });
  it('needs only the goals and the pipeline', () => {
    const { goals, pipeline } = ws();
    expect(planProgress({ goals, pipeline })).toMatchObject({ done: 1, total: 4, percent: 25 });
  });
  it('is 0% with nothing to do', () => {
    expect(planProgress(emptyWorkspace(now))).toEqual({ done: 0, total: 0, percent: 0, next: undefined });
  });
});

describe('completesApplication', () => {
  it('returns the application id when this change finishes its last open goal', () => {
    const w = ws();
    w.goals = w.goals.map((g) => (g.id === 'g2' ? { ...g, status: 'done' } : g));
    expect(completesApplication(w, 'g3', 'done')).toBe('a');
  });
  it('is undefined while other goals stay open, when un-completing, or for unattached goals', () => {
    expect(completesApplication(ws(), 'g3', 'done')).toBeUndefined();
    expect(completesApplication(ws(), 'g1', 'todo')).toBeUndefined();
    expect(completesApplication(ws(), 'g5', 'done')).toBeUndefined();
  });
  it('is undefined for a declined or withdrawn application: no celebration for those', () => {
    // g4 is the only goal of declined application b, so finishing it would otherwise complete b.
    expect(completesApplication(ws(), 'g4', 'done')).toBeUndefined();
    const withdrawn = ws();
    withdrawn.pipeline = withdrawn.pipeline.map((a) => (a.id === 'b' ? { ...a, stage: 'withdrawn' } : a));
    expect(completesApplication(withdrawn, 'g4', 'done')).toBeUndefined();
    // The same goal completes b once b is back in progress.
    const pursued = ws();
    pursued.pipeline = pursued.pipeline.map((a) => (a.id === 'b' ? { ...a, stage: 'submitted' } : a));
    expect(completesApplication(pursued, 'g4', 'done')).toBe('b');
  });
});
