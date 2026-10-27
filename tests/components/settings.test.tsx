// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Settings } from '@/components/settings/settings';
import { StorageBanner } from '@/components/layout/storage-banner';
import { useWorkspace } from '@/lib/store/use-workspace';
import { emptyWorkspace } from '@/lib/store/workspace-store';
import { serializeWorkspace } from '@/lib/store/transfer';
import { THEME_KEY } from '@/lib/theme';
import type { Workspace } from '@/lib/schema';

const now = new Date('2026-10-27T00:00:00Z');

function filled(): Workspace {
  const t = now.toISOString();
  return {
    ...emptyWorkspace(now),
    profile: { persona: 'vc-backed' },
    pipeline: [{ id: 'a1', programSlug: 'rdti', stage: 'preparing', notes: '', createdAt: t, updatedAt: t }],
    goals: [{ id: 'g1', title: 'Register', status: 'todo', steps: [], reminderOffsetsDays: [7], source: 'user', sequence: 0, createdAt: t, updatedAt: t }],
  };
}

const jsonFile = (text: string, name = 'ws.json') => new File([text], name, { type: 'application/json' });

beforeEach(async () => {
  window.localStorage.clear();
  await useWorkspace.getState().init();
  useWorkspace.setState({ ws: emptyWorkspace(now), storageAvailable: true, corruptBackupKey: null });
  URL.createObjectURL = vi.fn(() => 'blob:test');
  URL.revokeObjectURL = vi.fn();
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
});
afterEach(() => { vi.restoreAllMocks(); });

