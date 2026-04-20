'use client';

import { use, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Layers, Plus, Save } from 'lucide-react';
import type { MultiPileProjectSpecifics } from '@eng/shared';
import { usePileGroups, useCreatePileGroup } from '@/hooks/use-pile-groups';
import { useProject, useUpdateProject } from '@/hooks/use-projects';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/page-header';
import { StandardsBadge } from '@/components/standards-badge';
import { Badge } from '@/components/ui/badge';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button, buttonVariants } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { EmptyState } from '@/components/empty-state';
import { PageLoading } from '@/components/loading';
import {
  buildProjectMetadataPatch,
  extractProjectSpecifics,
} from '@/features/projects/project-specifics-adapter';
import {
  buildProjectDetailAssistantPageContext,
  useRegisterAssistantCurrentPageActionExecutor,
  useRegisterAssistantDraftActionAdapter,
  useRegisterAssistantPageContext,
  useRegisterAssistantSuggestionAdapter,
} from '@/features/ai/assistant-page-context';
import { ProjectAiDraftSuggestionsCard } from '@/features/projects/project-ai-draft-suggestions-card';
import {
  createProjectSuggestionApplyAdapter,
  isProjectFoundationsSuggestionFieldPath,
} from '@/features/projects/project-ai-suggestion-adapter';
import { createProjectCurrentPageActionExecutor } from '@/features/projects/project-current-page-action-executor';
import { ProjectGeotechnicalBasisEditor } from '@/features/projects/project-geotechnical-editors';
import { summarizeProjectGeotechnical } from '@/features/projects/project-specifics-utils';
import { toast } from 'sonner';

