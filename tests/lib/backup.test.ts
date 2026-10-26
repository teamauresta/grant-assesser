import { describe, it, expect } from 'vitest';
import { emptyWorkspace } from '@/lib/store/workspace-store';
import { BACKUP_AFTER_DAYS, needsBackup } from '@/lib/store/backup';
import type { Workspace } from '@/lib/schema';

const DAY = 86_400_000;
const created = new Date('2026-09-01T00:00:00Z');
const after = (days: number, from = created) => new Date(from.getTime() + days * DAY);

function withContent(extra: Partial<Workspace> = {}): Workspace {
  const ws = emptyWorkspace(created);
  const t = created.toISOString();
  return {
    ...ws,
    pipeline: [{ id: 'a1', programSlug: 'rdti', stage: 'considering', notes: '', createdAt: t, updatedAt: t }],
    ...extra,
  };
}

describe('needsBackup', () => {
  it('uses a 14-day threshold', () => expect(BACKUP_AFTER_DAYS).toBe(14));

  it('never prompts for an empty workspace', () => {
    expect(needsBackup(emptyWorkspace(created), after(100))).toBe(false);
  });

  it('counts goals as content too', () => {
    const t = created.toISOString();
    const ws = { ...emptyWorkspace(created), goals: [{ id: 'g', title: 'x', status: 'todo' as const, steps: [], reminderOffsetsDays: [1], source: 'user' as const, sequence: 0, createdAt: t, updatedAt: t }] };
    expect(needsBackup(ws, after(15))).toBe(true);
  });

  it('never exported: prompts once the workspace is more than 14 days old', () => {
    expect(needsBackup(withContent(), after(14))).toBe(false);
    expect(needsBackup(withContent(), after(14.01))).toBe(true);
  });

  it('exported and unchanged since: no prompt however long ago', () => {
    const exported = after(1).toISOString();
    expect(needsBackup(withContent({ lastExportedAt: exported, updatedAt: exported }), after(200))).toBe(false);
  });

  it('edited since the export: prompts once the export is more than 14 days old', () => {
    const ws = withContent({ lastExportedAt: after(1).toISOString(), updatedAt: after(2).toISOString() });
    expect(needsBackup(ws, after(15))).toBe(false);
    expect(needsBackup(ws, after(15.01))).toBe(true);
  });

  it('prompts when the last edit is more than 14 days after the export', () => {
    const ws = withContent({ lastExportedAt: after(1).toISOString(), updatedAt: after(16).toISOString() });
    expect(needsBackup(ws, after(16))).toBe(true);
  });

  it('ignores unparseable timestamps rather than prompting', () => {
    expect(needsBackup(withContent({ createdAt: 'garbage' }), after(100))).toBe(false);
  });
});
