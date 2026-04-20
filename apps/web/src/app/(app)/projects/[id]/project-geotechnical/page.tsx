'use client';

import { use, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, ArrowLeft, Save } from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { PageLoading } from '@/components/loading';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  buildProjectDetailAssistantPageContext,
  useRegisterAssistantDraftActionAdapter,
  useRegisterAssistantPageContext,
  useRegisterAssistantSuggestionAdapter,
} from '@/features/ai/assistant-page-context';
import { ProjectAiDraftSuggestionsCard } from '@/features/projects/project-ai-draft-suggestions-card';
import { createProjectSuggestionApplyAdapter } from '@/features/projects/project-ai-suggestion-adapter';
import {
  addProjectGeotechnicalMaterialCandidateToDraft,
  applyProjectGeotechnicalMaterialCandidateToExistingRow,
} from '@/features/projects/project-ai-geotechnical-material-candidates';
import { ProjectGeotechnicalMaterialsEditor } from '@/features/projects/project-geotechnical-editors';
import {
  buildProjectMetadataPatch,
  extractProjectSpecifics,
} from '@/features/projects/project-specifics-adapter';
import { summarizeProjectGeotechnical } from '@/features/projects/project-specifics-utils';
import { useProject, useUpdateProject } from '@/hooks/use-projects';
import { ApiError } from '@/lib/api-client';
import { toast } from 'sonner';

export default function ProjectGeotechnicalPage({ params }: { params: Promise<{ id: string }> }) {
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

  const handleAddMaterialCandidate = useCallback(
    (
      candidate: Parameters<typeof addProjectGeotechnicalMaterialCandidateToDraft>[1],
      includeInProject: boolean,
    ) => {
      setDraft((current) =>
        current
          ? addProjectGeotechnicalMaterialCandidateToDraft(current, candidate, {
              includeInProject,
            })
          : current,
      );
      setIsDirty(true);
    },
    [],
  );

  const handleApplyMaterialCandidateToExisting = useCallback(
    (
      candidate: Parameters<typeof applyProjectGeotechnicalMaterialCandidateToExistingRow>[1],
      targetIndex: number,
    ) => {
      setDraft((current) =>
        current
          ? applyProjectGeotechnicalMaterialCandidateToExistingRow(current, candidate, targetIndex)
          : current,
      );
      setIsDirty(true);
    },
    [],
  );

  const handleSave = useCallback(async () => {
    if (!project || !draft) {
      return;
    }

    try {
      const updated = await updateProject.mutateAsync({
        metadata: buildProjectMetadataPatch(project, draft),
      });
      setDraft(extractProjectSpecifics(updated));
      setIsDirty(false);
      toast.success('Project geotechnical workspace saved');
    } catch {
      toast.error('Failed to save project geotechnical workspace');
    }
  }, [draft, project, updateProject]);

  const geotechnicalSummary = draft ? summarizeProjectGeotechnical(draft) : null;
  const assistantPageContext = useMemo(() => {
    if (!draft || !project || !geotechnicalSummary) {
      return null;
    }

    return buildProjectDetailAssistantPageContext({
      route: `/projects/${projectId}/project-geotechnical`,
      projectId,
      pageTitle: 'Project Geotechnical',
      saveState: updateProject.isPending ? 'saving' : isDirty ? 'unsaved' : 'saved',
      visibleWarnings: [
        isDirty ? 'Project geotechnical edits are not saved yet' : null,
        !geotechnicalSummary.hasGeotechnicalReferences
          ? 'No geotechnical report references are recorded for this project yet'
          : null,
        geotechnicalSummary.activeReferenceTitle === 'No active geotechnical report selected'
          ? 'Project geotechnical materials do not have an active source reference selected yet'
          : null,
        geotechnicalSummary.activeMaterials === 0
          ? 'No project geotechnical materials are currently included'
          : null,
      ],
      keyFacts: [
        `${project.code} · ${project.name}`,
        `${geotechnicalSummary.activeMaterials} active material${geotechnicalSummary.activeMaterials === 1 ? '' : 's'}`,
        `Active report: ${geotechnicalSummary.activeReferenceTitle}`,
      ],
      pageSpecificData: {
        geotechnicalLibrary: {
          activeReferenceTitle: geotechnicalSummary.activeReferenceTitle,
          hasGeotechnicalReferences: geotechnicalSummary.hasGeotechnicalReferences,
          activeMaterials: geotechnicalSummary.activeMaterials,
          templateState: geotechnicalSummary.templateState,
          materialPreviewLabels: geotechnicalSummary.materialPreviewLabels,
        },
      },
    });
  }, [draft, geotechnicalSummary, isDirty, project, projectId, updateProject.isPending]);
  const assistantSuggestionAdapter = useMemo(
    () =>
      draft
        ? createProjectSuggestionApplyAdapter({
            projectSpecifics: draft,
            canApplyField: () => false,
            onApply: (nextValue) => {
              setDraft(nextValue);
              setIsDirty(true);
            },
          })
        : null,
    [draft],
  );
  const assistantDraftActionAdapter = useMemo(
    () =>
      draft
        ? {
            kind: 'project' as const,
            scope: 'project-geotechnical' as const,
            projectSpecifics: draft,
            aiReportsHref: `/projects/${projectId}/ai-reports`,
            onAddMaterialCandidate: handleAddMaterialCandidate,
            onApplyMaterialCandidateToExisting: handleApplyMaterialCandidateToExisting,
          }
        : null,
    [draft, handleAddMaterialCandidate, handleApplyMaterialCandidateToExisting, projectId],
  );

  useRegisterAssistantPageContext(assistantPageContext);
  useRegisterAssistantSuggestionAdapter(assistantSuggestionAdapter);
  useRegisterAssistantDraftActionAdapter(assistantDraftActionAdapter);

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

  if (!draft || !geotechnicalSummary) {
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
        title="Project Geotechnical"
        description={`${project.code} · Shared project geotechnical materials workspace`}
        badges={
          <>
            <Badge variant="outline">{project.name}</Badge>
            <Badge variant="outline">
              {geotechnicalSummary.activeMaterials} active material
              {geotechnicalSummary.activeMaterials === 1 ? '' : 's'}
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
            Save Project Geotechnical
          </Button>
        }
      />

      <Alert className="mb-6">
        <AlertTitle>Materials workspace scope</AlertTitle>
        <AlertDescription>
          This page owns the shared Project Geotechnical materials library and material-candidate AI
          review/apply flow. Foundations owns the project geotechnical basis and global GEO
          controls.
        </AlertDescription>
      </Alert>

      <ProjectGeotechnicalMaterialsEditor
        value={draft}
        onChange={(nextValue) => {
          setDraft(nextValue);
          setIsDirty(true);
        }}
      />

      {assistantPageContext ? (
        <section className="mt-8 space-y-4">
          <ProjectAiDraftSuggestionsCard
            pageContext={assistantPageContext}
            projectSpecifics={draft}
            suggestionAdapter={assistantSuggestionAdapter}
            scope="project-geotechnical"
            onAddMaterialCandidate={handleAddMaterialCandidate}
            onApplyMaterialCandidateToExisting={handleApplyMaterialCandidateToExisting}
          />
        </section>
      ) : null}
    </>
  );
}
