import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { CORRUPT_KEY_PREFIX, LocalWorkspaceStore, STORAGE_KEY, emptyWorkspace } from '@/lib/store/workspace-store';
import { SAVE_DEBOUNCE_MS, createWorkspaceStore } from '@/lib/store/use-workspace';
import type { Workspace } from '@/lib/schema';

/** A Storage-like map with key()/length, so code can enumerate keys as on a real localStorage. */
class FakeStorage {
  m = new Map<string, string>();
  get length() { return this.m.size; }
  key(i: number) { return [...this.m.keys()][i] ?? null; }
  getItem(k: string) { return this.m.get(k) ?? null; }
  setItem(k: string, v: string) { this.m.set(k, v); }
  removeItem(k: string) { this.m.delete(k); }
}
/** Accepts small writes (the availability probe) but refuses the workspace, like a full quota. */
class FullStorage extends FakeStorage {
  setItem(k: string, v: string) {
    if (k === STORAGE_KEY) throw new DOMException('The quota has been exceeded.', 'QuotaExceededError');
    super.setItem(k, v);
  }
}

const at = new Date('2026-10-27T00:00:00Z');
const clock = () => at;
const local = (s: FakeStorage) => new LocalWorkspaceStore(s as unknown as Storage);
const corruptKeys = (s: FakeStorage) => [...s.m.keys()].filter((k) => k.startsWith(CORRUPT_KEY_PREFIX));

describe('corrupt data is rescued once', () => {
  it('saves the fresh workspace at once, so the next load neither rescues again nor changes id', async () => {
    const storage = new FakeStorage();
    storage.setItem(STORAGE_KEY, '{"schemaVersion":1,"broken":');
    const a = createWorkspaceStore(local(storage), clock);
    await a.getState().init();
    expect(a.getState().corruptBackupKey).not.toBeNull();
    expect(JSON.parse(storage.getItem(STORAGE_KEY)!).workspaceId).toBe(a.getState().ws.workspaceId);

    const b = createWorkspaceStore(local(storage), () => new Date(at.getTime() + 60_000));
    await b.getState().init();
    expect(b.getState().corruptBackupKey).toBeNull();
    expect(b.getState().ws.workspaceId).toBe(a.getState().ws.workspaceId);
    expect(corruptKeys(storage)).toHaveLength(1);
  });

  it('rescues a stored workspace whose timestamps are not dates (it used to crash Settings)', async () => {
    const storage = new FakeStorage();
    const bad = { ...emptyWorkspace(at), lastExportedAt: 'not-a-date' };
    storage.setItem(STORAGE_KEY, JSON.stringify(bad));
    const useWs = createWorkspaceStore(local(storage), clock);
    await useWs.getState().init();
    expect(useWs.getState().corruptBackupKey).not.toBeNull();
    expect(useWs.getState().ws.lastExportedAt).toBeUndefined();
  });

  it('reset() removes every rescued copy and clears the notice, leaving other keys alone', async () => {
    vi.useFakeTimers();
    try {
      const storage = new FakeStorage();
      storage.setItem(`${CORRUPT_KEY_PREFIX}1`, 'old');
      storage.setItem(`${CORRUPT_KEY_PREFIX}2`, 'older');
      storage.setItem('gn-theme', 'dark');
      storage.setItem(STORAGE_KEY, 'garbage');
      const useWs = createWorkspaceStore(local(storage), clock);
      await useWs.getState().init();
      expect(corruptKeys(storage)).toHaveLength(3);
      useWs.getState().reset();
      await vi.advanceTimersByTimeAsync(SAVE_DEBOUNCE_MS);
      expect(corruptKeys(storage)).toEqual([]);
      expect(useWs.getState().corruptBackupKey).toBeNull();
      expect(storage.getItem('gn-theme')).toBe('dark');
      expect(JSON.parse(storage.getItem(STORAGE_KEY)!).workspaceId).toBe(useWs.getState().ws.workspaceId);
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('another tab saved', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it('reloads from storage, cancels the pending save and does not write the data back', async () => {
    const storage = new FakeStorage();
    const store = local(storage);
    const mine = createWorkspaceStore(store, clock);
    await mine.getState().init();
    mine.getState().setProfile({ companyName: 'Mine, unsaved' });

    const theirs: Workspace = { ...mine.getState().ws, profile: { companyName: 'From the other tab' } };
    storage.setItem(STORAGE_KEY, JSON.stringify(theirs));
    const save = vi.spyOn(store, 'save');

    expect(await mine.getState().syncFromStorage()).toBe(true);
    expect(mine.getState().ws.profile.companyName).toBe('From the other tab');
    await vi.advanceTimersByTimeAsync(SAVE_DEBOUNCE_MS * 4);
    expect(save).not.toHaveBeenCalled();
    expect(JSON.parse(storage.getItem(STORAGE_KEY)!).profile.companyName).toBe('From the other tab');

    // Later edits still save as usual.
    mine.getState().setProfile({ companyName: 'Edited after sync' });
    await vi.advanceTimersByTimeAsync(SAVE_DEBOUNCE_MS);
    expect(save).toHaveBeenCalledOnce();
  });

  it('ignores storage it cannot read, keeping the current workspace', async () => {
    const storage = new FakeStorage();
    const mine = createWorkspaceStore(local(storage), clock);
    await mine.getState().init();
    const before = mine.getState().ws;
    storage.setItem(STORAGE_KEY, '{"broken":');
    expect(await mine.getState().syncFromStorage()).toBe(false);
    expect(mine.getState().ws).toBe(before);
  });
});

describe('a full quota', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it('LocalWorkspaceStore.save reports the failure', async () => {
    expect(await local(new FullStorage()).save(emptyWorkspace(at))).toBe(false);
    expect(await local(new FakeStorage()).save(emptyWorkspace(at))).toBe(true);
  });

  it('turns storageAvailable off so the banner appears', async () => {
    const useWs = createWorkspaceStore(local(new FullStorage()), clock);
    await useWs.getState().init();
    expect(useWs.getState().storageAvailable).toBe(true);
    useWs.getState().setProfile({ companyName: 'Acme' });
    await vi.advanceTimersByTimeAsync(SAVE_DEBOUNCE_MS);
    expect(useWs.getState().storageAvailable).toBe(false);
  });

  it('flush reports the failure too', async () => {
    const useWs = createWorkspaceStore(local(new FullStorage()), clock);
    await useWs.getState().init();
    useWs.getState().setProfile({ companyName: 'Acme' });
    await useWs.getState().flush();
    expect(useWs.getState().storageAvailable).toBe(false);
  });
});
