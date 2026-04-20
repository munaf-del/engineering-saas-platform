'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Layers, Save } from 'lucide-react';
import type { ProjectLoadDefinition } from '@eng/shared';
import { PageHeader } from '@/components/page-header';
import { PageLoading } from '@/components/loading';
import { StandardsBadge } from '@/components/standards-badge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  buildProjectLoadDefinitionMetadataPatch,
  extractProjectLoadDefinition,
} from '@/features/projects/project-load-definition-adapter';
import { ProjectLoadDefinitionEditor } from '@/features/projects/project-load-definition-editor';
import { useProject, useUpdateProject } from '@/hooks/use-projects';
import { toast } from 'sonner';

export default function LoadCombinationsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = use(params);
  const { data: project, isLoading } = useProject(projectId);
  const updateProject = useUpdateProject(projectId);
  const [draft, setDraft] = useState<ProjectLoadDefinition | null>(null);
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    if (project && !isDirty) {
      setDraft(extractProjectLoadDefinition(project));
    }
  }, [project, isDirty]);

  if (isLoading || !project || !draft) return <PageLoading />;

  async function handleSave() {
    if (!project || !draft) return;

    try {
      const updated = await updateProject.mutateAsync({
        metadata: buildProjectLoadDefinitionMetadataPatch(project, draft),
      });
      setDraft(extractProjectLoadDefinition(updated));
      setIsDirty(false);
      toast.success('Project load combinations saved');
    } catch {
      toast.error('Failed to save project load combinations');
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
        title="Load Combinations"
        description={`${project.code ?? ''} · Reusable project combinations consumed by calculators`}
        badges={
          <>
            <StandardsBadge code="AS/NZS 1170.0" edition="2002" />
            <Badge variant="outline">
              {draft.loadCombinations.length} combination
              {draft.loadCombinations.length === 1 ? '' : 's'}
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
            Save Load Combinations
          </Button>
        }
      />

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">Project Module</CardTitle>
        </CardHeader>
        <CardContent className="flex items-start gap-3 text-sm text-muted-foreground">
          <Layers className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            Load combinations are owned at the project level and reference the project load cases.
            Multi-Pile consumes these combinations, but it is no longer the editing source of truth.
          </p>
        </CardContent>
      </Card>

      <ProjectLoadDefinitionEditor
        value={draft}
        sections={['settings', 'load-combinations']}
        onChange={(nextValue) => {
          setDraft(nextValue);
          setIsDirty(true);
        }}
      />
    </>
  );
}
