import type { Metadata } from 'next';
import { ReportBuilder } from '@/components/report/report-builder';

export const metadata: Metadata = {
  title: 'Report',
  description: 'Choose sections, preview them and download your funding report as a PDF.',
};

export default function ReportPage() {
  return <ReportBuilder />;
}
