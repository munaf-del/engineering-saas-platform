'use client';

import { use } from 'react';
import Link from 'next/link';
import { AlertTriangle, ArrowLeft, ClipboardList, FileText, Radio } from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { PageLoading } from '@/components/loading';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { extractProjectSpecifics } from '@/features/projects/project-specifics-adapter';
import { useProject } from '@/hooks/use-projects';
import { ApiError } from '@/lib/api-client';

export default function ProjectEnvironmentalPage({ params }: { params: Promise<{ id: string }> }) {
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

  const projectSpecifics = extractProjectSpecifics(project);
  const projectName = projectSpecifics.identity.projectName || project.name;

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
        title="Environmental"
        description={`${project.code} · Environmental workspace and authored deliverables`}
        badges={<Badge variant="outline">{projectName}</Badge>}
      />

      <Alert className="mb-6">
        <ClipboardList className="h-4 w-4" />
        <AlertTitle>Project environmental workspace</AlertTitle>
        <AlertDescription>
          CNVMP now lives here as an authored deliverable. This workspace can later expand to
          dewatering management, contamination, site inspections, and environmental controls.
        </AlertDescription>
      </Alert>

      <section className="grid gap-6 lg:grid-cols-2">
        <Link href={`/projects/${projectId}/environmental/cnvmp`}>
          <Card className="h-full transition-colors hover:border-primary/50 hover:bg-accent/30">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-muted-foreground" />
                <CardTitle className="text-base">CNVMP</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription>Construction Noise and Vibration Management Plan</CardDescription>
            </CardContent>
          </Card>
        </Link>

        <Link href={`/projects/${projectId}/environmental/monitoring`}>
          <Card className="h-full transition-colors hover:border-primary/50 hover:bg-accent/30">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <Radio className="h-5 w-5 text-muted-foreground" />
                <CardTitle className="text-base">Monitoring Reports</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Open the monitoring reports collection for creation, tracking, and report editing
              </CardDescription>
              <p className="mt-2 text-xs text-muted-foreground">
                Open a monitoring report to import Omnidots Honeycomb data.
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href={`/projects/${projectId}/environmental/waste-classification`}>
          <Card className="h-full transition-colors hover:border-primary/50 hover:bg-accent/30">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-muted-foreground" />
                <CardTitle className="text-base">Waste Classification Reports</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription>
                NSW EPA step-based waste classification deliverables
              </CardDescription>
            </CardContent>
          </Card>
        </Link>
      </section>

      <section className="mt-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Future workspace scope</CardTitle>
            <CardDescription>
              Keep related environmental deliverables grouped here as the module grows.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>Dewatering management</p>
            <p>Contamination</p>
            <p>Waste classification</p>
            <p>Site inspections</p>
            <p>Environmental controls and obligations</p>
          </CardContent>
        </Card>
      </section>
    </>
  );
}
