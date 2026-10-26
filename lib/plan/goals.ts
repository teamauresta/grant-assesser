import type { Goal, Program, Profile } from '@/lib/schema';
import { addDays, subtractBusinessDays, todayISO } from '@/lib/dates';
import { resolveDeadlines } from '@/lib/status';
import { newId } from '@/lib/id';

/** Starter goals for a new application. `reminders` is the workspace's `settings.remindersDefault`. */
export function goalsFromTemplate(p: Program, applicationId: string, now: Date, profile: Profile, reminders: readonly number[] = [7, 1]): Goal[] {
  const today = todayISO(now);
  const close = resolveDeadlines(p, now, profile).find((d) => d.kind === 'close' && d.at > now);
  const stamp = now.toISOString();
  return p.goalTemplate.map((t) => ({
    id: newId(), applicationId, title: t.title,
    dueDate: t.beforeDeadlineBusinessDays !== undefined && close
      ? subtractBusinessDays(close.date, t.beforeDeadlineBusinessDays)
      : addDays(today, t.offsetDays ?? 14),
    status: 'todo', steps: [], reminderOffsetsDays: [...reminders], source: 'template', sequence: 0,
    createdAt: stamp, updatedAt: stamp,
  }));
}
