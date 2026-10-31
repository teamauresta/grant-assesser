/**
 * A framed list: --surface rows divided by --border lines inside a --border outline (Due this week,
 * the goal lists, the agenda, Closing soon). A hovered or highlighted row fills to the frame's
 * corners: the first and last rows round to --radius-inner, since the frame does not clip (an
 * overflow-hidden frame would clip the rows' focus outlines).
 */
export const LIST_FRAME = 'divide-y divide-border rounded-lg border border-border bg-surface *:first:rounded-t-inner *:last:rounded-b-inner';
