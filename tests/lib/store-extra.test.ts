import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { CORRUPT_KEY_PREFIX, LocalWorkspaceStore, MemoryWorkspaceStore, STORAGE_KEY, emptyWorkspace } from '@/lib/store/workspace-store';
import { SAVE_DEBOUNCE_MS, createWorkspaceStore } from '@/lib/store/use-workspace';
import type { Workspace } from '@/lib/schema';

class FakeStorage { m = new Map<string, string>(); getItem(k: string) { return this.m.get(k) ?? null; } setItem(k: string, v: string) { this.m.set(k, v); } removeItem(k: string) { this.m.delete(k); } }
const at = new Date('2026-10-27T00:00:00Z');
const clock = () => at;

describe('corrupt stored data', () => {
  it('keeps the unreadable raw string under a backup key before starting fresh', async () => {
    const storage = new FakeStorage();
    storage.setItem(STORAGE_KEY, '{"schemaVersion":1,"broken":');
    const useWs = createWorkspaceStore(new LocalWorkspaceStore(storage as unknown as Storage), clock);
    await useWs.getState().init();

    const key = `${CORRUPT_KEY_PREFIX}${at.getTime()}`;
    expect(useWs.getState().corruptBackupKey).toBe(key);
    expect(storage.getItem(key)).toBe('{"schemaVersion":1,"broken":');
    expect(useWs.getState().ready).toBe(true);
    expect(useWs.getState().ws.pipeline).toEqual([]);
  });
  it('also rescues valid JSON from an unsupported version', async () => {
    const storage = new FakeStorage();
    storage.setItem(STORAGE_KEY, JSON.stringify({ schemaVersion: 99 }));
    const useWs = createWorkspaceStore(new LocalWorkspaceStore(storage as unknown as Storage), clock);
    await useWs.getState().init();
    expect(storage.getItem(useWs.getState().corruptBackupKey!)).toBe('{"schemaVersion":99}');
  });
  it('makes no backup when nothing is stored or the data is valid', async () => {
    const storage = new FakeStorage();
    const s = new LocalWorkspaceStore(storage as unknown as Storage);
    expect(await s.rescueCorrupt(at)).toBeNull();
    await s.save(emptyWorkspace(at));
    expect(await s.rescueCorrupt(at)).toBeNull();
    expect([...storage.m.keys()]).toEqual([STORAGE_KEY]);
  });
});

describe('debounced saving', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it('rapid mutations cause one save, 500ms after the last', async () => {
    const backing = new MemoryWorkspaceStore();
    const save = vi.spyOn(backing, 'save');
    const useWs = createWorkspaceStore(backing, clock);
    await useWs.getState().init();

    const { setProfile, addApplication, addGoal } = useWs.getState();
    setProfile({ persona: 'bootstrapped' });
    vi.advanceTimersByTime(300);
    addApplication('csiro-kick-start');
    vi.advanceTimersByTime(300);
    addGoal({ title: 'Call the bank' });
    vi.advanceTimersByTime(SAVE_DEBOUNCE_MS - 1);
    expect(save).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(save).toHaveBeenCalledTimes(1);
    const saved = save.mock.calls[0][0] as Workspace;
    expect(saved.profile.persona).toBe('bootstrapped');
    expect(saved.pipeline).toHaveLength(1);
    expect(saved.goals.some((g) => g.title === 'Call the bank')).toBe(true);
  });
  it('does not save when nothing changed, and flush saves a pending change at once', async () => {
    const backing = new MemoryWorkspaceStore();
    const save = vi.spyOn(backing, 'save');
    const useWs = createWorkspaceStore(backing, clock);
    await useWs.getState().init();
    await useWs.getState().init(); // idempotent
    vi.advanceTimersByTime(2000);
    expect(save).not.toHaveBeenCalled();

    useWs.getState().setProfile({ companyName: 'Acme' });
    await useWs.getState().flush();
    expect(save).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(2000);
    expect(save).toHaveBeenCalledTimes(1);
    expect((await backing.load())?.profile.companyName).toBe('Acme');
  });
  it('a reloaded store sees what was saved', async () => {
    const storage = new FakeStorage() as unknown as Storage;
    const a = createWorkspaceStore(new LocalWorkspaceStore(storage), clock);
    await a.getState().init();
    a.getState().setProfile({ persona: 'pre-raise' });
    vi.advanceTimersByTime(SAVE_DEBOUNCE_MS);
    const b = createWorkspaceStore(new LocalWorkspaceStore(storage), clock);
    await b.getState().init();
    expect(b.getState().ws.profile).toEqual({ persona: 'pre-raise', vcBacked: false });
    expect(b.getState().ws.workspaceId).toBe(a.getState().ws.workspaceId);
  });
});

