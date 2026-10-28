/**
 * Result groups: their order and labels. A module of constants only, so a page can show them
 * without loading the checks in lib/assess (which re-exports these).
 */
export type Group = 'act-now' | 'prepare' | 'watch' | 'not-a-fit';

export const GROUP_ORDER: Group[] = ['act-now', 'prepare', 'watch', 'not-a-fit'];

export const GROUP_INFO: Record<Group, { label: string; description: string }> = {
  'act-now': { label: 'Act now', description: 'Open, and you meet every required check.' },
  prepare: { label: 'Prepare', description: 'Open, but something needs answering or fixing before you apply.' },
  watch: { label: 'Watch', description: 'Not open yet, paused or unconfirmed. Get ready for the next round.' },
  'not-a-fit': { label: 'Not a fit', description: 'A required check fails and cannot be fixed. Listed so you can see why.' },
};
