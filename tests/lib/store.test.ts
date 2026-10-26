import { describe, it, expect, beforeEach } from 'vitest';
import { LocalWorkspaceStore, MemoryWorkspaceStore, migrate, emptyWorkspace } from '@/lib/store/workspace-store';
import { createWorkspaceStore } from '@/lib/store/use-workspace';

class FakeStorage { m = new Map<string, string>(); getItem(k: string) { return this.m.get(k) ?? null; } setItem(k: string, v: string) { this.m.set(k, v); } removeItem(k: string) { this.m.delete(k); } }

describe('workspace persistence', () => {
  it('migrate rejects unknown versions and invalid shapes', () => {
    expect(() => migrate({ schemaVersion: 99 })).toThrow();
    expect(() => migrate({ hello: 'world' })).toThrow();
  });
  it('local store round-trips', async () => {
    const s = new LocalWorkspaceStore(new FakeStorage() as unknown as Storage);
    expect(await s.load()).toBeNull();
    const ws = emptyWorkspace(new Date('2026-10-27T00:00:00Z'));
    await s.save(ws);
    expect(await s.load()).toEqual(ws);
  });
  it('local store reports unavailable storage', () => {
    const throwing = { getItem() { throw new Error('denied'); }, setItem() { throw new Error('denied'); }, removeItem() {} } as unknown as Storage;
    expect(new LocalWorkspaceStore(throwing).available()).toBe(false);
  });
});

describe('workspace actions', () => {
  let useWs: ReturnType<typeof createWorkspaceStore>;
  beforeEach(async () => { useWs = createWorkspaceStore(new MemoryWorkspaceStore(), () => new Date('2026-10-27T00:00:00Z')); await useWs.getState().init(); });

  it('addApplication creates starter goals from the template', () => {
    useWs.getState().addApplication('csiro-kick-start');
    const { pipeline, goals } = useWs.getState().ws;
    expect(pipeline).toHaveLength(1);
    expect(goals.length).toBeGreaterThan(0);
    expect(goals.every((g) => g.applicationId === pipeline[0].id)).toBe(true);
  });
  it('moveApplication changes stage and counts calendar changes', () => {
    useWs.getState().addApplication('csiro-kick-start');
    const id = useWs.getState().ws.pipeline[0].id;
    const before = useWs.getState().ws.changesSinceCalendarExport;
    useWs.getState().moveApplication(id, 'submitted');
    expect(useWs.getState().ws.pipeline[0].stage).toBe('submitted');
    expect(useWs.getState().ws.changesSinceCalendarExport).toBe(before + 1);
  });
  it('setProfile merges; setting a persona applies its defaults when unanswered', () => {
    useWs.getState().setProfile({ persona: 'vc-backed' });
    expect(useWs.getState().ws.profile.vcBacked).toBe(true);
    useWs.getState().setProfile({ companyName: 'Acme' });
    expect(useWs.getState().ws.profile).toMatchObject({ persona: 'vc-backed', companyName: 'Acme' });
  });
  it('removeApplication also removes its goals', () => {
    useWs.getState().addApplication('csiro-kick-start');
    const id = useWs.getState().ws.pipeline[0].id;
    useWs.getState().removeApplication(id);
    expect(useWs.getState().ws.goals.filter((g) => g.applicationId === id)).toHaveLength(0);
  });
});
