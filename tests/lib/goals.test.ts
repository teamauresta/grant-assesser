import { describe, it, expect } from 'vitest';
import { goalsFromTemplate } from '@/lib/plan/goals';
import { makeProgram } from '../helpers/program';

const now = new Date('2026-10-27T00:00:00Z');

describe('goalsFromTemplate', () => {
  it('offsetDays counts from today (Melbourne)', () => {
    const p = makeProgram({ status: { state: 'rolling' }, goalTemplate: [{ title: 'Send EOI', offsetDays: 7 }] });
    const [g] = goalsFromTemplate(p, 'app1', now, {});
    expect(g).toMatchObject({ title: 'Send EOI', dueDate: '2026-11-03', applicationId: 'app1', status: 'todo', source: 'template' });
  });
  it('beforeDeadlineBusinessDays counts back from the next close', () => {
    const p = makeProgram({ deadlines: [{ label: 'Close', kind: 'close', date: '2026-11-27', time: '14:00' }],
      goalTemplate: [{ title: 'Submit', beforeDeadlineBusinessDays: 5 }] });
    expect(goalsFromTemplate(p, 'a', now, {})[0].dueDate).toBe('2026-11-20');
  });
  it('falls back to +14 days when nothing is specified', () => {
    const p = makeProgram({ status: { state: 'rolling' }, goalTemplate: [{ title: 'Do it' }] });
    expect(goalsFromTemplate(p, 'a', now, {})[0].dueDate).toBe('2026-11-10');
  });
  it('uses the reminders it is given (the workspace default)', () => {
    const p = makeProgram({ status: { state: 'rolling' }, goalTemplate: [{ title: 'A' }, { title: 'B' }] });
    const goals = goalsFromTemplate(p, 'a', now, {}, [14, 3]);
    expect(goals.map((g) => g.reminderOffsetsDays)).toEqual([[14, 3], [14, 3]]);
    expect(goals[0].reminderOffsetsDays).not.toBe(goals[1].reminderOffsetsDays);
  });
});
