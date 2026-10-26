import { describe, it, expect } from 'vitest';
import { WorkspaceSchema, type Goal, type Workspace } from '@/lib/schema';
import { getProgram } from '@/content/programs';
import { resolveDeadlines } from '@/lib/status';
import { buildIcs, foldLine } from '@/lib/calendar/ics';
import { googleCalendarUrl, outlookCalendarUrl } from '@/lib/calendar/links';
import { deadlineFilename, deadlineToEvent, goalFilename, goalToEvent, slugify, workspaceEvents } from '@/lib/calendar/events';

const now = new Date('2026-10-27T00:00:00Z');
const appUrl = 'https://x.test/grant-assesser';
const stamp = now.toISOString();
const worksafe = getProgram('worksafe-rtw-trials')!;

const goal = (over: Partial<Goal> = {}): Goal => ({
  id: 'g1', title: 'Submit EOI', dueDate: '2026-11-20', status: 'todo', steps: [], reminderOffsetsDays: [7, 1],
  source: 'user', sequence: 3, createdAt: stamp, updatedAt: stamp, ...over,
});
const app = (id: string, programSlug?: string) =>
  ({ id, programSlug, customName: programSlug ? undefined : 'Custom', stage: 'considering' as const, notes: '', createdAt: stamp, updatedAt: stamp });
const workspace = (over: Partial<Workspace> = {}): Workspace => WorkspaceSchema.parse({
  schemaVersion: 1, workspaceId: 'w', profile: {}, pipeline: [], goals: [], settings: {},
  changesSinceCalendarExport: 0, createdAt: stamp, updatedAt: stamp, ...over,
});

describe('goalToEvent', () => {
  it('is an all-day event on the due date with a stable UID, sequence, alarms and a deep link', () => {
    const e = goalToEvent({ ...goal(), dueDate: '2026-11-20' }, appUrl);
    expect(e).toMatchObject({
      uid: 'goal-g1@grant-navigator', title: 'Submit EOI', allDay: true, date: '2026-11-20',
      sequence: 3, alarmsDaysBefore: [7, 1], url: 'https://x.test/grant-assesser/plan/?goal=g1',
    });
  });
  it('lists open steps in the description', () => {
    const e = goalToEvent({ ...goal({ steps: [{ id: 's1', title: 'Draft budget', done: false }, { id: 's2', title: 'Get quotes', done: true }] }), dueDate: '2026-11-20' }, appUrl);
    expect(e.description).toContain('Draft budget');
    expect(e.description).not.toContain('Get quotes');
  });
});

describe('deadlineToEvent', () => {
  it('a deadline with a time is a timed event at that instant, with 14/7/1-day alarms', () => {
    const [d] = resolveDeadlines(worksafe, now);
    const e = deadlineToEvent(worksafe, d, appUrl);
    expect(e).toMatchObject({
      uid: 'deadline-worksafe-rtw-trials-2026-11-27@grant-navigator', allDay: false, date: '2026-11-27',
      alarmsDaysBefore: [14, 7, 1], url: 'https://x.test/grant-assesser/programs/worksafe-rtw-trials/',
    });
    expect(e.at?.toISOString()).toBe('2026-11-27T03:00:00.000Z'); // 14:00 AEDT
    expect(e.title).toContain(worksafe.name);
  });
  it('a deadline without a time is all-day', () => {
    const rdti = getProgram('rdti')!;
    const [d] = resolveDeadlines(rdti, now, { fyEndMonth: 6 });
    expect(deadlineToEvent(rdti, d, appUrl)).toMatchObject({ allDay: true, date: '2027-04-30', uid: 'deadline-rdti-2027-04-30@grant-navigator' });
  });
});

