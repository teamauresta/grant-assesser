import type { ReactNode } from 'react';
import { Window } from '@/components/ui/window';

/**
 * A page that is only a notice, the 404 and the error page (Billabong design doc section 11, Task 9):
 * one window whose title is the page's h1. No hooks of its own, so the 404 renders it on the server
 * and the error page on the client.
 */
export function PageNoticeWindow({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="py-6 md:py-12">
      <Window as="h1" title={title} titleSize="md" className="max-w-xl" bodyClassName="flex flex-col items-start gap-4">
        {children}
      </Window>
    </div>
  );
}
