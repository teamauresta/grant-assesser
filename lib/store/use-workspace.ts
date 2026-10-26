import { create } from 'zustand';
import type { Application, Goal, Profile, Workspace } from '@/lib/schema';
import { getProgram } from '@/content/programs';
import { goalsFromTemplate } from '@/lib/plan/goals';
import { PERSONA_DEFAULTS } from '@/lib/personas';
import { newId } from '@/lib/id';
import { emptyWorkspace, LocalWorkspaceStore, migrate, type WorkspaceStore } from './workspace-store';

export const SAVE_DEBOUNCE_MS = 500;

type Stage = Application['stage'];
type Settings = Workspace['settings'];
export type ApplicationPatch = Partial<Omit<Application, 'id' | 'createdAt' | 'updatedAt'>>;
export type GoalInput = Pick<Goal, 'title'> & Partial<Omit<Goal, 'id' | 'title' | 'sequence' | 'createdAt' | 'updatedAt'>>;
export type GoalPatch = Partial<Omit<Goal, 'id' | 'sequence' | 'createdAt' | 'updatedAt'>>;

export type WorkspaceState = {
  ws: Workspace;
  /** False on the server and until init() has loaded the stored workspace. Render server-equivalent output until true. */
  ready: boolean;
  storageAvailable: boolean;
  /** Set when stored data could not be read: the raw copy was kept under this key before starting fresh. */
  corruptBackupKey: string | null;

  /** Loads (or creates) the workspace and starts debounced saving. Safe to call more than once. */
  init(): Promise<void>;
  /** Saves a pending change now instead of waiting for the debounce (e.g. when the page is hidden). */
  flush(): Promise<void>;
  /**
   * Replaces the workspace with the stored one, e.g. after another tab saved. Cancels a pending save
   * (the other tab's write wins) and does not write the loaded data back. Returns true if the
   * workspace was replaced; false when nothing readable is stored or init() has not run.
   */
  syncFromStorage(): Promise<boolean>;

  setProfile(patch: Partial<Profile>): void;
  /** Returns the new application's id, or undefined when the slug is unknown or already in the pipeline. */
  addApplication(slug: string): string | undefined;
  addCustomApplication(name: string): string;
  moveApplication(id: string, stage: Stage): void;
  updateApplication(id: string, patch: ApplicationPatch): void;
  removeApplication(id: string): void;
  addGoal(input: GoalInput): string;
  updateGoal(id: string, patch: GoalPatch): void;
  toggleStep(goalId: string, stepId: string): void;
  removeGoal(id: string): void;
  importWorkspace(ws: Workspace): void;
  reset(): void;
  markExported(): void;
  markCalendarExported(): void;
  setSettings(patch: Partial<Settings>): void;
};

/** A persona's vcBacked default replaces the stored value only if the user has not answered differently. */
function withPersonaDefaults(prev: Profile, patch: Partial<Profile>): Profile {
  const profile = { ...prev, ...patch };
  if (patch.persona && !('vcBacked' in patch)) {
    // A value equal to the previous persona's default is indistinguishable from that default, so it
    // follows the new persona; otherwise switching Bootstrapped → VC-backed would keep vcBacked: false.
    const prevDefault = prev.persona ? PERSONA_DEFAULTS[prev.persona].vcBacked : undefined;
    if (prev.vcBacked === undefined || prev.vcBacked === prevDefault) profile.vcBacked = PERSONA_DEFAULTS[patch.persona].vcBacked;
  }
  return profile;
}

