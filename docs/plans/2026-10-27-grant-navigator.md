# Grant Navigator Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (or superpowers:subagent-driven-development) to implement this plan task by task.

**Goal:** Rebuild the grant assessment tool as a static Next.js app with a verified program directory, a self-assessment for three personas, a pipeline and goals tracker with calendar export, and PDF reports.

**Architecture:**
- **Data:** each program is a typed data file, validated with Zod at build time.
- **Logic:** pure, unit-tested modules in `lib/`, covering dates, eligibility checks (gates), status, scoring, calendar and goals. These are the core of the app.
- **UI:** App Router pages, statically exported. Client components read a Zustand store, which saves to `localStorage` through an async `WorkspaceStore` interface so a server-backed store can be added later.

**Tech stack:** Next.js 16 (App Router, `output: 'export'`) · React 19 · TypeScript · Tailwind CSS 4 · Zod 4 · Zustand 5 · @react-pdf/renderer 4 · lucide-react · Geist font · Vitest 5 · Playwright + @axe-core/playwright · pnpm.

**Design reference:** `docs/plans/2026-10-27-grant-navigator-design.md`. Appendix A of that document is the **only** source for program facts.

---

## Conventions (read before any task)

- Run everything from the repo root `/Users/auresta/Projects/grant-assesser` on branch `rebuild/grant-navigator`.
- `@/` is an alias for the repo root (configured in `tsconfig.json` and `vitest.config.ts`).
- **Dates:**
  - Calendar dates are `'YYYY-MM-DD'` strings.
  - Instants are `Date` objects.
  - Use the helpers in `lib/dates.ts`; never call `new Date('YYYY-MM-DD')` directly.
- **"Now":**
  - Every logic function takes `now: Date` as a parameter.
  - UI gets it from the `useNow()` hook, which returns `null` on the server and during the first client render.
  - Server-rendered HTML shows the program's *declared* status. The client then refines it.
- **No emoji.** Icons come from `lucide-react` only, at 16 and 20px, with `strokeWidth={1.5}`.
- **Colours:** never use raw hex in components. Use the token classes from Task 10, such as `bg-bg`, `text-muted-fg` and `border-border`.
- **Commits:** one per task, in conventional-commit style, ending with the line `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- **Checks:** after every task, `pnpm typecheck && pnpm test` must pass.

---

## Milestone 1 — Foundation

### Task 1: Scaffold the project

`create-next-app` refuses to run in a directory that already contains files, so scaffold manually. Leave the existing `index.html`, `base.jsx` and `404.html` at the root; Task 24 moves them.

**Files:**
- Create:
  - `package.json`, `tsconfig.json`, `next.config.ts`, `postcss.config.mjs`, `vitest.config.ts`, `eslint.config.mjs`, `.gitignore`, `.nvmrc`
  - `app/layout.tsx`, `app/page.tsx`, `app/globals.css`
  - `tests/smoke.test.ts`

**Step 1: Install dependencies**

```bash
pnpm init
pnpm add next@16 react@19 react-dom@19 zod@4 zustand@5 lucide-react geist @react-pdf/renderer@4
pnpm add -D typescript @types/node @types/react @types/react-dom tailwindcss@4 @tailwindcss/postcss vitest@5 jsdom @testing-library/react @testing-library/user-event @testing-library/jest-dom eslint eslint-config-next @playwright/test @axe-core/playwright tsx
```

If a peer-dependency conflict appears, run `pnpm add` with the versions pnpm suggests and record them in the commit message.

**Step 2: `package.json` scripts** (merge into the generated file, and set `"private": true`)

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "serve": "node scripts/serve-out.mjs",
    "typecheck": "tsc --noEmit",
    "lint": "eslint .",
    "test": "vitest run",
    "test:watch": "vitest",
    "e2e": "playwright test",
    "freshness": "tsx scripts/check-freshness.ts"
  }
}
```

**Step 3: `next.config.ts`**

```ts
import type { NextConfig } from 'next';

const basePath = '/grant-assesser';

const nextConfig: NextConfig = {
  output: 'export',
  basePath,
  trailingSlash: true,
  images: { unoptimized: true },
  env: { NEXT_PUBLIC_BASE_PATH: basePath },
};

export default nextConfig;
```

**Step 4: `tsconfig.json`**

Use the standard Next.js tsconfig: `"strict": true`, `"moduleResolution": "bundler"`, `"jsx": "preserve"`, the `next` plugin, and `"paths": { "@/*": ["./*"] }`. Set `include` to `["**/*.ts", "**/*.tsx", "next-env.d.ts", ".next/types/**/*.ts"]` and `exclude` to `["node_modules", "out", "legacy"]`.

**Step 5: `postcss.config.mjs`**

```js
export default { plugins: { '@tailwindcss/postcss': {} } };
```

**Step 6: `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  resolve: { alias: { '@': path.resolve(__dirname, '.') } },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
    exclude: ['tests/e2e/**'],
  },
});
```

**Step 7: `eslint.config.mjs`**

Use the flat config exported by `eslint-config-next` (check its README for the current export name, `next/core-web-vitals`) and ignore `out/`, `.next/` and `legacy/`.

**Step 8: Minimal app**

- `app/globals.css` contains only `@import "tailwindcss";` for now. Task 10 fills it in.
- `app/layout.tsx`:
  - Renders `<html lang="en-AU"><body>{children}</body></html>`.
  - Exports `metadata = { title: 'Grant Navigator', description: 'Find, assess and track Australian startup funding.' }`.
- `app/page.tsx` renders `<main><h1>Grant Navigator</h1></main>`.

**Step 9: Smoke test**

`tests/smoke.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
describe('smoke', () => { it('runs', () => { expect(1 + 1).toBe(2); }); });
```

**Step 10: Verify**

Run: `pnpm test && pnpm typecheck && pnpm build`
Expected: the test passes and `out/index.html` exists.

**Step 11:** Add `out/`, `.next/`, `node_modules/`, `test-results/`, `playwright-report/` and `next-env.d.ts` to `.gitignore`. Write `24` to `.nvmrc`.

**Step 12: Commit:** `chore: scaffold Next.js static app with Tailwind, Vitest`

---

### Task 2: Date utilities

**Files:**
- Create: `lib/dates.ts`
- Test: `tests/lib/dates.test.ts`

**Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { addDays, daysBetween, endOfMonthISO, monthsBetween, subtractBusinessDays, todayISO, zonedToInstant } from '@/lib/dates';

describe('dates', () => {
  it('endOfMonthISO handles normal, leap and overflowing months', () => {
    expect(endOfMonthISO(2026, 6)).toBe('2026-06-30');
    expect(endOfMonthISO(2024, 2)).toBe('2024-02-29');
    expect(endOfMonthISO(2026, 16)).toBe('2027-04-30');
  });
  it('addDays and daysBetween', () => {
    expect(addDays('2026-10-27', 7)).toBe('2026-11-03');
    expect(daysBetween('2026-10-27', '2026-11-01')).toBe(5);
  });
  it('subtractBusinessDays skips weekends', () => {
    expect(subtractBusinessDays('2026-11-27', 5)).toBe('2026-11-20'); // Fri → previous Fri
    expect(subtractBusinessDays('2026-11-02', 1)).toBe('2026-10-30'); // Mon → Fri
  });
  it('monthsBetween counts whole months', () => {
    expect(monthsBetween('2025-04-27', '2026-10-27')).toBe(18);
    expect(monthsBetween('2025-04-28', '2026-10-27')).toBe(17);
  });
  it('zonedToInstant honours Melbourne daylight saving', () => {
    expect(zonedToInstant('2026-11-27', '14:00', 'Australia/Melbourne').toISOString()).toBe('2026-11-27T03:00:00.000Z');
    expect(zonedToInstant('2026-07-01', '09:00', 'Australia/Melbourne').toISOString()).toBe('2026-06-30T23:00:00.000Z');
  });
  it('todayISO uses the Melbourne calendar date', () => {
    expect(todayISO(new Date('2026-10-26T14:30:00Z'))).toBe('2026-10-27');
  });
});
```

**Step 2:** Run `pnpm vitest run tests/lib/dates.test.ts`. Expected: FAIL (module not found).

**Step 3: Implement `lib/dates.ts`**

```ts
export const MELBOURNE = 'Australia/Melbourne';
const DAY_MS = 86_400_000;

/** 'YYYY-MM-DD' → Date at 00:00 UTC. Use only for calendar-date arithmetic. */
export function parseISODate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function addDays(iso: string, n: number): string {
  return toISODate(new Date(parseISODate(iso).getTime() + n * DAY_MS));
}

export function daysBetween(fromIso: string, toIso: string): number {
  return Math.round((parseISODate(toIso).getTime() - parseISODate(fromIso).getTime()) / DAY_MS);
}

/** Walks back n weekdays. Public holidays are not considered. */
export function subtractBusinessDays(iso: string, n: number): string {
  let d = parseISODate(iso);
  let left = n;
  while (left > 0) {
    d = new Date(d.getTime() - DAY_MS);
    const wd = d.getUTCDay();
    if (wd !== 0 && wd !== 6) left--;
  }
  return toISODate(d);
}

/** month is 1–12 and may overflow, e.g. (2026, 16) → '2027-04-30'. */
export function endOfMonthISO(year: number, month: number): string {
  return toISODate(new Date(Date.UTC(year, month, 0)));
}

export function monthsBetween(fromIso: string, toIso: string): number {
  const [fy, fm, fd] = fromIso.split('-').map(Number);
  const [ty, tm, td] = toIso.split('-').map(Number);
  return (ty - fy) * 12 + (tm - fm) - (td < fd ? 1 : 0);
}

export function todayISO(now: Date, tz: string = MELBOURNE): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}

function tzOffsetMs(at: Date, tz: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).formatToParts(at);
  const get = (t: string) => Number(parts.find((p) => p.type === t)!.value);
  const asUtc = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'));
  return asUtc - at.getTime();
}

/** Wall-clock date and time in tz → instant. */
export function zonedToInstant(date: string, time: string, tz: string): Date {
  const [y, m, d] = date.split('-').map(Number);
  const [hh, mm] = time.split(':').map(Number);
  const guess = Date.UTC(y, m - 1, d, hh, mm);
  const offset = tzOffsetMs(new Date(guess), tz);
  let instant = guess - offset;
  const offset2 = tzOffsetMs(new Date(instant), tz);
  if (offset2 !== offset) instant = guess - offset2;
  return new Date(instant);
}

export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('en-AU', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(parseISODate(iso));
}
```

**Step 4:** Run the test. Expected: PASS.

**Step 5: Commit:** `feat(lib): add calendar-date and time-zone helpers`

---

### Task 3: Schemas (single source of types)

**Files:**
- Create: `lib/schema.ts`
- Test: `tests/lib/schema.test.ts`

The Zod schemas are the only type definitions. Types are inferred from them with `z.infer`. Zod 4: use `z.looseObject` (not `.passthrough()`), and `z.record(keySchema, valueSchema)` with two arguments.

**Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { ProgramSchema, ProfileSchema, WorkspaceSchema } from '@/lib/schema';

const minimal = {
  slug: 'x', name: 'X', provider: 'P', level: 'federal', type: 'grant',
  benefit: { kind: 'cash', currency: 'AUD', note: '' },
  status: { state: 'rolling' }, deadlines: [], gates: ['au-entity'],
  scores: { funding: 1, value: 1, effort: 1, speed: 1 },
  content: { summary: 's', howToApply: [], prepare: [], mistakes: [] },
  verification: { lastVerified: '2026-10-26', sources: [{ url: 'https://example.gov.au', title: 't', official: true }] },
};

describe('schemas', () => {
  it('accepts a minimal program and fills defaults', () => {
    const p = ProgramSchema.parse(minimal);
    expect(p.personas).toEqual({});
    expect(p.goalTemplate).toEqual([]);
    expect(p.changelog).toEqual([]);
  });
  it('rejects bad dates and scores out of range', () => {
    expect(() => ProgramSchema.parse({ ...minimal, verification: { ...minimal.verification, lastVerified: '26/10/2026' } })).toThrow();
    expect(() => ProgramSchema.parse({ ...minimal, scores: { ...minimal.scores, funding: 7 } })).toThrow();
  });
  it('accepts parameterised gate refs', () => {
    expect(() => ProgramSchema.parse({ ...minimal, gates: [{ id: 'incorporated-within', months: 24 }] })).not.toThrow();
    expect(() => ProgramSchema.parse({ ...minimal, gates: ['not-a-gate'] })).toThrow();
  });
  it('profile allows everything to be missing', () => {
    expect(ProfileSchema.parse({})).toEqual({});
  });
  it('workspace requires schemaVersion 1', () => {
    expect(() => WorkspaceSchema.parse({ schemaVersion: 2 })).toThrow();
  });
});
```

**Step 2:** Run it. Expected: FAIL.

**Step 3: Implement `lib/schema.ts`**

