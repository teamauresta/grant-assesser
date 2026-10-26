import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { PROGRAMS, getProgram } from '@/content/programs';
import { ProgramDetail } from '@/components/programs/program-detail';

type Props = { params: Promise<{ slug: string }> };

// Static export: every program page is generated at build time; unknown slugs are 404s.
export const dynamicParams = false;

export function generateStaticParams() {
  return PROGRAMS.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const program = getProgram((await params).slug);
  return program ? { title: program.name, description: program.content.summary } : {};
}

export default async function ProgramPage({ params }: Props) {
  const program = getProgram((await params).slug);
  if (!program) notFound();
  return <ProgramDetail program={program} />;
}
