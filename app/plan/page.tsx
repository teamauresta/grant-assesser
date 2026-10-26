import type { Metadata } from 'next';
import { Plan } from '@/components/plan/plan';

export const metadata: Metadata = {
  title: 'My plan',
  description: 'Your pipeline of applications, goals with due dates, and a calendar you can export.',
};

export default function PlanPage() {
  return <Plan />;
}
