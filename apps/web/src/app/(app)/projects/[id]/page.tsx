'use client';

import { use, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  ArrowLeft,
  Calculator,
  ClipboardList,
  FileText,
  FolderOpen,
  Layers,
  Map,
  PenTool,
  Save,
  Settings,
  Sparkles,
  Users,
  Weight,
} from 'lucide-react';
import type { MultiPileProjectSpecifics, Project } from '@eng/shared';
import { useProject, useUpdateProject } from '@/hooks/use-projects';
import { useProjectStandardAssignments, useCurrentEditions } from '@/hooks/use-standards';
import { useCalculations } from '@/hooks/use-calculations';
import { usePileGroups } from '@/hooks/use-pile-groups';
import { PageHeader } from '@/components/page-header';
import { StandardsBadgeList } from '@/components/standards-badge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { PageLoading } from '@/components/loading';
import { extractProjectLoadDefinition } from '@/features/projects/project-load-definition-adapter';
import {
  buildProjectMetadataPatch,
  extractProjectSpecifics,
} from '@/features/projects/project-specifics-adapter';
import {
  buildProjectAssistantPrecision,
  summarizeProjectGeotechnical,
  summarizeProjectReferences,
  summarizeProjectStructuralDefaults,
} from '@/features/projects/project-specifics-utils';
import {
  buildProjectDetailAssistantPageContext,
  useRegisterAssistantCurrentPageActionExecutor,
  useRegisterAssistantDraftActionAdapter,
  useRegisterAssistantPageContext,
  useRegisterAssistantSuggestionAdapter,
} from '@/features/ai/assistant-page-context';
import { ApiError } from '@/lib/api-client';
import { ProjectDetailsEditor } from '@/features/projects/project-details-editor';
import { ProjectAiDraftSuggestionsCard } from '@/features/projects/project-ai-draft-suggestions-card';
import {
  createProjectSuggestionApplyAdapter,
  isProjectPageSuggestionFieldPath,
} from '@/features/projects/project-ai-suggestion-adapter';
import { createProjectCurrentPageActionExecutor } from '@/features/projects/project-current-page-action-executor';
import { ProjectReferencesEditor } from '@/features/projects/project-references-editor';
import { toast } from 'sonner';

export default function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: project, isLoading, error } = useProject(id);

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

  return <ProjectDetailContent projectId={id} project={project} />;
}

