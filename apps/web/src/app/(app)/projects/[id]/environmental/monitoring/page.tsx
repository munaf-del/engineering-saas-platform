'use client';

import { use } from 'react';
import Link from 'next/link';
import { AlertTriangle, ArrowLeft, Radio } from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { PageLoading } from '@/components/loading';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { MonitoringReportsPanel } from '@/features/environmental/monitoring-reports-panel';
import { extractProjectSpecifics } from '@/features/projects/project-specifics-adapter';
import { useProject } from '@/hooks/use-projects';
import { ApiError } from '@/lib/api-client';

export default function ProjectEnvironmentalMonitoringPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: projectId } = use(params);
  const { data: project, isLoading, error } = useProject(projectId);

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
            href="/projects"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            All Projects
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

  const projectName = extractProjectSpecifics(project).identity.projectName || project.name;

  return (
    <>
      <div className="mb-4">
        <Link
          href={`/projects/${projectId}/environmental`}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to environmental
        </Link>
      </div>

      <PageHeader
        title="Monitoring Reports"
        description={`${project.code} · Noise and vibration monitoring deliverables`}
        badges={
          <>
            <Badge variant="outline">{projectName}</Badge>
            <Badge variant="outline">
              <Radio className="mr-1 h-3 w-3" />
              Environmental
            </Badge>
          </>
        }
      />

      <MonitoringReportsPanel projectId={projectId} />
    </>
  );
}
