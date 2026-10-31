'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Check, Plus } from 'lucide-react';
import type { Program } from '@/lib/schema';
import { useWorkspace } from '@/lib/store/use-workspace';
import { cn } from '@/lib/cn';
import { Button } from '@/components/ui/button';
import { focusRing } from '@/components/ui/focus-ring';

/**
 * Adds the program to the pipeline (with its starter goals), then shows "In your plan". Disabled
 * until the stored workspace has loaded, so the static HTML never claims a state it doesn't know.
 */
export function AddToPipeline({ program }: { program: Program }) {
  const ready = useWorkspace((s) => s.ready);
  const inPlan = useWorkspace((s) => s.ws.pipeline.some((a) => a.programSlug === program.slug));
  const addApplication = useWorkspace((s) => s.addApplication);
  const [added, setAdded] = useState<number>();

  const add = () => {
    const id = addApplication(program.slug);
    if (id) setAdded(useWorkspace.getState().ws.goals.filter((g) => g.applicationId === id).length);
  };

  return (
    <div className="flex flex-col items-start gap-1.5">
      {ready && inPlan ? (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <Button variant="secondary" aria-disabled="true">
            <Check aria-hidden="true" size={16} className="text-accent" />
            In your plan
          </Button>
          <Link href="/plan/" className={cn('inline-flex min-h-11 items-center gap-1 rounded-sm text-sm text-accent underline-offset-4 hover:underline', focusRing)}>
            View plan
            <ArrowRight aria-hidden="true" size={16} />
          </Link>
        </div>
      ) : (
        <Button variant="primary" disabled={!ready} onClick={add}>
          <Plus aria-hidden="true" size={16} />
          Add to pipeline
        </Button>
      )}
      <p role="status" className="text-sm text-muted-fg">
        {added !== undefined && (added > 0 ? `Added with ${added} starter ${added === 1 ? 'goal' : 'goals'}.` : 'Added to your pipeline.')}
      </p>
    </div>
  );
}