```ts
import { z } from 'zod';

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD');
const hhmm = z.string().regex(/^\d{2}:\d{2}$/);
const score = z.number().min(0).max(5);

export const PERSONAS = ['bootstrapped', 'pre-raise', 'vc-backed'] as const;
export const Persona = z.enum(PERSONAS);
export type Persona = z.infer<typeof Persona>;

export const STATES = ['vic', 'nsw', 'qld', 'wa', 'sa', 'tas', 'act', 'nt'] as const;
export const SECTORS = ['energy', 'health', 'manufacturing', 'construction', 'agriculture', 'defence', 'fintech', 'education', 'social-impact', 'other'] as const;
export const STACK = ['aws', 'azure', 'gcp', 'gemini', 'nvidia', 'cloudflare', 'openai', 'anthropic'] as const;
export const FUNDING_STAGES = ['none', 'angel', 'pre-seed', 'seed', 'series-a', 'series-b', 'series-c-plus'] as const;

export const GATE_IDS = [
  'au-entity', 'gst-registered', 'not-foreign-subsidiary', 'incorporated-within', 'turnover-under',
  'turnover-or-age', 'product-company', 'vc-funded', 'vc-or-accelerator', 'funding-stage-before',
  'last-round-within', 'prior-credits-max', 'cash-match', 'rd-spend-over', 'experimental-activities',
  'contemporaneous-records', 'research-partner', 'industry-partners', 'state-is', 'sector-any',
  'women-led', 'has-mvp', 'has-website', 'customer-evidence-at-least', 'uses-stack',
] as const;
export const GateId = z.enum(GATE_IDS);
export type GateId = z.infer<typeof GateId>;

export const GateRefSchema = z.union([
  GateId,
  z.looseObject({ id: GateId, severity: z.enum(['hard', 'soft']).optional() }),
]);
export type GateRef = z.infer<typeof GateRefSchema>;

const AbsoluteDeadline = z.object({
  label: z.string(), kind: z.enum(['close', 'milestone']), date: isoDate,
  time: hhmm.optional(), tz: z.string().optional(),
});
const RelativeDeadline = z.object({
  label: z.string(), kind: z.enum(['close', 'milestone']), relative: z.literal('fyEnd+10m'),
});
export const DeadlineSchema = z.union([AbsoluteDeadline, RelativeDeadline]);
export type Deadline = z.infer<typeof DeadlineSchema>;

export const ProgramSchema = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/),
  name: z.string(),
  provider: z.string(),
  level: z.enum(['federal', 'vic', 'industry', 'university']),
  type: z.enum(['tax-incentive', 'grant', 'voucher', 'credits', 'accelerator', 'capital', 'service', 'investor-incentive']),
  benefit: z.object({
    kind: z.enum(['cash', 'tax-offset', 'credits', 'equity', 'debt', 'service', 'investor']),
    min: z.number().nonnegative().optional(),
    max: z.number().nonnegative().optional(),
    currency: z.enum(['AUD', 'USD']),
    note: z.string(),
    consortium: z.boolean().optional(),   // award goes to a consortium; never counted as company cash
    estimator: z.literal('rdti').optional(),
  }),
  status: z.object({
    state: z.enum(['open', 'rolling', 'upcoming', 'paused', 'closed', 'unverified']),
    note: z.string().optional(),
  }),
  deadlines: z.array(DeadlineSchema),
  gates: z.array(GateRefSchema),
  scores: z.object({ funding: score, value: score, effort: score, speed: score }),
  personas: z.partialRecord(Persona, z.string()).default({}),
  goalTemplate: z.array(z.object({
    title: z.string(),
    offsetDays: z.number().int().optional(),
    beforeDeadlineBusinessDays: z.number().int().optional(),
  })).default([]),
  stacking: z.array(z.object({ with: z.string(), note: z.string() })).default([]),
  content: z.object({
    summary: z.string(),
    howToApply: z.array(z.string()),
    prepare: z.array(z.string()),
    mistakes: z.array(z.string()),
    caveats: z.array(z.string()).default([]),  // e.g. contradictory official wording
  }),
  verification: z.object({
    lastVerified: isoDate,
    sources: z.array(z.object({ url: z.url(), title: z.string(), official: z.boolean() })).min(1),
  }),
  changelog: z.array(z.object({ date: isoDate, note: z.string() })).default([]),
});
export type Program = z.infer<typeof ProgramSchema>;
export type ProgramInput = z.input<typeof ProgramSchema>;

export const ProfileSchema = z.object({
  persona: Persona.optional(),
  companyName: z.string().optional(),
  hasAcn: z.boolean().optional(),
  gstRegistered: z.boolean().optional(),
  incorporatedOn: isoDate.optional(),
  foreignSubsidiary: z.boolean().optional(),
  state: z.enum(STATES).optional(),
  fyEndMonth: z.number().int().min(1).max(12).optional(),
  turnover: z.enum(['under-1m', '1m-10m', '10m-20m', '20m-50m', 'over-50m']).optional(),
  rdSpend: z.enum(['under-20k', '20k-100k', '100k-500k', 'over-500k']).optional(),
  experimental: z.boolean().optional(),
  contemporaneousRecords: z.boolean().optional(),
  businessModel: z.enum(['product', 'services', 'mixed']).optional(),
  hasMvp: z.boolean().optional(),
  hasWebsite: z.boolean().optional(),
  stack: z.array(z.enum(STACK)).optional(),
  fundingStage: z.enum(FUNDING_STAGES).optional(),
  vcBacked: z.boolean().optional(),
  acceleratorMember: z.boolean().optional(),
  lastRoundOn: isoDate.optional(),
  priorCreditsUsd: z.object({ aws: z.number().optional(), azure: z.number().optional(), gcp: z.number().optional() }).optional(),
  cashMatch: z.enum(['none', 'under-20k', '20k-60k', '60k-250k', 'over-250k']).optional(),
  researchPartner: z.enum(['none', 'informal', 'active', 'formal']).optional(),
  industryPartners: z.number().int().min(0).optional(),
  sectors: z.array(z.enum(SECTORS)).optional(),
  customerEvidence: z.enum(['none', 'interviews', 'pilots', 'revenue']).optional(),
  founderHoursPerWeek: z.enum(['under-2', '2-5', '5-10', 'over-10']).optional(),
  urgency: z.enum(['now', '3-6m', '6-12m', 'none']).optional(),
  womenLed: z.enum(['yes', 'no', 'prefer-not']).optional(),
});
export type Profile = z.infer<typeof ProfileSchema>;

export const STAGES = ['considering', 'preparing', 'submitted', 'awarded', 'declined', 'withdrawn'] as const;
const timestamps = { createdAt: z.string(), updatedAt: z.string() };

export const ApplicationSchema = z.object({
  id: z.string(), programSlug: z.string().optional(), customName: z.string().optional(),
  stage: z.enum(STAGES), expectedAmount: z.number().optional(), notes: z.string().default(''), ...timestamps,
});
export type Application = z.infer<typeof ApplicationSchema>;

export const GoalSchema = z.object({
  id: z.string(), applicationId: z.string().optional(), title: z.string(), dueDate: isoDate.optional(),
  status: z.enum(['todo', 'doing', 'done', 'blocked']),
  steps: z.array(z.object({ id: z.string(), title: z.string(), done: z.boolean() })).default([]),
  reminderOffsetsDays: z.array(z.number().int().nonnegative()).default([7, 1]),
  source: z.enum(['template', 'user', 'persona']), sequence: z.number().int().default(0), ...timestamps,
});
export type Goal = z.infer<typeof GoalSchema>;

export const WorkspaceSchema = z.object({
  schemaVersion: z.literal(1),
  workspaceId: z.string(),
  profile: ProfileSchema,
  pipeline: z.array(ApplicationSchema),
  goals: z.array(GoalSchema),
  settings: z.object({
    theme: z.enum(['system', 'light', 'dark']).default('system'),
    remindersDefault: z.array(z.number().int()).default([7, 1]),
  }),
  lastExportedAt: z.string().optional(),
  lastCalendarExportAt: z.string().optional(),
  changesSinceCalendarExport: z.number().int().default(0),
  ...timestamps,
});
export type Workspace = z.infer<typeof WorkspaceSchema>;
```

If `z.partialRecord` or `z.url()` differ in the installed Zod 4 version, check the Zod 4 docs and adjust. Keep the behaviour: personas is an optional map, and URLs are validated.

**Step 4:** Run the test. Expected: PASS.

**Step 5: Commit:** `feat(lib): add Zod schemas for programs, profile and workspace`

---

### Task 4: Gate library

**Files:**
- Create: `lib/gates/index.ts`
- Test: `tests/lib/gates.test.ts`

**Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { evaluateGate } from '@/lib/gates';

const now = new Date('2026-10-27T00:00:00Z');
const ev = (ref: Parameters<typeof evaluateGate>[0], profile = {}) => evaluateGate(ref, profile, { now });

describe('gates', () => {
  it('unanswered is unknown, never pass', () => {
    expect(ev('au-entity').result).toBe('unknown');
    expect(ev({ id: 'incorporated-within', months: 24 }).result).toBe('unknown');
  });
  it('au-entity pass / fixable fail', () => {
    expect(ev('au-entity', { hasAcn: true }).result).toBe('pass');
    const r = ev('au-entity', { hasAcn: false });
    expect(r.result).toBe('fail'); expect(r.fixable).toBe(true); expect(r.severity).toBe('hard');
  });
  it('incorporated-within', () => {
    expect(ev({ id: 'incorporated-within', months: 24 }, { incorporatedOn: '2025-04-27' }).result).toBe('pass');
    const r = ev({ id: 'incorporated-within', months: 24 }, { incorporatedOn: '2024-01-01' });
    expect(r.result).toBe('fail'); expect(r.fixable).toBe(false);
  });
  it('turnover-under uses band edges', () => {
    expect(ev({ id: 'turnover-under', aud: 20_000_000 }, { turnover: '10m-20m' }).result).toBe('pass');
    expect(ev({ id: 'turnover-under', aud: 20_000_000 }, { turnover: '20m-50m' }).result).toBe('fail');
    expect(ev({ id: 'turnover-under', aud: 5_000_000 }, { turnover: '1m-10m' }).result).toBe('unknown');
  });
  it('turnover-or-age passes if either passes', () => {
    const ref = { id: 'turnover-or-age' as const, turnoverUnder: 10_000_000, yearsUnder: 3 };
    expect(ev(ref, { turnover: '10m-20m', incorporatedOn: '2025-01-01' }).result).toBe('pass');
    expect(ev(ref, { turnover: '10m-20m', incorporatedOn: '2020-01-01' }).result).toBe('fail');
    expect(ev(ref, { turnover: '10m-20m' }).result).toBe('unknown');
  });
  it('vc-funded derives from persona; pre-raise is fixable', () => {
    expect(ev('vc-funded', { persona: 'vc-backed' }).result).toBe('pass');
    const boot = ev('vc-funded', { persona: 'bootstrapped' });
    expect(boot.result).toBe('fail'); expect(boot.fixable).toBe(false);
    expect(ev('vc-funded', { persona: 'pre-raise' }).fixable).toBe(true);
    expect(ev('vc-funded', { persona: 'bootstrapped', vcBacked: true }).result).toBe('pass');
  });
  it('cash-match bands', () => {
    const ref = { id: 'cash-match' as const, min: 20_000 };
    expect(ev(ref, { cashMatch: '20k-60k' }).result).toBe('pass');
    expect(ev(ref, { cashMatch: 'under-20k' }).result).toBe('fail');
    expect(ev(ref, { cashMatch: 'under-20k' }).fixable).toBe(true);
    expect(ev({ id: 'cash-match', min: 100_000 }, { cashMatch: '60k-250k' }).result).toBe('unknown');
  });
  it('last-round-within picks the rule for the stage', () => {
    const ref = { id: 'last-round-within' as const, rules: [{ stages: ['pre-seed', 'seed'], months: 60 }, { stages: ['series-a'], months: 12 }] };
    expect(ev(ref, { fundingStage: 'seed', lastRoundOn: '2023-01-01' }).result).toBe('pass');
    expect(ev(ref, { fundingStage: 'series-a', lastRoundOn: '2025-01-01' }).result).toBe('fail');
    expect(ev(ref, { fundingStage: 'series-b', lastRoundOn: '2026-01-01' }).result).toBe('fail');
  });
  it('soft defaults and severity override', () => {
    expect(ev('contemporaneous-records', { contemporaneousRecords: false }).severity).toBe('soft');
    expect(ev({ id: 'au-entity', severity: 'soft' }).severity).toBe('soft');
  });
  it('sector-any and women-led', () => {
    expect(ev({ id: 'sector-any', sectors: ['energy'] }, { sectors: ['energy', 'other'] }).result).toBe('pass');
    expect(ev({ id: 'sector-any', sectors: ['energy'] }, { sectors: ['fintech'] }).result).toBe('fail');
    expect(ev('women-led', { womenLed: 'prefer-not' }).result).toBe('unknown');
  });
  it('every result has a label and reason', () => {
    const r = ev({ id: 'prior-credits-max', provider: 'gcp', usd: 0 }, { priorCreditsUsd: { gcp: 300 } });
    expect(r.result).toBe('fail'); expect(r.label).toMatch(/credits/i); expect(r.reason.length).toBeGreaterThan(0);
  });
});
```

**Step 2:** Run it. Expected: FAIL.

**Step 3: Implement `lib/gates/index.ts`**

```ts
import type { GateId, GateRef, Profile } from '@/lib/schema';
import { FUNDING_STAGES } from '@/lib/schema';
import { monthsBetween, todayISO } from '@/lib/dates';

export type Severity = 'hard' | 'soft';
export type GateOutcome = 'pass' | 'fail' | 'unknown';
export type GateResult = {
  id: GateId; label: string; severity: Severity; result: GateOutcome;
  reason: string; fix?: string; fixable: boolean;
};
type Eval = Pick<GateResult, 'result' | 'reason' | 'fix' | 'fixable'>;
type Ctx = { now: Date };
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Params = Record<string, any>;
type Def = { severity: Severity; label: (p: Params) => string; evaluate: (pr: Profile, p: Params, ctx: Ctx) => Eval };

const pass = (reason: string): Eval => ({ result: 'pass', reason, fixable: false });
const fail = (reason: string, fix?: string, fixable = false): Eval => ({ result: 'fail', reason, fix, fixable });
const unknown = (reason: string, fix?: string): Eval => ({ result: 'unknown', reason, fix, fixable: true });

const money = (n: number) => n >= 1_000_000 ? `$${n / 1_000_000}M` : `$${Math.round(n / 1000)}K`;

const TURNOVER: Record<NonNullable<Profile['turnover']>, [number, number]> = {
  'under-1m': [0, 1e6], '1m-10m': [1e6, 1e7], '10m-20m': [1e7, 2e7], '20m-50m': [2e7, 5e7], 'over-50m': [5e7, Infinity],
};
const RD_SPEND: Record<NonNullable<Profile['rdSpend']>, [number, number]> = {
  'under-20k': [0, 2e4], '20k-100k': [2e4, 1e5], '100k-500k': [1e5, 5e5], 'over-500k': [5e5, Infinity],
};
const CASH: Record<NonNullable<Profile['cashMatch']>, [number, number]> = {
  none: [0, 0], 'under-20k': [0, 2e4], '20k-60k': [2e4, 6e4], '60k-250k': [6e4, 2.5e5], 'over-250k': [2.5e5, Infinity],
};
const RESEARCH = ['none', 'informal', 'active', 'formal'] as const;
const EVIDENCE = ['none', 'interviews', 'pilots', 'revenue'] as const;

function bool(v: boolean | undefined, label: { yes: string; no: string; ask: string }, fix?: string, fixable = true): Eval {
  if (v === undefined) return unknown(label.ask, fix);
  return v ? pass(label.yes) : fail(label.no, fix, fixable);
}

function turnoverUnder(pr: Profile, aud: number): Eval {
  if (!pr.turnover) return unknown('Turnover not answered', 'Add your aggregated turnover band');
  const [lo, hi] = TURNOVER[pr.turnover];
  if (hi <= aud) return pass(`Turnover is under ${money(aud)}`);
  if (lo >= aud) return fail(`Turnover is ${money(aud)} or more`);
  return unknown(`Your turnover band straddles ${money(aud)}`, 'Confirm aggregated turnover with your accountant');
}

function incorporatedWithin(pr: Profile, months: number, now: Date): Eval {
  if (!pr.incorporatedOn) return unknown('Incorporation date not answered', 'Add your incorporation date');
  const age = monthsBetween(pr.incorporatedOn, todayISO(now));
  return age <= months ? pass(`Incorporated ${age} months ago`) : fail(`Incorporated ${age} months ago (limit ${months})`);
}

