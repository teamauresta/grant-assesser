import type { Metadata } from 'next';
import { PROGRAMS } from '@/content/programs';
import { Directory } from '@/components/programs/directory';

export const metadata: Metadata = {
  title: 'Programs',
  description: 'Australian grants, tax incentives, credits and accelerators for startups, each checked against official sources.',
};

export default function ProgramsPage() {
  return (
    <div className="flex flex-col gap-6">
      <header className="flex max-w-3xl flex-col gap-2">
        <h1 className="text-3xl">Programs</h1>
        <p className="text-muted-fg">
          {PROGRAMS.length} grants, tax incentives, credits and accelerators for Australian startups, each checked against official sources.
        </p>
      </header>
      <Directory />
    </div>
  );
}
