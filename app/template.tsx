import type { ReactNode } from 'react';

// Re-mounts on each navigation, so the page content fades in.
export default function Template({ children }: { children: ReactNode }) {
  return <div className="animate-route-in">{children}</div>;
}