export const GATES: Record<GateId, Def> = {
  'au-entity': { severity: 'hard', label: () => 'Australian company (ACN)',
    evaluate: (pr) => bool(pr.hasAcn, { yes: 'Has an ACN', no: 'No Australian company yet', ask: 'ACN not answered' }, 'Register a Pty Ltd company') },
  'gst-registered': { severity: 'hard', label: () => 'Registered for GST',
    evaluate: (pr) => bool(pr.gstRegistered, { yes: 'Registered for GST', no: 'Not registered for GST', ask: 'GST not answered' }, 'Register for GST with the ATO') },
  'not-foreign-subsidiary': { severity: 'hard', label: () => 'Not a subsidiary of a foreign company',
    evaluate: (pr) => pr.foreignSubsidiary === undefined ? unknown('Ownership not answered')
      : pr.foreignSubsidiary ? fail('Australian subsidiaries of foreign entities are excluded') : pass('Not a foreign subsidiary') },
  'incorporated-within': { severity: 'hard', label: (p) => `Incorporated within ${p.months} months`,
    evaluate: (pr, p, { now }) => incorporatedWithin(pr, p.months, now) },
  'turnover-under': { severity: 'hard', label: (p) => `Turnover under ${money(p.aud)}`,
    evaluate: (pr, p) => turnoverUnder(pr, p.aud) },
  'turnover-or-age': { severity: 'hard', label: (p) => `Turnover under ${money(p.turnoverUnder)} or under ${p.yearsUnder} years old`,
    evaluate: (pr, p, { now }) => {
      const t = turnoverUnder(pr, p.turnoverUnder);
      const a = incorporatedWithin(pr, p.yearsUnder * 12 - 1, now);
      if (t.result === 'pass' || a.result === 'pass') return pass(t.result === 'pass' ? t.reason : a.reason);
      if (t.result === 'fail' && a.result === 'fail') return fail(`${t.reason}, and ${a.reason.toLowerCase()}`);
      return unknown('Need turnover and incorporation date to check', 'Answer turnover and incorporation date');
    } },
  'product-company': { severity: 'hard', label: () => 'Owns a software product (not a consultancy)',
    evaluate: (pr) => !pr.businessModel ? unknown('Business model not answered')
      : pr.businessModel === 'services' ? fail('Consultancies and agencies are excluded')
      : pass(pr.businessModel === 'mixed' ? 'Apply with the product, not the services work' : 'Product company') },
  'vc-funded': { severity: 'hard', label: () => 'Backed by venture capital',
    evaluate: (pr) => {
      const v = pr.vcBacked ?? (pr.persona === 'vc-backed' ? true : pr.persona ? false : undefined);
      if (v === undefined) return unknown('Funding not answered');
      if (v) return pass('VC-backed');
      return pr.persona === 'pre-raise'
        ? fail('Needs institutional VC funding', 'Available once you close a VC-led round', true)
        : fail('Needs institutional VC funding; angel money, grants and bootstrapping do not count');
    } },
  'vc-or-accelerator': { severity: 'hard', label: () => 'Backed by a VC or accelerator partner',
    evaluate: (pr) => {
      const vc = pr.vcBacked ?? (pr.persona === 'vc-backed' ? true : undefined);
      if (vc || pr.acceleratorMember) return pass('Has a VC or accelerator relationship');
      if (vc === false && pr.acceleratorMember === false)
        return fail('Needs an Org ID from a partner VC or accelerator', 'Join an accelerator or VC that is an Activate Provider', true);
      return unknown('VC or accelerator membership not answered');
    } },
  'funding-stage-before': { severity: 'hard', label: (p) => `Raised less than ${p.stage}`,
    evaluate: (pr, p) => {
      if (!pr.fundingStage) return unknown('Funding stage not answered');
      return FUNDING_STAGES.indexOf(pr.fundingStage) < FUNDING_STAGES.indexOf(p.stage)
        ? pass(`Stage: ${pr.fundingStage}`) : fail(`Must be before ${p.stage}`);
    } },
  'last-round-within': { severity: 'hard', label: () => 'Recent qualifying funding round',
    evaluate: (pr, p, { now }) => {
      if (!pr.fundingStage || !pr.lastRoundOn) return unknown('Funding stage or last round date not answered');
      const rule = (p.rules as { stages: string[]; months: number }[]).find((r) => r.stages.includes(pr.fundingStage!));
      if (!rule) return fail(`A ${pr.fundingStage} round does not qualify`);
      const age = monthsBetween(pr.lastRoundOn, todayISO(now));
      return age <= rule.months ? pass(`Last round ${age} months ago`) : fail(`Last round ${age} months ago (limit ${rule.months})`);
    } },
  'prior-credits-max': { severity: 'hard', label: (p) => `No more than US$${p.usd.toLocaleString('en-AU')} prior ${p.provider.toUpperCase()} credits`,
    evaluate: (pr, p) => {
      const v = pr.priorCreditsUsd?.[p.provider as 'aws' | 'azure' | 'gcp'];
      if (v === undefined) return unknown(`Prior ${p.provider.toUpperCase()} credits not answered`);
      return v <= p.usd ? pass('Within the prior-credit limit') : fail(`Already received US$${v.toLocaleString('en-AU')} in credits`);
    } },
  'cash-match': { severity: 'hard', label: (p) => `Cash to match at least ${money(p.min)}`,
    evaluate: (pr, p) => {
      if (!pr.cashMatch) return unknown('Matching cash not answered');
      const [lo, hi] = CASH[pr.cashMatch];
      if (lo >= p.min) return pass('Enough cash to match');
      if (hi <= p.min) return fail(`Needs at least ${money(p.min)} in cash`, 'Budget the match before applying', true);
      return unknown('Your cash band may not cover the match', 'Confirm available cash');
    } },
  'rd-spend-over': { severity: 'hard', label: (p) => `R&D spend over ${money(p.aud)}`,
    evaluate: (pr, p) => {
      if (!pr.rdSpend) return unknown('R&D spend not answered');
      const [lo, hi] = RD_SPEND[pr.rdSpend];
      if (lo >= p.aud) return pass('R&D spend above the minimum');
      if (hi <= p.aud) return fail(`R&D spend must exceed ${money(p.aud)}`, 'Below the minimum, only spend with a registered research service provider counts', true);
      return unknown('R&D spend band straddles the minimum');
    } },
  'experimental-activities': { severity: 'hard', label: () => 'Genuinely experimental activities',
    evaluate: (pr) => bool(pr.experimental, { yes: 'Has experimental activities', no: 'No technical uncertainty being resolved', ask: 'Experimental work not answered' }, undefined, false) },
  'contemporaneous-records': { severity: 'soft', label: () => 'Keeps R&D records as work happens',
    evaluate: (pr) => bool(pr.contemporaneousRecords, { yes: 'Keeps contemporaneous records', no: 'No contemporaneous R&D records', ask: 'Record-keeping not answered' }, 'Log hypotheses, experiments and results now') },
  'research-partner': { severity: 'hard', label: (p) => `Research partner (${p.min} or better)`,
    evaluate: (pr, p) => {
      if (!pr.researchPartner) return unknown('Research partner not answered');
      return RESEARCH.indexOf(pr.researchPartner) >= RESEARCH.indexOf(p.min)
        ? pass(`Research relationship: ${pr.researchPartner}`) : fail('Needs a committed research partner', 'Start talks with a university or CSIRO', true);
    } },
  'industry-partners': { severity: 'hard', label: (p) => `At least ${p.count} industry partner(s)`,
    evaluate: (pr, p) => pr.industryPartners === undefined ? unknown('Industry partners not answered')
      : pr.industryPartners >= p.count ? pass(`${pr.industryPartners} industry partner(s)`) : fail(`Needs ${p.count} industry partner(s)`, 'Secure committed partners', true) },
  'state-is': { severity: 'hard', label: (p) => `Based in ${String(p.state).toUpperCase()}`,
    evaluate: (pr, p) => !pr.state ? unknown('State not answered')
      : pr.state === p.state ? pass(`Based in ${p.state.toUpperCase()}`) : fail(`Only for ${p.state.toUpperCase()} companies`) },
  'sector-any': { severity: 'hard', label: (p) => `Sector: ${(p.sectors as string[]).join(' / ')}`,
    evaluate: (pr, p) => !pr.sectors?.length ? unknown('Sectors not answered')
      : pr.sectors.some((s) => (p.sectors as string[]).includes(s)) ? pass('Sector matches') : fail('Sector does not match') },
  'women-led': { severity: 'hard', label: () => 'Women-led or women founder',
    evaluate: (pr) => pr.womenLed === 'yes' ? pass('Women-led') : pr.womenLed === 'no' ? fail('Only for women-led startups')
      : unknown('Optional question not answered') },
  'has-mvp': { severity: 'hard', label: () => 'Working MVP',
    evaluate: (pr) => bool(pr.hasMvp, { yes: 'Has a working MVP', no: 'No working MVP yet', ask: 'MVP not answered' }, 'Ship a working MVP first') },
  'has-website': { severity: 'soft', label: () => 'Working website',
    evaluate: (pr) => bool(pr.hasWebsite, { yes: 'Has a website', no: 'No working website', ask: 'Website not answered' }, 'Publish a simple website on your company domain') },
  'customer-evidence-at-least': { severity: 'hard', label: (p) => `Customer evidence: ${p.level} or better`,
    evaluate: (pr, p) => !pr.customerEvidence ? unknown('Customer evidence not answered')
      : EVIDENCE.indexOf(pr.customerEvidence) >= EVIDENCE.indexOf(p.level) ? pass(`Evidence: ${pr.customerEvidence}`)
      : fail(`Needs ${p.level}`, 'Secure a paid pilot', true) },
  'uses-stack': { severity: 'soft', label: (p) => `Uses ${p.tech}`,
    evaluate: (pr, p) => !pr.stack ? unknown('Tech stack not answered')
      : pr.stack.includes(p.tech) ? pass(`Uses ${p.tech}`) : fail(`Expects ${p.tech} in the product`, `Only worth it if ${p.tech} fits your architecture`, true) },
};

export function normaliseRef(ref: GateRef): { id: GateId; severity?: Severity; params: Params } {
  if (typeof ref === 'string') return { id: ref, params: {} };
  const { id, severity, ...params } = ref as { id: GateId; severity?: Severity } & Params;
  return { id, severity, params };
}

export function evaluateGate(ref: GateRef, profile: Profile, ctx: Ctx): GateResult {
  const { id, severity, params } = normaliseRef(ref);
  const def = GATES[id];
  return { id, label: def.label(params), severity: severity ?? def.severity, ...def.evaluate(profile, params, ctx) };
}

export const evaluateGates = (refs: GateRef[], profile: Profile, ctx: Ctx) => refs.map((r) => evaluateGate(r, profile, ctx));
```

Note on `turnover-or-age`: "registered for less than 3 years" means under 36 months, so it uses `yearsUnder * 12 - 1` as the inclusive limit.

**Step 4:** Run the test. Expected: PASS. Fix the implementation, not the tests, unless a test contradicts the design.

**Step 5: Commit:** `feat(lib): add tri-state eligibility gate library`

---

### Task 5: Status derivation

**Files:**
- Create: `lib/status.ts`
- Test: `tests/lib/status.test.ts`, `tests/helpers/program.ts`

**Step 1: Test helper `tests/helpers/program.ts`**

```ts
import { ProgramSchema, type Program, type ProgramInput } from '@/lib/schema';

export function makeProgram(over: Partial<ProgramInput> = {}): Program {
  return ProgramSchema.parse({
    slug: 'test', name: 'Test', provider: 'P', level: 'federal', type: 'grant',
    benefit: { kind: 'cash', currency: 'AUD', note: '', min: 10_000, max: 50_000 },
    status: { state: 'open' }, deadlines: [], gates: [],
    scores: { funding: 3, value: 5, effort: 3, speed: 3 },
    content: { summary: 's', howToApply: [], prepare: [], mistakes: [] },
    verification: { lastVerified: '2026-10-26', sources: [{ url: 'https://example.gov.au', title: 't', official: true }] },
    ...over,
  });
}
```

**Step 2: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { deriveStatus, resolveDeadlines } from '@/lib/status';
import { makeProgram } from '../helpers/program';

const now = new Date('2026-10-27T00:00:00Z'); // 11:00 AEDT, 27 Oct 2026
const close = (date: string, time?: string) => [{ label: 'Applications close', kind: 'close' as const, date, ...(time ? { time } : {}) }];

describe('deriveStatus', () => {
  it('open with a distant close stays open', () => {
    expect(deriveStatus(makeProgram({ deadlines: close('2026-11-15') }), now).state).toBe('open');
  });
  it('flips to closing-soon within 14 days', () => {
    const s = deriveStatus(makeProgram({ deadlines: close('2026-11-01') }), now);
    expect(s.state).toBe('closing-soon'); expect(s.daysToClose).toBe(5);
  });
  it('flips to closed after the last close date', () => {
    expect(deriveStatus(makeProgram({ deadlines: close('2026-10-20') }), now).state).toBe('closed');
  });
  it('closes at the deadline time, not midnight', () => {
    const p = makeProgram({ deadlines: close('2026-10-27', '10:00') }); // 10:00 AEDT already passed at 11:00
    expect(deriveStatus(p, now).state).toBe('closed');
  });
  it('does not auto-close unverified programs', () => {
    expect(deriveStatus(makeProgram({ status: { state: 'unverified' }, deadlines: close('2026-10-20') }), now).state).toBe('unverified');
  });
  it('flags stale verification after 60 days', () => {
    const p = makeProgram({ verification: { lastVerified: '2026-08-01', sources: [{ url: 'https://example.gov.au', title: 't', official: true }] } });
    expect(deriveStatus(p, now).stale).toBe(true);
    expect(deriveStatus(makeProgram(), now).stale).toBe(false);
  });
});

describe('resolveDeadlines', () => {
  const rdti = makeProgram({ status: { state: 'rolling' }, deadlines: [{ label: 'Registration due', kind: 'milestone', relative: 'fyEnd+10m' }] });
  it('June year-end → 30 April next year', () => {
    expect(resolveDeadlines(rdti, now, { fyEndMonth: 6 })[0].date).toBe('2027-04-30');
  });
  it('defaults to June and rolls forward once passed', () => {
    expect(resolveDeadlines(rdti, new Date('2027-05-15T00:00:00Z'), {})[0].date).toBe('2028-04-30');
  });
  it('December year-end', () => {
    expect(resolveDeadlines(rdti, now, { fyEndMonth: 12 })[0].date).toBe('2026-10-31');
  });
  it('milestones never close the program', () => {
    expect(deriveStatus(rdti, now).state).toBe('rolling');
  });
});
```

**Step 3:** Run it. Expected: FAIL.

**Step 4: Implement `lib/status.ts`**

