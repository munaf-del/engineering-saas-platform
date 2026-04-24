'use client';

import { use } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { PageLoading } from '@/components/loading';
import { PageHeader } from '@/components/page-header';
import { ProjectDocumentManager } from '@/features/documents/project-document-manager';
import { useProject } from '@/hooks/use-projects';

export default function ProjectDocumentsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: project, isLoading } = useProject(id);

  if (isLoading || !project) {
    return <PageLoading />;
  }

  return (
    <>
      <div className="mb-4">
        <Link
          href={`/projects/${id}`}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to project
        </Link>
      </div>

      <PageHeader
        title="Project Documents"
        description={`${project.code} · Upload, open, and safely delete project-scoped documents`}
      />

      <ProjectDocumentManager projectCode={project.code} projectId={id} />
    </>
  );
}
