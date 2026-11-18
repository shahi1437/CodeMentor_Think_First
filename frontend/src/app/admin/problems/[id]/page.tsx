'use client';

import { useParams } from 'next/navigation';
import { ProblemDraftEditor } from '@/components/ui/ProblemDraftEditor';

export default function EditProblemPage() {
  const { id } = useParams<{ id: string }>();
  return <ProblemDraftEditor id={id} />;
}
