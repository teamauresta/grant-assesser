import type { Metadata } from 'next';
import { Wizard } from '@/components/assess/wizard';

export const metadata: Metadata = {
  title: 'Assessment',
  description: 'Six short steps to see which Australian startup programs you can apply for now.',
};

export default function AssessPage() {
  return (
    <div className="flex flex-col gap-6">
      <header className="flex max-w-2xl flex-col gap-2">
        <h1 className="text-3xl">Self-assessment</h1>
        <p className="text-muted-fg">
          About five minutes. Skip anything you don&apos;t know: unanswered checks show as unknown, never as a pass.
        </p>
      </header>
      <Wizard />
    </div>
  );
}
