import { ZodError } from 'zod';
import type { Profile, Workspace } from '@/lib/schema';
import { todayISO } from '@/lib/dates';
import { downloadFile } from '@/lib/download';
import { migrate } from './workspace-store';

export type ImportSummary = { hasProfile: boolean; applications: number; goals: number };
export type ImportResult = { ok: true; ws: Workspace; summary: ImportSummary } | { ok: false; error: string };

const CURRENT_VERSION = 1;
const MAX_PATHS = 3;
/** Real exports are a few kilobytes; anything near this is not one, and reading it would stall the page. */
export const MAX_IMPORT_BYTES = 2 * 1024 * 1024;

/** An error for a file too large to be a workspace export, checked before the file is read. */
export function importSizeError(bytes: number): string | undefined {
  if (bytes <= MAX_IMPORT_BYTES) return undefined;
  return "This file is too large to be a Grant Navigator workspace (the limit is 2 MB). Choose the .json file you exported from Settings.";
}

/** Pretty-printed JSON, so an exported file is readable and diffable. */
export function serializeWorkspace(ws: Workspace): string {
  return `${JSON.stringify(ws, null, 2)}\n`;
}

/** `grant-navigator-workspace-YYYY-MM-DD.json`, dated in Melbourne. */
export function workspaceFilename(now: Date): string {
  return `grant-navigator-workspace-${todayISO(now)}.json`;
}

/**
 * Downloads the workspace as a .json file. The file records its own export time, so importing it
 * later does not bring back the backup prompt. Client only; the caller records the export in the store.
 */
export function exportWorkspaceFile(ws: Workspace, now: Date) {
  downloadFile(workspaceFilename(now), serializeWorkspace({ ...ws, lastExportedAt: now.toISOString() }), 'application/json');
}

export const hasProfile = (p: Profile) => Object.values(p).some((v) => v !== undefined);

export function summarise(ws: Workspace): ImportSummary {
  return { hasProfile: hasProfile(ws.profile), applications: ws.pipeline.length, goals: ws.goals.length };
}

/** `pipeline[0].stage` from Zod's `['pipeline', 0, 'stage']`. */
function formatPath(path: readonly PropertyKey[]): string {
  return path.reduce<string>((out, k) => (typeof k === 'number' ? `${out}[${k}]` : out ? `${out}.${String(k)}` : String(k)), '') || 'the top level';
}

function listPaths(paths: string[]): string {
  const shown = paths.slice(0, MAX_PATHS);
  const more = paths.length - shown.length;
  if (more > 0) return `${shown.join(', ')} and ${more} more`;
  if (shown.length === 1) return shown[0];
  return `${shown.slice(0, -1).join(', ')} and ${shown[shown.length - 1]}`;
}

/**
 * Reads an exported workspace file. Never throws: an error says what is wrong and how to fix it.
 */
export function parseImport(text: string): ImportResult {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, error: "This file isn't valid JSON, so it can't be imported. Choose the .json file you exported from Grant Navigator, without editing it." };
  }
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw) || !('schemaVersion' in raw)) {
    return { ok: false, error: "This file isn't a Grant Navigator workspace. Choose a file exported from Settings, named like grant-navigator-workspace-2026-10-27.json." };
  }
  const version = (raw as { schemaVersion: unknown }).schemaVersion;
  if (typeof version === 'number' && version > CURRENT_VERSION) {
    return { ok: false, error: `This file is from a newer version of Grant Navigator (version ${version}). Reload this page to get the latest version, then import the file again.` };
  }
  if (version !== CURRENT_VERSION) {
    return { ok: false, error: `This file uses an unsupported workspace version (${JSON.stringify(version) ?? 'none'}), so it can't be imported. Export your workspace again from Grant Navigator and import the new file.` };
  }
  try {
    const ws = migrate(raw);
    return { ok: true, ws, summary: summarise(ws) };
  } catch (e) {
    if (e instanceof ZodError) {
      const paths = [...new Set(e.issues.map((i) => formatPath(i.path)))];
      return { ok: false, error: `Some data in this file can't be read, at ${listPaths(paths)}. The file may have been edited or damaged. Export a fresh copy from Grant Navigator and import that instead.` };
    }
    return { ok: false, error: "This file couldn't be imported. Export a fresh copy from Grant Navigator and import that instead." };
  }
}