```ts
import type { Program, Profile } from '@/lib/schema';
import { MELBOURNE, daysBetween, endOfMonthISO, todayISO, zonedToInstant } from '@/lib/dates';

export type DerivedState = Program['status']['state'] | 'closing-soon';
export type ResolvedDeadline = {
  label: string; kind: 'close' | 'milestone'; date: string; time?: string; tz: string; allDay: boolean; at: Date;
};
export type StatusInfo = {
  state: DerivedState; declared: Program['status']['state'];
  nextDeadline?: ResolvedDeadline; daysToClose?: number; stale: boolean; daysSinceVerified: number;
};

export const CLOSING_SOON_DAYS = 14;
export const STALE_DAYS = 60;

function fyRelative(today: string, fyEndMonth: number, monthsAfter: number): string {
  const year = Number(today.slice(0, 4));
  let fyEnd = endOfMonthISO(year, fyEndMonth);
  if (fyEnd > today) fyEnd = endOfMonthISO(year - 1, fyEndMonth);
  const [y, m] = fyEnd.split('-').map(Number);
  let deadline = endOfMonthISO(y, m + monthsAfter);
  if (deadline < today) deadline = endOfMonthISO(y + 1, m + monthsAfter);
  return deadline;
}

export function resolveDeadlines(p: Program, now: Date, profile: Profile = {}): ResolvedDeadline[] {
  const today = todayISO(now);
  return p.deadlines
    .map((d): ResolvedDeadline => {
      if ('relative' in d) {
        const date = fyRelative(today, profile.fyEndMonth ?? 6, 10);
        return { label: d.label, kind: d.kind, date, tz: MELBOURNE, allDay: true, at: zonedToInstant(date, '23:59', MELBOURNE) };
      }
      const tz = d.tz ?? MELBOURNE;
      return { label: d.label, kind: d.kind, date: d.date, time: d.time, tz, allDay: !d.time, at: zonedToInstant(d.date, d.time ?? '23:59', tz) };
    })
    .sort((a, b) => a.at.getTime() - b.at.getTime());
}

export function deriveStatus(p: Program, now: Date, profile: Profile = {}): StatusInfo {
  const declared = p.status.state;
  const deadlines = resolveDeadlines(p, now, profile);
  const future = deadlines.filter((d) => d.at.getTime() > now.getTime());
  const closes = deadlines.filter((d) => d.kind === 'close');
  const futureCloses = closes.filter((d) => d.at.getTime() > now.getTime());
  const today = todayISO(now);
  const daysSinceVerified = daysBetween(p.verification.lastVerified, today);

  let state: DerivedState = declared;
  let daysToClose: number | undefined;
  if ((declared === 'open' || declared === 'rolling') && closes.length) {
    if (!futureCloses.length) state = 'closed';
    else {
      daysToClose = daysBetween(today, futureCloses[0].date);
      if (daysToClose <= CLOSING_SOON_DAYS) state = 'closing-soon';
    }
  }
  return { state, declared, nextDeadline: future[0], daysToClose, stale: daysSinceVerified > STALE_DAYS, daysSinceVerified };
}
```

**Step 5:** Run the test. Expected: PASS.

**Step 6: Commit:** `feat(lib): derive program status from dates and verification age`

---

### Task 6: Scoring, assessment groups and funding estimate

**Files:**
- Create: `lib/scoring.ts`, `lib/assess.ts`
- Test: `tests/lib/scoring.test.ts`, `tests/lib/assess.test.ts`

**Step 1: Failing tests**

`tests/lib/scoring.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { scoreProgram, probabilityFrom, adjustEffort } from '@/lib/scoring';
import { makeProgram } from '../helpers/program';
import type { GateResult } from '@/lib/gates';

const g = (over: Partial<GateResult>): GateResult => ({ id: 'au-entity', label: 'l', severity: 'hard', result: 'pass', reason: 'r', fixable: false, ...over });

describe('scoring', () => {
  const p = makeProgram({ gates: [{ id: 'cash-match', min: 20000 }] }); // funding 3, value 5, effort 3, speed 3
  const allPass = [g({})];
  it('probability from gates', () => {
    expect(probabilityFrom(allPass)).toBe(4);
    expect(probabilityFrom([g({ severity: 'soft', result: 'fail' }), g({ result: 'unknown' })])).toBe(2);
  });
  it('effort adjusts for founder hours', () => {
    expect(adjustEffort(3, 'under-2')).toBe(2);
    expect(adjustEffort(5, 'under-2')).toBe(5);
    expect(adjustEffort(3, 'over-10')).toBe(3.5);
  });
  it('pre-raise uses equal weights', () => {
    expect(scoreProgram(p, allPass, { persona: 'pre-raise' }).total).toBe(72);
  });
  it('bootstrapped weights effort/speed and penalises cash match', () => {
    const s = scoreProgram(p, allPass, { persona: 'bootstrapped' });
    expect(s.total).toBe(61);
    expect(s.notes.join(' ')).toMatch(/cash match/i);
  });
  it('vc-backed weights funding and value', () => {
    expect(scoreProgram(p, allPass, { persona: 'vc-backed' }).total).toBe(73);
  });
});
```

`tests/lib/assess.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { groupFor, trackFor, assessProgram, estimateFunding } from '@/lib/assess';
import { makeProgram } from '../helpers/program';
import type { GateResult } from '@/lib/gates';

const g = (over: Partial<GateResult>): GateResult => ({ id: 'au-entity', label: 'l', severity: 'hard', result: 'pass', reason: 'r', fixable: false, ...over });
const now = new Date('2026-10-27T00:00:00Z');

describe('groupFor', () => {
  it('closed programs are excluded from results', () => { expect(groupFor('closed', [])).toBeNull(); });
  it('unfixable hard fail → not-a-fit, even when paused', () => {
    expect(groupFor('paused', [g({ result: 'fail' })])).toBe('not-a-fit');
  });
  it('paused/upcoming/unverified → watch', () => {
    expect(groupFor('upcoming', [g({})])).toBe('watch');
    expect(groupFor('unverified', [g({ result: 'unknown' })])).toBe('watch');
  });
  it('open + all hard pass → act-now; unknown or soft fail → prepare', () => {
    expect(groupFor('rolling', [g({})])).toBe('act-now');
    expect(groupFor('closing-soon', [g({ result: 'unknown' })])).toBe('prepare');
    expect(groupFor('open', [g({ result: 'fail', fixable: true })])).toBe('prepare');
    expect(groupFor('open', [g({}), g({ severity: 'soft', result: 'fail' })])).toBe('prepare');
  });
});

describe('trackFor', () => {
  it('credits and services are quick wins', () => {
    expect(trackFor(makeProgram({ benefit: { kind: 'credits', currency: 'USD', note: '' } }))).toBe('quick-wins');
    expect(trackFor(makeProgram())).toBe('funding');
  });
});

describe('estimateFunding', () => {
  it('counts only cash/tax where hard gates pass; credits separate; consortium excluded', () => {
    const cash = assessProgram(makeProgram({ slug: 'a', gates: ['au-entity'] }), { hasAcn: true }, now);
    const blocked = assessProgram(makeProgram({ slug: 'b', gates: ['au-entity'] }), {}, now);
    const credits = assessProgram(makeProgram({ slug: 'c', benefit: { kind: 'credits', currency: 'USD', note: '', min: 1000, max: 5000 } }), {}, now);
    const crcp = assessProgram(makeProgram({ slug: 'd', benefit: { kind: 'cash', currency: 'AUD', note: '', min: 100000, max: 3000000, consortium: true } }), {}, now);
    const e = estimateFunding([cash, blocked, credits, crcp], {});
    expect(e.aud).toEqual({ low: 10_000, high: 50_000 });
    expect(e.creditsUsd).toEqual({ low: 1000, high: 5000 });
    expect(e.includedSlugs).toEqual(['a', 'c']);
  });
  it('RDTI estimator uses R&D spend band and refundability', () => {
    const rdti = assessProgram(makeProgram({ slug: 'rdti', status: { state: 'rolling' },
      benefit: { kind: 'tax-offset', currency: 'AUD', note: '', estimator: 'rdti' } }), {}, now);
    expect(estimateFunding([rdti], { rdSpend: '20k-100k', turnover: 'under-1m' }).aud).toEqual({ low: 8700, high: 43500 });
  });
});
```

**Step 2:** Run both. Expected: FAIL.

**Step 3: Implement `lib/scoring.ts`**

```ts
import type { Persona, Profile, Program } from '@/lib/schema';
import type { GateResult } from '@/lib/gates';
import { normaliseRef } from '@/lib/gates';

export type Dims = { funding: number; probability: number; effort: number; value: number; speed: number };
export type ScoreBreakdown = { dims: Dims; weights: Dims; total: number; notes: string[] };

export const WEIGHTS: Record<Persona, Dims> = {
  bootstrapped: { funding: 1, probability: 1.2, effort: 1.3, value: 1, speed: 1.3 },
  'pre-raise': { funding: 1, probability: 1, effort: 1, value: 1, speed: 1 },
  'vc-backed': { funding: 1.3, probability: 1, effort: 0.8, value: 1.2, speed: 1 },
};

const clamp = (n: number) => Math.max(0, Math.min(5, n));

export function probabilityFrom(gates: GateResult[]): number {
  const softFails = gates.filter((g) => g.severity === 'soft' && g.result === 'fail').length;
  const hardFixable = gates.filter((g) => g.severity === 'hard' && g.result === 'fail' && g.fixable).length;
  const unknowns = gates.filter((g) => g.result === 'unknown').length;
  return clamp(4 - 1.5 * softFails - 1 * hardFixable - 0.5 * unknowns);
}

export function adjustEffort(base: number, hours: Profile['founderHoursPerWeek']): number {
  if (hours === 'under-2' && base < 4) return clamp(base - 1);
  if (hours === 'over-10') return clamp(base + 0.5);
  return base;
}

export function scoreProgram(program: Program, gates: GateResult[], profile: Profile): ScoreBreakdown {
  const persona = profile.persona ?? 'pre-raise';
  const weights = { ...WEIGHTS[persona] };
  const notes: string[] = [];
  if (profile.urgency === 'now') { weights.speed *= 1.3; notes.push('Speed weighted up: funding needed now'); }
  const dims: Dims = {
    funding: program.scores.funding,
    probability: probabilityFrom(gates),
    effort: adjustEffort(program.scores.effort, profile.founderHoursPerWeek),
    value: program.scores.value,
    speed: program.scores.speed,
  };
  const keys = Object.keys(dims) as (keyof Dims)[];
  const sumW = keys.reduce((s, k) => s + weights[k], 0);
  const sumWD = keys.reduce((s, k) => s + weights[k] * dims[k], 0);
  let total = Math.round((sumWD / (sumW * 5)) * 100);
  if (persona === 'bootstrapped' && program.gates.some((r) => normaliseRef(r).id === 'cash-match')) {
    total = Math.max(0, total - 10);
    notes.push('Cash match ties up runway for a bootstrapped company');
  }
  return { dims, weights, total, notes };
}
```

**Step 4: Implement `lib/assess.ts`**

```ts
import type { Profile, Program } from '@/lib/schema';
import { evaluateGates, type GateResult } from '@/lib/gates';
import { deriveStatus, type DerivedState, type StatusInfo } from '@/lib/status';
import { scoreProgram, type ScoreBreakdown } from '@/lib/scoring';

export type Group = 'act-now' | 'prepare' | 'watch' | 'not-a-fit';
export type Track = 'funding' | 'quick-wins';
export type Assessment = { program: Program; status: StatusInfo; gates: GateResult[]; group: Group | null; track: Track; score: ScoreBreakdown };

export const GROUP_ORDER: Group[] = ['act-now', 'prepare', 'watch', 'not-a-fit'];

export function groupFor(state: DerivedState, gates: GateResult[]): Group | null {
  if (state === 'closed') return null;
  const hard = gates.filter((g) => g.severity === 'hard');
  if (hard.some((g) => g.result === 'fail' && !g.fixable)) return 'not-a-fit';
  if (state === 'upcoming' || state === 'paused' || state === 'unverified') return 'watch';
  const blocked = hard.some((g) => g.result !== 'pass') || gates.some((g) => g.severity === 'soft' && g.result === 'fail');
  return blocked ? 'prepare' : 'act-now';
}

export const trackFor = (p: Program): Track => (p.benefit.kind === 'credits' || p.benefit.kind === 'service' ? 'quick-wins' : 'funding');

export function assessProgram(program: Program, profile: Profile, now: Date): Assessment {
  const gates = evaluateGates(program.gates, profile, { now });
  const status = deriveStatus(program, now, profile);
  return { program, status, gates, group: groupFor(status.state, gates), track: trackFor(program), score: scoreProgram(program, gates, profile) };
}

export function assessAll(programs: Program[], profile: Profile, now: Date): Assessment[] {
  return programs
    .map((p) => assessProgram(p, profile, now))
    .filter((a) => a.group !== null)
    .sort((a, b) => GROUP_ORDER.indexOf(a.group!) - GROUP_ORDER.indexOf(b.group!) || b.score.total - a.score.total);
}

const RD_BANDS: Record<NonNullable<Profile['rdSpend']>, [number, number]> = {
  'under-20k': [0, 0], '20k-100k': [20_000, 100_000], '100k-500k': [100_000, 500_000], 'over-500k': [500_000, 1_000_000],
};

function rdtiRange(a: Assessment, profile: Profile): [number, number] {
  if (!profile.rdSpend) return [0, 0];
  const refundable = profile.turnover ? ['under-1m', '1m-10m', '10m-20m'].includes(profile.turnover) : true;
  const rate = refundable ? 0.435 : 0.335; // 25% + 18.5 pts, or 25% + 8.5 pts (non-refundable, ≤2% intensity)
  const [lo, hi] = RD_BANDS[profile.rdSpend];
  return [Math.round(lo * rate), Math.round(hi * rate)];
}

export type FundingEstimate = { aud: { low: number; high: number }; creditsUsd: { low: number; high: number }; includedSlugs: string[] };

export function estimateFunding(assessments: Assessment[], profile: Profile): FundingEstimate {
  const out: FundingEstimate = { aud: { low: 0, high: 0 }, creditsUsd: { low: 0, high: 0 }, includedSlugs: [] };
  for (const a of assessments) {
    if (a.group !== 'act-now' && a.group !== 'prepare') continue;
    if (a.gates.some((g) => g.severity === 'hard' && g.result !== 'pass')) continue;
    const b = a.program.benefit;
    if (b.consortium) continue;
    if (b.kind === 'cash' || b.kind === 'tax-offset') {
      const [lo, hi] = b.estimator === 'rdti' ? rdtiRange(a, profile) : [b.min ?? 0, b.max ?? b.min ?? 0];
      out.aud.low += lo; out.aud.high += hi; out.includedSlugs.push(a.program.slug);
    } else if (b.kind === 'credits') {
      out.creditsUsd.low += b.min ?? 0; out.creditsUsd.high += b.max ?? b.min ?? 0; out.includedSlugs.push(a.program.slug);
    }
  }
  return out;
}
```

**Step 5:** Run the tests. Expected: PASS. The expected totals were worked out by hand from the weights; if one is off by 1, check the rounding and don't change the weights.

**Step 6: Commit:** `feat(lib): persona-weighted scoring, result groups and funding estimate`

---

### Tasks 7–9: Program data

**Shared rules (apply to all three tasks)**

- One file per program at `content/programs/<slug>.ts`, exporting `default` a `ProgramInput` (`import type { ProgramInput } from '@/lib/schema'`).
- Facts come **only** from Appendix A of the design document. If a gate parameter is not in Appendix A, either verify it on the official page with WebFetch and add that page to `sources`, or make the gate `severity: 'soft'` and add a `content.caveats` entry saying it is unverified.
- `verification.lastVerified: '2026-10-26'` for every program. Add `changelog: [{ date: '2026-10-26', note: 'Initial verified record' }]`.
- Only `official: true` sources may support a program whose `status.state` is `open` or `rolling`.
- `content` is written plainly for founders:
  - `summary`: 1–2 sentences.
  - `howToApply`: 3–5 steps.
  - `prepare`: 3–6 items.
  - `mistakes`: 2–4 items, taken from the research report where Appendix A agrees with it.
