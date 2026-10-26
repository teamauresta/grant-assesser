import { describe, it, expect } from 'vitest';
import { WorkspaceSchema, type Workspace } from '@/lib/schema';
import { emptyWorkspace } from '@/lib/store/workspace-store';
import { parseImport } from '@/lib/store/transfer';
import { newId } from '@/lib/id';

const now = new Date('2026-10-27T00:00:00Z');
const t = now.toISOString();

function sample(): Workspace {
  return {
    ...emptyWorkspace(now),
    profile: { persona: 'pre-raise', companyName: 'Acme' },
    pipeline: [{ id: 'a1', programSlug: 'rdti', stage: 'preparing', notes: 'n', createdAt: t, updatedAt: t }],
    goals: [{
      id: 'g1', applicationId: 'a1', title: 'Register', status: 'todo', steps: [{ id: 's1', title: 'Email', done: false }],
      reminderOffsetsDays: [7, 1], source: 'template', sequence: 0, createdAt: t, updatedAt: t,
    }],
  };
}

/** Deep-sets a value on a fresh sample and returns the JSON a crafted import file would contain. */
function crafted(edit: (ws: Workspace) => void): string {
  const ws = structuredClone(sample());
  edit(ws);
  return JSON.stringify(ws);
}

const rejects = (text: string, path: RegExp) => {
  const r = parseImport(text);
  expect(r.ok).toBe(false);
  if (!r.ok) {
    expect(r.error).toMatch(path);
    expect(r.error).toMatch(/Export a fresh copy/);
  }
};

describe('workspace timestamps', () => {
  it('accepts the toISOString() form our own code writes', () => {
    expect(WorkspaceSchema.safeParse(sample()).success).toBe(true);
    expect(WorkspaceSchema.safeParse({ ...sample(), lastExportedAt: t, lastCalendarExportAt: t }).success).toBe(true);
  });
  it.each([
    ['createdAt', (ws: Workspace) => { ws.createdAt = 'not-a-date'; }, /createdAt/],
    ['updatedAt', (ws: Workspace) => { ws.updatedAt = '2026-13-01T00:00:00Z'; }, /updatedAt/],
    ['lastExportedAt', (ws: Workspace) => { ws.lastExportedAt = 'yesterday'; }, /lastExportedAt/],
    ['lastCalendarExportAt', (ws: Workspace) => { ws.lastCalendarExportAt = ''; }, /lastCalendarExportAt/],
    ['application createdAt', (ws: Workspace) => { ws.pipeline[0].createdAt = 'soon'; }, /pipeline\[0\]\.createdAt/],
    ['goal updatedAt', (ws: Workspace) => { ws.goals[0].updatedAt = '2026-02-31T00:00:00Z'; }, /goals\[0\]\.updatedAt/],
  ])('rejects an invalid %s with a readable error', (_name, edit, path) => {
    rejects(crafted(edit), path);
  });
});

describe('workspace bounds', () => {
  it('reminder defaults must be distinct non-negative whole days, at most 5, up to 365', () => {
    const ok = (v: unknown) => WorkspaceSchema.safeParse({ ...sample(), settings: { theme: 'system', remindersDefault: v } }).success;
    expect(ok([14, 7, 3, 1, 0])).toBe(true);
    expect(ok([365])).toBe(true);
    expect(ok([-1])).toBe(false);
    expect(ok([366])).toBe(false);
    expect(ok([1.5])).toBe(false);
    expect(ok([7, 7])).toBe(false);
    expect(ok([30, 14, 7, 3, 2, 1])).toBe(false);
    rejects(crafted((ws) => { ws.settings.remindersDefault = [-3]; }), /settings\.remindersDefault/);
  });
  it('goal reminder offsets have the same bounds', () => {
    rejects(crafted((ws) => { ws.goals[0].reminderOffsetsDays = [400]; }), /goals\[0\]\.reminderOffsetsDays/);
    rejects(crafted((ws) => { ws.goals[0].reminderOffsetsDays = [1, 1]; }), /goals\[0\]\.reminderOffsetsDays/);
    rejects(crafted((ws) => { ws.goals[0].reminderOffsetsDays = [1, 2, 3, 4, 5, 6]; }), /goals\[0\]\.reminderOffsetsDays/);
  });
  it('ids are short and limited to letters, digits, _ and -', () => {
    expect(newId()).toMatch(/^[A-Za-z0-9_-]{1,64}$/);
    rejects(crafted((ws) => { ws.workspaceId = 'x\r\nBEGIN:VEVENT'; }), /workspaceId/);
    rejects(crafted((ws) => { ws.pipeline[0].id = 'a b'; }), /pipeline\[0\]\.id/);
    rejects(crafted((ws) => { ws.goals[0].id = 'g'.repeat(65); }), /goals\[0\]\.id/);
    rejects(crafted((ws) => { ws.goals[0].applicationId = 'a1\n'; }), /goals\[0\]\.applicationId/);
    rejects(crafted((ws) => { ws.goals[0].steps[0].id = ''; }), /goals\[0\]\.steps\[0\]\.id/);
  });
  it('caps text lengths', () => {
    const long = (n: number) => 'x'.repeat(n);
    expect(WorkspaceSchema.safeParse({ ...sample(), profile: { companyName: long(200) } }).success).toBe(true);
    rejects(crafted((ws) => { ws.profile.companyName = long(201); }), /profile\.companyName/);
    rejects(crafted((ws) => { ws.pipeline[0].customName = long(201); }), /pipeline\[0\]\.customName/);
    rejects(crafted((ws) => { ws.pipeline[0].notes = long(5001); }), /pipeline\[0\]\.notes/);
    rejects(crafted((ws) => { ws.goals[0].title = long(201); }), /goals\[0\]\.title/);
    rejects(crafted((ws) => { ws.goals[0].steps[0].title = long(201); }), /goals\[0\]\.steps\[0\]\.title/);
  });
});
