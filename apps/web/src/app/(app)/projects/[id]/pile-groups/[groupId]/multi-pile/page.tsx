'use client';

import { use, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ChevronRight, FileText, Play, Save } from 'lucide-react';
import {
  type MultiPileEnvelopeRunSummary,
  type MultiPileJointLoadRow,
  type MultiPileState,
} from '@eng/shared';
import { PageHeader } from '@/components/page-header';
import { PageLoading } from '@/components/loading';
import { Badge, type BadgeProps } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CombinationsEnvelopeTab } from '@/features/multi-pile/combinations-envelope-tab';
import { GeoTab } from '@/features/multi-pile/geo-tab';
import { LoadEngineBasisTab } from '@/features/multi-pile/load-engine-basis-tab';
import { LoadEngineLoadsTab } from '@/features/multi-pile/load-engine-loads-tab';
import {
  PileRegisterTab,
  type MultiPileRegisterSelection,
} from '@/features/multi-pile/pile-register-tab';
import { PricingSummaryTab } from '@/features/multi-pile/pricing-summary-tab';
import { buildMultiPileReportSummaryPrintPath } from '@/features/multi-pile/report-summary';
import { MultiPileProjectLink, MultiPileStatCard } from '@/features/multi-pile/runtime-shell';
import { StructTab } from '@/features/multi-pile/struct-tab';
import {
  buildMultiPileAssistantPageContext,
  useRegisterAssistantPageContext,
} from '@/features/ai/assistant-page-context';
import {
  clearGeoRuntimeState,
  defaultGeoTypeSettings,
  derivePileRegisterRows,
  materializeAutoAssignedPileTypes,
  nextSequentialId,
  normalizeJointDefinition,
  normalizePileTypeDefinition,
  removeJointLoadAuthoringRowsForJoint,
  setJointLoadCellValue,
  syncGeoTypeSettingsWithPileTypes,
} from '@/features/multi-pile/utils';
import {
  extractProjectSpecifics,
  projectGeotechnicalSummary,
  projectReferencesSummary,
  projectSpecificsSummary,
  projectStructuralDefaultsSummary,
} from '@/features/projects/project-specifics-adapter';
import { extractProjectLoadDefinition } from '@/features/projects/project-load-definition-adapter';
import {
  useLatestMultiPileEnvelope,
  useMultiPileState,
  useRunMultiPileEnvelope,
  useSaveMultiPileState,
} from '@/hooks/use-multi-pile';
import { usePileGroup } from '@/hooks/use-pile-groups';
import { useProject } from '@/hooks/use-projects';
import { toast } from 'sonner';