- `personas` notes appear only where the persona genuinely changes the advice.
- `goalTemplate` has 2–5 steps. Use `beforeDeadlineBusinessDays` for programs with a close deadline and `offsetDays` for rolling ones.
- Deadlines with a time use `tz: 'Australia/Melbourne'`, except Defence, which publishes AEST and uses `tz: 'Australia/Brisbane'`.

**Registry file (created in Task 7, extended in Tasks 8 and 9):** `content/programs/index.ts`

```ts
import { ProgramSchema, type Program } from '@/lib/schema';
import rdti from './rdti';
// …one import per file, alphabetical by slug

const raw = [rdti /* , … */];

export const PROGRAMS: Program[] = raw.map((p) => ProgramSchema.parse(p));
export const PROGRAMS_BY_SLUG = new Map(PROGRAMS.map((p) => [p.slug, p]));
export const getProgram = (slug: string) => PROGRAMS_BY_SLUG.get(slug);
```

**Content test (created in Task 7):** `tests/content/programs.test.ts`

```ts
import { describe, it, expect } from 'vitest';
import { PROGRAMS } from '@/content/programs';

describe('program content', () => {
  it('slugs are unique', () => { expect(new Set(PROGRAMS.map((p) => p.slug)).size).toBe(PROGRAMS.length); });
  it('open/rolling programs cite an official source', () => {
    for (const p of PROGRAMS.filter((p) => ['open', 'rolling'].includes(p.status.state)))
      expect(p.verification.sources.some((s) => s.official), p.slug).toBe(true);
  });
  it('stacking references existing programs', () => {
    const slugs = new Set(PROGRAMS.map((p) => p.slug));
    for (const p of PROGRAMS) for (const s of p.stacking) expect(slugs.has(s.with), `${p.slug} → ${s.with}`).toBe(true);
  });
  it('benefit min ≤ max', () => {
    for (const p of PROGRAMS) if (p.benefit.min !== undefined && p.benefit.max !== undefined) expect(p.benefit.min, p.slug).toBeLessThanOrEqual(p.benefit.max);
  });
});
```

Stacking entries may only reference slugs that exist by the end of the current task. Add cross-references to later programs in Task 9.

**Reference example: `content/programs/csiro-kick-start.ts`** (write exactly this)

```ts
import type { ProgramInput } from '@/lib/schema';

const program: ProgramInput = {
  slug: 'csiro-kick-start',
  name: 'CSIRO Kick-Start',
  provider: 'CSIRO',
  level: 'federal',
  type: 'voucher',
  benefit: { kind: 'cash', min: 20_000, max: 60_000, currency: 'AUD',
    note: 'CSIRO matches your cash dollar for dollar, paid to CSIRO for research. Up to two vouchers.' },
  status: { state: 'rolling', note: 'Year-round expressions of interest. Approval depends on CSIRO capability and funds.' },
  deadlines: [],
  gates: [
    'au-entity', 'gst-registered', 'not-foreign-subsidiary',
    { id: 'turnover-or-age', turnoverUnder: 10_000_000, yearsUnder: 3 },
    { id: 'cash-match', min: 20_000 },
    'experimental-activities',
  ],
  scores: { funding: 3, value: 5, effort: 3, speed: 3 },
  personas: {
    bootstrapped: 'The cash match is the binding constraint: budget it before the EOI.',
    'vc-backed': 'Use it to de-risk one technical question investors keep asking about.',
  },
  goalTemplate: [
    { title: 'Write a 2–3 page EOI around one research question', offsetDays: 7 },
    { title: 'Submit the Kick-Start EOI', offsetDays: 10 },
    { title: 'Meet the matched CSIRO researcher', offsetDays: 45 },
    { title: 'Agree IP and commercial-use terms', offsetDays: 60 },
    { title: 'Sign the agreement (within 60 days of offer)', offsetDays: 90 },
  ],
  stacking: [{ with: 'rdti', note: 'Possible, but the grant can trigger an R&D Tax clawback adjustment. Get advice.' }],
  content: {
    summary: 'A matched voucher that pays CSIRO to research one technical problem with you.',
    howToApply: [
      'Submit an expression of interest describing the research question.',
      'CSIRO reviews it within about five working days.',
      'CSIRO matches you with a researcher, usually within two to six weeks.',
      'Develop the full application with the researcher, then sign within 60 days.',
    ],
    prepare: [
      'One commercially decisive technical uncertainty',
      'Dataset description and permission to use it',
      'Evidence of ACN, GST registration and eligibility',
      'Cash for the match (in-kind does not count)',
    ],
    mistakes: [
      'Asking for routine app development or customer introductions',
      'Signing before agreeing IP and commercial-use rights',
    ],
    caveats: [
      'CSIRO words the turnover test two ways: the guidelines say the last complete financial year; the FAQ says the current and two previous years. Confirm with kickstart@csiro.au.',
    ],
  },
  verification: {
    lastVerified: '2026-10-26',
    sources: [
      { url: 'https://www.csiro.au/en/work-with-us/funding-programs/SME/CSIRO-Kick-Start/Eligibility-and-funding', title: 'Kick-Start eligibility and funding', official: true },
      { url: 'https://www.csiro.au/en/work-with-us/funding-programs/SME/CSIRO-Kick-Start/FAQs', title: 'Kick-Start FAQs', official: true },
    ],
  },
  changelog: [{ date: '2026-10-26', note: 'Initial verified record' }],
};

export default program;
```

### Task 7: Federal program data

**Files:**
- Create: `content/programs/index.ts`, `tests/content/programs.test.ts`
- Create one file each (slug → state; gates; scores as funding/value/effort/speed):

| slug | state | gates | scores | notes |
|---|---|---|---|---|
| `rdti` | rolling | `au-entity`, `experimental-activities`, `{rd-spend-over aud 20000}`, `{turnover-under aud 20000000, severity soft}`, `contemporaneous-records` | 3/4/3/2 | `benefit.kind 'tax-offset'`, `estimator 'rdti'`; deadline `{label:'R&D registration due', kind:'milestone', relative:'fyEnd+10m'}`; caveat on the proposed 1 Jul 2028 changes (not yet law); the soft turnover gate's reason explains the non-refundable rate |
| `csiro-kick-start` | rolling | (reference above) | 3/5/3/3 | |
| `crc-p` | unverified | `au-entity`, `gst-registered`, `{research-partner min 'active'}`, `{industry-partners count 1}`, `{cash-match min 100000, severity soft}` | 5/5/1/1 | `benefit.consortium: true`, 100,000–3,000,000; `status.note` "Round 20 not confirmed on business.gov.au or GrantConnect" |
| `crc-ai-accelerator` | upcoming | `au-entity`, `{research-partner min 'active'}` | 5/5/1/1 | `consortium: true`; note "~$50M round opening 2027" |
| `industry-growth-program` | paused | `au-entity`, `{turnover-under aud 20000000}` | 4/4/2/1 | |
| `emdg` | paused | `au-entity`, `{turnover-under aud 20000000}` | 2/3/3/2 | review note |
| `brii` | closed | `au-entity` | 3/4/2/2 | |
| `aea` | closed | `{research-partner min 'formal'}` | 3/4/2/1 | existing projects continue to Jun 2028 |
| `ai-adopt-centres` | rolling | `au-entity`, `{sector-any [health, manufacturing, energy, agriculture, defence], severity soft}` | 0/3/4/4 | `kind 'service'` (free) |
| `defence-industry-development` | unverified | `au-entity`, `{sector-any [defence]}` | 3/3/2/2 | deadline `{close 2026-10-31 23:59 tz Australia/Brisbane, label 'Exports & Security batch closes'}`; note on new guidelines by ~3 Nov |
| `arena-advancing-renewables` | rolling | `au-entity`, `{sector-any [energy]}` | 4/4/1/1 | |
| `csiro-innovate-to-grow` | upcoming | `au-entity` | 0/3/3/2 | `kind 'service'`; monthly sector intakes |
| `national-industry-phd` | closed | `au-entity`, `{research-partner min 'active'}` | 2/3/2/1 | |
| `apr-intern` | rolling | `au-entity` | 0/3/3/3 | `kind 'service'`; note the costs ($19,900 for 3 months ex-GST) |
| `esic` | rolling | `{incorporated-within months 36, severity soft}` | 2/3/4/3 | `type 'investor-incentive'`, `benefit.kind 'investor'`; summary is clear that it benefits **investors**; verify the company tests on the ATO page or add a caveat |

**Steps:**
1. Write the content test and the registry with only `csiro-kick-start` in it. Run it: PASS.
2. Add the remaining files one at a time, registering each.
3. Run `pnpm test`: PASS.
4. **Commit:** `feat(content): add verified federal programs`

### Task 8: Industry and credits data

| slug | state | gates | scores | notes |
|---|---|---|---|---|
| `microsoft-for-startups` | rolling | `product-company`, `{funding-stage-before stage 'series-c-plus'}`, `{prior-credits-max provider 'azure' usd 350000}` | 4/3/5/5 | credits USD 0–150,000 |
| `aws-activate-founders` | rolling | `{incorporated-within months 120}`, `{funding-stage-before stage 'series-b'}`, `product-company`, `has-website` | 1/3/5/4 | 1,000–5,000 USD; processing takes 5–10 business days |
| `aws-activate-portfolio` | rolling | `{incorporated-within months 120}`, `{funding-stage-before stage 'series-b'}`, `vc-or-accelerator` | 3/3/4/3 | up to 200,000 USD |
| `google-cloud-start` | rolling | `{incorporated-within months 24}`, `has-mvp`, `product-company`, `{prior-credits-max provider 'gcp' usd 0}` | 1/3/5/4 | 2,000 USD; caveat about the paid Workspace exclusion |
| `google-cloud-ai` | rolling | `vc-funded`, `{incorporated-within months 60}`, `{last-round-within rules [{stages:[pre-seed,seed],months:60},{stages:[series-a],months:12}]}`, `{prior-credits-max provider 'gcp' usd 5000}`, `{uses-stack tech 'gemini'}` | 5/3/4/3 | up to 350,000 USD over 2 years; a bootstrapped persona note explains why it's not a fit |
| `nvidia-inception` | rolling | `{incorporated-within months 120}`, `has-website`, `product-company` | 0/4/5/3 | `kind 'service'`; no cash |
| `cloudflare-startups` | rolling | `{incorporated-within months 60}`, `{funding-stage-before stage 'series-c-plus'}` | 2/3/5/4 | 5,000–250,000 USD; persona notes on tiers |
| `claude-startups` | closed | `product-company` | 2/3/5/4 | cohort full; VC-partner credits note |
| `openai-startups` | unverified | `product-company` | 2/3/4/3 | secondary sources only, `official: false` plus the official URL |

**Steps:** add the files, register them, run `pnpm test`.
**Commit:** `feat(content): add cloud and industry credit programs`

### Task 9: Victorian and accelerator data, plus the evidence file

| slug | level | state | gates | scores | notes |
|---|---|---|---|---|---|
| `iv-basecamp-ascent` | vic | open | `{state-is vic}` | 0/3/4/4 | service |
| `iv-office-hours` | vic | rolling | `{state-is vic}` | 0/2/5/5 | service |
| `alice-anderson-fund` | vic | rolling | `{state-is vic}`, `women-led` | 4/4/2/2 | capital, `kind 'equity'`, up to 300,000 |
| `venture-growth-fund` | vic | rolling | `{state-is vic}`, `{customer-evidence-at-least level 'revenue'}` | 4/3/2/2 | `kind 'debt'`, 50,000–5,000,000 |
| `victor-ai` | vic | unverified | `{state-is vic}` | 2/4/3/3 | accelerator; lists the nine operators |
| `press-play` | vic | open | `women-led`, `{state-is vic, severity soft}` | 1/4/3/3 | close 2026-11-15; `kind 'service'` (equity-free) |
| `worksafe-rtw-trials` | vic | open | `{sector-any [construction, manufacturing, health]}`, `{industry-partners count 2}`, `{research-partner min 'active', severity soft}` | 5/4/1/2 | close 2026-11-27 14:00; `consortium: true`; caveat on AEST vs AEDT |
| `startmate-summer-27` | industry | open | `au-entity` | 3/4/3/3 | close 2026-11-01 23:59; `kind 'equity'`, 120,000 for 8% |
| `melbourne-accelerator-program` | university | closed | `{state-is vic}` | 2/4/3/3 | |
| `rmit-launchhub` | university | closed | `{state-is vic}` | 1/3/3/3 | RMIT-affiliation caveat |
| `monash-generator` | university | unverified | `{state-is vic}` | 1/3/3/3 | |

**Also:**
- Create `content/verification/2026-10-26.md`, a copy of Appendix A from the design document with a one-line header. Don't import it anywhere.
- Add the remaining stacking cross-references now that every slug exists.

**Steps:** add the files, register them, run `pnpm test`. Expected: PASS, 35 programs.
**Commit:** `feat(content): add Victorian and accelerator programs and verification evidence`

---

### Task 10: Design tokens, theme, layout and UI primitives

Use `@superpowers:ui-ux-pro-max` and the design document's visual system section.

**Files:**
- Modify: `app/globals.css`, `app/layout.tsx`
- Create:
  - `components/layout/top-nav.tsx`, `components/layout/bottom-nav.tsx`, `components/layout/skip-link.tsx`
  - `components/ui/button.tsx`, `badge.tsx`, `status-pill.tsx`, `card.tsx`, `tabs.tsx`, `disclosure.tsx`, `field.tsx` (label, help, error), `choice-group.tsx` (radio/checkbox cards), `empty-state.tsx`, `menu.tsx`
  - `lib/use-now.ts`, `lib/cn.ts`
- Test: `tests/components/status-pill.test.tsx`

**`app/globals.css`:**
- `@import "tailwindcss";` and `@custom-variant dark (&:where([data-theme=dark], [data-theme=dark] *));`
- `:root` and `[data-theme=dark]` define these CSS variables: `--bg --surface --border --fg --muted-fg --primary --on-primary --accent`, plus status pairs `--ok-bg --ok-fg --warn-bg --warn-fg --neutral-bg --neutral-fg`. All pairs must meet AA (4.5:1) in both themes.
- `@theme inline` maps them to `--color-bg`, `--color-surface`, … and sets `--font-sans: var(--font-geist-sans)` and `--font-mono: var(--font-geist-mono)`.
- Body: `bg-bg text-fg font-sans antialiased`, line-height 1.6.
- `.num { font-variant-numeric: tabular-nums; }`.
- Under `prefers-reduced-motion`, set transition and animation durations to 0.

**`app/layout.tsx`:**
- Load fonts with `import { GeistSans } from 'geist/font/sans'` and `import { GeistMono } from 'geist/font/mono'`, and apply their `.variable` classes on `<html>`.
- An inline `<script>` in `<head>` sets `document.documentElement.dataset.theme` from `localStorage['gn-theme']` (wrapped in try/catch), falling back to `matchMedia('(prefers-color-scheme: dark)')`. Add `suppressHydrationWarning` on `<html>`.
- Render `SkipLink`, then `TopNav` (hidden below `md`), then `<main id="main" className="mx-auto max-w-[1120px] px-4 pb-24 md:pb-12">`, then `BottomNav` (`md:hidden`, fixed, with safe-area padding).

