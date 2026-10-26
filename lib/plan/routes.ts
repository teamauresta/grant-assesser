export const PLAN_TABS = ['pipeline', 'goals', 'calendar'] as const;
export type PlanTab = (typeof PLAN_TABS)[number];

/** `?goal=` always opens the Goals tab; otherwise `?tab=`, defaulting to the pipeline. */
export function parsePlanTab(tab: string | null, goal: string | null): PlanTab {
  if (goal) return 'goals';
  return PLAN_TABS.find((t) => t === tab) ?? 'pipeline';
}

/** Deep link to a goal on the plan page (opens the Goals tab, scrolls to and highlights it). */
export const goalHref = (id: string) => `/plan/?tab=goals&goal=${encodeURIComponent(id)}`;
