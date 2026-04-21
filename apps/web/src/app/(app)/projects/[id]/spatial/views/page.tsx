'use client';

import { use } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { AlertTriangle, ArrowLeft } from 'lucide-react';
import { PageLoading } from '@/components/loading';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ProjectSpatialWorkspace } from '@/features/spatial/project-spatial-workspace';
import { useProject } from '@/hooks/use-projects';
import { ApiError } from '@/lib/api-client';

export default function ProjectSpatialViewsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: projectId } = use(params);
  const searchParams = useSearchParams();
  const { data: project, isLoading, error } = useProject(projectId);
  const returnToHref = normalizeSpatialReturnTo(searchParams.get('returnTo'));
  const source = searchParams.get('source');
  const entryIntent = source === 'monitoring-annexure' ? 'monitoring-annexure' : null;

  if (isLoading) {
    return <PageLoading />;
  }

  if (!project) {
    const notFound = error instanceof ApiError && error.status === 404;
    const accessDenied = error instanceof ApiError && error.status === 403;

    return (
      <>
        <div className="mb-4">
          <Link
            href={`/projects/${projectId}/spatial`}
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Map
          </Link>
        </div>

        <Alert variant="destructive" className="max-w-2xl">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>
            {notFound
              ? 'Project not found'
              : accessDenied
                ? 'Project access denied'
                : 'Failed to load project'}
          </AlertTitle>
          <AlertDescription>
            {notFound
              ? 'This project no longer exists. It may have been deleted.'
              : accessDenied
                ? 'You no longer have access to this project.'
                : 'The project could not be loaded right now. Please try again.'}
          </AlertDescription>
        </Alert>
      </>
    );
  }

  return (
    <ProjectSpatialWorkspace
      entryIntent={entryIntent}
      key={`spatial-views-${projectId}`}
      mode="views"
      projectId={projectId}
      project={project}
      returnToHref={returnToHref}
    />
  );
}

function normalizeSpatialReturnTo(value: string | null) {
  if (!value || !value.startsWith('/')) {
    return null;
  }

  return value.startsWith('//') ? null : value;
}
