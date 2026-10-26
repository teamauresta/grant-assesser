import type { Profile } from '@/lib/schema';
import { QUESTIONS } from '@/lib/assessment/questions';

/** Answered eligibility questions needed, without a persona, before a profile counts as assessed. */
export const MIN_ANSWERS = 3;

/**
 * Wizard questions that count towards MIN_ANSWERS: every one except the persona (which counts on its
 * own) and the company name (identity, not eligibility). The financial-year end does count, but on
 * its own (as set from Settings) it is one answer, well short of an assessment.
 */
const COUNTED = QUESTIONS.map((q) => q.id).filter((id) => id !== 'persona' && id !== 'companyName');

/**
 * True when the profile is enough to show results, eligibility and an assessment report: a persona,
 * or at least MIN_ANSWERS answered eligibility questions. An empty list ("None of these") and 0 are answers.
 */
export function hasAnswers(p: Profile): boolean {
  if (p.persona !== undefined) return true;
  return COUNTED.filter((id) => p[id] !== undefined).length >= MIN_ANSWERS;
}

/** True when any profile field is set, e.g. to say an import file includes a profile. */
export const hasProfileData = (p: Profile): boolean => Object.values(p).some((v) => v !== undefined);