function ProjectDetailContent({ projectId, project }: { projectId: string; project: Project }) {
  const updateProject = useUpdateProject(projectId);
  const { data: assignments } = useProjectStandardAssignments(projectId);
  const { data: editions } = useCurrentEditions();
  const { data: calcs } = useCalculations(projectId, 1, 5);
  const { data: pileGroups } = usePileGroups(projectId);
  const [draft, setDraft] = useState<MultiPileProjectSpecifics | null>(null);
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    if (project && !isDirty) {
      setDraft(extractProjectSpecifics(project));
    }
  }, [project, isDirty]);

  const assignedStandards =
    assignments
      ?.map((assignment) => {
        const edition = editions?.find((row) => row.id === assignment.standardEditionId);
        return { code: edition?.code ?? '', edition: edition?.edition ?? '' };
      })
      .filter((standard) => standard.code) ?? [];

  const projectSpecifics = draft ?? extractProjectSpecifics(project);
  const projectSummary = summarizeAssistantProjectSummary(projectSpecifics, project);
  const referencesSummary = summarizeProjectReferences(projectSpecifics);
  const structuralDefaultsSummary = summarizeProjectStructuralDefaults(projectSpecifics);
  const geotechnicalSummary = summarizeProjectGeotechnical(projectSpecifics);
  const projectLoadDefinition = extractProjectLoadDefinition(project);
  const hasRulePacks = editions?.some((edition) => edition.rulePackId) ?? false;
  const loadCaseCount = projectLoadDefinition.loadCases.length;
  const loadCombinationCount = projectLoadDefinition.loadCombinations.length;
  const standardCount = assignedStandards.length;
  const assistantPrecision = buildProjectAssistantPrecision({
    projectSpecifics,
    standardCount,
    isDirty,
  });
  const geotechnicalArrReady =
    projectSpecifics.geotechnicalBasis.arrAssessment.weightTotal > 0 &&
    Number.isFinite(projectSpecifics.geotechnicalBasis.arrAssessment.arrValue);
  const assistantSummaryCards = [
    {
      label: 'References',
      value: `${referencesSummary.totalReferences} active`,
      detail: `${referencesSummary.includedInReportCount} in report · Geo ${referencesSummary.primaryGeotechnicalTitle} · Struct ${referencesSummary.primaryStructuralTitle}`,
    },
    {
      label: 'Structural defaults',
      value: `${structuralDefaultsSummary.configuredLibraries}/4 libraries`,
      detail: `${structuralDefaultsSummary.activeRows} active rows across concrete, reinforcement, tendon, and cover`,
    },
    {
      label: 'Geotechnical setup',
      value: `${geotechnicalSummary.activeMaterials} active materials`,
      detail: `${geotechnicalSummary.activeReferenceTitle} · ${geotechnicalSummary.templateState} · ARR ${geotechnicalSummary.arrBandSummary}`,
    },
    {
      label: 'Load library',
      value: `${loadCaseCount} load cases / ${loadCombinationCount} combinations`,
      detail:
        loadCombinationCount > 0
          ? 'Reusable project combinations are configured'
          : 'Reusable project combinations are still missing',
    },
  ];
  const assistantCurrentState = compactAssistantLines([
    ...assistantPrecision.currentStateFacts,
    `${standardCount} assigned standard${standardCount === 1 ? '' : 's'} · ${pileGroups?.length ?? 0} foundation workspace${(pileGroups?.length ?? 0) === 1 ? '' : 's'} · ${calcs?.meta?.total ?? 0} calculation run${(calcs?.meta?.total ?? 0) === 1 ? '' : 's'}`,
    `Load library: ${loadCaseCount} load case${loadCaseCount === 1 ? '' : 's'} and ${loadCombinationCount} load combination${loadCombinationCount === 1 ? '' : 's'}`,
    `References: ${referencesSummary.totalReferences} active, ${referencesSummary.includedInReportCount} included in report output`,
    `Structural defaults: ${structuralDefaultsSummary.configuredLibraries}/4 libraries configured with ${structuralDefaultsSummary.activeRows} active rows`,
    `Geotechnical setup: ${geotechnicalSummary.activeReferenceTitle}, ${geotechnicalSummary.activeMaterials} active material${geotechnicalSummary.activeMaterials === 1 ? '' : 's'}, ARR ${geotechnicalArrReady ? 'ready' : 'not ready'}`,
  ]);
  const assistantMissingInputs = compactAssistantLines([
    ...assistantPrecision.exactMissingItems,
    !geotechnicalArrReady ? 'Project Geotechnical: ARR / phi_g assessment is not ready yet.' : null,
    loadCombinationCount === 0
      ? 'Load library: shared project load combinations are not configured yet.'
      : null,
  ]);
  const assistantNextActions = compactAssistantLines([
    ...assistantPrecision.exactNextEdits,
    !geotechnicalArrReady
      ? 'Project Geotechnical: complete the ARR / phi_g assessment inputs on this page.'
      : null,
    loadCombinationCount === 0
      ? 'Load library: create shared project load combinations before relying on downstream run workflows.'
      : null,
  ]);
  const assistantPageContext = useMemo(() => {
    if (!draft) {
      return null;
    }

    return buildProjectDetailAssistantPageContext({
      route: `/projects/${projectId}`,
      projectId,
      pageTitle: projectSpecifics.identity.projectName || project.name,
      saveState: updateProject.isPending ? 'saving' : isDirty ? 'unsaved' : 'saved',
      visibleWarnings: [
        isDirty ? 'Project detail edits are not saved yet' : null,
        standardCount === 0 ? 'No standards are assigned to this project yet' : null,
        loadCaseCount === 0 ? 'No shared project load cases are configured yet' : null,
        loadCombinationCount === 0
          ? 'No shared project load combinations are configured yet'
          : null,
        pileGroups && pileGroups.length === 0
          ? 'No foundation workspaces exist for this project yet'
          : null,
        structuralDefaultsSummary.configuredLibraries === 0
          ? 'No project structural default libraries are configured yet'
          : null,
        structuralDefaultsSummary.configuredLibraries > 0 &&
        structuralDefaultsSummary.configuredLibraries < 4
          ? 'Project structural default libraries are only partially configured'
          : null,
        !geotechnicalSummary.hasGeotechnicalReferences
          ? 'No geotechnical report references are recorded for this project yet'
          : null,
        geotechnicalSummary.activeReferenceTitle === 'No active geotechnical report selected'
          ? 'Project geotechnical materials do not have an active source reference selected yet'
          : null,
        geotechnicalSummary.activeMaterials === 0
          ? 'No project geotechnical materials are currently included'
          : null,
        !geotechnicalArrReady ? 'ARR / phi_g assessment is not ready yet' : null,
        referencesSummary.totalReferences === 0
          ? 'No active project references are recorded yet'
          : null,
      ],
      keyFacts: [
        `${project.code} · ${projectSummary.status}`,
        `${standardCount} assigned standard${standardCount === 1 ? '' : 's'}`,
        `${loadCaseCount} load case${loadCaseCount === 1 ? '' : 's'} · ${loadCombinationCount} load combination${loadCombinationCount === 1 ? '' : 's'}`,
        `${pileGroups?.length ?? 0} foundation workspace${(pileGroups?.length ?? 0) === 1 ? '' : 's'} · ${calcs?.meta?.total ?? 0} calculation run${(calcs?.meta?.total ?? 0) === 1 ? '' : 's'}`,
      ],
      pageSpecificData: {
        projectCode: project.code,
        projectStatus: project.status,
        authoredProjectStatus: projectSummary.status,
        client: projectSummary.client,
        address: projectSummary.address,
        standards: {
          count: standardCount,
          hasRulePacks,
        },
        pileGroupsCount: pileGroups?.length ?? 0,
        calculationsCount: calcs?.meta?.total ?? 0,
        loadLibrary: {
          loadCases: loadCaseCount,
          loadCombinations: loadCombinationCount,
        },
        summaryCards: assistantSummaryCards,
        incompleteAreas: assistantMissingInputs,
        projectPrecision: assistantPrecision,
        availableNextActions: assistantNextActions,
        references: referencesSummary,
        structuralDefaults: {
          configuredLibraries: structuralDefaultsSummary.configuredLibraries,
          activeRows: structuralDefaultsSummary.activeRows,
          concreteRows: structuralDefaultsSummary.concreteClasses.activeRows,
          reinforcementRows: structuralDefaultsSummary.reinforcementGrades.activeRows,
          tendonRows: structuralDefaultsSummary.tendonGrades.activeRows,
          coverRows: structuralDefaultsSummary.coverDurabilityClasses.activeRows,
        },
        geotechnicalLibrary: {
          activeReferenceTitle: geotechnicalSummary.activeReferenceTitle,
          hasGeotechnicalReferences: geotechnicalSummary.hasGeotechnicalReferences,
          activeMaterials: geotechnicalSummary.activeMaterials,
          templateState: geotechnicalSummary.templateState,
          arrBandSummary: geotechnicalSummary.arrBandSummary,
          arrReady: geotechnicalArrReady,
          socketAssumptionsSummary: geotechnicalSummary.socketAssumptionsSummary,
          foundingSummary: geotechnicalSummary.foundingSummary,
        },
        assistantGuidance: {
          currentState: assistantCurrentState,
          missingInputs: assistantMissingInputs,
          likelyBlockers: assistantMissingInputs,
          nextActions: assistantNextActions,
          standardsReferenceNotes: [],
        },
      },
    });
  }, [
    assistantPrecision,
    assistantCurrentState,
    assistantMissingInputs,
    assistantNextActions,
    assistantSummaryCards,
    calcs?.meta?.total,
    draft,
    geotechnicalSummary,
    geotechnicalArrReady,
    hasRulePacks,
    isDirty,
    loadCaseCount,
    loadCombinationCount,
    pileGroups,
    project.code,
    project.name,
    project.status,
    projectId,
    projectSpecifics.identity.projectName,
    projectSummary.address,
    projectSummary.client,
    projectSummary.status,
    referencesSummary,
    standardCount,
    structuralDefaultsSummary,
    updateProject.isPending,
  ]);
  const assistantSuggestionAdapter = useMemo(
    () =>
      draft
        ? createProjectSuggestionApplyAdapter({
            projectSpecifics: draft,
            canApplyField: isProjectPageSuggestionFieldPath,
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
            scope: 'project-page',
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
            scope: 'project-page' as const,
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

  if (!draft) return <PageLoading />;

  const navCards = [
    {
      href: `/projects/${projectId}/load-cases`,
      icon: Weight,
      title: 'Load Cases',
      desc: `${loadCaseCount} shared project load case${loadCaseCount === 1 ? '' : 's'}`,
    },
    {
      href: `/projects/${projectId}/load-combinations`,
      icon: Layers,
      title: 'Load Combinations',
      desc: `${loadCombinationCount} reusable project combination${loadCombinationCount === 1 ? '' : 's'}`,
    },
    {
      href: `/projects/${projectId}/pile-groups`,
      icon: Layers,
      title: 'Foundations',
      desc: `${pileGroups?.length ?? 0} workspace(s)`,
    },
    {
      href: `/projects/${projectId}/calculations`,
      icon: Calculator,
      title: 'Calculations',
      desc: `${calcs?.meta?.total ?? 0} run(s)`,
    },
    {
      href: `/projects/${projectId}/ai-reports`,
      icon: Sparkles,
      title: 'AI Reports',
      desc: 'Upload reports, index in OpenAI, and extract cited engineering summaries',
    },
    {
      href: `/projects/${projectId}/documents`,
      icon: FolderOpen,
      title: 'Documents',
      desc: 'Upload, open, and safely delete project-scoped files',
    },
    {
      href: `/projects/${projectId}/standards`,
      icon: ClipboardList,
      title: 'Standards',
      desc:
        standardCount > 0
          ? `${standardCount} assigned standard${standardCount === 1 ? '' : 's'} · ${hasRulePacks ? 'rule packs ready' : 'rule packs pending'}`
          : 'No standards assigned yet',
    },
    {
      href: `/projects/${projectId}/environmental`,
      icon: FileText,
      title: 'Environmental',
      desc: 'Environmental workspace and authored deliverables',
    },
    {
      href: `/projects/${projectId}/spatial`,
      icon: Map,
      title: 'Spatial',
      desc: 'Project master map, boundaries, monitoring locations, boreholes, wells, and reusable spatial features',
    },
    {
      href: `/projects/${projectId}/drafting`,
      icon: PenTool,
      title: 'Drafting',
      desc: 'Project-native drawings, underlays, semantic engineering objects, revisions, and exports',
    },
    { href: `/projects/${projectId}/members`, icon: Users, title: 'Members', desc: 'Project team' },
    {
      href: `/projects/${projectId}/settings`,
      icon: Settings,
      title: 'Settings',
      desc: 'Project configuration',
    },
  ];
  const workspaceCards = [
    {
      href: `/projects/${projectId}/structural-libraries`,
      icon: Layers,
      title: 'Structural Libraries',
      desc: `${structuralDefaultsSummary.configuredLibraries}/4 libraries configured`,
    },
    {
      href: `/projects/${projectId}/project-geotechnical`,
      icon: ClipboardList,
      title: 'Project Geotechnical',
      desc: `${geotechnicalSummary.activeMaterials} active material${geotechnicalSummary.activeMaterials === 1 ? '' : 's'}`,
    },
  ];

  async function handleSaveProjectDetails() {
    if (!project || !draft) return;

    try {
      const updated = await updateProject.mutateAsync({
        metadata: buildProjectMetadataPatch(project, draft),
      });
      setDraft(extractProjectSpecifics(updated));
      setIsDirty(false);
      toast.success('Project details saved');
    } catch {
      toast.error('Failed to save project details');
    }
  }

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

      <PageHeader
        title={projectSpecifics.identity.projectName || project.name}
        description={`${project.code} · Project module hub`}
        actions={
          <Button onClick={handleSaveProjectDetails} disabled={!isDirty || updateProject.isPending}>
            <Save className="mr-2 h-4 w-4" />
            Save Project Details
          </Button>
        }
        badges={
          <>
            <Badge variant={project.status === 'active' ? 'success' : 'secondary'}>
              {project.status.replace('_', ' ')}
            </Badge>
            <Badge variant="outline">{projectSpecifics.identity.status}</Badge>
            {isDirty ? (
              <Badge variant="warning">Unsaved changes</Badge>
            ) : (
              <Badge variant="success">Saved</Badge>
            )}
            <StandardsBadgeList standards={assignedStandards} />
          </>
        }
      />

      <section className="space-y-4">
        <div id="project-details">
          <h2 className="text-lg font-semibold">Project Details</h2>
          <p className="text-sm text-muted-foreground">
            Project identity, report metadata, site map details, and shared context used across
            Multi-Pile.
          </p>
        </div>

        <ProjectDetailsEditor
          value={draft}
          onChange={(nextValue) => {
            setDraft(nextValue);
            setIsDirty(true);
          }}
        />
      </section>

      <section className="mt-8 space-y-4">
        <div id="project-references">
          <h2 className="text-lg font-semibold">Project References</h2>
          <p className="text-sm text-muted-foreground">
            Maintain document provenance here, then reuse it across Multi-Pile.
          </p>
        </div>

        <ProjectReferencesEditor
          value={draft}
          onChange={(nextValue) => {
            setDraft(nextValue);
            setIsDirty(true);
          }}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          {workspaceCards.map((card) => (
            <Link key={card.href} href={card.href}>
              <Card className="h-full transition-colors hover:border-primary/50 hover:bg-accent/30">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <card.icon className="h-5 w-5 text-muted-foreground" />
                    <CardTitle className="text-base">{card.title}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <CardDescription>{card.desc}</CardDescription>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-8 space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Project Modules</h2>
          <p className="text-sm text-muted-foreground">
            Open a dedicated module page to edit project-owned data or calculator workspaces.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {navCards.map((card) => (
            <Link key={card.href} href={card.href}>
              <Card className="h-full transition-colors hover:border-primary/50 hover:bg-accent/30">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <card.icon className="h-5 w-5 text-muted-foreground" />
                    <CardTitle className="text-base">{card.title}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <CardDescription>{card.desc}</CardDescription>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      {assistantPageContext ? (
        <section className="mt-8 space-y-4">
          <div>
            <h2 className="text-lg font-semibold">AI Draft Suggestions</h2>
            <p className="text-sm text-muted-foreground">
              Load visible report-derived draft suggestions here without opening the floating
              assistant.
            </p>
          </div>

          <ProjectAiDraftSuggestionsCard
            pageContext={assistantPageContext}
            projectSpecifics={draft}
            suggestionAdapter={assistantSuggestionAdapter}
            currentPageActionExecutor={currentPageActionExecutor}
            scope="project-page"
          />
        </section>
      ) : null}
    </>
  );
}

function summarizeAssistantProjectSummary(
  projectSpecifics: MultiPileProjectSpecifics,
  project: Project,
) {
  return {
    projectNumber: projectSpecifics.identity.projectNumber || project.code || 'Not set',
    projectName: projectSpecifics.identity.projectName || project.name || 'Untitled Project',
    client: projectSpecifics.identity.client || 'Not set',
    address: projectSpecifics.identity.address || 'Not set',
    status: projectSpecifics.identity.status || 'Not set',
  };
}

function compactAssistantLines(values: Array<string | null | undefined>) {
  return values.filter((value): value is string => Boolean(value && value.trim()));
}
