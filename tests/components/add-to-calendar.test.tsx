// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AddToCalendar } from '@/components/calendar/add-to-calendar';

const event = {
  uid: 'deadline-worksafe-rtw-trials-2026-11-27@grant-navigator', title: 'WorkSafe: Applications close',
  date: '2026-11-27', allDay: false, at: new Date('2026-11-27T03:00:00Z'), alarmsDaysBefore: [14, 7, 1], sequence: 0,
  url: 'https://x.test/grant-assesser/programs/worksafe-rtw-trials/',
};

afterEach(() => { vi.restoreAllMocks(); });

describe('AddToCalendar', () => {
  const setup = () => {
    render(<AddToCalendar event={event} filename="worksafe-rtw-trials-applications-close.ics" />);
    return { user: userEvent.setup(), trigger: screen.getByRole('button', { name: /add to calendar/i }) };
  };

  it('offers Google, Outlook.com and an .ics download, with the duplicate note', async () => {
    const { user, trigger } = setup();
    await user.click(trigger);
    const items = screen.getAllByRole('menuitem');
    expect(items.map((i) => i.textContent)).toEqual([
      'Google Calendar (opens in a new tab)', 'Outlook.com (opens in a new tab)', 'Download .ics (Apple, Outlook desktop)',
    ]);
    const google = new URL(items[0].getAttribute('href')!);
    expect(google.hostname).toBe('calendar.google.com');
    expect(google.searchParams.get('dates')).toBe('20261127T030000Z/20261127T033000Z');
    expect(items[0]).toHaveAttribute('target', '_blank');
    expect(new URL(items[1].getAttribute('href')!).hostname).toBe('outlook.live.com');
    expect(screen.getByRole('menu')).toHaveAccessibleDescription('Google may add a duplicate if you re-import.');
  });

  it('downloads an .ics file with the given name', async () => {
    const createObjectURL = vi.fn<(blob: Blob) => string>(() => 'blob:x');
    Object.assign(URL, { createObjectURL, revokeObjectURL: vi.fn() });
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      expect(this.download).toBe('worksafe-rtw-trials-applications-close.ics');
    });
    const { user, trigger } = setup();
    await user.click(trigger);
    await user.click(screen.getByRole('menuitem', { name: /download \.ics/i }));
    expect(click).toHaveBeenCalledOnce();
    const text = await createObjectURL.mock.calls[0][0].text();
    expect(text).toContain('UID:deadline-worksafe-rtw-trials-2026-11-27@grant-navigator');
    expect(trigger).toHaveFocus();
  });

  it('is keyboard operable: arrows move, Escape closes and returns focus', async () => {
    const { user, trigger } = setup();
    trigger.focus();
    await user.keyboard('{ArrowDown}');
    const items = screen.getAllByRole('menuitem');
    expect(items[0]).toHaveFocus();
    await user.keyboard('{ArrowDown}');
    expect(items[1]).toHaveFocus();
    await user.keyboard('{ArrowUp}{ArrowUp}');
    expect(items[2]).toHaveFocus();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('menu')).toBeNull();
    expect(trigger).toHaveFocus();
  });
});
