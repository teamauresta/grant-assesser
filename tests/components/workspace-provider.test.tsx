// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { WorkspaceProvider } from '@/lib/store/workspace-provider';
import { useWorkspace } from '@/lib/store/use-workspace';
import { STORAGE_KEY } from '@/lib/store/workspace-store';

beforeEach(async () => {
  window.localStorage.clear();
  await useWorkspace.getState().init();
  useWorkspace.getState().reset();
});

describe('WorkspaceProvider', () => {
  it('reloads when another tab saves the workspace and says so politely', async () => {
    render(<WorkspaceProvider />);
    const status = screen.getByRole('status');
    expect(status).toHaveAttribute('aria-live', 'polite');
    expect(status).toBeEmptyDOMElement();

    const theirs = { ...useWorkspace.getState().ws, profile: { companyName: 'Other tab' } };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(theirs));
    await act(async () => {
      window.dispatchEvent(new StorageEvent('storage', { key: STORAGE_KEY, newValue: JSON.stringify(theirs) }));
    });
    expect(useWorkspace.getState().ws.profile.companyName).toBe('Other tab');
    expect(status).toHaveTextContent('Updated from another tab');
  });

  it('ignores storage events for other keys', async () => {
    render(<WorkspaceProvider />);
    const theirs = { ...useWorkspace.getState().ws, profile: { companyName: 'Other tab' } };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(theirs));
    await act(async () => {
      window.dispatchEvent(new StorageEvent('storage', { key: 'gn-theme', newValue: 'dark' }));
    });
    expect(useWorkspace.getState().ws.profile.companyName).toBeUndefined();
    expect(screen.getByRole('status')).toBeEmptyDOMElement();
  });
});
