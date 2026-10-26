'use client';

import { useMemo } from 'react';
import { CalendarPlus, Download, ExternalLink } from 'lucide-react';
import { buildIcs, downloadIcs, type CalEvent } from '@/lib/calendar/ics';
import { googleCalendarUrl, outlookCalendarUrl } from '@/lib/calendar/links';
import { Menu, type MenuItem, type MenuProps } from '@/components/ui/menu';

type Props = {
  event: CalEvent;
  /** Name for the downloaded file, e.g. "worksafe-rtw-trials-applications-close.ics". */
  filename: string;
  label?: string;
  /** Names the event for screen readers when the visible label alone is ambiguous. */
  'aria-label'?: string;
} & Pick<MenuProps, 'align' | 'variant' | 'size' | 'className'>;

const newTab = <span className="sr-only"> (opens in a new tab)</span>;

/** "Add to calendar" menu: Google Calendar and Outlook.com links (new tab) and an .ics download. */
export function AddToCalendar({ event, filename, label = 'Add to calendar', ...rest }: Props) {
  const items = useMemo((): MenuItem[] => [
    { id: 'google', label: <>Google Calendar{newTab}</>, icon: ExternalLink, href: googleCalendarUrl(event), external: true },
    { id: 'outlook', label: <>Outlook.com{newTab}</>, icon: ExternalLink, href: outlookCalendarUrl(event), external: true },
    { id: 'ics', label: 'Download .ics (Apple, Outlook desktop)', icon: Download, onSelect: () => downloadIcs(filename, buildIcs([event], new Date())) },
  ], [event, filename]);

  return <Menu label={label} icon={CalendarPlus} items={items} footer="Google may add a duplicate if you re-import." {...rest} />;
}
