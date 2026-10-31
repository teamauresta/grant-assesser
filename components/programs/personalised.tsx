'use client';

import type { GateRef, Program } from '@/lib/schema';
import { useStoredProfile } from '@/lib/store/use-workspace';
import { EligibilityList } from './eligibility-list';
import { PersonaNotes } from './persona-notes';

/*
 * Program-page sections that adapt to the stored profile. Until the workspace has loaded (and on the
 * server) they render exactly as they would with no profile, so hydration matches.
 */

/** One callout for the stored persona; every recorded note when no persona is set. */
export function ProgramPersonaNotes({ personas }: { personas: Program['personas'] }) {
  const profile = useStoredProfile();
  return <PersonaNotes personas={personas} persona={profile?.persona} />;
}

/** Eligibility checks evaluated against the stored answers, or an invitation to take the assessment. */
export function ProgramEligibility({ gates }: { gates: GateRef[] }) {
  const profile = useStoredProfile();
  // Inside the Eligibility window, whose body is the frame.
  return <EligibilityList gates={gates} profile={profile} framed={false} />;
}
