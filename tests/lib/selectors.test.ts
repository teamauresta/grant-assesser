import { describe, it, expect } from 'vitest';
import { WorkspaceSchema, type Application, type Goal, type Workspace } from '@/lib/schema';
import { getProgram } from '@/content/programs';
import { parseAmount } from '@/lib/plan/applications';
import { agenda, applicationProgress, dueWithin, goalsByApplication, isOverdue, monthGrid, planItems } from '@/lib/plan/selectors';

// 11:00 on 27 Oct 2026 in Melbourne.
const now = new Date('2026-10-27T00:00:00Z');
const stamp = now.toISOString();
const worksafe = getProgram('worksafe-rtw-trials')!;

const goal = (id: string, over: Partial<Goal> = {}): Goal => ({
  id, title: `Goal ${id}`, dueDate: '2026-11-01', status: 'todo', steps: [], reminderOffsetsDays: [7, 1],
  source: 'user', sequence: 0, createdAt: stamp, updatedAt: stamp, ...over,
});
const app = (id: string, over: Partial<Application> = {}): Application =>
  ({ id, stage: 'considering', notes: '', createdAt: stamp, updatedAt: stamp, ...over });
const workspace = (over: Partial<Workspace> = {}): Workspace => WorkspaceSchema.parse({
  schemaVersion: 1, workspaceId: 'w', profile: {}, pipeline: [], goals: [], settings: {},
  changesSinceCalendarExport: 0, createdAt: stamp, updatedAt: stamp, ...over,
});

describe('dueWithin', () => {
  const goals = [
    goal('later', { dueDate: '2026-11-04' }),
    goal('overdue', { dueDate: '2026-10-20' }),
    goal('today', { dueDate: '2026-10-27' }),
    goal('edge', { dueDate: '2026-11-03' }),
    goal('done', { dueDate: '2026-10-28', status: 'done' }),
    goal('undated', { dueDate: undefined }),
  ];
  it('returns open goals due within N days, including overdue ones, sorted by date', () => {
    expect(dueWithin(goals, now, 7).map((g) => g.id)).toEqual(['overdue', 'today', 'edge']);
  });
  it('sorts goals due the same day by title', () => {
    const same = [goal('b', { title: 'B', dueDate: '2026-10-28' }), goal('a', { title: 'A', dueDate: '2026-10-28' })];
    expect(dueWithin(same, now, 7).map((g) => g.id)).toEqual(['a', 'b']);
  });
  it('uses the Melbourne calendar date for "today"', () => {
    // 14:00 UTC on 27 Oct is already 28 Oct in Melbourne, so a goal due 27 Oct is overdue.
    const late = new Date('2026-10-27T14:00:00Z');
    expect(isOverdue(goal('x', { dueDate: '2026-10-27' }), late)).toBe(true);
    expect(isOverdue(goal('x', { dueDate: '2026-10-27' }), now)).toBe(false);
    expect(isOverdue(goal('x', { dueDate: '2026-10-20', status: 'done' }), now)).toBe(false);
  });
});

describe('goalsByApplication', () => {
  it('groups goals under their application in pipeline order, then "Other goals"', () => {
    const ws = workspace({
      pipeline: [app('a1', { programSlug: 'worksafe-rtw-trials' }), app('a2', { customName: 'Angel round' }), app('a3', { customName: 'Empty' })],
      goals: [goal('g1', { applicationId: 'a2' }), goal('g2', { applicationId: 'a1' }), goal('g3'), goal('g4', { applicationId: 'gone' })],
    });
    const groups = goalsByApplication(ws);
    expect(groups.map((g) => [g.id, g.name, g.goals.map((x) => x.id)])).toEqual([
      ['a1', worksafe.name, ['g2']],
      ['a2', 'Angel round', ['g1']],
      ['a3', 'Empty', []],
      ['other', 'Other goals', ['g3', 'g4']],
    ]);
    expect(groups[0].application?.id).toBe('a1');
    expect(groups[3].application).toBeUndefined();
  });
  it('orders open goals by due date (undated last) and puts done goals at the end', () => {
    const ws = workspace({
      goals: [goal('done', { status: 'done', dueDate: '2026-10-01' }), goal('undated', { dueDate: undefined }), goal('late', { dueDate: '2026-12-01' }), goal('soon', { dueDate: '2026-10-30' })],
    });
    expect(goalsByApplication(ws)[0].goals.map((g) => g.id)).toEqual(['soon', 'late', 'undated', 'done']);
  });
  it('omits "Other goals" when every goal belongs to an application', () => {
    expect(goalsByApplication(workspace({ pipeline: [app('a1', { customName: 'X' })] })).map((g) => g.id)).toEqual(['a1']);
  });
});

