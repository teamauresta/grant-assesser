import type { Goal, Program, Profile } from '@/lib/schema';
import { addDays, subtractBusinessDays, todayISO } from '@/lib/dates';
import { resolveDeadlines } from '@/lib/status';
import { newId } from '@/lib/id';

export function goalsFromTemplate(p: Program, applicationId: string, now: Date, profile: Profile): Goal[] {
  const today = todayISO(now);
  const close = resolveDeadlines(p, now, profile).find((d) => d.kind === 'close' && d.at > now);
  const stamp = now.toISOString();
  return p.goalTemplate.map((t) => ({
    id: newId(), applicationId, title: t.title,
    dueDate: t.beforeDeadlineBusinessDays !== undefined && close
      ? subtractBusinessDays(close.date, t.beforeDeadlineBusinessDays)
      : addDays(today, t.offsetDays ?? 14),
    status: 'todo', steps: [], reminderOffsetsDays: [7, 1], source: 'template', sequence: 0,
    createdAt: stamp, updatedAt: stamp,
  }));
}
