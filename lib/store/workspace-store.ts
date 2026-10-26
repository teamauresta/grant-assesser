import { WorkspaceSchema, type Workspace } from '@/lib/schema';
import { newId } from '@/lib/id';

export const STORAGE_KEY = 'gn-workspace';
export const CORRUPT_KEY_PREFIX = 'gn-workspace-corrupt-';

export interface WorkspaceStore {
  available(): boolean;
  load(): Promise<Workspace | null>;
  /** Resolves false when the workspace could not be written (e.g. the storage quota is full). */
  save(ws: Workspace): Promise<boolean>;
  clear(): Promise<void>;
  /**
   * Called when `load()` returned null. If stored data exists but cannot be read, copies the raw
   * string to `gn-workspace-corrupt-<timestamp>` so starting fresh never destroys it, and returns
   * that key. Returns null when there was nothing to rescue.
   */
  rescueCorrupt?(now: Date): Promise<string | null>;
  /** Deletes every copy kept by `rescueCorrupt`, e.g. when the user resets the workspace. */
  clearRescues?(): Promise<void>;
}

export function emptyWorkspace(now: Date): Workspace {
  const t = now.toISOString();
  return WorkspaceSchema.parse({
    schemaVersion: 1, workspaceId: newId(), profile: {}, pipeline: [], goals: [],
    settings: {}, changesSinceCalendarExport: 0, createdAt: t, updatedAt: t,
  });
}

/** Upgrade older shapes here as schemaVersion increases. */
export function migrate(raw: unknown): Workspace {
  const v = (raw as { schemaVersion?: unknown })?.schemaVersion;
  if (v !== 1) throw new Error(`Unsupported workspace version: ${String(v)}`);
  return WorkspaceSchema.parse(raw);
}

export class LocalWorkspaceStore implements WorkspaceStore {
  constructor(private storage: Storage | undefined = typeof window !== 'undefined' ? window.localStorage : undefined) {}
  available(): boolean {
    try { this.storage!.setItem('gn-probe', '1'); this.storage!.removeItem('gn-probe'); return true; } catch { return false; }
  }
  async load() {
    try { const s = this.storage?.getItem(STORAGE_KEY); return s ? migrate(JSON.parse(s)) : null; } catch { return null; }
  }
  async save(ws: Workspace) {
    if (!this.storage) return false;
    try { this.storage.setItem(STORAGE_KEY, JSON.stringify(ws)); return true; } catch { return false; }
  }
  async clear() { try { this.storage?.removeItem(STORAGE_KEY); } catch { /* ignore */ } }
  async rescueCorrupt(now: Date) {
    try {
      const raw = this.storage?.getItem(STORAGE_KEY);
      if (!raw) return null;
      try { migrate(JSON.parse(raw)); return null; } catch { /* unreadable: keep a copy below */ }
      const key = `${CORRUPT_KEY_PREFIX}${now.getTime()}`;
      this.storage!.setItem(key, raw);
      return key;
    } catch {
      return null;
    }
  }
  async clearRescues() {
    try {
      const s = this.storage;
      if (!s) return;
      const keys: string[] = [];
      for (let i = 0; i < s.length; i++) {
        const k = s.key(i);
        if (k?.startsWith(CORRUPT_KEY_PREFIX)) keys.push(k);
      }
      for (const k of keys) s.removeItem(k);
    } catch { /* blocked storage: nothing to clear */ }
  }
}

export class MemoryWorkspaceStore implements WorkspaceStore {
  private ws: Workspace | null = null;
  available() { return true; }
  async load() { return this.ws; }
  async save(ws: Workspace) { this.ws = structuredClone(ws); return true; }
  async clear() { this.ws = null; }
}