**Navigation:**
- Items: Programs `/programs` (icon `LayoutGrid`), Assess `/assess` (`ClipboardCheck`), My Plan `/plan` (`KanbanSquare`), Report `/report` (`FileText`). Each has an icon and a text label.
- The active route is shown with `aria-current="page"` and is visually distinct: weight 600, plus an accent underline on desktop and accent text on mobile.
- Touch targets are at least 44px.
- The top nav also has a persona chip, which links to `/settings` and shows the persona from the store, or "Choose persona". Task 13 provides the store, so leave a placeholder until then.

**`useNow()`:** returns `null` until mounted, then `new Date()`, refreshing every 60 seconds.

**`StatusPill` props:** `{ declared: StatusState; derived?: DerivedState; daysToClose?: number }`. It renders the derived state when given, otherwise the declared state.

| State | Icon | Label | Colours |
|---|---|---|---|
| open / rolling | `CircleCheck` | "Open" / "Rolling" | ok |
| closing-soon | `Clock` | "Closes in N days" | warn |
| upcoming | `CircleDashed` | "Upcoming" | neutral outline |
| unverified | `CircleHelp` | "Unverified" | neutral outline |
| paused | `CirclePause` | "Paused" | neutral |
| closed | `CircleX` | "Closed" | neutral, label struck through |

**Component test:** renders "Closes in 5 days" for `derived='closing-soon', daysToClose=5`; renders "Unverified" with an icon; never relies on colour alone (check that the text is present). Use `// @vitest-environment jsdom` and `@testing-library/react`.

**Visual rules for every component:**
- 1px `border-border`, no shadows.
- Radius `rounded-lg` (8px) on cards, `rounded-md` (6px) on buttons and inputs.
- Focus: `focus-visible:outline-2 outline-accent outline-offset-2`.
- `Button` variants: `primary` (bg-primary text-on-primary), `secondary` (border), `ghost`. Size `md` is at least 44px tall.

**Verify:** `pnpm test`, `pnpm build`, then `pnpm dev` and look at `/` in light and dark (toggle with `localStorage.setItem('gn-theme','dark')`).
**Commit:** `feat(ui): design tokens, theme, navigation and UI primitives`

---

### Task 11: Home page and programs directory

**Files:**
- Modify: `app/page.tsx`
- Create:
  - `app/programs/page.tsx`
  - `components/programs/program-card.tsx`, `components/programs/directory.tsx` (client), `components/programs/closing-soon-strip.tsx` (client)
  - `lib/programs/filter.ts`
- Test: `tests/lib/filter.test.ts`

**`lib/programs/filter.ts`:**
- `filterPrograms(programs, statuses: Map<slug, StatusInfo>, f: { q?: string; status?: 'open-upcoming' | 'all' | DerivedState; type?: Program['type'][]; level?: Program['level'][] }): Program[]`
  - Search covers name, provider and summary, case-insensitive.
  - `'open-upcoming'` (the default) keeps open, rolling, closing-soon, upcoming and unverified.
  - Sort: closing-soon first (by days ascending), then open/rolling, then the rest; alphabetical within each.
- `closingSoon(programs, now, withinDays = 30)`: programs with a future close deadline within N days, sorted by date.
- Test both with `makeProgram` fixtures.

**`ProgramCard`:**
- Bordered card containing:
  - The name (16px, weight 600) linking to `/programs/[slug]/`, with the status pill at the top right.
  - The provider and level in muted text.
  - The benefit in mono (e.g. "$20K–$60K", "US$2K credits", "Free service").
  - The summary, clamped to 2 lines.
  - The next deadline when there is one ("Closes 15 Nov 2026").
  - "Verified 26 Oct 2026" in muted text, or a "Needs re-check" badge when stale.
- Format amounts with a `formatBenefit(benefit)` helper in `lib/format.ts`. Unit-test it: `$20K–$60K`, `Up to US$150K`, `$1.25M`.

**Directory (client):**
- Search input with a visible label, then filter chips for status, type and level.
- Results count with `aria-live="polite"`.
- Grid: 1 column, 2 at `md`, 3 at `lg`.
- Filters live in the URL query (`?status=all&type=credits`) via `useSearchParams`, so the back button and shared links keep them. Wrap in `<Suspense>`, which static export requires.
- Statuses are computed with `useNow()`. Before mount, declared statuses are used.
- Empty state: "No programs match. Clear filters."

**Home (`app/page.tsx`):**
- An h1 ("Find, assess and track startup funding in Australia") and a one-line subhead.
- A persona picker: three large choice cards (Bootstrapped, Pre-raise, VC-backed), each with a one-line description. Clicking one stores the persona and routes to `/assess/`; Task 13 wires the store, and until then it routes with `?persona=` as a query parameter.
- The closing-soon strip.
- A "Due this week" strip placeholder; Task 18 fills it in.
- Three short value lines: verified sources, honest about uncertainty, private (data stays in the browser).
- No hero art, gradients or dot patterns. The page has one primary action.

**Verify:** `pnpm test`, `pnpm build`, and manually check the filters at 375px.
**Commit:** `feat: home page and filterable programs directory`

### Task 12: Program detail page