describe('applicationProgress', () => {
  it('counts done goals and finds the next open goal with a due date', () => {
    const goals = [
      goal('d', { applicationId: 'a1', status: 'done', dueDate: '2026-10-28' }),
      goal('n2', { applicationId: 'a1', dueDate: '2026-11-10' }),
      goal('n1', { applicationId: 'a1', dueDate: '2026-11-02' }),
      goal('u', { applicationId: 'a1', dueDate: undefined }),
      goal('x', { applicationId: 'a2', dueDate: '2026-10-29' }),
    ];
    const p = applicationProgress(goals, 'a1');
    expect(p).toMatchObject({ done: 1, total: 4 });
    expect(p.next?.id).toBe('n1');
    expect(applicationProgress(goals, 'none')).toEqual({ done: 0, total: 0, next: undefined });
  });
});

describe('monthGrid', () => {
  it('returns Monday-start weeks of ISO dates covering the month', () => {
    const weeks = monthGrid(2026, 11); // November 2026 starts on a Sunday
    expect(weeks).toHaveLength(6);
    expect(weeks[0]).toEqual(['2026-10-26', '2026-10-27', '2026-10-28', '2026-10-29', '2026-10-30', '2026-10-31', '2026-11-01']);
    expect(weeks.at(-1)!.at(-1)).toBe('2026-12-06');
    for (const w of weeks) expect(w).toHaveLength(7);
  });
  it('has five rows for a typical month and four when February fits exactly', () => {
    expect(monthGrid(2026, 10)).toHaveLength(5); // October 2026 starts on a Thursday
    expect(monthGrid(2027, 2)).toHaveLength(4); // 1 Feb 2027 is a Monday; 28 days
    expect(monthGrid(2027, 2)[0][0]).toBe('2027-02-01');
  });
  it('handles a month that starts on a Monday and leap years', () => {
    expect(monthGrid(2028, 2).flat()).toContain('2028-02-29');
    expect(monthGrid(2026, 6)[0][0]).toBe('2026-06-01');
  });
});

describe('planItems and agenda', () => {
  const ws = workspace({
    pipeline: [
      app('a1', { programSlug: 'worksafe-rtw-trials' }),
      app('a2', { programSlug: 'iv-basecamp-ascent', stage: 'withdrawn' }),
      app('a3', { customName: 'Angel round' }),
    ],
    goals: [
      goal('g1', { applicationId: 'a1', dueDate: '2026-11-20', title: 'Submit' }),
      goal('g2', { applicationId: 'a3', dueDate: '2026-10-20', title: 'Pitch deck' }),
      goal('g3', { dueDate: '2027-03-01', title: 'Far away' }),
      goal('g4', { dueDate: '2026-11-01', status: 'done', title: 'Done' }),
      goal('g5', { dueDate: undefined, title: 'Undated' }),
    ],
  });

  it('planItems lists dated goals (with their application name) and deadlines of active applications', () => {
    const items = planItems(ws, now);
    expect(items.map((i) => i.id)).toEqual(['g2', 'g4', 'g1', 'deadline-worksafe-rtw-trials-applications-close@grant-navigator', 'g3']);
    const g1 = items.find((i) => i.id === 'g1')!;
    expect(g1).toMatchObject({ kind: 'goal', context: worksafe.name, done: false });
    const d = items.find((i) => i.kind === 'deadline')!;
    expect(d).toMatchObject({ date: '2026-11-27', title: 'Applications close', context: worksafe.name, past: false });
  });

  it('agenda merges open goals (including overdue) and future deadlines within the window, sorted', () => {
    expect(agenda(ws, now).map((i) => i.id)).toEqual(['g2', 'g1', 'deadline-worksafe-rtw-trials-applications-close@grant-navigator']);
    expect(agenda(ws, now)[0]).toMatchObject({ overdue: true });
    expect(agenda(ws, now, 200).map((i) => i.id)).toContain('g3');
  });

  it('agenda drops deadlines that have passed', () => {
    expect(agenda(ws, new Date('2026-11-28T00:00:00Z')).filter((i) => i.kind === 'deadline')).toEqual([]);
  });

  it('a deadline and a goal on the same day list the deadline first', () => {
    const same = workspace({ pipeline: [app('a1', { programSlug: 'worksafe-rtw-trials' })], goals: [goal('g', { dueDate: '2026-11-27', title: 'A goal' })] });
    expect(agenda(same, now).map((i) => i.kind)).toEqual(['deadline', 'goal']);
  });
});

describe('parseAmount', () => {
  it('reads dollars with symbols, commas and k/m suffixes', () => {
    expect(parseAmount('')).toBeUndefined();
    expect(parseAmount('$45,000')).toBe(45_000);
    expect(parseAmount('50k')).toBe(50_000);
    expect(parseAmount('1.2M')).toBe(1_200_000);
    expect(parseAmount('lots')).toBeNaN();
  });
});