export default function PileGroupsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = use(params);
  const router = useRouter();
  const { data: project } = useProject(projectId);
  const updateProject = useUpdateProject(projectId);
  const { data: groups, isLoading } = usePileGroups(projectId);
  const createGroup = useCreatePileGroup(projectId);
  const [draft, setDraft] = useState<MultiPileProjectSpecifics | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', description: '' });

  useEffect(() => {
    if (project && !isDirty) {
      setDraft(extractProjectSpecifics(project));
    }
  }, [project, isDirty]);

  const geotechnicalSummary = draft ? summarizeProjectGeotechnical(draft) : null;
  const assistantPageContext = useMemo(() => {
    if (!project || !draft || !geotechnicalSummary) {
      return null;
    }

    return buildProjectDetailAssistantPageContext({
      route: `/projects/${projectId}/pile-groups`,
      projectId,
      pageTitle: 'Foundations',
      saveState: updateProject.isPending ? 'saving' : isDirty ? 'unsaved' : 'saved',
      visibleWarnings: [
        isDirty ? 'Foundation/global GEO control edits are not saved yet' : null,
        !geotechnicalSummary.hasGeotechnicalReferences
          ? 'No geotechnical report references are recorded for this project yet'
          : null,
        geotechnicalSummary.arrBandSummary === 'Not assessed'
          ? 'ARR / phi_g assessment is not ready yet'
          : null,
      ],
      keyFacts: [
        `${project.code} · ${project.name}`,
        `${groups?.length ?? 0} foundation workspace${(groups?.length ?? 0) === 1 ? '' : 's'}`,
        `Global GEO source: ${geotechnicalSummary.activeReferenceTitle}`,
        `ARR: ${geotechnicalSummary.arrBandSummary}`,
      ],
      pageSpecificData: {
        foundationWorkspacesCount: groups?.length ?? 0,
        foundationGlobalGeoControls: {
          groundwaterDesignNotes: draft.geotechnicalBasis.groundwaterDesignNotes,
          cfaUpliftSummary: geotechnicalSummary.cfaUpliftSummary,
          socketAssumptionsSummary: geotechnicalSummary.socketAssumptionsSummary,
          foundingSummary: geotechnicalSummary.foundingSummary,
          commentarySummary: geotechnicalSummary.commentarySummary,
          arrBandSummary: geotechnicalSummary.arrBandSummary,
        },
      },
    });
  }, [
    draft,
    geotechnicalSummary,
    groups?.length,
    isDirty,
    project,
    projectId,
    updateProject.isPending,
  ]);
  const assistantSuggestionAdapter = useMemo(
    () =>
      draft
        ? createProjectSuggestionApplyAdapter({
            projectSpecifics: draft,
            canApplyField: isProjectFoundationsSuggestionFieldPath,
            onApply: (nextValue) => {
              setDraft(nextValue);
              setIsDirty(true);
            },
          })
        : null,
    [draft],
  );
  const currentPageActionExecutor = useMemo(
    () =>
      draft
        ? createProjectCurrentPageActionExecutor({
            projectSpecifics: draft,
            scope: 'project-foundations',
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
            scope: 'project-foundations' as const,
            projectSpecifics: draft,
            aiReportsHref: `/projects/${projectId}/ai-reports`,
          }
        : null,
    [draft, projectId],
  );

  useRegisterAssistantPageContext(assistantPageContext);
  useRegisterAssistantSuggestionAdapter(assistantSuggestionAdapter);
  useRegisterAssistantCurrentPageActionExecutor(currentPageActionExecutor);
  useRegisterAssistantDraftActionAdapter(assistantDraftActionAdapter);

  if (isLoading || !project || !draft) return <PageLoading />;

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    try {
      const group = await createGroup.mutateAsync({
        name: form.name,
        description: form.description || undefined,
      });
      toast.success('Foundation workspace created');
      setShowCreate(false);
      setForm({ name: '', description: '' });
      router.push(`/projects/${projectId}/pile-groups/${group.id}`);
    } catch {
      toast.error('Failed to create foundation workspace');
    }
  }

  async function handleSaveFoundations() {
    if (!project || !draft) return;

    try {
      const updated = await updateProject.mutateAsync({
        metadata: buildProjectMetadataPatch(project, draft),
      });
      setDraft(extractProjectSpecifics(updated));
      setIsDirty(false);
      toast.success('Foundations settings saved');
    } catch {
      toast.error('Failed to save foundations settings');
    }
  }

  return (
    <>
      <div className="mb-4">
        <Link
          href={`/projects/${projectId}`}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to project
        </Link>
      </div>

      <PageHeader
        title="Foundations"
        description={`${project.code} · Foundations workspace and pile-group authoring`}
        badges={
          <>
            <StandardsBadge code="AS 2159" edition="2009" />
            {isDirty ? (
              <Badge variant="warning">Unsaved changes</Badge>
            ) : (
              <Badge variant="success">Saved</Badge>
            )}
          </>
        }
        actions={
          <>
            <Button
              variant="outline"
              onClick={handleSaveFoundations}
              disabled={!isDirty || updateProject.isPending}
            >
              <Save className="mr-2 h-4 w-4" />
              Save Foundations Settings
            </Button>
            <Button onClick={() => setShowCreate(true)}>
              <Plus className="mr-2 h-4 w-4" /> New Foundation Workspace
            </Button>
          </>
        }
      />

      <section id="project-geotechnical-basis" className="mt-8 space-y-4">
        <div>
          <h2 className="text-lg font-semibold">
            Project Geotechnical Basis / Global GEO Controls
          </h2>
          <p className="text-sm text-muted-foreground">
            Foundations owns the ARR / phi_g assessment, groundwater notes, uplift settings, socket
            assumptions, founding notes, and project-level geotechnical commentary.
          </p>
        </div>

        <ProjectGeotechnicalBasisEditor
          value={draft}
          onChange={(nextValue) => {
            setDraft(nextValue);
            setIsDirty(true);
          }}
        />

        {assistantPageContext ? (
          <ProjectAiDraftSuggestionsCard
            pageContext={assistantPageContext}
            projectSpecifics={draft}
            suggestionAdapter={assistantSuggestionAdapter}
            currentPageActionExecutor={currentPageActionExecutor}
            scope="project-foundations"
          />
        ) : null}
      </section>

      <section className="mt-8 space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Foundation Workspaces</h2>
          <p className="text-sm text-muted-foreground">
            Existing pile-group and Multi-Pile entry points stay here under the Foundations module.
          </p>
        </div>

        {!groups?.length ? (
          <EmptyState
            icon={<Layers className="h-12 w-12" />}
            title="No foundation workspaces"
            description="Create a foundation workspace to define the pile-group arrangement and run analysis."
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {groups.map((g) => (
              <Card key={g.id} className="transition-colors hover:border-primary/50">
                <CardHeader className="space-y-4">
                  <div className="space-y-1">
                    <CardTitle className="text-base">{g.name}</CardTitle>
                    {g.description && <CardDescription>{g.description}</CardDescription>}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Link
                      href={`/projects/${projectId}/pile-groups/${g.id}`}
                      className={buttonVariants({ variant: 'outline', size: 'sm' })}
                    >
                      Setup
                    </Link>
                    <Link
                      href={`/projects/${projectId}/pile-groups/${g.id}/multi-pile`}
                      className={buttonVariants({ size: 'sm' })}
                    >
                      Open Multi-Pile
                    </Link>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        )}
      </section>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Foundation Workspace</DialogTitle>
            <DialogDescription>
              Create a foundation workspace backed by the existing pile-group route.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
                placeholder="e.g. Pile Cap PC-01"
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createGroup.isPending}>
                Create
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
