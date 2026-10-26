import type { Workspace } from '@/lib/schema';

export const BACKUP_AFTER_DAYS = 14;
const WINDOW_MS = BACKUP_AFTER_DAYS * 86_400_000;

/**
 * True when the workspace has a pipeline or goals worth keeping and has gone more than 14 days
 * without a backup: never exported and more than 14 days old, or edited since the last export and
 * that export is more than 14 days old.
 */
export function needsBackup(ws: Workspace, now: Date): boolean {
  if (ws.pipeline.length === 0 && ws.goals.length === 0) return false;
  const t = now.getTime();
  if (!ws.lastExportedAt) {
    const created = Date.parse(ws.createdAt);
    return Number.isFinite(created) && t - created > WINDOW_MS;
  }
  const exported = Date.parse(ws.lastExportedAt);
  const updated = Date.parse(ws.updatedAt);
  if (!Number.isFinite(exported) || !Number.isFinite(updated)) return false;
  return updated > exported && Math.max(t, updated) - exported > WINDOW_MS;
}
