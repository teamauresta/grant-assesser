'use client';

import { useMemo } from 'react';
import type { Profile, Program } from '@/lib/schema';
import { deriveStatus, type StatusInfo } from '@/lib/status';
import { useNow } from '@/lib/use-now';

/**
 * Derived statuses keyed by slug. Empty until the client knows "now", so server HTML and the first
 * client render show declared states and never a build-time date.
 */
export function useStatuses(programs: Program[], profile?: Profile): Map<string, StatusInfo> {
  const now = useNow();
  return useMemo(
    () => (now ? new Map(programs.map((p) => [p.slug, deriveStatus(p, now, profile)])) : new Map<string, StatusInfo>()),
    [programs, now, profile],
  );
}

/** One program's derived status, or null before mount. */
export function useProgramStatus(program: Program, profile?: Profile): StatusInfo | null {
  const now = useNow();
  return useMemo(() => (now ? deriveStatus(program, now, profile) : null), [program, now, profile]);
}
