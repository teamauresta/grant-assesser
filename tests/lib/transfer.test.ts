import { describe, it, expect, vi } from 'vitest';
import { emptyWorkspace } from '@/lib/store/workspace-store';
import { exportWorkspaceFile, parseImport, serializeWorkspace, workspaceFilename } from '@/lib/store/transfer';
import * as download from '@/lib/download';
import type { Workspace } from '@/lib/schema';

const now = new Date('2026-10-27T00:00:00Z');

function sample(): Workspace {
  const ws = emptyWorkspace(now);
  const t = now.toISOString();
  return {
    ...ws,
    profile: { persona: 'pre-raise', fyEndMonth: 6 },
    pipeline: [{ id: 'a1', programSlug: 'rdti', stage: 'preparing', notes: 'Talk to adviser', createdAt: t, updatedAt: t }],
    goals: [
      { id: 'g1', applicationId: 'a1', title: 'Register R&D activities', status: 'todo', steps: [], reminderOffsetsDays: [7, 1], source: 'template', sequence: 0, createdAt: t, updatedAt: t },
      { id: 'g2', title: 'Book adviser', status: 'done', steps: [{ id: 's1', title: 'Email', done: true }], reminderOffsetsDays: [1], source: 'user', sequence: 2, createdAt: t, updatedAt: t },
    ],
  };
}

describe('serializeWorkspace', () => {
  it('writes pretty-printed JSON', () => {
    const ws = sample();
    const text = serializeWorkspace(ws);
    expect(text).toContain('\n  "schemaVersion": 1');
    expect(JSON.parse(text)).toEqual(ws);
  });
});

describe('workspaceFilename', () => {
  it('uses the Melbourne date', () => {
    // 27 Oct 2026 14:00 UTC is already 28 Oct in Melbourne (AEDT, UTC+11).
    expect(workspaceFilename(new Date('2026-10-27T14:00:00Z'))).toBe('grant-navigator-workspace-2026-10-28.json');
    expect(workspaceFilename(new Date('2026-10-27T12:00:00Z'))).toBe('grant-navigator-workspace-2026-10-27.json');
  });
});

describe('parseImport', () => {
  it('round-trips a valid export and summarises it', () => {
    const ws = sample();
    const r = parseImport(serializeWorkspace(ws));
    expect(r).toEqual({ ok: true, ws, summary: { hasProfile: true, applications: 1, goals: 2 } });
  });

  it('reports an empty profile', () => {
    const r = parseImport(serializeWorkspace(emptyWorkspace(now)));
    expect(r.ok && r.summary).toEqual({ hasProfile: false, applications: 0, goals: 0 });
  });

  it('rejects invalid JSON with a readable cause and fix', () => {
    const r = parseImport('{"schemaVersion": 1,');
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error).toMatch(/isn't valid JSON/);
    expect(r.error).toMatch(/Choose the \.json file/);
  });

  it('rejects files that are not Grant Navigator workspaces', () => {
    for (const text of ['[1,2,3]', '"hello"', 'null', '{"name":"something else"}']) {
      const r = parseImport(text);
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.error).toMatch(/isn't a Grant Navigator workspace/);
    }
  });

  it('rejects a version-2 file as coming from a newer version', () => {
    const r = parseImport(JSON.stringify({ ...sample(), schemaVersion: 2 }));
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error).toMatch(/newer version/);
      expect(r.error).toMatch(/version 2/);
    }
  });

  it('rejects other unsupported versions', () => {
    const r = parseImport(JSON.stringify({ ...sample(), schemaVersion: 0 }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/unsupported workspace version \(0\)/);
  });

  it('summarises schema errors to the first three field paths', () => {
    const bad = sample() as unknown as Record<string, unknown>;
    bad.pipeline = [{ ...sample().pipeline[0], stage: 'dreaming' }];
    bad.goals = [{ id: 'g1' }];
    bad.settings = { theme: 'neon' };
    const r = parseImport(JSON.stringify(bad));
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error).toMatch(/pipeline\[0\]\.stage/);
    expect(r.error).toMatch(/goals\[0\]\.title/);
    expect(r.error).toMatch(/and \d+ more/);
    expect(r.error).not.toMatch(/settings\.theme/);
    expect(r.error).toMatch(/Export a fresh copy/);
  });
});

describe('exportWorkspaceFile', () => {
  it('stamps the export time into the file so a re-import does not prompt for a backup', () => {
    const spy = vi.spyOn(download, 'downloadFile').mockImplementation(() => {});
    const ws = sample();
    exportWorkspaceFile(ws, now);
    const [name, text, type] = spy.mock.calls[0];
    expect(name).toBe('grant-navigator-workspace-2026-10-27.json');
    expect(type).toBe('application/json');
    const r = parseImport(text as string);
    expect(r.ok && r.ws).toEqual({ ...ws, lastExportedAt: now.toISOString() });
    spy.mockRestore();
  });
});