**Files:**
- Create:
  - `app/programs/[slug]/page.tsx` (server component; `generateStaticParams` from `PROGRAMS`; `generateMetadata` with the title and summary)
  - `components/programs/program-detail.tsx`
  - `components/programs/program-status.tsx` (client: derived status and next deadline)
  - `components/programs/eligibility-list.tsx` (client: gate results against the stored profile, or "Take the assessment to check" when there's no profile)

**Layout:**
- Breadcrumb: `Programs / {name}`.
- h1, status pill and provider.
- A key-facts row in mono: benefit, next deadline, type.
- One primary action, **Add to pipeline** (wired in Task 18; disabled with a tooltip until then). A secondary action, **Add deadline to calendar**, appears only when there's a deadline.
- Sections, each with an h2:
  - What it is
  - Eligibility: each gate with an icon and text (pass, fail or unknown), its reason and its fix
  - How to apply (ordered list)
  - Prepare
  - Common mistakes
  - Caveats (amber-tinted callout)
  - Stacking (links to other programs)
  - Sources: links with an "Official" badge where applicable and the verified date
  - Change log
- If the profile has a persona and `personas[persona]` exists, show it as a callout near the top.

**Verify:** `pnpm build` produces `out/programs/csiro-kick-start/index.html`.
**Commit:** `feat: program detail pages`

---

## Milestone 2 — Assessment

### Task 13: Workspace store

**Files:**
- Create:
  - `lib/store/workspace-store.ts` (interface plus Local and Memory implementations, and `migrate`)
  - `lib/store/use-workspace.ts` (Zustand)
  - `lib/plan/goals.ts` (used by `addApplication`)
- Test: `tests/lib/store.test.ts`, `tests/lib/goals.test.ts`

**Step 1: Failing tests**

`tests/lib/goals.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { goalsFromTemplate } from '@/lib/plan/goals';
import { makeProgram } from '../helpers/program';

const now = new Date('2026-10-27T00:00:00Z');

describe('goalsFromTemplate', () => {
  it('offsetDays counts from today (Melbourne)', () => {
    const p = makeProgram({ status: { state: 'rolling' }, goalTemplate: [{ title: 'Send EOI', offsetDays: 7 }] });
    const [g] = goalsFromTemplate(p, 'app1', now, {});
    expect(g).toMatchObject({ title: 'Send EOI', dueDate: '2026-11-03', applicationId: 'app1', status: 'todo', source: 'template' });
  });
  it('beforeDeadlineBusinessDays counts back from the next close', () => {
    const p = makeProgram({ deadlines: [{ label: 'Close', kind: 'close', date: '2026-11-27', time: '14:00' }],
      goalTemplate: [{ title: 'Submit', beforeDeadlineBusinessDays: 5 }] });
    expect(goalsFromTemplate(p, 'a', now, {})[0].dueDate).toBe('2026-11-20');
  });
  it('falls back to +14 days when nothing is specified', () => {
    const p = makeProgram({ status: { state: 'rolling' }, goalTemplate: [{ title: 'Do it' }] });
    expect(goalsFromTemplate(p, 'a', now, {})[0].dueDate).toBe('2026-11-10');
  });
});
```

`tests/lib/store.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { LocalWorkspaceStore, MemoryWorkspaceStore, migrate, emptyWorkspace } from '@/lib/store/workspace-store';
import { createWorkspaceStore } from '@/lib/store/use-workspace';

class FakeStorage { m = new Map<string, string>(); getItem(k: string) { return this.m.get(k) ?? null; } setItem(k: string, v: string) { this.m.set(k, v); } removeItem(k: string) { this.m.delete(k); } }

describe('workspace persistence', () => {
  it('migrate rejects unknown versions and invalid shapes', () => {
    expect(() => migrate({ schemaVersion: 99 })).toThrow();
    expect(() => migrate({ hello: 'world' })).toThrow();
  });
  it('local store round-trips', async () => {
    const s = new LocalWorkspaceStore(new FakeStorage() as unknown as Storage);
    expect(await s.load()).toBeNull();
    const ws = emptyWorkspace(new Date('2026-10-27T00:00:00Z'));
    await s.save(ws);
    expect(await s.load()).toEqual(ws);
  });
  it('local store reports unavailable storage', () => {
    const throwing = { getItem() { throw new Error('denied'); }, setItem() { throw new Error('denied'); }, removeItem() {} } as unknown as Storage;
    expect(new LocalWorkspaceStore(throwing).available()).toBe(false);
  });
});

describe('workspace actions', () => {
  let useWs: ReturnType<typeof createWorkspaceStore>;
  beforeEach(async () => { useWs = createWorkspaceStore(new MemoryWorkspaceStore(), () => new Date('2026-10-27T00:00:00Z')); await useWs.getState().init(); });

  it('addApplication creates starter goals from the template', () => {
    useWs.getState().addApplication('csiro-kick-start');
    const { pipeline, goals } = useWs.getState().ws;
    expect(pipeline).toHaveLength(1);
    expect(goals.length).toBeGreaterThan(0);
    expect(goals.every((g) => g.applicationId === pipeline[0].id)).toBe(true);
  });
  it('moveApplication changes stage and counts calendar changes', () => {
    useWs.getState().addApplication('csiro-kick-start');
    const id = useWs.getState().ws.pipeline[0].id;
    const before = useWs.getState().ws.changesSinceCalendarExport;
    useWs.getState().moveApplication(id, 'submitted');
    expect(useWs.getState().ws.pipeline[0].stage).toBe('submitted');
    expect(useWs.getState().ws.changesSinceCalendarExport).toBe(before + 1);
  });
  it('setProfile merges; setting a persona applies its defaults when unanswered', () => {
    useWs.getState().setProfile({ persona: 'vc-backed' });
    expect(useWs.getState().ws.profile.vcBacked).toBe(true);
    useWs.getState().setProfile({ companyName: 'Acme' });
    expect(useWs.getState().ws.profile).toMatchObject({ persona: 'vc-backed', companyName: 'Acme' });
  });
  it('removeApplication also removes its goals', () => {
    useWs.getState().addApplication('csiro-kick-start');
    const id = useWs.getState().ws.pipeline[0].id;
    useWs.getState().removeApplication(id);
    expect(useWs.getState().ws.goals.filter((g) => g.applicationId === id)).toHaveLength(0);
  });
});
```

**Step 2:** Run them. Expected: FAIL.

**Step 3: Implement `lib/plan/goals.ts`**

```ts
import type { Goal, Program, Profile } from '@/lib/schema';
import { addDays, subtractBusinessDays, todayISO } from '@/lib/dates';
import { resolveDeadlines } from '@/lib/status';

export function goalsFromTemplate(p: Program, applicationId: string, now: Date, profile: Profile): Goal[] {
  const today = todayISO(now);
  const close = resolveDeadlines(p, now, profile).find((d) => d.kind === 'close' && d.at > now);
  const stamp = now.toISOString();
  return p.goalTemplate.map((t) => ({
    id: crypto.randomUUID(), applicationId, title: t.title,
    dueDate: t.beforeDeadlineBusinessDays !== undefined && close
      ? subtractBusinessDays(close.date, t.beforeDeadlineBusinessDays)
      : addDays(today, t.offsetDays ?? 14),
    status: 'todo', steps: [], reminderOffsetsDays: [7, 1], source: 'template', sequence: 0,
    createdAt: stamp, updatedAt: stamp,
  }));
}
```

**Step 4: Implement `lib/store/workspace-store.ts`**

```ts
import { WorkspaceSchema, type Workspace } from '@/lib/schema';

export const STORAGE_KEY = 'gn-workspace';

export interface WorkspaceStore {
  available(): boolean;
  load(): Promise<Workspace | null>;
  save(ws: Workspace): Promise<void>;
  clear(): Promise<void>;
}

export function emptyWorkspace(now: Date): Workspace {
  const t = now.toISOString();
  return WorkspaceSchema.parse({
    schemaVersion: 1, workspaceId: crypto.randomUUID(), profile: {}, pipeline: [], goals: [],
    settings: {}, changesSinceCalendarExport: 0, createdAt: t, updatedAt: t,
  });
}

/** Upgrade older shapes here as schemaVersion increases. */
export function migrate(raw: unknown): Workspace {
  const v = (raw as { schemaVersion?: unknown })?.schemaVersion;
  if (v !== 1) throw new Error(`Unsupported workspace version: ${String(v)}`);
  return WorkspaceSchema.parse(raw);
}

export class LocalWorkspaceStore implements WorkspaceStore {
  constructor(private storage: Storage | undefined = typeof window !== 'undefined' ? window.localStorage : undefined) {}
  available(): boolean {
    try { this.storage!.setItem('gn-probe', '1'); this.storage!.removeItem('gn-probe'); return true; } catch { return false; }
  }
  async load() {
    try { const s = this.storage?.getItem(STORAGE_KEY); return s ? migrate(JSON.parse(s)) : null; } catch { return null; }
  }
  async save(ws: Workspace) { try { this.storage?.setItem(STORAGE_KEY, JSON.stringify(ws)); } catch { /* surfaced via available() */ } }
  async clear() { try { this.storage?.removeItem(STORAGE_KEY); } catch { /* ignore */ } }
}

export class MemoryWorkspaceStore implements WorkspaceStore {
  private ws: Workspace | null = null;
  available() { return true; }
  async load() { return this.ws; }
  async save(ws: Workspace) { this.ws = structuredClone(ws); }
  async clear() { this.ws = null; }
}
```

If `load()` finds unparseable data, it returns `null`. The UI must not overwrite that data silently: `init()` keeps the raw string under `gn-workspace-corrupt-<timestamp>` before starting fresh.

**Step 5: Implement `lib/store/use-workspace.ts`**

- `createWorkspaceStore(store: WorkspaceStore, clock: () => Date = () => new Date())` returns a Zustand vanilla-compatible hook built with `create<State>()`.
- **State:** `{ ws: Workspace; ready: boolean; storageAvailable: boolean }`.
- **`init()`:**
  - Loads the workspace, or creates `emptyWorkspace(clock())`.
  - Sets `ready` and `storageAvailable`.
  - Subscribes to changes and saves 500ms after the last one (debounced with `setTimeout`).
- **Actions:**

  | Action | What it does |
  |---|---|
  | `setProfile(patch)` | Shallow-merges into `profile`. When `patch.persona` is set and `vcBacked` hasn't been answered, sets `vcBacked` from `PERSONA_DEFAULTS` in `lib/personas.ts`: bootstrapped → false, pre-raise → false, vc-backed → true. |
  | `addApplication(slug)` | Ignored if that slug is already in the pipeline. Creates the application with stage `considering` and appends `goalsFromTemplate(program, id, now, profile)`. |
  | `addCustomApplication(name)` | Creates an application for a program that isn't in the directory. |
  | `moveApplication(id, stage)` | Changes the application's stage. |
  | `updateApplication(id, patch)` | Patches an application. |
  | `removeApplication(id)` | Removes the application and its goals. |
  | `addGoal(partial)` | Creates a goal with `source 'user'`. |
  | `updateGoal(id, patch)` | Increments `sequence`. |
  | `toggleStep(goalId, stepId)` | Ticks or unticks a sub-step. |
  | `removeGoal(id)` | Removes a goal. |
  | `importWorkspace(ws)` | Replaces the whole workspace. |
  | `reset()` | Replaces it with an empty workspace. |
  | `markExported()` | Sets `lastExportedAt`. |
  | `markCalendarExported()` | Sets `lastCalendarExportAt` and zeroes `changesSinceCalendarExport`. |
  | `setSettings(patch)` | Patches settings. |

- Every pipeline or goal mutation increments `changesSinceCalendarExport` by 1 and sets `updatedAt` on the record and the workspace.
- Export the app-wide hook `useWorkspace = createWorkspaceStore(new LocalWorkspaceStore())`, plus a `WorkspaceProvider` client component, mounted in the layout, that calls `init()` once.
- Look up programs with `getProgram` from `@/content/programs`.

**Step 6: Wire the persona chip and home persona cards to the store.**

**Step 7:** Run the tests. Expected: PASS.
**Commit:** `feat(store): versioned browser workspace with pipeline and goal actions`

### Task 14: Assessment wizard

**Files:**
- Create:
  - `lib/assessment/questions.ts`
  - `app/assess/page.tsx`
  - `components/assess/wizard.tsx` (client), `components/assess/question.tsx`
- Test: `tests/lib/questions.test.ts`

**`lib/assessment/questions.ts`:** a declarative list. Each question is `{ id: keyof Profile; step: 1–6; type: 'single' | 'multi' | 'boolean' | 'date' | 'month' | 'number' | 'text' | 'credits'; label; help?; options?: {value, label, description?}[]; optional?: boolean }`.

| Step | Title | Fields |
|---|---|---|
| 1 | You | `persona` (three cards with descriptions), `companyName` |
| 2 | Company | `hasAcn`, `gstRegistered`, `incorporatedOn`, `foreignSubsidiary`, `state`, `fyEndMonth` (default 6) |
| 3 | Money | `turnover`, `fundingStage`, `lastRoundOn` (shown only when fundingStage ≠ none), `vcBacked`, `acceleratorMember`, `cashMatch`, `priorCreditsUsd` (three number inputs: AWS, Azure, GCP; blank means unknown) |
| 4 | Product and R&D | `businessModel`, `hasMvp`, `hasWebsite`, `stack`, `experimental` (help: "work where the outcome can't be known in advance, even by an expert"), `rdSpend`, `contemporaneousRecords` |
| 5 | Partners and market | `researchPartner`, `industryPartners`, `sectors`, `customerEvidence`, `womenLed` (optional, includes "Prefer not to say", help explains which programs use it) |
| 6 | Capacity | `founderHoursPerWeek`, `urgency` |

**Test:** every `id` is a key of `ProfileSchema.shape`; every option value parses with that field's schema; steps 1–6 are each non-empty.

**Wizard:**
- Step indicator "Step 2 of 6 · Company" with a progress bar.
- Back and Next buttons. Next is the primary action; on the last step it reads "See results".
- Every question has a visible label and help text below it.
- Every single-choice question also has a "Not sure" choice, which clears the answer.
- Each answer is written to the store immediately, so the form autosaves.
- On step change, focus moves to the step heading.
- `?step=` keeps the current step in the URL.
- `?persona=` from the home page pre-selects the persona.
- Finishing routes to `/assess/results/`.

**Verify:** fill in the wizard by hand, reload mid-way, and check the answers persist.
**Commit:** `feat: six-step self-assessment wizard with autosave`

### Task 15: Results page

**Files:**
- Create:
  - `app/assess/results/page.tsx`
  - `components/results/results.tsx` (client), `components/results/assessment-row.tsx`, `components/results/funding-summary.tsx`
  - `lib/personas.ts` (descriptions, defaults, intro copy and starter goals for each persona)

**Behaviour:**
- `assessAll(PROGRAMS, profile, now)`, recalculated when the profile changes.
- **Header:** persona intro copy, then a funding summary.
  - "Potential funding (not secured): $X–$Y" in mono.
  - "Credits: up to US$Z", listed separately.
  - A line listing which programs are counted, and the note "Consortium awards and equity are not counted."
- **Track toggle:** Funding / Quick wins, using Tabs with `aria-selected`.
- **Groups,** in order Act now · Prepare · Watch · Not a fit, each with a count and a one-line description.
- **Each row:**
  - Program name (link), status pill and benefit.
  - The score as a number out of 100, with a "Why?" disclosure showing the five dimensions with weights, plus the notes.
  - Gates summarised as "4 of 6 checks pass · 1 unknown". Expanding shows each gate's icon, label, reason and fix.
  - An **Add to pipeline** button.
- **Not a fit** rows are de-emphasised (muted text) and show the failing reason inline.
- **Persona starter goals:** `lib/personas.ts` exports `PERSONA_STARTER_GOALS`. For bootstrapped and pre-raise that is "Secure a paid pilot with measurable success criteria"; for VC-backed, "Apply for VC-partner credits through your investor". Show a card with an "Add goal" button that calls `addGoal` with `source: 'persona'`.
- **Empty state, when the profile is empty:** "Take the assessment first" with a link to `/assess/`.

**Verify:** run through manually as each persona. Bootstrapped must show Google Scale AI under Not a fit with the VC reason.
**Commit:** `feat: assessment results with groups, tracks and score explanations`

---

## Milestone 3 — Plan

### Task 16: Calendar library

**Files:**
- Create: `lib/calendar/ics.ts`, `lib/calendar/links.ts`, `lib/calendar/events.ts`
- Test: `tests/lib/calendar.test.ts`

**Step 1: Failing test**

```ts
import { describe, it, expect } from 'vitest';
import { buildIcs, escapeText, foldLine } from '@/lib/calendar/ics';
import { googleCalendarUrl } from '@/lib/calendar/links';

const now = new Date('2026-10-27T00:00:00Z');
const allDay = { uid: 'g1@grant-navigator', title: 'Submit EOI', date: '2026-11-20', allDay: true, alarmsDaysBefore: [7, 1], sequence: 2, description: 'Kick-Start', url: 'https://x.test/plan/?goal=g1' };
const timed = { uid: 'd1@grant-navigator', title: 'WorkSafe closes', date: '2026-11-27', allDay: false, at: new Date('2026-11-27T03:00:00Z'), alarmsDaysBefore: [], sequence: 0 };

describe('ics', () => {
  const ics = buildIcs([allDay, timed], now);
  it('uses CRLF and wraps a VCALENDAR', () => {
    expect(ics.startsWith('BEGIN:VCALENDAR\r\n')).toBe(true);
    expect(ics.trimEnd().endsWith('END:VCALENDAR')).toBe(true);
  });
  it('all-day events use DATE values with exclusive end', () => {
    expect(ics).toContain('DTSTART;VALUE=DATE:20261120');
    expect(ics).toContain('DTEND;VALUE=DATE:20261121');
  });
  it('timed events use UTC', () => { expect(ics).toContain('DTSTART:20261127T030000Z'); });
  it('includes alarms, stable UID and sequence', () => {
    expect(ics).toContain('TRIGGER:-P7D'); expect(ics).toContain('TRIGGER:-P1D');
    expect(ics).toContain('UID:g1@grant-navigator'); expect(ics).toContain('SEQUENCE:2');
  });
  it('escapes text and folds long lines to 75 octets', () => {
    expect(escapeText('a, b; c\\d\ne')).toBe('a\\, b\\; c\\\\d\\ne');
    const folded = foldLine('DESCRIPTION:' + 'x'.repeat(200));
    for (const l of folded.split('\r\n')) expect(new TextEncoder().encode(l).length).toBeLessThanOrEqual(75);
    expect(folded.split('\r\n')[1].startsWith(' ')).toBe(true);
  });
});

describe('links', () => {
  it('google all-day link uses exclusive end date', () => {
    const u = new URL(googleCalendarUrl(allDay));
    expect(u.searchParams.get('dates')).toBe('20261120/20261121');
    expect(u.searchParams.get('text')).toBe('Submit EOI');
  });
});
```

**Step 2:** Run it. Expected: FAIL.

**Step 3: Implement `lib/calendar/ics.ts`**

```ts
import { addDays } from '@/lib/dates';

export type CalEvent = {
  uid: string; title: string; description?: string; url?: string;
  allDay: boolean; date: string; at?: Date; durationMinutes?: number;
  alarmsDaysBefore: number[]; sequence: number;
};

const utc = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
const compactDate = (iso: string) => iso.replace(/-/g, '');

export function escapeText(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
}

export function foldLine(line: string): string {
  const enc = new TextEncoder();
  const out: string[] = [];
  let cur = '';
  let bytes = 0;
  for (const ch of line) {
    const b = enc.encode(ch).length;
    const limit = out.length === 0 ? 75 : 74; // continuation lines start with a space
    if (bytes + b > limit) { out.push(cur); cur = ''; bytes = 0; }
    cur += ch; bytes += b;
  }
  out.push(cur);
  return out.map((l, i) => (i === 0 ? l : ' ' + l)).join('\r\n');
}

export function buildIcs(events: CalEvent[], now: Date): string {
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Grant Navigator//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH'];
  for (const e of events) {
    lines.push('BEGIN:VEVENT', `UID:${e.uid}`, `DTSTAMP:${utc(now)}`, `SEQUENCE:${e.sequence}`, `SUMMARY:${escapeText(e.title)}`);
    if (e.allDay || !e.at) {
      lines.push(`DTSTART;VALUE=DATE:${compactDate(e.date)}`, `DTEND;VALUE=DATE:${compactDate(addDays(e.date, 1))}`);
    } else {
      lines.push(`DTSTART:${utc(e.at)}`, `DTEND:${utc(new Date(e.at.getTime() + (e.durationMinutes ?? 30) * 60_000))}`);
    }
    const desc = [e.description, e.url].filter(Boolean).join('\n\n');
    if (desc) lines.push(`DESCRIPTION:${escapeText(desc)}`);
    if (e.url) lines.push(`URL:${e.url}`);
    for (const d of e.alarmsDaysBefore) {
      lines.push('BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${escapeText(`Reminder: ${e.title}`)}`, `TRIGGER:-P${d}D`, 'END:VALARM');
    }
    lines.push('END:VEVENT');
  }
  lines.push('END:VCALENDAR');
  return lines.map(foldLine).join('\r\n') + '\r\n';
}

export function downloadIcs(filename: string, ics: string) {
  const url = URL.createObjectURL(new Blob([ics], { type: 'text/calendar;charset=utf-8' }));
  const a = Object.assign(document.createElement('a'), { href: url, download: filename });
  a.click();
  URL.revokeObjectURL(url);
}
```

**Step 4: Implement `lib/calendar/links.ts`**

```ts
import { addDays } from '@/lib/dates';
import type { CalEvent } from './ics';

const utc = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
const details = (e: CalEvent) => [e.description, e.url].filter(Boolean).join('\n\n');

export function googleCalendarUrl(e: CalEvent): string {
  const dates = e.allDay || !e.at
    ? `${e.date.replace(/-/g, '')}/${addDays(e.date, 1).replace(/-/g, '')}`
    : `${utc(e.at)}/${utc(new Date(e.at.getTime() + (e.durationMinutes ?? 30) * 60_000))}`;
  const p = new URLSearchParams({ action: 'TEMPLATE', text: e.title, dates, details: details(e) });
  return `https://calendar.google.com/calendar/render?${p}`;
}

export function outlookCalendarUrl(e: CalEvent): string {
  const start = e.allDay || !e.at ? e.date : e.at.toISOString();
  const end = e.allDay || !e.at ? addDays(e.date, 1) : new Date(e.at.getTime() + (e.durationMinutes ?? 30) * 60_000).toISOString();
  const p = new URLSearchParams({ path: '/calendar/action/compose', rru: 'addevent', subject: e.title, startdt: start, enddt: end, allday: String(e.allDay || !e.at), body: details(e) });
  return `https://outlook.live.com/calendar/0/deeplink/compose?${p}`;
}
```

**Step 5: Implement `lib/calendar/events.ts`**

- `goalToEvent(goal, appUrl)` → `CalEvent`: all-day on `dueDate`, `uid: \`goal-${id}@grant-navigator\``, `sequence: goal.sequence`, alarms from `reminderOffsetsDays`, url `${appUrl}/plan/?goal=${id}`.
- `deadlineToEvent(program, deadline, appUrl)` → `CalEvent`: timed when the deadline has a time; `uid: \`deadline-${slug}-${date}@grant-navigator\``; alarms `[14, 7, 1]`; url `${appUrl}/programs/${slug}/`.
- `workspaceEvents(ws, now, appUrl)`: every goal with a due date that isn't done, plus every future deadline of each pipeline program.
- `appBaseUrl()`: returns `window.location.origin + process.env.NEXT_PUBLIC_BASE_PATH`.

Add a test that `workspaceEvents` includes one deadline event for a pipeline program with a future close date and skips goals marked done.

**Step 6:** Run the tests. Expected: PASS.
**Commit:** `feat(lib): ICS export with alarms and Google/Outlook links`

### Task 17: Add-to-calendar menu

**Files:**
- Create: `components/calendar/add-to-calendar.tsx`
- Modify: `components/programs/program-detail.tsx` (wire the deadline button)

A menu button labelled "Add to calendar" with three items: Google Calendar (opens in a new tab), Outlook.com (new tab), and "Download .ics (Apple, Outlook desktop)". Below them, a muted note: "Google may add a duplicate if you re-import." The menu is keyboard operable: arrow keys move between items, Esc closes, and focus returns to the button.

**Commit:** `feat: add-to-calendar menu`

### Task 18: Plan workspace (pipeline, goals, calendar)

