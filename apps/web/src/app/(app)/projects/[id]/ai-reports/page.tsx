'use client';

import { use } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { useProject } from '@/hooks/use-projects';
import { PageHeader } from '@/components/page-header';
import { PageLoading } from '@/components/loading';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { AiReportsWorkspace } from '@/features/ai/ai-reports-workspace';

export default function AiReportsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = use(params);
  const { data: project, isLoading } = useProject(projectId);

  if (isLoading || !project) {
    return <PageLoading />;
  }

  return (
    <>
      <div className="mb-4">
        <Link
          href={`/projects/${projectId}`}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to project
        </Link>
      </div>

      <PageHeader
        title="AI Reports"
        description={`${project.code} · Discipline-aware technical report registry for upload, indexing, and structured extraction`}
        badges={<Badge variant="outline">{project.name}</Badge>}
      />

      <Alert className="mb-6">
        <AlertTitle>Technical report registry</AlertTitle>
        <AlertDescription>
          Classify reports by discipline family now while the existing upload, OpenAI indexing,
          extraction, and delete flow stays in place.
        </AlertDescription>
      </Alert>

      <AiReportsWorkspace projectId={projectId} />
    </>
  );
}