describe('Settings', () => {
  it('changes persona and financial-year end through the store', async () => {
    const user = userEvent.setup();
    render(<Settings />);
    await user.click(screen.getByRole('radio', { name: /Pre-raise/ }));
    expect(useWorkspace.getState().ws.profile.persona).toBe('pre-raise');
    await user.selectOptions(screen.getByLabelText('When does your financial year end?'), '12');
    expect(useWorkspace.getState().ws.profile.fyEndMonth).toBe(12);
    await user.selectOptions(screen.getByLabelText('When does your financial year end?'), '');
    expect(useWorkspace.getState().ws.profile.fyEndMonth).toBeUndefined();
  });

  it('applies and remembers the theme', async () => {
    const user = userEvent.setup();
    render(<Settings />);
    await user.click(screen.getByRole('radio', { name: 'Dark' }));
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(window.localStorage.getItem(THEME_KEY)).toBe('dark');
    expect(useWorkspace.getState().ws.settings.theme).toBe('dark');
    await user.click(screen.getByRole('radio', { name: /System/ }));
    expect(window.localStorage.getItem(THEME_KEY)).toBe('system');
    expect(document.documentElement.dataset.theme).toBe('light');
  });

  it('turns Celebrations off and on through the store', async () => {
    const user = userEvent.setup();
    render(<Settings />);
    const group = screen.getByRole('group', { name: 'Celebrations' });
    const on = within(group).getByRole('radio', { name: 'On' });
    const off = within(group).getByRole('radio', { name: 'Off' });
    expect(on).toBeChecked();
    expect(off).not.toBeChecked();
    await user.click(off);
    expect(useWorkspace.getState().ws.settings.celebrations).toBe(false);
    expect(off).toBeChecked();
    await user.click(on);
    expect(useWorkspace.getState().ws.settings.celebrations).toBe(true);
  });

  it('keeps at least one default reminder', async () => {
    const user = userEvent.setup();
    render(<Settings />);
    await user.click(screen.getByRole('checkbox', { name: '14 days before' }));
    expect(useWorkspace.getState().ws.settings.remindersDefault).toEqual([14, 7, 1]);
    await user.click(screen.getByRole('checkbox', { name: '14 days before' }));
    await user.click(screen.getByRole('checkbox', { name: '7 days before' }));
    await user.click(screen.getByRole('checkbox', { name: '1 day before' }));
    expect(useWorkspace.getState().ws.settings.remindersDefault).toEqual([1]);
    expect(screen.getByText(/Keep at least one reminder/)).toBeInTheDocument();
  });

  it('keeps at most 5 default reminders, counting ones from an imported file', async () => {
    const user = userEvent.setup();
    useWorkspace.setState({ ws: { ...emptyWorkspace(now), settings: { theme: 'system', remindersDefault: [30, 21, 2, 7, 1], celebrations: true } } });
    render(<Settings />);
    await user.click(screen.getByRole('checkbox', { name: '14 days before' }));
    expect(useWorkspace.getState().ws.settings.remindersDefault).toEqual([30, 21, 2, 7, 1]);
    expect(screen.getByText(/at most 5 reminders/i)).toBeInTheDocument();
  });

  it('exports and records the export', async () => {
    const user = userEvent.setup();
    render(<Settings />);
    await user.click(screen.getByRole('button', { name: 'Export workspace (.json)' }));
    expect(URL.createObjectURL).toHaveBeenCalledOnce();
    expect(useWorkspace.getState().ws.lastExportedAt).toBeDefined();
    expect(screen.getByRole('status')).toHaveTextContent('Workspace exported');
  });

  it('shows a readable error for an invalid file', async () => {
    const user = userEvent.setup();
    render(<Settings />);
    await user.upload(screen.getByLabelText('Choose a workspace file (.json)'), jsonFile('not json'));
    expect(await screen.findByText(/isn't valid JSON/)).toBeInTheDocument();
    expect(screen.getByLabelText('Choose a workspace file (.json)')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('refuses a file over 2 MB without reading it', async () => {
    const user = userEvent.setup();
    render(<Settings />);
    const big = jsonFile('x'.repeat(2 * 1024 * 1024 + 1));
    const read = vi.spyOn(big, 'text');
    await user.upload(screen.getByLabelText('Choose a workspace file (.json)'), big);
    expect(await screen.findByText(/too large/)).toBeInTheDocument();
    expect(read).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('imports a valid file only after confirming the summary', async () => {
    const user = userEvent.setup();
    render(<Settings />);
    const incoming = filled();
    await user.upload(screen.getByLabelText('Choose a workspace file (.json)'), jsonFile(serializeWorkspace(incoming)));
    const dialog = await screen.findByRole('dialog', { name: 'Replace your workspace?' });
    expect(dialog).toHaveTextContent('Replace your current workspace with: 1 profile, 1 application, 1 goal?');
    expect(useWorkspace.getState().ws.pipeline).toHaveLength(0);
    await user.click(within(dialog).getByRole('button', { name: 'Replace workspace' }));
    expect(useWorkspace.getState().ws.workspaceId).toBe(incoming.workspaceId);
    expect(useWorkspace.getState().ws.pipeline).toHaveLength(1);
    expect(screen.getByRole('status')).toHaveTextContent('Workspace imported: 1 profile, 1 application, 1 goal.');
  });

  it('applies and remembers the imported theme', async () => {
    const user = userEvent.setup();
    window.localStorage.setItem(THEME_KEY, 'light');
    render(<Settings />);
    expect(screen.getByRole('radio', { name: 'Light' })).toBeChecked();
    const incoming = { ...filled(), settings: { theme: 'dark' as const, remindersDefault: [7, 1], celebrations: true } };
    await user.upload(screen.getByLabelText('Choose a workspace file (.json)'), jsonFile(serializeWorkspace(incoming)));
    const dialog = await screen.findByRole('dialog', { name: 'Replace your workspace?' });
    await user.click(within(dialog).getByRole('button', { name: 'Replace workspace' }));
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(window.localStorage.getItem(THEME_KEY)).toBe('dark');
    expect(screen.getByRole('radio', { name: 'Dark' })).toBeChecked();
  });

  it('cancelling an import changes nothing', async () => {
    const user = userEvent.setup();
    render(<Settings />);
    await user.upload(screen.getByLabelText('Choose a workspace file (.json)'), jsonFile(serializeWorkspace(filled())));
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    expect(useWorkspace.getState().ws.pipeline).toHaveLength(0);
  });

  it('resets only after typing "reset"', async () => {
    const user = userEvent.setup();
    useWorkspace.setState({ ws: filled() });
    render(<Settings />);
    await user.click(screen.getByRole('button', { name: 'Reset everything' }));
    const dialog = screen.getByRole('dialog', { name: 'Reset everything?' });
    const input = within(dialog).getByLabelText(/to confirm/);
    expect(input).toHaveFocus();
    const confirm = within(dialog).getByRole('button', { name: 'Reset everything' });
    expect(confirm).toBeDisabled();
    await user.type(input, 'rese');
    expect(confirm).toBeDisabled();
    await user.type(input, 't');
    expect(confirm).toBeEnabled();
    await user.click(confirm);
    expect(useWorkspace.getState().ws.pipeline).toHaveLength(0);
    expect(useWorkspace.getState().ws.profile).toEqual({});
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Your workspace was reset.');
  });
});

describe('StorageBanner', () => {
  it('is hidden when storage works and nothing was rescued', () => {
    const { container } = render(<StorageBanner />);
    expect(container).toBeEmptyDOMElement();
  });

  it('warns when the browser cannot save and links to Settings', () => {
    act(() => useWorkspace.setState({ storageAvailable: false }));
    render(<StorageBanner />);
    expect(screen.getByText(/This browser can't save your work/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Go to Settings' })).toHaveAttribute('href', expect.stringMatching(/^\/settings\/?#your-data$/));
  });

  it('offers the rescued raw data as a download and can be dismissed', async () => {
    const user = userEvent.setup();
    window.localStorage.setItem('gn-workspace-corrupt-1', '{"broken":');
    act(() => useWorkspace.setState({ corruptBackupKey: 'gn-workspace-corrupt-1' }));
    render(<StorageBanner />);
    await user.click(screen.getByRole('button', { name: 'Download the old data' }));
    const blob = vi.mocked(URL.createObjectURL).mock.calls[0][0] as Blob;
    expect(await blob.text()).toBe('{"broken":');
    await user.click(screen.getByRole('button', { name: 'Dismiss' }));
    expect(screen.queryByText(/couldn't read your saved workspace/)).not.toBeInTheDocument();
  });
});
