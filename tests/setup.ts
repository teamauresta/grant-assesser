import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';

// Component tests opt into jsdom per file; only those need React Testing Library cleanup.
if (typeof document !== 'undefined') {
  const { cleanup } = await import('@testing-library/react');
  afterEach(cleanup);
}
