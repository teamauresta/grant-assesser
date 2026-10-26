'use client';

import { Suspense, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { SearchX } from 'lucide-react';
import type { Program } from '@/lib/schema';
import {
  DEFAULT_FILTERS, PROGRAM_LEVELS, PROGRAM_TYPES, STATUS_FILTERS,
  filterPrograms, parseFilters, serializeFilters, type ProgramFilters, type StatusFilter,
} from '@/lib/programs/filter';
import { useStatuses } from '@/lib/programs/use-status';
import { notAFitReasons } from '@/lib/programs/fit';
import { useStoredProfile } from '@/lib/store/use-workspace';
import { useNow } from '@/lib/use-now';
import { LEVEL_LABELS, TYPE_LABELS } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Field, Input } from '@/components/ui/field';
import { FilterChips } from './filter-chips';
import { ProgramCard } from './program-card';

type Filters = Required<ProgramFilters>;

const STATUS_LABELS: Record<StatusFilter, string> = {
  'open-upcoming': 'Open & upcoming',
  'closing-soon': 'Closing soon',
  open: 'Open',
  rolling: 'Rolling',
  upcoming: 'Upcoming',
  unverified: 'Unverified',
  paused: 'Paused',
  closed: 'Closed',
  all: 'All',
};
const STATUS_OPTIONS = STATUS_FILTERS.map((value) => ({ value, label: STATUS_LABELS[value] }));
const TYPE_OPTIONS = PROGRAM_TYPES.map((value) => ({ value, label: TYPE_LABELS[value] }));
const LEVEL_OPTIONS = PROGRAM_LEVELS.map((value) => ({ value, label: LEVEL_LABELS[value] }));

const NONE = new Map<string, string>();

const toggle = <T,>(list: readonly T[], v: T): T[] => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

/**
 * Searchable, filterable program grid. Filters live in the URL query so the back button and shared
 * links keep them. The static HTML renders the default view (useSearchParams needs a Suspense boundary
 * under static export); the client then applies the URL's filters.
 */
export function Directory({ programs }: { programs: Program[] }) {
  return (
    <Suspense fallback={<DirectoryView programs={programs} filters={DEFAULT_FILTERS} />}>
      <UrlDirectory programs={programs} />
    </Suspense>
  );
}

function UrlDirectory({ programs }: { programs: Program[] }) {
  const params = useSearchParams();
  const fromUrl = parseFilters(params);
  // The search box keeps its own state so typing is never interrupted by URL updates.
  const [q, setQ] = useState(fromUrl.q);
  const filters: Filters = { ...fromUrl, q };

  const onChange = (next: Filters) => {
    setQ(next.q);
    const qs = serializeFilters(next);
    // Next.js syncs native history calls with useSearchParams. Pass null as the state: state carrying
    // Next's own markers is treated as internal and not synced. Replace (not push) keeps Back meaningful.
    window.history.replaceState(null, '', qs ? `?${qs}` : window.location.pathname);
  };

  return <DirectoryView programs={programs} filters={filters} onChange={onChange} />;
}

function DirectoryView({ programs, filters, onChange }: { programs: Program[]; filters: Filters; onChange?: (f: Filters) => void }) {
  const profile = useStoredProfile();
  const now = useNow();
  const statuses = useStatuses(programs, profile);
  const notFit = useMemo(() => (now ? notAFitReasons(programs, profile, now) : NONE), [programs, profile, now]);
  const results = useMemo(() => filterPrograms(programs, statuses, filters), [programs, statuses, filters]);
  const set = (patch: Partial<Filters>) => onChange?.({ ...filters, ...patch });
  const isDefault = serializeFilters(filters) === '';
  const clear = () => onChange?.(DEFAULT_FILTERS);

  return (
    <div className="flex flex-col gap-6">
      <div role="search" aria-label="Filter programs" className="flex flex-col gap-4">
        <Field label="Search programs" className="max-w-md">
          {(control) => (
            <Input
              {...control}
              type="search"
              placeholder="Name, provider or keyword"
              autoComplete="off"
              value={filters.q}
              onChange={(e) => set({ q: e.target.value })}
            />
          )}
        </Field>
        <FilterChips
          label="Status"
          options={STATUS_OPTIONS}
          isPressed={(v) => filters.status === v}
          onToggle={(v) => set({ status: v })}
        />
        <FilterChips
          label="Type"
          options={TYPE_OPTIONS}
          isPressed={(v) => filters.type.includes(v)}
          onToggle={(v) => set({ type: toggle(filters.type, v) })}
        />
        <FilterChips
          label="Level"
          options={LEVEL_OPTIONS}
          isPressed={(v) => filters.level.includes(v)}
          onToggle={(v) => set({ level: toggle(filters.level, v) })}
        />
      </div>

      <div className="flex min-h-11 flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-border pt-4">
        <p role="status" aria-live="polite" className="num text-sm text-muted-fg">
          Showing {results.length} of {programs.length} programs
        </p>
        {!isDefault && (
          <Button variant="ghost" onClick={clear}>
            Clear filters
          </Button>
        )}
      </div>

      {results.length ? (
        <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {results.map((p) => (
            <li key={p.slug}>
              <ProgramCard program={p} status={statuses.get(p.slug)} notFitReason={notFit.get(p.slug)} />
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState
          icon={SearchX}
          title="No programs match."
          description="Try a different search or fewer filters."
          action={<Button onClick={clear}>Clear filters</Button>}
        />
      )}
    </div>
  );
}
