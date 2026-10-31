import type { Metadata } from 'next';
import { PROGRAMS } from '@/content/programs';
import { Directory } from '@/components/programs/directory';
import { Highlight } from '@/components/ui/highlight';

export const metadata: Metadata = {
  title: 'Programs',
  description: 'Australian grants, tax incentives, credits and accelerators for startups, each checked against official sources.',
};

export default function ProgramsPage() {
  return (
    <div className="flex flex-col gap-6">
      <header className="flex max-w-3xl flex-col gap-2">
        <h1 className="text-3xl">Programs</h1>
        {/* One highlight, on the intro's key phrase (Billabong design doc, section 4). The utility
            draws the phrase in --fg, never muted. */}
        <p className="text-muted-fg">
          <span className="num">{PROGRAMS.length}</span> grants, tax incentives, credits and accelerators for Australian startups, each{' '}
          <Highlight>checked against official sources</Highlight>.
        </p>
      </header>
      <Directory />
    </div>
  );
}