export default function MultiPilePage({
  params,
}: {
  params: Promise<{ id: string; groupId: string }>;
}) {
  const { id: projectId, groupId } = use(params);
  const router = useRouter();
  const { data: project } = useProject(projectId);
  const { data: group, isLoading: groupLoading } = usePileGroup(projectId, groupId);
  const { data: persistedState, isLoading: stateLoading } = useMultiPileState(projectId, groupId);
  const { data: latestRun } = useLatestMultiPileEnvelope(projectId, groupId);
  const saveState = useSaveMultiPileState(projectId, groupId);
  const runEnvelope = useRunMultiPileEnvelope(projectId, groupId);

  const [draft, setDraft] = useState<MultiPileState | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [isPreparingReportSummary, setIsPreparingReportSummary] = useState(false);
  const [activeTab, setActiveTab] = useState('basis');
  const [selectedRegisterPile, setSelectedRegisterPile] =
    useState<MultiPileRegisterSelection | null>(null);
  const materializedDraft = useMemo(
    () => (draft ? materializeAutoAssignedPileTypes(draft, latestRun) : null),
    [draft, latestRun],
  );
  const hasPendingAutoAssignmentDiff = useMemo(() => {
    if (!draft || !materializedDraft || draft.joints.length !== materializedDraft.joints.length) {
      return false;
    }

    return draft.joints.some(
      (joint, index) => joint.pileTypeId !== materializedDraft.joints[index]?.pileTypeId,
    );
  }, [draft, materializedDraft]);
  const hasUnsavedChanges = isDirty || hasPendingAutoAssignmentDiff;

  useEffect(() => {
    if (persistedState && !isDirty) {
      setDraft(persistedState);
    }
  }, [persistedState, isDirty]);

  const projectSpecifics = extractProjectSpecifics(project);
  const projectSummary = projectSpecificsSummary(project);
  const geotechnicalSummary = projectGeotechnicalSummary(project);
  const referenceSummary = projectReferencesSummary(project);
  const structuralDefaultsSummary = projectStructuralDefaultsSummary(project);
  const projectLoadDefinition = extractProjectLoadDefinition(project);
  const geotechnicalBasis = projectSpecifics.geotechnicalBasis;
  const configuredStructuralLibraries = [
    structuralDefaultsSummary.concreteClasses.activeRows > 0,
    structuralDefaultsSummary.reinforcementGrades.activeRows > 0,
    structuralDefaultsSummary.tendonGrades.activeRows > 0,
    structuralDefaultsSummary.coverDurabilityClasses.activeRows > 0,
  ].filter(Boolean).length;
  const arrReady =
    geotechnicalBasis.arrAssessment.weightTotal > 0 &&
    Number.isFinite(geotechnicalBasis.arrAssessment.arrValue);

  const assistantPageContext = useMemo(() => {
    if (groupLoading || stateLoading || !group || !draft) {
      return null;
    }

    const pileTypeCount = draft.pileTypes.length;
    const jointCount = draft.joints.length;
    const derivedPileCount = derivePileRegisterRows(draft).length;
    const selectedCombinationCount = draft.selectedCombinations.length;
    const assistantInsights = buildMultiPileAssistantInsights({
      activeTab,
      draft,
      projectSpecifics,
      latestRun,
      selectedRegisterPile,
      hasProjectLoadCases: projectLoadDefinition.loadCases.length > 0,
      hasProjectLoadCombinations: projectLoadDefinition.loadCombinations.length > 0,
      arrReady,
      hasProjectGeotechnicalMaterials: geotechnicalSummary.activeMaterials > 0,
      configuredStructuralLibraries,
    });

    return buildMultiPileAssistantPageContext({
      route: `/projects/${projectId}/pile-groups/${groupId}/multi-pile`,
      projectId,
      pileGroupId: groupId,
      saveState: saveState.isPending ? 'saving' : hasUnsavedChanges ? 'unsaved' : 'saved',
      visibleWarnings: [
        saveState.isPending ? 'The current Multi-Pile draft is saving' : null,
        hasUnsavedChanges ? 'There are unsaved Multi-Pile changes on this page' : null,
        !arrReady ? 'ARR assessment is not ready in the project geotechnical basis' : null,
        projectLoadDefinition.loadCases.length === 0
          ? 'No project load cases are available yet'
          : null,
        projectLoadDefinition.loadCombinations.length === 0
          ? 'No project load combinations are available yet'
          : null,
        selectedCombinationCount === 0
          ? 'No load combinations are currently selected in Multi-Pile'
          : null,
        geotechnicalSummary.activeMaterials === 0
          ? 'No project geotechnical materials are currently included'
          : null,
        configuredStructuralLibraries === 0
          ? 'No project structural default libraries are configured yet'
          : null,
        latestRun == null ? 'Envelope has not been run for this foundation workspace yet' : null,
        ...(latestRun?.warnings?.slice(0, 3).map(formatMultiPileEngineMessage) ?? []),
      ],
      visibleErrors: [
        latestRun?.status === 'failed' ? 'The latest envelope run failed' : null,
        ...(latestRun?.errors?.slice(0, 3).map(formatMultiPileEngineMessage) ?? []),
      ],
      keyFacts: [
        `Active tab: ${formatMultiPileTabLabel(activeTab)}`,
        `${pileTypeCount} pile type${pileTypeCount === 1 ? '' : 's'} · ${jointCount} joint${jointCount === 1 ? '' : 's'}`,
        `${derivedPileCount} derived pile${derivedPileCount === 1 ? '' : 's'} · ${selectedCombinationCount} selected combination${selectedCombinationCount === 1 ? '' : 's'}`,
        latestRun ? `Run status: ${normalizeRunStatusLabel(latestRun)}` : 'Run status: Not run',
      ],
      pageSpecificData: {
        projectName: projectSummary.projectName,
        pileGroupName: group.name,
        activeTab,
        counts: {
          pileTypes: pileTypeCount,
          joints: jointCount,
          derivedPiles: derivedPileCount,
          selectedCombinations: selectedCombinationCount,
        },
        saveStatus: saveState.isPending ? 'saving' : hasUnsavedChanges ? 'unsaved' : 'saved',
        selectedRegisterPile: selectedRegisterPile
          ? {
              pileId: selectedRegisterPile.pileId,
              pileTypeId: selectedRegisterPile.pileTypeId,
              jointId: selectedRegisterPile.jointId,
            }
          : null,
        latestRun: latestRun
          ? {
              status: latestRun.status,
              createdAt: latestRun.createdAt,
              durationMs: latestRun.durationMs ?? null,
              warningsCount: latestRun.warnings?.length ?? 0,
              errorsCount: latestRun.errors?.length ?? 0,
            }
          : null,
        projectContext: {
          projectNumber: projectSummary.projectNumber,
          client: projectSummary.client,
          status: projectSummary.status,
          references: {
            total: referenceSummary.totalReferences,
            includedInReport: referenceSummary.includedInReportCount,
          },
        },
        readiness: {
          arrReady,
          configuredStructuralLibraries,
          activeGeotechnicalMaterials: geotechnicalSummary.activeMaterials,
          projectLoadCases: projectLoadDefinition.loadCases.length,
          projectLoadCombinations: projectLoadDefinition.loadCombinations.length,
        },
        incompleteAreas: assistantInsights.missingInputs,
        activeTabContext: assistantInsights.activeTabContext,
        assistantGuidance: {
          currentState: assistantInsights.currentState,
          missingInputs: assistantInsights.missingInputs,
          likelyBlockers: assistantInsights.likelyBlockers,
          nextActions: assistantInsights.nextActions,
          standardsReferenceNotes: [],
        },
      },
    });
  }, [
    activeTab,
    arrReady,
    configuredStructuralLibraries,
    draft,
    geotechnicalSummary.activeMaterials,
    group,
    groupId,
    groupLoading,
    hasUnsavedChanges,
    isDirty,
    latestRun,
    projectLoadDefinition.loadCases.length,
    projectLoadDefinition.loadCombinations.length,
    projectId,
    projectSpecifics,
    projectSummary.projectName,
    projectSummary.projectNumber,
    projectSummary.client,
    projectSummary.status,
    referenceSummary.includedInReportCount,
    referenceSummary.primaryGeotechnicalTitle,
    referenceSummary.primaryStructuralTitle,
    referenceSummary.totalReferences,
    saveState.isPending,
    selectedRegisterPile,
    stateLoading,
  ]);

  useRegisterAssistantPageContext(assistantPageContext);

  if (groupLoading || stateLoading || !group || !draft) {
    return <PageLoading />;
  }

  const currentDraft = draft;
  const draftForSaveOrRun = materializedDraft ?? currentDraft;
  const pileTypeCount = currentDraft.pileTypes.length;
  const jointCount = currentDraft.joints.length;
  const derivedPileCount = derivePileRegisterRows(currentDraft).length;
  const selectedCombinationCount = currentDraft.selectedCombinations.length;
  const projectLoadCasesHref = `/projects/${projectId}/load-cases`;
  const projectLoadCombinationsHref = `/projects/${projectId}/load-combinations`;
  const projectDetailsHref = `/projects/${projectId}#project-details`;
  const projectReferencesHref = `/projects/${projectId}#project-references`;
  const projectStructuralDefaultsHref = `/projects/${projectId}#project-structural-default-libraries`;
  const projectFoundationsHref = `/projects/${projectId}/pile-groups#project-geotechnical-basis`;

  function updateDraft(updater: (current: MultiPileState) => MultiPileState) {
    setDraft((current) => {
      if (!current) return current;
      return clearGeoRuntimeState(updater(current));
    });
    setIsDirty(true);
  }

  function updateStructDraft(updater: (current: MultiPileState) => MultiPileState) {
    setDraft((current) => {
      if (!current) return current;
      return updater(current);
    });
    setIsDirty(true);
  }

  function updateJointLoad(
    jointId: string,
    patternId: string,
    field: keyof Omit<MultiPileJointLoadRow, 'jointId' | 'patternId'>,
    value: number | null,
  ) {
    updateDraft((current) => setJointLoadCellValue(current, jointId, patternId, field, value));
  }

  function getJointLoad(jointId: string, patternId: string): MultiPileJointLoadRow {
    const loadRow = currentDraft.jointLoads.find(
      (row) => row.jointId === jointId && row.patternId === patternId,
    );
    if (loadRow) {
      return loadRow;
    }
    return {
      jointId,
      patternId,
      p: 0,
      vx: 0,
      vy: 0,
      mx: 0,
      my: 0,
      mz: 0,
    };
  }

  function setSelectedCombinations(combinationIds: string[]) {
    updateDraft((current) => {
      const selectedIdSet = new Set(combinationIds);
      return {
        ...current,
        selectedCombinations: current.combinationLibrary
          .map((combination) => combination.id)
          .filter((combinationId) => selectedIdSet.has(combinationId)),
      };
    });
  }

  function toggleSelectedCombination(combinationId: string) {
    updateDraft((current) => {
      const selectedIds = new Set(current.selectedCombinations);
      if (selectedIds.has(combinationId)) {
        selectedIds.delete(combinationId);
      } else {
        selectedIds.add(combinationId);
      }

      return {
        ...current,
        selectedCombinations: current.combinationLibrary
          .map((combination) => combination.id)
          .filter((candidateId) => selectedIds.has(candidateId)),
      };
    });
  }

  function addPileType() {
    updateDraft((current) => {
      const nextPileType = normalizePileTypeDefinition(
        {
          id: nextSequentialId(
            'BP',
            current.pileTypes.map((pileType) => pileType.id),
          ),
        },
        { order: current.pileTypes.length },
      );
      const pileTypes = [...current.pileTypes, nextPileType];
      return {
        ...current,
        pileTypes,
        geoTypeSettings: syncGeoTypeSettingsWithPileTypes(current.geoTypeSettings, pileTypes),
      };
    });
  }

  function removePileType(pileTypeId: string) {
    if (currentDraft.pileTypes.length <= 1) return;

    updateDraft((current) => {
      const remainingPileTypes = current.pileTypes.filter((pileType) => pileType.id !== pileTypeId);
      const fallbackPileTypeId = remainingPileTypes[0]?.id ?? current.pileTypes[0]?.id ?? 'BP1';
      return {
        ...current,
        pileTypes: remainingPileTypes.map((pileType, index) => ({ ...pileType, order: index })),
        geoTypeSettings: syncGeoTypeSettingsWithPileTypes(
          current.geoTypeSettings,
          remainingPileTypes.map((pileType, index) => ({ ...pileType, order: index })),
        ),
        joints: current.joints.map((joint, index) => ({
          ...joint,
          pileTypeId: joint.pileTypeId === pileTypeId ? fallbackPileTypeId : joint.pileTypeId,
          order: index,
        })),
      };
    });
  }

  function addJoint() {
    updateDraft((current) => {
      const nextJoint = normalizeJointDefinition(
        {
          id: nextSequentialId(
            'J',
            current.joints.map((joint) => joint.id),
          ),
          pileTypeId: current.pileTypes[0]?.id ?? 'BP1',
        },
        {
          order: current.joints.length,
          defaultPileTypeId: current.pileTypes[0]?.id ?? 'BP1',
          pileTypeIds: current.pileTypes.map((pileType) => pileType.id),
        },
      );

      return {
        ...current,
        joints: [...current.joints, nextJoint],
      };
    });
  }

  function removeJoint(jointId: string) {
    if (currentDraft.joints.length <= 1) return;

    updateDraft((current) =>
      removeJointLoadAuthoringRowsForJoint(
        {
          ...current,
          joints: current.joints
            .filter((joint) => joint.id !== jointId)
            .map((joint, index) => ({ ...joint, order: index })),
          jointLoads: current.jointLoads.filter((row) => row.jointId !== jointId),
        },
        jointId,
      ),
    );
  }

  async function persistDraft({
    successMessage,
    errorMessage,
  }: {
    successMessage?: string;
    errorMessage: string;
  }) {
    if (!draft) return null;

    try {
      const saved = await saveState.mutateAsync(draftForSaveOrRun);
      setDraft(saved);
      setIsDirty(false);
      if (successMessage) {
        toast.success(successMessage);
      }
      return saved;
    } catch {
      toast.error(errorMessage);
      return null;
    }
  }

  async function handleSave() {
    await persistDraft({
      successMessage: 'Multi-Pile state saved',
      errorMessage: 'Failed to save Multi-Pile state',
    });
  }

  async function handlePreparePricingPrint() {
    if (!hasUnsavedChanges) {
      return true;
    }

    const saved = await persistDraft({
      errorMessage: 'Failed to save current Multi-Pile changes before printing',
    });
    return Boolean(saved);
  }

  async function handleRun() {
    if (!draft) return;
    const saved = await persistDraft({
      errorMessage: 'Failed to save Multi-Pile state',
    });
    if (!saved) return;
    try {
      const result = await runEnvelope.mutateAsync(saved);
      const jointCount = result.envelope?.projectSummary.jointCount ?? saved.joints.length;
      toast.success(`Envelope run completed for ${jointCount} joint${jointCount === 1 ? '' : 's'}`);
    } catch {
      toast.error('Failed to run Multi-Pile envelope');
    }
  }

  async function handleOpenReportSummary() {
    try {
      setIsPreparingReportSummary(true);
      const canOpenPreview = await handlePreparePricingPrint();
      if (!canOpenPreview) {
        return;
      }
      router.push(buildMultiPileReportSummaryPrintPath({ projectId, groupId }));
    } catch (error) {
      console.error('Report Summary print preview failed', error);
      toast.error('Failed to open Multi-Pile Report Summary');
    } finally {
      setIsPreparingReportSummary(false);
    }
  }

  return (
    <>
      <nav className="mb-4 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        <Link href={`/projects/${projectId}`} className="hover:text-foreground">
          {project?.name ?? project?.code ?? 'Project'}
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <Link href={`/projects/${projectId}/pile-groups`} className="hover:text-foreground">
          Foundations
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <Link
          href={`/projects/${projectId}/pile-groups/${groupId}`}
          className="hover:text-foreground"
        >
          {group.name}
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-foreground">Multi-Pile</span>
      </nav>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Link
          href={`/projects/${projectId}/pile-groups/${groupId}`}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to foundation workspace
        </Link>
      </div>

      <PageHeader
        title="Multi-Pile"
        description={`${project?.code ?? ''} · ${group.name} · pile types, joints, loads, GEO, and STRUCT workspace`}
        badges={
          <>
            <Badge variant="outline">{pileTypeCount} pile types</Badge>
            <Badge variant="outline">{jointCount} joints</Badge>
            <Badge variant="outline">{derivedPileCount} derived piles</Badge>
            {hasUnsavedChanges ? (
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
              onClick={handleOpenReportSummary}
              disabled={saveState.isPending || runEnvelope.isPending || isPreparingReportSummary}
              data-testid="multi-pile-report-summary-button"
            >
              <FileText className="mr-2 h-4 w-4" />
              Report Summary
            </Button>
            <Button
              variant="outline"
              onClick={handleSave}
              disabled={saveState.isPending || runEnvelope.isPending}
            >
              <Save className="mr-2 h-4 w-4" />
              Save
            </Button>
            <Button onClick={handleRun} disabled={saveState.isPending || runEnvelope.isPending}>
              <Play className="mr-2 h-4 w-4" />
              Run Envelope
            </Button>
          </>
        }
      />

      <Card className="mb-6 border-slate-200 bg-slate-50/70">
        <CardContent className="space-y-4 p-4">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
            <div className="space-y-1">
              <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                Project Context
              </div>
              <div className="text-sm font-semibold text-foreground">
                {projectSummary.projectNumber} · {projectSummary.projectName}
              </div>
              <p className="text-sm text-muted-foreground">
                Compact project context for this workspace. Detailed editing stays on the Project
                page.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <MultiPileProjectLink href={projectDetailsHref}>Project details</MultiPileProjectLink>
              <MultiPileProjectLink href={projectReferencesHref}>References</MultiPileProjectLink>
              <MultiPileProjectLink href={projectStructuralDefaultsHref}>
                Structural defaults
              </MultiPileProjectLink>
              <MultiPileProjectLink href={projectFoundationsHref}>Foundations</MultiPileProjectLink>
              <MultiPileProjectLink href={projectLoadCasesHref}>Load cases</MultiPileProjectLink>
              <MultiPileProjectLink href={projectLoadCombinationsHref}>
                Combinations
              </MultiPileProjectLink>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <MultiPileStatCard
              label="References"
              value={`${referenceSummary.totalReferences} total`}
              detail={`${referenceSummary.includedInReportCount} report · Geo ${referenceSummary.primaryGeotechnicalTitle} · Struct ${referenceSummary.primaryStructuralTitle}`}
            />
            <MultiPileStatCard
              label="Structural Defaults"
              value={`${configuredStructuralLibraries}/4 configured`}
              detail={`${structuralDefaultsSummary.concreteClasses.activeRows} concrete · ${structuralDefaultsSummary.reinforcementGrades.activeRows} reinforcement · ${structuralDefaultsSummary.coverDurabilityClasses.activeRows} cover`}
            />
            <MultiPileStatCard
              label="Geotechnical Library"
              value={`${geotechnicalSummary.activeMaterials} adopted`}
              detail={`${geotechnicalSummary.activeReferenceTitle} · ${geotechnicalSummary.templateState} · ${geotechnicalSummary.socketAssumptionsSummary}`}
            />
            <MultiPileStatCard
              label="Load Library"
              value={`${projectLoadDefinition.loadCases.length} / ${projectLoadDefinition.loadCombinations.length}`}
              detail={`${selectedCombinationCount} selected in Multi-Pile · ${geotechnicalSummary.testingSummary}`}
            />
            <MultiPileStatCard
              label="ARR"
              value={arrReady ? 'Ready' : 'Not ready'}
              detail={`ARR ${geotechnicalSummary.arrValueSummary} · band ${geotechnicalSummary.arrBandSummary} · phi_g ${geotechnicalSummary.phiGLowSummary} / ${geotechnicalSummary.phiGHighSummary}`}
              valueVariant={arrReady ? 'success' : 'warning'}
            />
            <MultiPileStatCard
              label="Save Status"
              value={saveState.isPending ? 'Saving' : isDirty ? 'Unsaved' : 'Saved'}
              detail={
                saveState.isPending
                  ? 'Persisting current Multi-Pile draft'
                  : 'Calculator-owned state only'
              }
              valueVariant={
                saveState.isPending ? 'outline' : hasUnsavedChanges ? 'warning' : 'success'
              }
            />
            <MultiPileStatCard
              label="Run Status"
              value={latestRun ? normalizeRunStatusLabel(latestRun) : 'Not run'}
              detail={
                latestRun
                  ? formatCompactRunMeta(latestRun)
                  : 'Run envelope to populate downstream GEO and STRUCT snapshots'
              }
              valueVariant={latestRun ? runStatusVariant(latestRun) : 'outline'}
            />
            <MultiPileStatCard
              label="Workspace"
              value={`${pileTypeCount} types · ${jointCount} joints`}
              detail={`${derivedPileCount} derived piles · ${projectSummary.client} · ${projectSummary.status}`}
            />
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="flex h-auto flex-wrap justify-start">
          <TabsTrigger value="basis">Pile Types</TabsTrigger>
          <TabsTrigger value="loads">Joint Loads / Pattern Assignment</TabsTrigger>
          <TabsTrigger value="envelope">Combinations / Envelope</TabsTrigger>
          <TabsTrigger value="register">Pile Register</TabsTrigger>
          <TabsTrigger value="geo">GEO</TabsTrigger>
          <TabsTrigger value="struct">STRUCT</TabsTrigger>
          <TabsTrigger value="pricing">Pricing Summary</TabsTrigger>
        </TabsList>

        <TabsContent value="basis" className="space-y-6">
          <LoadEngineBasisTab
            draft={currentDraft}
            projectSpecifics={projectSpecifics}
            updateDraft={updateDraft}
            addPileType={addPileType}
            removePileType={removePileType}
          />
        </TabsContent>

        <TabsContent value="loads" className="space-y-6">
          <LoadEngineLoadsTab
            draft={currentDraft}
            latestRun={latestRun}
            projectLoadDefinition={projectLoadDefinition}
            projectLoadCasesHref={projectLoadCasesHref}
            projectLoadCombinationsHref={projectLoadCombinationsHref}
            preferredJointId={selectedRegisterPile?.jointId ?? null}
            preferredPileTypeId={selectedRegisterPile?.pileTypeId ?? null}
            updateDraft={updateDraft}
            addJoint={addJoint}
            removeJoint={removeJoint}
            updateJointLoad={updateJointLoad}
            getJointLoad={getJointLoad}
          />
        </TabsContent>

        <TabsContent value="envelope" className="space-y-6">
          <CombinationsEnvelopeTab
            draft={draftForSaveOrRun}
            latestRun={latestRun}
            projectLoadDefinition={projectLoadDefinition}
            projectLoadCombinationsHref={projectLoadCombinationsHref}
            onToggleSelectedCombination={toggleSelectedCombination}
            onApplySelectedCombinations={setSelectedCombinations}
            onRunEnvelope={handleRun}
            isDirty={hasUnsavedChanges}
            isRunning={saveState.isPending || runEnvelope.isPending}
          />
        </TabsContent>

        <TabsContent value="register" className="space-y-6">
          <PileRegisterTab
            draft={currentDraft}
            latestRun={latestRun}
            selectedPileId={selectedRegisterPile?.pileId ?? null}
            onSelectPile={setSelectedRegisterPile}
            onJumpToGeo={(selection) => {
              setSelectedRegisterPile(selection);
              setActiveTab('geo');
            }}
            onJumpToStruct={(selection) => {
              setSelectedRegisterPile(selection);
              setActiveTab('struct');
            }}
            onJumpToLoads={(selection) => {
              setSelectedRegisterPile(selection);
              setActiveTab('loads');
            }}
          />
        </TabsContent>

        <TabsContent value="geo" className="space-y-6">
          <GeoTab
            draft={currentDraft}
            projectSpecifics={projectSpecifics}
            editProjectArrHref={projectFoundationsHref}
            updateDraft={updateDraft}
            selectedTypeId={selectedRegisterPile?.pileTypeId ?? null}
            selectedJointId={selectedRegisterPile?.jointId ?? null}
          />
        </TabsContent>

        <TabsContent value="struct" className="space-y-6">
          <StructTab
            draft={currentDraft}
            projectSpecifics={projectSpecifics}
            latestRun={latestRun}
            editProjectStructuralDefaultsHref={projectStructuralDefaultsHref}
            updateDraft={updateStructDraft}
            selectedTypeId={selectedRegisterPile?.pileTypeId ?? null}
          />
        </TabsContent>

        <TabsContent value="pricing" className="space-y-6">
          <PricingSummaryTab
            projectId={projectId}
            groupId={groupId}
            draft={currentDraft}
            projectSpecifics={projectSpecifics}
            projectCode={project?.code}
            projectName={project?.name}
            latestRun={latestRun}
            onPreparePrint={handlePreparePricingPrint}
          />
        </TabsContent>
      </Tabs>
    </>
  );
}

function normalizeRunStatusLabel(latestRun: MultiPileEnvelopeRunSummary) {
  return latestRun.status
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((chunk) => chunk[0]?.toUpperCase() + chunk.slice(1))
    .join(' ');
}

function formatCompactRunMeta(latestRun: MultiPileEnvelopeRunSummary) {
  const durationLabel =
    latestRun.durationMs != null ? ` · ${Math.round(latestRun.durationMs)} ms` : '';
  return `${formatTimestamp(latestRun.createdAt)}${durationLabel}`;
}

function formatTimestamp(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleString('en-AU', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function runStatusVariant(latestRun: MultiPileEnvelopeRunSummary): BadgeProps['variant'] {
  if (latestRun.status === 'completed') {
    return 'success';
  }
  if (latestRun.status === 'failed') {
    return 'destructive';
  }
  return 'warning';
}

function formatMultiPileTabLabel(tab: string) {
  switch (tab) {
    case 'basis':
      return 'Pile Types';
    case 'loads':
      return 'Joint Loads / Pattern Assignment';
    case 'envelope':
      return 'Combinations / Envelope';
    case 'register':
      return 'Pile Register';
    case 'geo':
      return 'GEO';
    case 'struct':
      return 'STRUCT';
    case 'pricing':
      return 'Pricing Summary';
    default:
      return tab;
  }
}

function formatMultiPileEngineMessage(message: {
  code?: string | null;
  message: string;
  clauseRef?: string | null;
}) {
  const prefix = message.code ? `${message.code}: ` : '';
  const suffix = message.clauseRef ? ` (${message.clauseRef})` : '';
  return `${prefix}${message.message}${suffix}`;
}

type MultiPileAssistantInsights = {
  currentState: string[];
  missingInputs: string[];
  likelyBlockers: string[];
  nextActions: string[];
  activeTabContext: {
    tab: string;
    label: string;
    activePileTypeId: string | null;
    currentState: string[];
    missingInputs: string[];
    likelyBlockers: string[];
    nextActions: string[];
    pendingStates: string[];
    pileTypeSummaries: MultiPileAssistantPileTypeSummary[];
  };
};

type MultiPileAssistantPileTypeSummary = {
  pileTypeId: string;
  displayName: string;
  active: boolean;
  linkedJointCount: number;
  derivedPileCount: number;
  diameterM: number | null;
  eOopM: number | null;
  baseResistanceEnabled: boolean;
  socketMode: string;
  adoptedSocketLengthM: number | null;
  missingFlags: {
    missingDiameter: boolean;
    missingEoop: boolean;
    missingShaftReductionFactors: boolean;
    missingProjectGeoMaterials: boolean;
    missingLayerMaterialSelections: boolean;
    missingFoundingMaterial: boolean;
    pendingSocketLength: boolean;
    overrideValueMissing: boolean;
  };
  missingInputs: string[];
  likelyBlockers: string[];
  pendingStates: string[];
};

function buildMultiPileAssistantInsights({
  activeTab,
  draft,
  projectSpecifics,
  latestRun,
  selectedRegisterPile,
  hasProjectLoadCases,
  hasProjectLoadCombinations,
  arrReady,
  hasProjectGeotechnicalMaterials,
  configuredStructuralLibraries,
}: {
  activeTab: string;
  draft: MultiPileState;
  projectSpecifics: ReturnType<typeof extractProjectSpecifics>;
  latestRun: MultiPileEnvelopeRunSummary | null | undefined;
  selectedRegisterPile: MultiPileRegisterSelection | null;
  hasProjectLoadCases: boolean;
  hasProjectLoadCombinations: boolean;
  arrReady: boolean;
  hasProjectGeotechnicalMaterials: boolean;
  configuredStructuralLibraries: number;
}): MultiPileAssistantInsights {
  const allProjectMaterials = projectSpecifics.geotechnicalMaterials.materials;
  const projectMaterialById = new Map(
    allProjectMaterials.map((material) => [material.id, material]),
  );
  const derivedPileRows = derivePileRegisterRows(draft);
  const typeSummaries = draft.pileTypes.map((pileType) =>
    summarizeMultiPileAssistantPileType({
      pileType,
      draft,
      projectMaterialById,
      hasProjectGeotechnicalMaterials,
      derivedPileRows,
    }),
  );
  const activePileTypeId = resolveMultiPileAssistantActiveTypeId({
    draft,
    selectedRegisterPile,
    typeSummaries,
  });
  const activeTypeSummary =
    typeSummaries.find((summary) => summary.pileTypeId === activePileTypeId) ?? null;
  const runStatusLabel = latestRun ? normalizeRunStatusLabel(latestRun) : 'Not run';

  const globalMissingInputs = compactAssistantLines([
    !hasProjectLoadCases ? 'Project load cases are not configured yet' : null,
    !hasProjectLoadCombinations ? 'Project load combinations are not configured yet' : null,
    draft.selectedCombinations.length === 0
      ? 'No load combinations are selected in Multi-Pile'
      : null,
    draft.joints.length === 0 ? 'No joints are authored in the workspace yet' : null,
    derivedPileRows.length === 0 ? 'No derived piles exist yet from the authored joints' : null,
    !arrReady ? 'ARR / phi_g assessment is not ready yet on the Project page' : null,
    !hasProjectGeotechnicalMaterials
      ? 'Project geotechnical material assignments are missing'
      : null,
    configuredStructuralLibraries === 0
      ? 'Project structural default libraries are not configured yet'
      : null,
  ]);
  const globalLikelyBlockers = compactAssistantLines([
    latestRun?.status === 'failed' ? 'The latest Multi-Pile run failed' : null,
    latestRun == null ? 'Run status is Not run because the envelope has not been run yet' : null,
    draft.selectedCombinations.length === 0
      ? 'Run Envelope is blocked until at least one combination is selected'
      : null,
    !hasProjectLoadCombinations
      ? 'Run readiness is blocked by missing project load combinations'
      : null,
    !hasProjectGeotechnicalMaterials
      ? 'GEO readiness is blocked because the project geotechnical library is empty'
      : null,
    !arrReady ? 'GEO readiness is blocked because the ARR basis is incomplete' : null,
    configuredStructuralLibraries === 0
      ? 'STRUCT readiness is blocked because the project structural default libraries are empty'
      : null,
  ]);
  const globalNextActions = compactAssistantLines([
    !hasProjectLoadCombinations
      ? 'Add or import the project load combinations used by this foundation workspace'
      : null,
    draft.selectedCombinations.length === 0
      ? 'Select the load combinations that should be included in the envelope'
      : null,
    !hasProjectGeotechnicalMaterials
      ? 'Add the project geotechnical material rows on the Project page before expecting GEO inputs to resolve'
      : null,
    !arrReady ? 'Complete the project ARR / phi_g basis on the Project page' : null,
    configuredStructuralLibraries === 0
      ? 'Populate the project structural default libraries before relying on STRUCT outputs'
      : null,
    latestRun?.status === 'failed'
      ? 'Review the last run errors, then rerun the envelope after clearing the blockers'
      : latestRun == null
        ? 'Use Save and Run Envelope once the visible blockers are cleared'
        : null,
  ]);

  const tabContext = buildMultiPileActiveTabContext({
    activeTab,
    draft,
    latestRun,
    activeTypeSummary,
    typeSummaries,
    configuredStructuralLibraries,
    hasProjectLoadCases,
    hasProjectLoadCombinations,
  });

  return {
    currentState: compactAssistantLines([
      `Active tab is ${formatMultiPileTabLabel(activeTab)}`,
      `Run status is ${runStatusLabel}`,
      `${draft.pileTypes.length} pile type${draft.pileTypes.length === 1 ? '' : 's'} · ${draft.joints.length} joint${draft.joints.length === 1 ? '' : 's'} · ${derivedPileRows.length} derived pile${derivedPileRows.length === 1 ? '' : 's'}`,
      `${draft.selectedCombinations.length} load combination${draft.selectedCombinations.length === 1 ? '' : 's'} selected in Multi-Pile`,
      activeTypeSummary
        ? `Focus pile type ${activeTypeSummary.pileTypeId} is ${activeTypeSummary.baseResistanceEnabled ? 'including' : 'excluding'} base resistance with socket mode ${activeTypeSummary.socketMode}`
        : null,
      ...tabContext.currentState,
    ]),
    missingInputs: uniqueAssistantLines([...globalMissingInputs, ...tabContext.missingInputs]),
    likelyBlockers: uniqueAssistantLines([...globalLikelyBlockers, ...tabContext.likelyBlockers]),
    nextActions: uniqueAssistantLines([...tabContext.nextActions, ...globalNextActions]),
    activeTabContext: {
      tab: activeTab,
      label: formatMultiPileTabLabel(activeTab),
      activePileTypeId,
      currentState: tabContext.currentState,
      missingInputs: uniqueAssistantLines(tabContext.missingInputs),
      likelyBlockers: uniqueAssistantLines(tabContext.likelyBlockers),
      nextActions: uniqueAssistantLines(tabContext.nextActions),
      pendingStates: uniqueAssistantLines(tabContext.pendingStates),
      pileTypeSummaries: orderMultiPileTypeSummaries(typeSummaries, activePileTypeId),
    },
  };
}

function buildMultiPileActiveTabContext({
  activeTab,
  draft,
  latestRun,
  activeTypeSummary,
  typeSummaries,
  configuredStructuralLibraries,
  hasProjectLoadCases,
  hasProjectLoadCombinations,
}: {
  activeTab: string;
  draft: MultiPileState;
  latestRun: MultiPileEnvelopeRunSummary | null | undefined;
  activeTypeSummary: MultiPileAssistantPileTypeSummary | null;
  typeSummaries: MultiPileAssistantPileTypeSummary[];
  configuredStructuralLibraries: number;
  hasProjectLoadCases: boolean;
  hasProjectLoadCombinations: boolean;
}) {
  const activeTypeMissingInputs = collectTypeAssistantLines({
    typeSummaries,
    activePileTypeId: activeTypeSummary?.pileTypeId ?? null,
    field: 'missingInputs',
  });
  const activeTypeLikelyBlockers = collectTypeAssistantLines({
    typeSummaries,
    activePileTypeId: activeTypeSummary?.pileTypeId ?? null,
    field: 'likelyBlockers',
  });
  const activeTypePendingStates = collectTypeAssistantLines({
    typeSummaries,
    activePileTypeId: activeTypeSummary?.pileTypeId ?? null,
    field: 'pendingStates',
  });

  switch (activeTab) {
    case 'basis':
      return {
        currentState: compactAssistantLines([
          'Pile Types tab is open',
          activeTypeSummary
            ? `${activeTypeSummary.pileTypeId} has ${activeTypeSummary.linkedJointCount} linked joint${activeTypeSummary.linkedJointCount === 1 ? '' : 's'} and ${activeTypeSummary.derivedPileCount} derived pile${activeTypeSummary.derivedPileCount === 1 ? '' : 's'}`
            : null,
          activeTypeSummary
            ? `Base resistance is ${activeTypeSummary.baseResistanceEnabled ? 'enabled' : 'disabled'} and the socket mode is ${activeTypeSummary.socketMode}`
            : null,
        ]),
        missingInputs: activeTypeMissingInputs,
        likelyBlockers: uniqueAssistantLines([
          ...activeTypeLikelyBlockers,
          ...activeTypePendingStates,
        ]),
        nextActions: compactAssistantLines([
          activeTypeMissingInputs.some((line) => line.includes('D (m)') || line.includes('e_oop'))
            ? 'Complete the pile type geometry fields such as D (m) and e_oop (m)'
            : null,
          activeTypeMissingInputs.some((line) => line.includes('Shaft reduction'))
            ? 'Author the pile-type shaft reduction factors used by GEO'
            : null,
          activeTypeMissingInputs.some((line) => line.includes('layer material'))
            ? 'Assign the visible layer material selections for each active pile type'
            : null,
          activeTypeMissingInputs.some((line) => line.includes('Founding / socket material'))
            ? 'Select the founding / socket material for each affected pile type'
            : null,
          activeTypeMissingInputs.some((line) => line.includes('socket state'))
            ? 'Resolve the adopted socket length, either by solving it downstream or by entering the intended manual override'
            : null,
        ]),
        pendingStates: activeTypePendingStates,
      };
    case 'loads':
      return {
        currentState: compactAssistantLines([
          'Joint Loads / Pattern Assignment tab is open',
          `${draft.joints.length} joint${draft.joints.length === 1 ? '' : 's'} are available for load authoring`,
          `${draft.loadPatterns.filter((pattern) => pattern.enabled).length} enabled load pattern${draft.loadPatterns.filter((pattern) => pattern.enabled).length === 1 ? '' : 's'} are currently visible`,
          `${draft.jointLoads.length} authored joint load row${draft.jointLoads.length === 1 ? '' : 's'} are stored`,
        ]),
        missingInputs: compactAssistantLines([
          !hasProjectLoadCases ? 'Project load cases are not configured yet' : null,
          !hasProjectLoadCombinations ? 'Project load combinations are not configured yet' : null,
          draft.joints.length === 0 ? 'No joints are available to receive loads yet' : null,
        ]),
        likelyBlockers: compactAssistantLines([
          !hasProjectLoadCombinations
            ? 'Envelope setup will stay incomplete until project load combinations exist'
            : null,
        ]),
        nextActions: compactAssistantLines([
          draft.joints.length === 0 ? 'Add joints before authoring joint loads' : null,
          !hasProjectLoadCombinations
            ? 'Open the Project load combinations page and add the combinations needed here'
            : null,
          draft.jointLoads.length === 0
            ? 'Populate the joint load rows and pattern assignments visible on this tab'
            : null,
        ]),
        pendingStates: [],
      };
    case 'envelope':
      return {
        currentState: compactAssistantLines([
          'Combinations / Envelope tab is open',
          `${draft.selectedCombinations.length} selected combination${draft.selectedCombinations.length === 1 ? '' : 's'} from ${draft.combinationLibrary.length} available row${draft.combinationLibrary.length === 1 ? '' : 's'}`,
          latestRun
            ? `Latest run status is ${normalizeRunStatusLabel(latestRun)}`
            : 'No envelope run is stored yet',
        ]),
        missingInputs: compactAssistantLines([
          !hasProjectLoadCombinations ? 'Project load combinations are not configured yet' : null,
          draft.selectedCombinations.length === 0
            ? 'No combinations are selected for the envelope run'
            : null,
        ]),
        likelyBlockers: compactAssistantLines([
          draft.selectedCombinations.length === 0
            ? 'Envelope run cannot proceed meaningfully without selected combinations'
            : null,
          latestRun?.status === 'failed' ? 'The last envelope run failed' : null,
        ]),
        nextActions: compactAssistantLines([
          draft.selectedCombinations.length === 0
            ? 'Select the combinations that should be included in the envelope'
            : null,
          latestRun == null ? 'Run the envelope after saving the current state' : null,
          latestRun?.status === 'failed'
            ? 'Review the run errors, fix the inputs, and rerun the envelope'
            : null,
        ]),
        pendingStates: [],
      };
    case 'register':
      return {
        currentState: compactAssistantLines([
          'Pile Register tab is open',
          `${derivePileRegisterRows(draft).length} derived pile${derivePileRegisterRows(draft).length === 1 ? '' : 's'} are currently listed`,
          activeTypeSummary ? `Focus pile type is ${activeTypeSummary.pileTypeId}` : null,
        ]),
        missingInputs: compactAssistantLines([
          derivePileRegisterRows(draft).length === 0 ? 'No derived piles are visible yet' : null,
        ]),
        likelyBlockers: compactAssistantLines([
          derivePileRegisterRows(draft).length === 0
            ? 'Pile Register will stay empty until joints and support counts generate derived piles'
            : null,
        ]),
        nextActions: compactAssistantLines([
          derivePileRegisterRows(draft).length === 0
            ? 'Add or update joints so the pile register can derive pile rows'
            : null,
          derivePileRegisterRows(draft).length > 0
            ? 'Use the register jump actions to inspect the linked GEO or STRUCT context for a specific pile'
            : null,
        ]),
        pendingStates: [],
      };
    case 'geo':
      return {
        currentState: compactAssistantLines([
          'GEO tab is open',
          activeTypeSummary ? `Focus pile type is ${activeTypeSummary.pileTypeId}` : null,
          activeTypeSummary
            ? `Socket mode is ${activeTypeSummary.socketMode} with adopted Ls ${formatAssistantOptionalNumber(activeTypeSummary.adoptedSocketLengthM, 'm')}`
            : null,
        ]),
        missingInputs: activeTypeMissingInputs,
        likelyBlockers: uniqueAssistantLines([
          ...activeTypeLikelyBlockers,
          ...activeTypePendingStates,
        ]),
        nextActions: compactAssistantLines([
          activeTypeMissingInputs.some((line) => line.includes('layer material'))
            ? 'Finish the layer material mapping for the active GEO type'
            : null,
          activeTypeMissingInputs.some((line) => line.includes('Founding / socket material'))
            ? 'Resolve the founding / socket material for the active GEO type'
            : null,
          activeTypeMissingInputs.some((line) => line.includes('socket state'))
            ? 'Resolve the active type socket adoption state before expecting GEO results'
            : null,
          latestRun == null ? 'Run the envelope to populate downstream stored GEO rows' : null,
        ]),
        pendingStates: activeTypePendingStates,
      };
    case 'struct':
      return {
        currentState: compactAssistantLines([
          'STRUCT tab is open',
          activeTypeSummary ? `Focus pile type is ${activeTypeSummary.pileTypeId}` : null,
          `${configuredStructuralLibraries}/4 structural default libraries are configured`,
        ]),
        missingInputs: compactAssistantLines([
          configuredStructuralLibraries === 0
            ? 'Project structural default libraries are not configured yet'
            : configuredStructuralLibraries < 4
              ? 'Project structural default libraries are only partially configured'
              : null,
        ]),
        likelyBlockers: compactAssistantLines([
          configuredStructuralLibraries === 0
            ? 'STRUCT results will stay weak until the project structural defaults are configured'
            : null,
          latestRun == null ? 'No run is stored yet for downstream STRUCT context' : null,
        ]),
        nextActions: compactAssistantLines([
          configuredStructuralLibraries === 0
            ? 'Open the Project structural defaults section and configure the required libraries'
            : configuredStructuralLibraries < 4
              ? 'Fill in the remaining structural default libraries used by this pile type'
              : null,
          latestRun == null ? 'Run the envelope once the project defaults are ready' : null,
        ]),
        pendingStates: [],
      };
    case 'pricing':
      return {
        currentState: compactAssistantLines([
          'Pricing Summary tab is open',
          `${derivePileRegisterRows(draft).length} derived pile${derivePileRegisterRows(draft).length === 1 ? '' : 's'} feed the current pricing summary`,
          latestRun
            ? `Latest run status is ${normalizeRunStatusLabel(latestRun)}`
            : 'No run is stored yet',
        ]),
        missingInputs: compactAssistantLines([
          latestRun == null ? 'No run is available yet for downstream pricing summaries' : null,
        ]),
        likelyBlockers: compactAssistantLines([
          latestRun == null ? 'Pricing outputs remain limited until a run is available' : null,
        ]),
        nextActions: compactAssistantLines([
          latestRun == null ? 'Run the envelope before relying on pricing summary outputs' : null,
        ]),
        pendingStates: [],
      };
    default:
      return {
        currentState: [],
        missingInputs: [],
        likelyBlockers: [],
        nextActions: [],
        pendingStates: [],
      };
  }
}

function summarizeMultiPileAssistantPileType({
  pileType,
  draft,
  projectMaterialById,
  hasProjectGeotechnicalMaterials,
  derivedPileRows,
}: {
  pileType: MultiPileState['pileTypes'][number];
  draft: MultiPileState;
  projectMaterialById: Map<string, unknown>;
  hasProjectGeotechnicalMaterials: boolean;
  derivedPileRows: ReturnType<typeof derivePileRegisterRows>;
}): MultiPileAssistantPileTypeSummary {
  const rawSettings = draft.geoTypeSettings[pileType.id];
  const settings = rawSettings ?? defaultGeoTypeSettings(pileType);
  const diameterMm = firstPositiveNumber(
    settings.linkedDmm,
    pileType.Dmm,
    pileType.nominalDiameterMm,
  );
  const diameterM = diameterMm != null ? diameterMm / 1000 : null;
  const eOopM = firstPositiveNumber(pileType.eoop, pileType.eoopM);
  const layerRows = [
    { height: settings.s1H, materialId: String(settings.s1MaterialId || '').trim() },
    { height: settings.s2H, materialId: String(settings.s2MaterialId || '').trim() },
    { height: settings.s3H, materialId: String(settings.s3MaterialId || '').trim() },
  ];
  const hasAnyLayerAuthoring = layerRows.some((row) => row.height > 0 || row.materialId.length > 0);
  const hasMissingLayerSelection =
    !hasProjectGeotechnicalMaterials ||
    !hasAnyLayerAuthoring ||
    layerRows.some(
      (row) =>
        (row.height > 0 && row.materialId.length === 0) ||
        (row.materialId.length > 0 && !projectMaterialById.has(row.materialId)),
    );
  const missingDiameter =
    diameterM == null || !Number.isFinite(settings.linkedDmm) || settings.linkedDmm <= 0;
  const missingEoop = eOopM == null;
  const missingShaftReductionFactors =
    rawSettings == null ||
    !Number.isFinite(settings.shaftRedComp) ||
    settings.shaftRedComp <= 0 ||
    !Number.isFinite(settings.shaftRedTen) ||
    settings.shaftRedTen <= 0;
  const missingFoundingMaterial =
    String(settings.foundingMaterialId || '').trim().length === 0 ||
    !projectMaterialById.has(String(settings.foundingMaterialId || '').trim());
  const pendingSocketLength = settings.LsMode === 'pending' || settings.LsAdopted <= 0;
  const overrideValueMissing =
    (settings.socketOverrideEnabled && settings.LsManual <= 0) ||
    (settings.useLsMinOverride && settings.LsMinOverride <= 0);
  const missingInputs = compactAssistantLines([
    missingDiameter ? 'D (m) is blank or unresolved' : null,
    missingEoop ? 'e_oop (m) is blank or unresolved' : null,
    missingShaftReductionFactors ? 'Shaft reduction factors are blank or unresolved' : null,
    !hasProjectGeotechnicalMaterials
      ? 'Project geotechnical material assignments are missing'
      : hasMissingLayerSelection
        ? 'Layer material selections are still incomplete'
        : null,
    missingFoundingMaterial ? 'Founding / socket material is still unresolved' : null,
    pendingSocketLength ? 'Solved / adopted socket state is still pending' : null,
    settings.socketOverrideEnabled && settings.LsManual <= 0
      ? 'Socket override is enabled but no adopted socket length is entered'
      : null,
    settings.useLsMinOverride && settings.LsMinOverride <= 0
      ? 'Minimum socket override is enabled but no override length is entered'
      : null,
  ]);

  return {
    pileTypeId: pileType.id,
    displayName: pileType.displayName,
    active: pileType.active !== false,
    linkedJointCount: draft.joints.filter((joint) => joint.pileTypeId === pileType.id).length,
    derivedPileCount: derivedPileRows.filter((row) => row.pileTypeId === pileType.id).length,
    diameterM,
    eOopM,
    baseResistanceEnabled: settings.useBase === 'YES',
    socketMode: settings.LsMode,
    adoptedSocketLengthM: settings.LsAdopted > 0 ? settings.LsAdopted : null,
    missingFlags: {
      missingDiameter,
      missingEoop,
      missingShaftReductionFactors,
      missingProjectGeoMaterials: !hasProjectGeotechnicalMaterials,
      missingLayerMaterialSelections: hasMissingLayerSelection,
      missingFoundingMaterial,
      pendingSocketLength,
      overrideValueMissing,
    },
    missingInputs,
    likelyBlockers: compactAssistantLines([
      missingInputs.length > 0 ? 'This pile type still has unresolved authoring inputs' : null,
      draft.joints.every((joint) => joint.pileTypeId !== pileType.id)
        ? 'No joints are currently linked to this pile type'
        : null,
      derivedPileRows.every((row) => row.pileTypeId !== pileType.id)
        ? 'No derived piles currently reference this pile type'
        : null,
    ]),
    pendingStates: compactAssistantLines([
      pendingSocketLength ? 'Socket length is still pending' : null,
      settings.socketOverrideEnabled && settings.LsManual <= 0
        ? 'Manual socket override is waiting for a value'
        : null,
    ]),
  };
}

function resolveMultiPileAssistantActiveTypeId({
  draft,
  selectedRegisterPile,
  typeSummaries,
}: {
  draft: MultiPileState;
  selectedRegisterPile: MultiPileRegisterSelection | null;
  typeSummaries: MultiPileAssistantPileTypeSummary[];
}) {
  const selectedTypeId = selectedRegisterPile?.pileTypeId ?? null;
  if (selectedTypeId && typeSummaries.some((summary) => summary.pileTypeId === selectedTypeId)) {
    return selectedTypeId;
  }

  return (
    typeSummaries.find((summary) => summary.active && summary.missingInputs.length > 0)
      ?.pileTypeId ??
    typeSummaries.find((summary) => summary.active)?.pileTypeId ??
    draft.pileTypes[0]?.id ??
    null
  );
}

function orderMultiPileTypeSummaries(
  typeSummaries: MultiPileAssistantPileTypeSummary[],
  activePileTypeId: string | null,
) {
  return typeSummaries
    .slice()
    .sort((left, right) => {
      if (left.pileTypeId === activePileTypeId) return -1;
      if (right.pileTypeId === activePileTypeId) return 1;
      if (left.active !== right.active) return left.active ? -1 : 1;
      return left.pileTypeId.localeCompare(right.pileTypeId);
    })
    .slice(0, 6);
}

function collectTypeAssistantLines({
  typeSummaries,
  activePileTypeId,
  field,
}: {
  typeSummaries: MultiPileAssistantPileTypeSummary[];
  activePileTypeId: string | null;
  field: 'missingInputs' | 'likelyBlockers' | 'pendingStates';
}) {
  return uniqueAssistantLines(
    orderMultiPileTypeSummaries(typeSummaries, activePileTypeId)
      .filter((summary) => summary.active || summary.pileTypeId === activePileTypeId)
      .flatMap((summary) => summary[field].map((line) => `${summary.pileTypeId}: ${line}`)),
  );
}

function compactAssistantLines(values: Array<string | null | undefined>) {
  return values.filter((value): value is string => Boolean(value && value.trim()));
}

function uniqueAssistantLines(values: string[]) {
  return Array.from(new Set(values));
}

function firstPositiveNumber(...values: Array<number | null | undefined>) {
  for (const value of values) {
    if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
      return value;
    }
  }

  return null;
}

function formatAssistantOptionalNumber(value: number | null, unit: string) {
  return value != null ? `${value.toFixed(2)} ${unit}` : 'pending';
}
