import type { Application } from '@/lib/schema';
import { getProgram } from '@/content/programs';

export type Stage = Application['stage'];

/** Stages where the application is no longer being pursued, so its program deadlines no longer matter. */
export const DROPPED_STAGES: readonly Stage[] = ['declined', 'withdrawn'];
export const isDropped = (a: Pick<Application, 'stage'>) => DROPPED_STAGES.includes(a.stage);

/** The program's name, or the custom application's name. Undefined for an unknown slug with no custom name. */
export function applicationName(a: Pick<Application, 'programSlug' | 'customName'>): string | undefined {
  return (a.programSlug ? getProgram(a.programSlug)?.name : undefined) ?? a.customName;
}

export const STAGE_LABELS: Record<Stage, string> = {
  considering: 'Considering', preparing: 'Preparing', submitted: 'Submitted',
  awarded: 'Awarded', declined: 'Declined', withdrawn: 'Withdrawn',
};

export type BoardColumn = { id: 'considering' | 'preparing' | 'submitted' | 'outcome'; label: string; stages: readonly Stage[] };

/** The pipeline board's columns. Outcome groups the three final stages. */
export const BOARD_COLUMNS: readonly BoardColumn[] = [
  { id: 'considering', label: 'Considering', stages: ['considering'] },
  { id: 'preparing', label: 'Preparing', stages: ['preparing'] },
  { id: 'submitted', label: 'Submitted', stages: ['submitted'] },
  { id: 'outcome', label: 'Outcome', stages: ['awarded', 'declined', 'withdrawn'] },
];

export const columnOf = (stage: Stage) => BOARD_COLUMNS.find((c) => c.stages.includes(stage))!;

/** "45000", "$45,000", "45k" or "1.2m" → dollars; undefined when blank; NaN when unreadable. */
export function parseAmount(text: string): number | undefined {
  const t = text.trim().toLowerCase().replace(/[$,\s]/g, '').replace(/^aud/, '');
  if (!t) return undefined;
  const m = /^(\d+(?:\.\d+)?)([km]?)$/.exec(t);
  if (!m) return NaN;
  const n = Math.round(Number(m[1]) * (m[2] === 'k' ? 1_000 : m[2] === 'm' ? 1_000_000 : 1));
  return Number.isFinite(n) ? n : NaN;
}
