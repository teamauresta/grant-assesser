import type { Metadata } from 'next';
import { Results } from '@/components/results/results';

export const metadata: Metadata = {
  title: 'Your results',
  description: 'Programs sorted into Act now, Prepare, Watch and Not a fit, with potential funding and score explanations.',
};

export default function ResultsPage() {
  return <Results />;
}