describe('workspaceEvents', () => {
  it('includes one deadline event for a pipeline program with a future close date and skips goals marked done', () => {
    const ws = workspace({
      pipeline: [app('a1', 'worksafe-rtw-trials')],
      goals: [goal({ id: 'open' }), goal({ id: 'done', status: 'done' }), goal({ id: 'undated', dueDate: undefined })],
    });
    const events = workspaceEvents(ws, now, appUrl);
    expect(events.filter((e) => e.uid.startsWith('deadline-'))).toHaveLength(1);
    expect(events.map((e) => e.uid).sort()).toEqual(['deadline-worksafe-rtw-trials-2026-11-27@grant-navigator', 'goal-open@grant-navigator']);
  });
  it('dedupes deadlines when the same program is in the pipeline twice, and ignores custom applications', () => {
    const ws = workspace({ pipeline: [app('a1', 'worksafe-rtw-trials'), app('a2', 'worksafe-rtw-trials'), app('a3')] });
    expect(workspaceEvents(ws, now, appUrl)).toHaveLength(1);
  });
  it('skips deadlines that have passed and unknown slugs', () => {
    const ws = workspace({ pipeline: [app('a1', 'worksafe-rtw-trials'), app('a2', 'no-such-program')] });
    expect(workspaceEvents(ws, new Date('2026-11-28T00:00:00Z'), appUrl)).toEqual([]);
  });
  it('resolves profile-relative deadlines with the workspace profile', () => {
    const ws = workspace({ profile: { fyEndMonth: 12 }, pipeline: [app('a1', 'rdti')] });
    expect(workspaceEvents(ws, now, appUrl).map((e) => e.date)).toEqual(['2026-10-31']);
  });
  it('sorts events by date', () => {
    const ws = workspace({ pipeline: [app('a1', 'worksafe-rtw-trials')], goals: [goal({ id: 'late', dueDate: '2026-12-20' }), goal({ id: 'early', dueDate: '2026-11-01' })] });
    expect(workspaceEvents(ws, now, appUrl).map((e) => e.date)).toEqual(['2026-11-01', '2026-11-27', '2026-12-20']);
  });
});

describe('filenames', () => {
  it('slugify keeps ascii letters and digits', () => {
    expect(slugify('Submit the R&D  registration — café!')).toBe('submit-the-r-d-registration-cafe');
    expect(slugify('!!!')).toBe('event');
  });
  it('deadline files are <slug>-<label-slug>.ics; goal files are <title-slug>.ics', () => {
    const [d] = resolveDeadlines(worksafe, now);
    expect(deadlineFilename(worksafe, d)).toBe('worksafe-rtw-trials-applications-close.ics');
    expect(goalFilename(goal({ title: 'Submit EOI, v2' }))).toBe('submit-eoi-v2.ics');
  });
});

describe('ics and links details', () => {
  const timed = { uid: 'd1@grant-navigator', title: 'Closes', date: '2026-11-27', allDay: false, at: new Date('2026-11-27T03:00:00Z'), alarmsDaysBefore: [1], sequence: 0, description: 'Line 1\nLine 2', url: 'https://x.test/p/' };
  it('timed events end after the default 30 minutes', () => {
    expect(buildIcs([timed], now)).toContain('DTEND:20261127T033000Z');
  });
  it('ends every line with CRLF and never emits a bare LF', () => {
    const ics = buildIcs([timed], now);
    expect(ics.endsWith('\r\n')).toBe(true);
    expect(ics.replace(/\r\n/g, '')).not.toContain('\n');
  });
  it('folding never splits a multi-byte character', () => {
    const folded = foldLine('SUMMARY:' + 'é'.repeat(100));
    for (const l of folded.split('\r\n')) expect(new TextEncoder().encode(l).length).toBeLessThanOrEqual(75);
    expect(folded.replace(/\r\n /g, '')).toBe('SUMMARY:' + 'é'.repeat(100));
  });
  it('google timed links use UTC start/end and include details', () => {
    const u = new URL(googleCalendarUrl(timed));
    expect(u.searchParams.get('dates')).toBe('20261127T030000Z/20261127T033000Z');
    expect(u.searchParams.get('details')).toBe('Line 1\nLine 2\n\nhttps://x.test/p/');
  });
  it('outlook links carry subject, ISO start/end and the all-day flag', () => {
    const u = new URL(outlookCalendarUrl(timed));
    expect(u.searchParams.get('subject')).toBe('Closes');
    expect(u.searchParams.get('startdt')).toBe('2026-11-27T03:00:00.000Z');
    expect(u.searchParams.get('allday')).toBe('false');
  });
});
