import type { Page } from '@playwright/test';
import { WorkspaceSchema, type Workspace } from '@/lib/schema';
import { bootstrappedVic } from '@/tests/fixtures/personas';

const WORKSPACE_KEY = 'gn-workspace';
const THEME_KEY = 'gn-theme';

/** YYYY-MM-DD, `days` from today (UTC). Seeded dates follow the real clock so they stay upcoming. */
const isoFromToday = (days: number) => new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);

/**
 * A realistic workspace: the bootstrappedVic answers, two programs in the pipeline at different
 * stages, and goals with due dates (one this week) so the board, goals and calendar all have content.
 */
export function populatedWorkspace(): Workspace {
  const at = new Date().toISOString();
  const stamps = { createdAt: at, updatedAt: at };
  return WorkspaceSchema.parse({
    schemaVersion: 1,
    workspaceId: 'e2e-workspace',
    profile: bootstrappedVic,
    pipeline: [
      { id: 'app-kick-start', programSlug: 'csiro-kick-start', stage: 'considering', notes: '', ...stamps },
      { id: 'app-rdti', programSlug: 'rdti', stage: 'preparing', expectedAmount: 30_000, notes: 'Talk to the accountant first.', ...stamps },
    ],
    goals: [
      { id: 'goal-eoi', applicationId: 'app-kick-start', title: 'Submit the Kick-Start EOI', dueDate: isoFromToday(3), status: 'todo', steps: [{ id: 's1', title: 'Draft the R&D question', done: true }, { id: 's2', title: 'Pick a research partner', done: false }], source: 'template', sequence: 0, ...stamps },
      { id: 'goal-records', applicationId: 'app-rdti', title: 'Set up an R&D activity log', dueDate: isoFromToday(14), status: 'doing', source: 'template', sequence: 0, ...stamps },
      { id: 'goal-own', title: 'Ask two customers for a paid pilot', status: 'todo', source: 'user', sequence: 1, ...stamps },
    ],
    settings: { theme: 'system', remindersDefault: [7, 1] },
    lastExportedAt: at,
    changesSinceCalendarExport: 0,
    ...stamps,
  });
}

/** Seeds localStorage before any page script runs, on every navigation in this page. */
export async function seedStorage(page: Page, { workspace, theme }: { workspace?: Workspace; theme?: 'light' | 'dark' }) {
  await page.addInitScript(
    ([wsKey, ws, themeKey, t]) => {
      // Only seed once per test, so changes the app makes survive later navigations.
      if (sessionStorage.getItem('e2e-seeded')) return;
      sessionStorage.setItem('e2e-seeded', '1');
      if (ws) localStorage.setItem(wsKey, ws);
      if (t) localStorage.setItem(themeKey, t);
    },
    [WORKSPACE_KEY, workspace ? JSON.stringify(workspace) : '', THEME_KEY, theme ?? ''] as const,
  );
}