export function createWorkspaceStore(store: WorkspaceStore, clock: () => Date = () => new Date()) {
  return create<WorkspaceState>()((set, get, api) => {
    let initPromise: Promise<void> | null = null;
    let timer: ReturnType<typeof setTimeout> | undefined;
    // The workspace last loaded from storage by syncFromStorage, which must not be saved back.
    let synced: Workspace | null = null;

    /** Saves, and shows the "can't save" banner while saving fails (e.g. a full quota). */
    const save = async (ws: Workspace) => {
      const ok = await store.save(ws);
      if (get().storageAvailable !== ok) set({ storageAvailable: ok });
    };

    /**
     * Applies fn to the workspace. fn returns null for a no-op (e.g. unknown id). `calendar` marks
     * pipeline and goal changes, which count towards changesSinceCalendarExport.
     */
    const mutate = (fn: (ws: Workspace, stamp: string) => Workspace | null, calendar = false) => {
      const stamp = clock().toISOString();
      const next = fn(get().ws, stamp);
      if (!next) return;
      set({
        ws: { ...next, updatedAt: stamp, changesSinceCalendarExport: next.changesSinceCalendarExport + (calendar ? 1 : 0) },
      });
    };

    const patchApp = (id: string, fn: (a: Application, stamp: string) => Application) =>
      mutate((ws, stamp) => ws.pipeline.some((a) => a.id === id)
        ? { ...ws, pipeline: ws.pipeline.map((a) => (a.id === id ? { ...fn(a, stamp), updatedAt: stamp } : a)) }
        : null, true);

    const patchGoal = (id: string, fn: (g: Goal) => Goal) =>
      mutate((ws, stamp) => ws.goals.some((g) => g.id === id)
        ? { ...ws, goals: ws.goals.map((g) => (g.id === id ? { ...fn(g), sequence: g.sequence + 1, updatedAt: stamp } : g)) }
        : null, true);

    const newApplication = (fields: Pick<Application, 'programSlug' | 'customName'>, stamp: string): Application =>
      ({ id: newId(), ...fields, stage: 'considering', notes: '', createdAt: stamp, updatedAt: stamp });

    return {
      ws: emptyWorkspace(clock()),
      ready: false,
      storageAvailable: true,
      corruptBackupKey: null,

      init: () => (initPromise ??= (async () => {
        const loaded = await store.load();
        const corruptBackupKey = loaded ? null : (await store.rescueCorrupt?.(clock())) ?? null;
        set({ ws: loaded ?? emptyWorkspace(clock()), ready: true, storageAvailable: store.available(), corruptBackupKey });
        // Replace the unreadable data now (its copy is kept), or every load would rescue it again.
        if (corruptBackupKey) await save(get().ws);
        api.subscribe((s, prev) => {
          if (s.ws === prev.ws || s.ws === synced) return;
          clearTimeout(timer);
          timer = setTimeout(() => {
            timer = undefined;
            void save(get().ws);
          }, SAVE_DEBOUNCE_MS);
        });
      })()),

      flush: async () => {
        if (timer === undefined) return;
        clearTimeout(timer);
        timer = undefined;
        await save(get().ws);
      },

      syncFromStorage: async () => {
        if (!get().ready) return false;
        const loaded = await store.load();
        if (!loaded) return false;
        clearTimeout(timer);
        timer = undefined;
        synced = loaded;
        set({ ws: loaded });
        return true;
      },

      setProfile: (patch) => {
        const ws = get().ws;
        // RDTI-style deadlines count from the financial-year end (unset means 30 June), so moving it
        // moves pipeline deadlines and the user's exported calendar is out of date.
        const fyMoved = 'fyEndMonth' in patch && (patch.fyEndMonth ?? 6) !== (ws.profile.fyEndMonth ?? 6) && ws.pipeline.length > 0;
        mutate((w) => ({ ...w, profile: withPersonaDefaults(w.profile, patch) }), fyMoved);
      },

      addApplication: (slug) => {
        const program = getProgram(slug);
        if (!program || get().ws.pipeline.some((a) => a.programSlug === slug)) return undefined;
        const app = newApplication({ programSlug: slug }, clock().toISOString());
        mutate((ws) => ({
          ...ws,
          pipeline: [...ws.pipeline, app],
          goals: [...ws.goals, ...goalsFromTemplate(program, app.id, clock(), ws.profile)],
        }), true);
        return app.id;
      },

      addCustomApplication: (name) => {
        const app = newApplication({ customName: name }, clock().toISOString());
        mutate((ws) => ({ ...ws, pipeline: [...ws.pipeline, app] }), true);
        return app.id;
      },

      moveApplication: (id, stage) => patchApp(id, (a) => ({ ...a, stage })),
      updateApplication: (id, patch) => patchApp(id, (a) => ({ ...a, ...patch })),

      removeApplication: (id) => mutate((ws) => ws.pipeline.some((a) => a.id === id)
        ? { ...ws, pipeline: ws.pipeline.filter((a) => a.id !== id), goals: ws.goals.filter((g) => g.applicationId !== id) }
        : null, true),

      addGoal: (input) => {
        const id = newId();
        mutate((ws, stamp) => ({
          ...ws,
          goals: [...ws.goals, {
            status: 'todo', steps: [], reminderOffsetsDays: [...ws.settings.remindersDefault], source: 'user',
            ...input, id, sequence: 0, createdAt: stamp, updatedAt: stamp,
          }],
        }), true);
        return id;
      },

      updateGoal: (id, patch) => patchGoal(id, (g) => ({ ...g, ...patch })),

      toggleStep: (goalId, stepId) => {
        const goal = get().ws.goals.find((g) => g.id === goalId);
        if (!goal?.steps.some((s) => s.id === stepId)) return;
        patchGoal(goalId, (g) => ({ ...g, steps: g.steps.map((s) => (s.id === stepId ? { ...s, done: !s.done } : s)) }));
      },

      removeGoal: (id) => mutate((ws) => ws.goals.some((g) => g.id === id)
        ? { ...ws, goals: ws.goals.filter((g) => g.id !== id) }
        : null, true),

      importWorkspace: (ws) => set({ ws: migrate(ws) }),
      reset: () => {
        set({ ws: emptyWorkspace(clock()), corruptBackupKey: null });
        void store.clearRescues?.();
      },
      markExported: () => mutate((ws, stamp) => ({ ...ws, lastExportedAt: stamp })),
      markCalendarExported: () => mutate((ws, stamp) => ({ ...ws, lastCalendarExportAt: stamp, changesSinceCalendarExport: 0 })),
      setSettings: (patch) => mutate((ws) => ({ ...ws, settings: { ...ws.settings, ...patch } })),
    };
  });
}

/** The app-wide workspace, persisted to localStorage. Use only in client components. */
export const useWorkspace = createWorkspaceStore(new LocalWorkspaceStore());

const hasAnswers = (p: Profile) => Object.values(p).some((v) => v !== undefined);

/**
 * The stored profile once loaded and non-empty, else undefined (also on the server and during
 * hydration). Returns the stored object itself, so its identity changes only when the profile does.
 */
export function useStoredProfile(): Profile | undefined {
  return useWorkspace((s) => (s.ready && hasAnswers(s.ws.profile) ? s.ws.profile : undefined));
}
