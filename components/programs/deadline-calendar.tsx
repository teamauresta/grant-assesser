'use client';

import { useMemo } from 'react';
import type { Program } from '@/lib/schema';
import { formatDate } from '@/lib/dates';
import { resolveDeadlines } from '@/lib/status';
import { appBaseUrl, deadlineFilename, deadlineToEvent } from '@/lib/calendar/events';
import { useNow } from '@/lib/use-now';
import { useDeadlineProfile } from '@/lib/store/use-workspace';
import { AddToCalendar } from '@/components/calendar/add-to-calendar';

/**
 * An "Add to calendar" menu for each future deadline. Deadlines depend on "now" and the stored
 * profile (for profile-relative dates), so nothing renders on the server or before hydration.
 */
export function DeadlineCalendar({ program }: { program: Program }) {
  const now = useNow();
  const profile = useDeadlineProfile();
  const deadlines = useMemo(() => {
    if (!now) return [];
    const appUrl = appBaseUrl();
    return resolveDeadlines(program, now, profile)
      .filter((d) => d.at.getTime() > now.getTime())
      .map((d) => ({ d, event: deadlineToEvent(program, d, appUrl), filename: deadlineFilename(program, d) }));
  }, [program, now, profile]);

  if (!deadlines.length) return null;
  const single = deadlines.length === 1;
  return (
    <div className="flex flex-wrap items-start gap-3">
      {deadlines.map(({ d, event, filename }) => {
        const label = single ? 'Add deadline to calendar' : `Add “${d.label}” to calendar`;
        // The accessible name starts with the visible label (WCAG 2.5.3) and adds which deadline it is.
        return (
          <AddToCalendar
            key={event.uid}
            event={event}
            filename={filename}
            label={label}
            aria-label={`${label}: ${program.name}, ${d.label}, ${formatDate(d.date)}`}
          />
        );
      })}
    </div>
  );
}
