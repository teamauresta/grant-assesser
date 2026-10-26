// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ErrorPage from '@/app/error';
import { useWorkspace } from '@/lib/store/use-workspace';
import { STORAGE_KEY, emptyWorkspace } from '@/lib/store/workspace-store';

const now = new Date('2026-10-27T00:00:00Z');

beforeEach(async () => {
  window.localStorage.clear();
  await useWorkspace.getState().init();
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('app error boundary', () => {
  it('offers Try again and a link to Settings', async () => {
    const retry = vi.fn();
    render(<ErrorPage error={new Error('boom')} retry={retry} reset={vi.fn()} />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Something went wrong');
    await userEvent.setup().click(screen.getByRole('button', { name: 'Try again' }));
    expect(retry).toHaveBeenCalledOnce();
    expect(screen.getByRole('link', { name: /settings/i })).toHaveAttribute('href', expect.stringMatching(/^\/settings\/?/));
  });

  it('resets the stored workspace only after confirming', async () => {
    const user = userEvent.setup();
    const reset = vi.fn();
    window.localStorage.setItem(STORAGE_KEY, '{"schemaVersion":1}');
    useWorkspace.setState({ ws: { ...emptyWorkspace(now), profile: { companyName: 'Broken' } } });
    render(<ErrorPage error={new Error('boom')} retry={vi.fn()} reset={reset} />);

    await user.click(screen.getByRole('button', { name: 'Reset workspace' }));
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe('{"schemaVersion":1}');
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe('{"schemaVersion":1}');

    await user.click(screen.getByRole('button', { name: 'Reset workspace' }));
    await user.click(screen.getByRole('button', { name: 'Yes, reset my workspace' }));
    expect(window.localStorage.getItem(STORAGE_KEY)).not.toBe('{"schemaVersion":1}');
    expect(useWorkspace.getState().ws.profile).toEqual({});
    expect(reset).toHaveBeenCalledOnce();
  });
});
