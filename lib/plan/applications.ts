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
