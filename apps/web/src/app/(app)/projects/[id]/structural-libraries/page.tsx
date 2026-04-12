'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, ArrowLeft, Save } from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { PageLoading } from '@/components/loading';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  buildProjectMetadataPatch,
  extractProjectSpecifics,
} from '@/features/projects/project-specifics-adapter';
import { summarizeProjectStructuralDefaults } from '@/features/projects/project-specifics-utils';
import { ProjectStructuralDefaultLibrariesEditor } from '@/features/projects/project-structural-default-libraries-editor';
import { useProject, useUpdateProject } from '@/hooks/use-projects';
import { ApiError } from '@/lib/api-client';
import { toast } from 'sonner';

export default function StructuralLibrariesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = use(params);
  const { data: project, isLoading, error } = useProject(projectId);
  const updateProject = useUpdateProject(projectId);
  const [draft, setDraft] = useState<ReturnType<typeof extractProjectSpecifics> | null>(null);
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    if (project && !isDirty) {
      setDraft(extractProjectSpecifics(project));
    }
  }, [project, isDirty]);

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

  if (!draft) {
    return <PageLoading />;
  }

  const structuralDefaultsSummary = summarizeProjectStructuralDefaults(draft);

  async function handleSave() {
    if (!project || !draft) {
      return;
    }

    try {
      const updated = await updateProject.mutateAsync({
        metadata: buildProjectMetadataPatch(project, draft),
      });
      setDraft(extractProjectSpecifics(updated));
      setIsDirty(false);
      toast.success('Structural libraries saved');
    } catch {
      toast.error('Failed to save structural libraries');
    }
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
        title="Structural Libraries"
        description={`${project.code} · Shared concrete, reinforcement, tendon, and cover defaults`}
        badges={
          <>
            <Badge variant="outline">{project.name}</Badge>
            <Badge variant="outline">
              {structuralDefaultsSummary.configuredLibraries}/4 libraries configured
            </Badge>
            {isDirty ? (
              <Badge variant="warning">Unsaved changes</Badge>
            ) : (
              <Badge variant="success">Saved</Badge>
            )}
          </>
        }
        actions={
          <Button onClick={handleSave} disabled={!isDirty || updateProject.isPending}>
            <Save className="mr-2 h-4 w-4" />
            Save Structural Libraries
          </Button>
        }
      />

      <ProjectStructuralDefaultLibrariesEditor
        value={draft}
        onChange={(nextValue) => {
          setDraft(nextValue);
          setIsDirty(true);
        }}
      />
    </>
  );
}