describe('workspace actions (more)', () => {
  let useWs: ReturnType<typeof createWorkspaceStore>;
  beforeEach(async () => { useWs = createWorkspaceStore(new MemoryWorkspaceStore(), clock); await useWs.getState().init(); });
  const ws = () => useWs.getState().ws;

  it('is not ready before init', () => {
    expect(createWorkspaceStore(new MemoryWorkspaceStore(), clock).getState().ready).toBe(false);
    expect(useWs.getState().ready).toBe(true);
  });
  it('switching persona follows the new default unless vcBacked was answered differently', () => {
    const { setProfile } = useWs.getState();
    setProfile({ persona: 'bootstrapped' });
    expect(ws().profile.vcBacked).toBe(false);
    setProfile({ persona: 'vc-backed' });
    expect(ws().profile.vcBacked).toBe(true);
    setProfile({ vcBacked: false }); // an explicit answer that differs from the vc-backed default
    setProfile({ persona: 'pre-raise' });
    expect(ws().profile.vcBacked).toBe(false);
    setProfile({ vcBacked: true });
    setProfile({ persona: 'bootstrapped' });
    expect(ws().profile.vcBacked).toBe(true);
    setProfile({ persona: 'vc-backed', vcBacked: false });
    expect(ws().profile.vcBacked).toBe(false);
  });
  it('profile changes keep the object identity of untouched parts and do not count calendar changes', () => {
    const pipeline = ws().pipeline;
    useWs.getState().setProfile({ companyName: 'Acme' });
    expect(ws().pipeline).toBe(pipeline);
    expect(ws().changesSinceCalendarExport).toBe(0);
  });
  it('addApplication ignores duplicates and unknown slugs', () => {
    expect(useWs.getState().addApplication('csiro-kick-start')).toBeTypeOf('string');
    expect(useWs.getState().addApplication('csiro-kick-start')).toBeUndefined();
    expect(useWs.getState().addApplication('no-such-program')).toBeUndefined();
    expect(ws().pipeline).toHaveLength(1);
    expect(ws().pipeline[0]).toMatchObject({ programSlug: 'csiro-kick-start', stage: 'considering' });
    expect(ws().changesSinceCalendarExport).toBe(1);
  });
  it('template goals use the workspace default reminders', () => {
    useWs.getState().setSettings({ remindersDefault: [14, 3] });
    useWs.getState().addApplication('csiro-kick-start');
    expect(ws().goals.length).toBeGreaterThan(0);
    for (const g of ws().goals) expect(g.reminderOffsetsDays).toEqual([14, 3]);
  });
  it('addCustomApplication and updateApplication', () => {
    const id = useWs.getState().addCustomApplication('Local council grant');
    useWs.getState().updateApplication(id, { expectedAmount: 5000, notes: 'Ask about timing' });
    expect(ws().pipeline[0]).toMatchObject({ customName: 'Local council grant', expectedAmount: 5000, notes: 'Ask about timing' });
  });
  it('unknown ids are no-ops', () => {
    const before = ws();
    useWs.getState().moveApplication('nope', 'submitted');
    useWs.getState().updateGoal('nope', { title: 'x' });
    useWs.getState().removeGoal('nope');
    useWs.getState().removeApplication('nope');
    expect(ws()).toBe(before);
  });
  it('goals: add with defaults, update bumps sequence, toggle steps, remove', () => {
    const id = useWs.getState().addGoal({ title: 'Secure a paid pilot', source: 'persona', steps: [{ id: 's1', title: 'Pick a customer', done: false }] });
    const g = () => ws().goals.find((x) => x.id === id)!;
    expect(g()).toMatchObject({ status: 'todo', source: 'persona', sequence: 0, reminderOffsetsDays: [7, 1] });
    useWs.getState().updateGoal(id, { status: 'doing' });
    expect(g()).toMatchObject({ status: 'doing', sequence: 1 });
    useWs.getState().toggleStep(id, 's1');
    expect(g().steps[0].done).toBe(true);
    expect(g().sequence).toBe(2);
    useWs.getState().removeGoal(id);
    expect(ws().goals).toHaveLength(0);
    expect(ws().changesSinceCalendarExport).toBe(4);
  });
  it('markCalendarExported zeroes the change count; markExported stamps the export', () => {
    useWs.getState().addGoal({ title: 'a' });
    useWs.getState().markCalendarExported();
    expect(ws()).toMatchObject({ changesSinceCalendarExport: 0, lastCalendarExportAt: at.toISOString() });
    useWs.getState().markExported();
    expect(ws().lastExportedAt).toBe(at.toISOString());
  });
  it('setSettings, importWorkspace and reset', () => {
    useWs.getState().setSettings({ theme: 'dark' });
    expect(ws().settings).toEqual({ theme: 'dark', remindersDefault: [7, 1], celebrations: true });
    const other = { ...emptyWorkspace(at), profile: { companyName: 'Imported' } };
    useWs.getState().importWorkspace(other);
    expect(ws().profile.companyName).toBe('Imported');
    const id = ws().workspaceId;
    useWs.getState().reset();
    expect(ws().profile).toEqual({});
    expect(ws().workspaceId).not.toBe(id);
  });
});

describe('financial-year end changes move calendar deadlines', () => {
  let useWs: ReturnType<typeof createWorkspaceStore>;
  const count = () => useWs.getState().ws.changesSinceCalendarExport;
  beforeEach(async () => { useWs = createWorkspaceStore(new MemoryWorkspaceStore(), clock); await useWs.getState().init(); });

  it('counts a change when fyEndMonth changes and the pipeline has entries', () => {
    useWs.getState().addApplication('rdti');
    const before = count();
    useWs.getState().setProfile({ fyEndMonth: 12 });
    expect(count()).toBe(before + 1);
    useWs.getState().setProfile({ fyEndMonth: undefined });
    expect(count()).toBe(before + 2);
  });
  it('does not count when the effective month is unchanged (unset means 30 June)', () => {
    useWs.getState().addApplication('rdti');
    const before = count();
    useWs.getState().setProfile({ fyEndMonth: 6 });
    useWs.getState().setProfile({ fyEndMonth: 6 });
    useWs.getState().setProfile({ companyName: 'Acme' });
    expect(count()).toBe(before);
  });
  it('does not count with an empty pipeline', () => {
    useWs.getState().setProfile({ fyEndMonth: 3 });
    expect(count()).toBe(0);
    expect(useWs.getState().ws.profile.fyEndMonth).toBe(3);
  });
});