**Files:**
- Create:
  - `app/plan/page.tsx`
  - `components/plan/plan.tsx` (client; tabs synced to `?tab=pipeline|goals|calendar`)
  - `components/plan/pipeline-board.tsx`, `components/plan/application-card.tsx`
  - `components/plan/goal-list.tsx`, `components/plan/goal-editor.tsx` (dialog)
  - `components/plan/calendar-view.tsx`
  - `components/plan/due-this-week.tsx`
  - `lib/plan/selectors.ts`
- Modify: the program detail page and the results row (wire **Add to pipeline**), and the home page (due-this-week strip).
- Test: `tests/lib/selectors.test.ts`

**`lib/plan/selectors.ts` (unit-tested):**
- `dueWithin(goals, now, days)`: open goals due within N days, plus overdue ones, sorted by date.
- `goalsByApplication(ws)`.
- `monthGrid(year, month)`: weeks start on Monday, returned as ISO dates.
- `agenda(ws, now, days = 90)`: goals and pipeline deadlines merged and sorted.

**Pipeline board:**
- Columns: Considering, Preparing, Submitted and Outcome. Outcome groups awarded, declined and withdrawn, with a sub-badge.
- Dragging uses native HTML5 drag and drop, plus a "Move to…" menu on every card, which is the keyboard and touch path.
- On mobile, the columns stack vertically. There is no horizontal scrolling.
- Each card shows:
  - The program name and status pill.
  - The expected amount, editable.
  - Goal progress ("2 of 5 goals done").
  - The next due goal.
  - A menu with Move, Edit notes and Remove (confirmation required).
- An "Add custom application" button.
- Empty state: "Nothing in your pipeline. Browse programs or see your results." with links.

**Goals tab:**
- Goals grouped by application (custom goals under "Other").
- Each row has: a checkbox (done), the title, the due date in mono with an "Overdue" warning style, a status select, an expandable list of steps, and an "Add to calendar" menu.
- The **Add goal** button opens `GoalEditor`, a dialog with focus trap and Esc to close. It has fields for title, due date, application, steps and reminder offsets (checkboxes for 14, 7, 3 and 1 days).
- Deep link: `?goal=<id>` scrolls to the goal and highlights it.

**Calendar tab:**
- A month grid of goals and deadlines, with prev/next and today controls, and an agenda list alongside.
- **Export all to calendar (.ics)** is the primary action. It calls `markCalendarExported()`.
- When `changesSinceCalendarExport > 0` and a calendar export has happened before, a banner reads "N changes since your last calendar export" with a **Re-export** button.

**Due-this-week strip** (`components/plan/due-this-week.tsx`): shown on the home and plan pages. It lists at most 5 items and links to "See all". When there are none, it renders nothing.

**Commit:** `feat: plan workspace with pipeline board, goals and calendar`

### Task 19: Settings, backup and storage banner

**Files:**
- Create:
  - `app/settings/page.tsx`
  - `components/settings/settings.tsx`
  - `components/layout/storage-banner.tsx`, `components/layout/backup-prompt.tsx`
  - `lib/store/transfer.ts` (export and import helpers)
- Test: `tests/lib/transfer.test.ts`

**Settings page:**
- Persona (three cards).
- Financial-year end month.
- Theme: system, light or dark. Writes `localStorage['gn-theme']`, sets `data-theme`, and updates the store's settings.
- Default reminder offsets.
- **Export workspace (.json)** downloads `grant-navigator-workspace-YYYY-MM-DD.json` and calls `markExported()`.
- **Import workspace:**
  1. A file input.
  2. `parseImport(text)` returns either `{ ok: true, ws, summary: { programs, applications, goals } }` or `{ ok: false, error }`, where the error message says what's wrong and how to fix it.
  3. A confirmation dialog: "Replace your current workspace with: 1 profile, 4 applications, 17 goals?"
  4. `importWorkspace`.
- **Reset everything** uses destructive styling and requires typing "reset" to confirm.

**`transfer.test.ts`:** a valid export round-trips through `parseImport`; invalid JSON gives `ok: false` with a readable error; a version-2 file gives `ok: false`.

**`StorageBanner`:** shown when `storageAvailable === false`. Text: "This browser can't save your work. Export your workspace to keep it." with a link to Settings.

**`BackupPrompt`:** shown when the workspace has changes, `updatedAt` is more than 14 days after `lastExportedAt` (or there has never been an export and the workspace is more than 14 days old), and the user hasn't dismissed it this session. It's a quiet inline notice; never a modal.

**Commit:** `feat: settings, workspace export/import and storage warnings`

---

## Milestone 4 — Reports

### Task 20: Report builder and PDF

**Files:**
- Create:
  - `app/report/page.tsx`
  - `components/report/report-builder.tsx` (client)
  - `lib/pdf/report-document.tsx` (`@react-pdf/renderer` components)
  - `lib/pdf/report-data.ts` (pure: workspace + programs + now → `ReportData`)
- Test: `tests/lib/report-data.test.ts`

**`report-data.ts`:**
- `buildReportData(ws, programs, now, sections)`: uses `assessAll` and `estimateFunding`.
- `oldestVerified` is the earliest `lastVerified` among the programs included.
- `readinessGaps`: every hard gate across the act-now and prepare programs that is unknown or a fixable fail, de-duplicated by gate id and label, each with its fix.
- `upcoming` comes from `agenda(ws, now, 90)`.
- Unit-test: section toggles drop data; `oldestVerified` is correct; gaps are de-duplicated.

**Report sections** (checkboxes; all on by default except "Sources appendix"):

| Section | Contents |
|---|---|
| Cover | Company name, persona, date, "Prepared with Grant Navigator" |
| Assessment summary | |
| Matched programs | By group, with status, verified date and source URL |
| Funding estimate | Labelled "not secured"; credits separate |
| Pipeline | |
| Goals and deadlines | Next 90 days |
| Readiness gaps | |
| Stacking notes | |
| Sources appendix | |

**PDF:**
- Fonts: register Geist from the `geist` package's font files with `Font.register`, using a path that works in static export. Copy the `.woff`/`.ttf` files to `public/fonts/` and register them with `${basePath}/fonts/...`. If @react-pdf can't load Geist, fall back to Helvetica and note it in the commit.
- Layout: A4 with 40pt margins, neutral palette, accent only for headings' rule lines, and tables with 1px borders.
- Footer on every page: `Generated {date} · Program data verified as of {oldestVerified} · General information, not financial or tax advice · Page n of N`.

**Builder:**
- Section checkboxes on the left, or above on mobile.
- An HTML preview on the right that mirrors the sections. It's not a PDF viewer.
- **Download PDF** is the primary action. It loads `@react-pdf/renderer` with a dynamic `import()` on click, calls `pdf(<ReportDocument data={…} />).toBlob()`, and downloads `{slug(companyName) || 'startup'}-funding-report-{YYYY-MM-DD}.pdf`.
- The button shows a spinner and is disabled while generating. Errors appear inline with a retry.
- Empty state, when there's no profile: suggests taking the assessment, but still allows a directory-only report.

**Verify:** generate a PDF by hand and open it.
**Commit:** `feat: report builder with PDF export`

---

## Milestone 5 — Hardening

### Task 21: Persona snapshot tests

**Files:**
- Create: `tests/fixtures/personas.ts`, `tests/content/personas.test.ts`

**Fixtures** (evaluated at `now = 2026-10-27T00:00:00Z`):
- **`bootstrappedVic`:**
  - Company: persona bootstrapped, hasAcn, GST registered, incorporated 2025-04-27, not a foreign subsidiary, state vic.
  - Finances: turnover under-1m, R&D spend 20k-100k, cash match under-20k.
  - Product: experimental, contemporaneous records, product company, MVP, website.
  - Funding: stage none, vcBacked false, prior credits all 0.
  - Partners and evidence: research partner none, 0 industry partners, customer evidence pilots, sectors other.
  - Capacity: 2–5 founder hours, urgency now, women-led no.
- **`preRaiseVic`:** the same, but persona pre-raise, stage angel, cash match 20k-60k, research partner informal, women-led yes.
- **`vcBackedSeed`:** persona vc-backed, incorporated 2023-03-01, stage seed, last round 2025-06-01, turnover 1m-10m, R&D spend 100k-500k, cash match 60k-250k, research partner active, 2 industry partners, stack [gcp, gemini], prior credits gcp 0, state nsw.

**Tests:**
- Assert specific outcomes (each worked out from the gate rules in Task 4; add a one-line comment per assertion saying why):

  | Fixture | Program | Group | Why |
  |---|---|---|---|
  | `bootstrappedVic` | `google-cloud-ai` | not-a-fit | Bootstrapped, so vc-funded is an unfixable fail |
  | `bootstrappedVic` | `google-cloud-start` | act-now | 18 months old; has an MVP; no prior credits |
  | `bootstrappedVic` | `csiro-kick-start` | prepare | Cash match under $20K is a fixable fail |
  | `bootstrappedVic` | `rdti` | act-now | |
  | `bootstrappedVic` | `press-play` | not-a-fit | womenLed is no |
  | `bootstrappedVic` | `crc-p` | watch | Research-partner and industry-partner fails are fixable, and the status is unverified |
  | `preRaiseVic` | `google-cloud-ai` | not-a-fit | An angel round doesn't qualify under last-round-within, which is unfixable |
  | `preRaiseVic` | `press-play` | act-now | Open until 15 Nov; women-led; Victorian |
  | `vcBackedSeed` | `google-cloud-ai` | act-now | |
  | `vcBackedSeed` | `google-cloud-start` | not-a-fit | Incorporated 43 months ago |
  | `vcBackedSeed` | `iv-office-hours` | not-a-fit | Based in NSW |
- Snapshot the full `{slug: group}` map for each persona with `toMatchInlineSnapshot()`, generated on the first run and reviewed by hand before committing. This snapshot is the regression net for data edits.

**Commit:** `test: persona snapshot tests over real program data`

### Task 22: End-to-end and accessibility tests

**Files:**
- Create: `scripts/serve-out.mjs`, `playwright.config.ts`, `tests/e2e/journey.spec.ts`, `tests/e2e/a11y.spec.ts`

**`scripts/serve-out.mjs`:** a zero-dependency Node `http` server on port 4173. It strips the `/grant-assesser` prefix, serves files from `out/` (resolving `dir/` to `dir/index.html`), and falls back to `out/404.html` with status 404. It must reject `..` path traversal.

**`playwright.config.ts`:**
- `webServer: { command: 'pnpm build && pnpm serve', url: 'http://localhost:4173/grant-assesser/', reuseExistingServer: true, timeout: 180_000 }`.
- Projects: `mobile` (viewport 375×812) and `desktop` (1280×800).
- `use.acceptDownloads: true`.

**`journey.spec.ts`:**
1. Home → choose Bootstrapped → the wizard opens at step 1 with Bootstrapped selected.
2. Complete all 6 steps with the `bootstrappedVic` answers, using labels and roles, not CSS selectors.
3. Results: "Act now" contains "R&D Tax Incentive"; "Not a fit" contains "Google for Startups Cloud — AI".
4. Add CSIRO Kick-Start to the pipeline → `/plan/` → the card is in Considering and the goals tab lists "Submit the Kick-Start EOI".
5. Move the card to Preparing with the "Move to…" menu.
6. Calendar tab → Export all → the download's file name ends `.ics` and its content contains `BEGIN:VEVENT`.
7. `/report/` → Download PDF → the download is larger than 5 KB and starts with `%PDF`.
8. Settings → Export → reset → import the exported file → the pipeline card is back.

**`a11y.spec.ts`:**
- For `/`, `/programs/`, `/programs/csiro-kick-start/`, `/assess/`, `/assess/results/`, `/plan/`, `/report/` and `/settings/`, run `new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()` and expect no violations.
- Repeat for `/` and `/programs/` with `localStorage['gn-theme'] = 'dark'`.

**Verify:** `pnpm e2e` passes in both projects. Fix the app, never the assertions, unless an assertion contradicts the design.
**Commit:** `test: end-to-end journey and axe accessibility checks`

### Task 23: CI, deployment and freshness check

**Files:**
- Create: `.github/workflows/ci.yml`, `.github/workflows/deploy.yml`, `.github/workflows/freshness.yml`, `scripts/check-freshness.ts`
- Test: `tests/lib/freshness.test.ts`

**`ci.yml`** (pull requests and pushes to non-main branches):
- Checkout, set up pnpm and Node 24, `pnpm install --frozen-lockfile`.
- `pnpm typecheck`, `pnpm lint`, `pnpm test`.
- `pnpm exec playwright install --with-deps chromium`, then `pnpm e2e`.

**`deploy.yml`** (push to `main`):
- Build, then upload `out/` with `actions/upload-pages-artifact`, then `actions/deploy-pages`.
- `permissions: pages: write, id-token: write`.
- The repo owner must switch Settings → Pages → Source to "GitHub Actions". Record this in the README; do not change it automatically.

**`scripts/check-freshness.ts`:**
- Loads `PROGRAMS`.
- For each program, reports:
  - `stale` (last verified more than 60 days ago)
  - `closingSoon` (a close date within 30 days)
  - `brokenLinks` (each source URL fetched with GET, 15-second timeout; any status ≥400 or a network error)
- Prints a Markdown report and exits 0.
- Export a pure `freshnessReport(programs, now, linkResults)` and unit-test it, with no network involved.

**`freshness.yml`:** runs on a weekly cron (Monday 9:00 Melbourne = `0 22 * * 0` UTC) and on `workflow_dispatch`. It runs the script and creates or updates one issue titled "Program data freshness" with `gh issue create` / `gh issue edit`, using `permissions: issues: write`. It never changes the site.

**Commit:** `ci: test pipeline, Pages deploy and weekly data freshness check`

### Task 24: Switch-over and docs

**Files:**
- Move: `index.html`, `base.jsx` and `404.html` → `legacy/` (with `git mv`)
- Create: `app/not-found.tsx` (minimal 404 with a link to Programs; static export writes `out/404.html`)
- Modify: `README.md`, `CLAUDE.md`
- Keep: `.nojekyll`. Also add `public/.nojekyll` so it ships in `out/`.

**`README.md`:** what the app does; local development (`pnpm dev` → http://localhost:3000/grant-assesser/); tests; how to update a program (edit `content/programs/<slug>.ts`, bump `lastVerified`, add a changelog entry, run `pnpm test`); deployment (Pages source = GitHub Actions); privacy (data stays in the browser).

**`CLAUDE.md`:** replace the architecture section with the new structure (`app/`, `components/`, `content/programs/`, `lib/*`), the program-data rules (official sources only for open/rolling; Appendix A is the evidence), the commands, and the static-export constraints (no server code; client-only storage; `useNow` for time).

**Verify:**
- `pnpm typecheck && pnpm lint && pnpm test && pnpm e2e` all pass.
- `pnpm build && pnpm serve`, then click through the main journey at 375px and 1280px in light and dark.

**Commit:** `chore: switch over to Next.js app; move legacy single-file app`

---

## Done criteria

- All five milestones are committed on `rebuild/grant-navigator`, with CI green locally: typecheck, lint, unit, persona and e2e tests.
- The persona snapshots have been reviewed by hand.
- No program is marked `open` or `rolling` without an official source.
- Nothing is pushed, merged or deployed without the user's go-ahead. Changing the Pages source setting is the owner's action.
