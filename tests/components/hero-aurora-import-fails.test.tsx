// @vitest-environment jsdom
import { it, expect, vi, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

// The shader's chunk fails to download (offline, a stale deploy): the import() rejects.
vi.mock('@/components/home/aurora-canvas', () => { throw new Error('chunk failed to load'); });

import { HeroAurora } from '@/components/home/hero-aurora';

afterEach(() => vi.unstubAllGlobals());

it('shows the still contour rings and no button when the shader cannot load', async () => {
  vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener: () => {}, removeEventListener: () => {} }));
  const { container } = render(<HeroAurora />);
  await waitFor(() => expect(container.querySelector('[data-aurora-fallback]')).not.toBeNull());
  expect(container.querySelector('canvas')).toBeNull();
  expect(screen.queryByRole('button')).toBeNull();
});
