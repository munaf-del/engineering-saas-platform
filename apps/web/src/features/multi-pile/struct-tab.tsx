'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  hydrateMultiPileStructTypeSettingsWithProjectAssignments,
  normalizeProjectCoverClass,
  normalizeProjectReinforcementGrade,
  resolveProjectConcreteClass,
  resolveProjectTendonGrade,
  type MultiPileEnvelopeRunSummary,
  type MultiPileEnvelopeValue,
  type MultiPileJointEnvelopeSnapshot,
  type MultiPilePileTypeDefinition,
  type MultiPileProjectCoverDurabilityClass,
  type MultiPileProjectConcreteClass,
  type MultiPileProjectReinforcementGrade,
  type MultiPileProjectSpecifics,
  type MultiPileProjectTendonGrade,
  type MultiPileState,
  type MultiPileStructResult,
} from '@eng/shared';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  formatTimestamp,
  getStructTypeSettings,
  jointDisplayLabel,
  pileTypeSelectLabel,
  setStructTypeSettings,
  type MultiPileDraftUpdater,
  type MultiPileStructTypeSettings,
} from './utils';
import { MultiPileElevationSketch, MultiPileSectionSketch } from './struct-visuals';
import { cn } from '@/lib/utils';

interface StructTabProps {
  draft: MultiPileState;
  projectSpecifics: MultiPileProjectSpecifics;
  latestRun: MultiPileEnvelopeRunSummary | null | undefined;
  editProjectStructuralDefaultsHref: string;
  updateDraft: MultiPileDraftUpdater;
  selectedTypeId?: string | null;
}

type GoverningTraceRow = {
  key: 'nMax' | 'nMin' | 'vx' | 'vy' | 'mx' | 'my';
  label: string;
  unit: string;
  jointId: string;
  jointLabel: string;
  value: MultiPileEnvelopeValue | null;
};

type SourceOption = {
  jointId: string;
  pileId: string;
  label: string;
  supportCount: number;
};

type ResolvedTypeStructuralInputs = {
  concreteClass: MultiPileProjectConcreteClass | null;
  reinforcementGrade: MultiPileProjectReinforcementGrade | null;
  tendonGrade: MultiPileProjectTendonGrade | null;
  coverClass: MultiPileProjectCoverDurabilityClass | null;
  concreteClassLabel: string;
  reinforcementGradeLabel: string;
  tendonGradeLabel: string;
  coverClassLabel: string;
  summaryLabel: string;
  fc: number | null;
  Ec: number | null;
  fsy: number | null;
  Es: number | null;
  nominalCoverMm: number | null;
  durabilityNotes: string;
  designLifeYears: number | null;
  exposureClass: string;
  usedLegacyFallback: boolean;
  resolutionMode: 'project-library' | 'migration-fallback' | 'missing';
  inputWarnings: string[];
};

type StructSummaryRow = {
  pileType: MultiPilePileTypeDefinition;
  settings: MultiPileStructTypeSettings;
  resolvedInputs: ResolvedTypeStructuralInputs;
  linkedJointsCount: number;
  sourceLabel: string;
  governingLabel: string;
  concreteLabel: string;
  reinforcementLabel: string;
  coverLabel: string;
  axialUtilisation: number | null;
  momentUtilisation: number | null;
  shearUtilisation: number | null;
  statusKey: 'pass' | 'fail' | 'warning' | 'pending';
  structResultLabel: string;
  structResultVariant: 'outline' | 'success' | 'warning' | 'destructive';
};

const BAR_DIA_OPTIONS = [16, 20, 24, 28, 32, 36, 40] as const;
const TIE_DIA_OPTIONS = [10, 12, 16] as const;
const HEAD_DETAIL_OPTIONS = ['straight', '90out', '90in', '180in', '180out'] as const;
const AXIAL_MODEL_OPTIONS = ['reinforced', 'partial', 'plain'] as const;
const K_METHOD_OPTIONS = ['all', 'cfa', 'drillfluid', 'preformed'] as const;

export function StructTab({
  draft,
  projectSpecifics,
  latestRun,
  editProjectStructuralDefaultsHref,
  updateDraft,
  selectedTypeId,
}: StructTabProps) {
  const [activeTypeId, setActiveTypeId] = useState(draft.pileTypes[0]?.id ?? '');
  const [sourceSelectionByTypeId, setSourceSelectionByTypeId] = useState<Record<string, string>>(
    {},
  );
  const [summaryStatusFilter, setSummaryStatusFilter] = useState<
    'all' | 'pass' | 'fail' | 'warning' | 'pending'
  >('all');
  const [summarySearchText, setSummarySearchText] = useState('');
  const [summaryRowLimit, setSummaryRowLimit] = useState('25');

  useEffect(() => {
    if (!draft.pileTypes.some((pileType) => pileType.id === activeTypeId)) {
      setActiveTypeId(draft.pileTypes[0]?.id ?? '');
    }
  }, [activeTypeId, draft.pileTypes]);

  useEffect(() => {
    if (!selectedTypeId) {
      return;
    }
    if (!draft.pileTypes.some((pileType) => pileType.id === selectedTypeId)) {
      return;
    }
    setActiveTypeId(selectedTypeId);
  }, [draft.pileTypes, selectedTypeId]);

  const activeType = draft.pileTypes.find((pileType) => pileType.id === activeTypeId) ?? null;
  const activeSettings = activeType
    ? hydrateStructTypeSettingsWithProjectAssignments(
        getStructTypeSettings(draft, activeType),
        projectSpecifics,
      )
    : null;
  const linkedJoints = useMemo(
    () => draft.joints.filter((joint) => joint.pileTypeId === activeTypeId && joint.active),
    [activeTypeId, draft.joints],
  );
  const activeEnvelopeRows = useMemo(
    () =>
      (latestRun?.envelope?.jointResults ?? []).filter((row) => row.pileTypeId === activeTypeId),
    [activeTypeId, latestRun],
  );
  const activeStructResult = useMemo(
    () => latestRun?.envelope?.structResults?.[activeTypeId] ?? null,
    [activeTypeId, latestRun],
  );
  const traceRows = useMemo(
    () => buildGoverningTraceRows(activeEnvelopeRows),
    [activeEnvelopeRows],
  );
  const sourceOptions = useMemo(
    () => buildSourceOptions(draft, linkedJoints),
    [draft, linkedJoints],
  );
  const activeSourceJointId =
    (activeTypeId && sourceSelectionByTypeId[activeTypeId]) || sourceOptions[0]?.jointId || '';
  const activeSource = sourceOptions.find((row) => row.jointId === activeSourceJointId) ?? null;
  const sourcePatternRows = useMemo(
    () => buildSourcePatternRows(draft, activeSourceJointId),
    [activeSourceJointId, draft],
  );
  const resolvedInputs = useMemo(
    () => (activeSettings ? resolveTypeStructuralInputs(projectSpecifics, activeSettings) : null),
    [activeSettings, projectSpecifics],
  );
  const governingCombinationNames = collectGoverningCombinationNames(traceRows);
  const designerWarnings = useMemo(
    () =>
      collectStructDesignerWarnings({
        linkedJointCount: linkedJoints.length,
        envelopeRowCount: activeEnvelopeRows.length,
        settings: activeSettings,
        resolvedInputs,
      }),
    [activeEnvelopeRows.length, activeSettings, linkedJoints.length, resolvedInputs],
  );
  const summaryRows = useMemo(
    () =>
      draft.pileTypes.map((pileType) =>
        buildStructSummaryRow({
          draft,
          pileType,
          projectSpecifics,
          latestRun,
        }),
      ),
    [draft, latestRun, projectSpecifics],
  );
  const filteredSummaryRows = summaryRows
    .filter((row) => {
      if (summaryStatusFilter !== 'all' && row.statusKey !== summaryStatusFilter) {
        return false;
      }
      if (!summarySearchText.trim()) {
        return true;
      }

      const search = summarySearchText.trim().toLowerCase();
      return [
        row.pileType.id,
        row.pileType.displayName,
        row.concreteLabel,
        row.reinforcementLabel,
        row.coverLabel,
        row.sourceLabel,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(search);
    })
    .slice(0, Math.max(1, Number(summaryRowLimit) || 25));

  function updateActiveTypeSettings(
    updater: (current: MultiPileStructTypeSettings) => MultiPileStructTypeSettings,
  ) {
    if (!activeType) {
      return;
    }

    updateDraft((current) => {
      const currentSettings = hydrateStructTypeSettingsWithProjectAssignments(
        getStructTypeSettings(current, activeType),
        projectSpecifics,
      );
      return setStructTypeSettings(current, activeType, updater(currentSettings));
    });
  }

  if (!activeType || !activeSettings || !resolvedInputs) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">STRUCTURAL SECTION DESIGNER — BY PILE TYPE</CardTitle>
          <CardDescription>No pile types are available for structural design yet.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const sourcePillLabel = activeSource
    ? activeSource.label
    : 'No linked joint / representative pile';
  const sourceSupportLabel = activeSource
    ? `${activeSource.supportCount} support${activeSource.supportCount === 1 ? '' : 's'}`
    : 'No linked joint';
  const providedPerimeterAs =
    activeSettings.nBars > 0 ? activeSettings.nBars * barAreaFromDia(activeSettings.barDia) : null;
  const providedCentralAs =
    activeSettings.useCentralBar && activeSettings.centralBarCount > 0
      ? activeSettings.centralBarCount * barAreaFromDia(activeSettings.centralBarDia)
      : null;
  const designerStatusVariant =
    designerWarnings.length === 0 && activeEnvelopeRows.length > 0 ? 'success' : 'warning';
  const storedStructStatus = structResultLabel(activeStructResult);
  const storedStructVariant = structResultVariant(activeStructResult);
  const storedPmDemandPoints = activeStructResult
    ? interactionDemandPoints(activeStructResult)
    : [];
  const latestStructSourceLabel = activeStructResult
    ? jointPileResultLabel(
        draft,
        activeStructResult.worstJointId,
        activeStructResult.representativePileId,
        sourcePillLabel,
      )
    : sourcePillLabel;
  const storedStructCurveCount = activeStructResult?.interaction.curve.length ?? 0;
  const storedStructDemandPointCount = storedPmDemandPoints.length;
  const storedStructShearDemandCount = activeStructResult?.shear.demandCases.length ?? 0;
  const activeReinforcementCompliance = activeStructResult?.reinforcementCompliance ?? null;
  const activeAxialUtilisation = activeStructResult?.utilisation.axial ?? null;
  const activeMomentUtilisation = activeStructResult?.utilisation.moment ?? null;
  const activeShearUtilisation = activeStructResult?.utilisation.shear ?? null;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">STRUCT Summary Table</CardTitle>
          <CardDescription>
            Compact all-type schedule for quick review. Selecting a row focuses the type-specific
            designer, charts, and stored result summary below.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <FieldBlock label="STATUS">
              <Select
                value={summaryStatusFilter}
                onValueChange={(value) =>
                  setSummaryStatusFilter(value as typeof summaryStatusFilter)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="pass">Pass only</SelectItem>
                  <SelectItem value="fail">Fail only</SelectItem>
                  <SelectItem value="warning">Warning only</SelectItem>
                  <SelectItem value="pending">Pending only</SelectItem>
                </SelectContent>
              </Select>
            </FieldBlock>

            <FieldBlock label="SEARCH">
              <Input
                value={summarySearchText}
                onChange={(event) => setSummarySearchText(event.target.value)}
                placeholder="Type, concrete, reinforcement"
              />
            </FieldBlock>

            <FieldBlock label="VISIBLE ROWS">
              <Select value={summaryRowLimit} onValueChange={setSummaryRowLimit}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {['10', '25', '50', '100'].map((value) => (
                    <SelectItem key={value} value={value}>
                      {value}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FieldBlock>

            <div className="flex items-end justify-end">
              <Badge variant="outline">
                {filteredSummaryRows.length} visible of {summaryRows.length}
              </Badge>
            </div>
          </div>

          <div className="overflow-x-auto rounded-lg border">
            <Table className="text-xs">
              <TableHeader className="[&_th]:bg-background">
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Concrete</TableHead>
                  <TableHead>Reinforcement</TableHead>
                  <TableHead>Cover</TableHead>
                  <TableHead>Axial util</TableHead>
                  <TableHead>P-M util</TableHead>
                  <TableHead>Shear util</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSummaryRows.map((row) => (
                  <TableRow
                    key={row.pileType.id}
                    className={row.pileType.id === activeTypeId ? 'bg-muted/40' : undefined}
                    onClick={() => setActiveTypeId(row.pileType.id)}
                  >
                    <TableCell className="cursor-pointer py-2 font-medium">
                      {row.pileType.id}
                      <div className="text-xs text-muted-foreground">
                        {row.pileType.displayName || row.pileType.id}
                      </div>
                    </TableCell>
                    <TableCell className="cursor-pointer py-2">{row.concreteLabel}</TableCell>
                    <TableCell className="cursor-pointer py-2">{row.reinforcementLabel}</TableCell>
                    <TableCell className="cursor-pointer py-2">{row.coverLabel}</TableCell>
                    <TableCell className="cursor-pointer py-2">
                      {formatMaybePercent(row.axialUtilisation)}
                    </TableCell>
                    <TableCell className="cursor-pointer py-2">
                      {formatMaybePercent(row.momentUtilisation)}
                    </TableCell>
                    <TableCell className="cursor-pointer py-2">
                      {formatMaybePercent(row.shearUtilisation)}
                    </TableCell>
                    <TableCell className="py-2">
                      <Badge variant={row.structResultVariant}>{row.structResultLabel}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div className="space-y-1">
            <CardTitle className="text-base">STRUCTURAL SECTION DESIGNER — BY PILE TYPE</CardTitle>
            <CardDescription>
              Keep one pile type in focus while reviewing materials, geometry, reinforcement,
              detailing, and checks.
            </CardDescription>
          </div>
          <Link
            href={editProjectStructuralDefaultsHref}
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            Edit Project Structural Defaults
          </Link>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">Active type {activeType.id}</Badge>
            <Badge variant="outline">{formatMaybeNumber(activeType.nominalDiameterMm)} mm</Badge>
            <Badge variant="outline">e_oop {formatMaybeNumber(activeType.eoopM)} m</Badge>
            <Badge variant="outline">{linkedJoints.length} linked joint(s)</Badge>
            <Badge variant="outline">{activeEnvelopeRows.length} stored envelope row(s)</Badge>
            <Badge variant={designerStatusVariant}>
              {designerWarnings.length === 0 && activeEnvelopeRows.length > 0
                ? 'Ready for STRUCT run'
                : 'Input / data warning'}
            </Badge>
            <Badge variant={storedStructVariant}>{storedStructStatus}</Badge>
          </div>

          <div className="grid gap-4 lg:grid-cols-[minmax(260px,340px)_1fr]">
            <FieldBlock label="STRUCTURAL TYPE">
              <Select value={activeTypeId} onValueChange={setActiveTypeId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select pile type" />
                </SelectTrigger>
                <SelectContent>
                  {draft.pileTypes.map((pileType) => (
                    <SelectItem key={pileType.id} value={pileType.id}>
                      {pileTypeSelectLabel(pileType)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FieldBlock>

            <div className="flex flex-wrap items-end gap-2 rounded-lg border bg-muted/10 p-4 text-sm text-muted-foreground">
              <Badge variant="outline">{activeType.displayName}</Badge>
              <Badge variant="outline">Reference joint / pile: {sourcePillLabel}</Badge>
              <Badge variant="outline">{sourceSupportLabel}</Badge>
              <Badge variant="outline">
                {governingCombinationNames || 'Run Envelope to populate governing combinations'}
              </Badge>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <CompactResultStat
              label="Axial util"
              value={formatMaybePercent(activeAxialUtilisation)}
            />
            <CompactResultStat
              label="P-M util"
              value={formatMaybePercent(activeMomentUtilisation)}
            />
            <CompactResultStat
              label="Shear util"
              value={formatMaybePercent(activeShearUtilisation)}
            />
            <CompactResultStat label="Status" value={storedStructStatus} />
            <CompactResultStat
              label="Governing combo"
              value={governingCombinationNames || 'Run Envelope to populate'}
            />
          </div>

          <details className="rounded-lg border bg-muted/10 p-4">
            <summary className="cursor-pointer text-sm font-semibold">
              View designer inputs, source loads, sketches, and detailing
            </summary>
            <div className="mt-4 grid gap-6 2xl:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
              <div className="space-y-6">
                <WorkspaceSection
                  title="TYPE RESULT SUMMARY"
                  description="Active pile type summary from the current stored envelope and STRUCT results."
                >
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    <SummaryLine
                      label="Active pile type"
                      value={activeType.displayName || activeType.id}
                    />
                    <SummaryLine
                      label="Nominal diameter"
                      value={`${formatMaybeNumber(activeType.nominalDiameterMm)} mm`}
                    />
                    <SummaryLine label="e_oop" value={`${formatMaybeNumber(activeType.eoopM)} m`} />
                    <SummaryLine label="Reference joint / pile" value={sourcePillLabel} />
                    <SummaryLine
                      label="Linked joints"
                      value={`${linkedJoints.length} active joint(s)`}
                    />
                    <SummaryLine
                      label="Resolved structural defaults"
                      value={resolvedInputs.summaryLabel}
                    />
                    <SummaryLine label="Stored STRUCT result" value={storedStructStatus} />
                    <SummaryLine
                      label="Governing combinations"
                      value={governingCombinationNames || 'Run Envelope to populate'}
                    />
                    <SummaryLine
                      label="Designer status"
                      value={
                        designerWarnings.length === 0
                          ? 'Designer inputs look complete for a future STRUCT run.'
                          : (designerWarnings[0] ?? 'Input / data warning')
                      }
                    />
                  </div>
                </WorkspaceSection>

                <WorkspaceSection
                  title="SOURCE OF DESIGN ACTIONS"
                  description="Select the linked joint / representative pile whose raw pattern loads you want to inspect."
                >
                  <div className="grid gap-4 lg:grid-cols-[minmax(260px,360px)_1fr]">
                    <FieldBlock label="REFERENCE JOINT / REPRESENTATIVE PILE">
                      <Select
                        value={activeSourceJointId || '__none__'}
                        onValueChange={(value) =>
                          setSourceSelectionByTypeId((current) => ({
                            ...current,
                            [activeType.id]: value === '__none__' ? '' : value,
                          }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="No linked joint / representative pile" />
                        </SelectTrigger>
                        <SelectContent>
                          {sourceOptions.length === 0 ? (
                            <SelectItem value="__none__">
                              No linked joint / representative pile
                            </SelectItem>
                          ) : (
                            sourceOptions.map((option) => (
                              <SelectItem key={option.jointId} value={option.jointId}>
                                {option.label}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    </FieldBlock>

                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                      <SummaryLine label="Reference joint / pile" value={sourcePillLabel} />
                      <SummaryLine label="Support sharing" value={sourceSupportLabel} />
                      <SummaryLine
                        label="Envelope rows for type"
                        value={`${activeEnvelopeRows.length} stored row(s)`}
                      />
                      <SummaryLine
                        label="Stored envelope status"
                        value={
                          latestRun
                            ? `${latestRun.status.toUpperCase()} · ${formatTimestamp(latestRun.createdAt)}`
                            : 'No stored envelope run yet'
                        }
                      />
                    </div>
                  </div>
                </WorkspaceSection>

                <WorkspaceSection
                  title="SOURCE JOINT LOADS BY PATTERN"
                  description="Raw joint loads shown before support distribution."
                >
                  {sourcePatternRows.length === 0 ? (
                    <EmptyHint>
                      No linked joint / representative pile is available for this type yet.
                    </EmptyHint>
                  ) : (
                    <>
                      <div className="rounded-lg border bg-muted/10 p-4 text-sm text-muted-foreground">
                        {activeSource?.supportCount && activeSource.supportCount > 1
                          ? `Stored joint loads are shown before support distribution. This reference joint currently splits load equally across ${activeSource.supportCount} supports.`
                          : 'This reference joint currently resolves to a single representative pile, so no support split note applies.'}
                      </div>
                      <div className="overflow-x-auto rounded-lg border">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Pattern</TableHead>
                              <TableHead>Type</TableHead>
                              <TableHead>P (kN)</TableHead>
                              <TableHead>Vx (kN)</TableHead>
                              <TableHead>Vy (kN)</TableHead>
                              <TableHead>Mx (kNm)</TableHead>
                              <TableHead>My (kNm)</TableHead>
                              <TableHead>Mz (kNm)</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {sourcePatternRows.map((row) => (
                              <TableRow key={row.patternId}>
                                <TableCell className="font-medium">{row.patternId}</TableCell>
                                <TableCell>{row.patternType}</TableCell>
                                <TableCell>{formatMaybeNumber(row.p)}</TableCell>
                                <TableCell>{formatMaybeNumber(row.vx)}</TableCell>
                                <TableCell>{formatMaybeNumber(row.vy)}</TableCell>
                                <TableCell>{formatMaybeNumber(row.mx)}</TableCell>
                                <TableCell>{formatMaybeNumber(row.my)}</TableCell>
                                <TableCell>{formatMaybeNumber(row.mz)}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </>
                  )}
                </WorkspaceSection>

                <WorkspaceSection
                  title="GEOMETRY + MATERIALS"
                  description="Geometry, cover, structural material assignment, and project-owned defaults resolved for the active pile type."
                >
                  <div className="grid gap-4 xl:grid-cols-2">
                    <ReadOnlyInput label="TYPE ID" value={activeType.id} />
                    <ReadOnlyInput
                      label="DISPLAY NAME"
                      value={activeType.displayName || activeType.id}
                    />
                    <ReadOnlyInput
                      label="D (m)"
                      value={formatMaybeNumber(activeType.nominalDiameterMm / 1000)}
                    />
                    <InputField
                      label="TYPE COVER USED IN CHECK (mm)"
                      value={String(activeSettings.cover)}
                      onChange={(value) =>
                        updateActiveTypeSettings((current) => ({
                          ...current,
                          cover: Math.max(0, numericOr(value, current.cover)),
                        }))
                      }
                    />
                    <FieldBlock label="TRANSVERSE RESTRAINT SYSTEM">
                      <Select
                        value={activeSettings.transverseSystem}
                        onValueChange={(value) =>
                          updateActiveTypeSettings((current) => ({
                            ...current,
                            transverseSystem: value === 'spiral' ? 'spiral' : 'ties',
                          }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ties">Ties / links</SelectItem>
                          <SelectItem value="spiral">Spiral / helix</SelectItem>
                        </SelectContent>
                      </Select>
                    </FieldBlock>
                    {activeSettings.transverseSystem === 'ties' ? (
                      <>
                        <FieldBlock label="TIE BAR (CLASS N)">
                          <Select
                            value={String(activeSettings.tieDia)}
                            onValueChange={(value) =>
                              updateActiveTypeSettings((current) => ({
                                ...current,
                                tieDia: numericOr(value, current.tieDia),
                              }))
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {TIE_DIA_OPTIONS.map((option) => (
                                <SelectItem key={option} value={String(option)}>
                                  N{option}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FieldBlock>
                        <InputField
                          label="TIE SPACING s (mm)"
                          value={String(activeSettings.tieS)}
                          onChange={(value) =>
                            updateActiveTypeSettings((current) => ({
                              ...current,
                              tieS: Math.max(50, numericOr(value, current.tieS)),
                            }))
                          }
                        />
                        <InputField
                          label="NO. OF LEGS"
                          value={String(activeSettings.tieLegs)}
                          onChange={(value) =>
                            updateActiveTypeSettings((current) => ({
                              ...current,
                              tieLegs: Math.max(2, Math.round(numericOr(value, current.tieLegs))),
                            }))
                          }
                        />
                      </>
                    ) : (
                      <>
                        <FieldBlock label="SPIRAL BAR (CLASS N)">
                          <Select
                            value={String(activeSettings.spiralDia)}
                            onValueChange={(value) =>
                              updateActiveTypeSettings((current) => ({
                                ...current,
                                spiralDia: numericOr(value, current.spiralDia),
                              }))
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {TIE_DIA_OPTIONS.map((option) => (
                                <SelectItem key={option} value={String(option)}>
                                  N{option}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FieldBlock>
                        <InputField
                          label="SPIRAL PITCH p (mm)"
                          value={String(activeSettings.spiralPitch)}
                          onChange={(value) =>
                            updateActiveTypeSettings((current) => ({
                              ...current,
                              spiralPitch: Math.max(25, numericOr(value, current.spiralPitch)),
                            }))
                          }
                        />
                      </>
                    )}
                    <FieldBlock label="CONCRETE PLACEMENT FACTOR k">
                      <Select
                        value={activeSettings.kPlace}
                        onValueChange={(value) =>
                          updateActiveTypeSettings((current) => ({
                            ...current,
                            kPlace: value === '0.75' ? '0.75' : '1.0',
                          }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1.0">k = 1.0</SelectItem>
                          <SelectItem value="0.75">k = 0.75</SelectItem>
                        </SelectContent>
                      </Select>
                    </FieldBlock>
                    <FieldBlock label="PILE CONSTRUCTION METHOD">
                      <Select
                        value={activeSettings.kMethod}
                        onValueChange={(value) =>
                          updateActiveTypeSettings((current) => ({
                            ...current,
                            kMethod: K_METHOD_OPTIONS.includes(
                              value as (typeof K_METHOD_OPTIONS)[number],
                            )
                              ? (value as MultiPileStructTypeSettings['kMethod'])
                              : 'all',
                          }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All</SelectItem>
                          <SelectItem value="cfa">CFA / displacement</SelectItem>
                          <SelectItem value="drillfluid">Bored under drilling fluid</SelectItem>
                          <SelectItem value="preformed">Preformed driven</SelectItem>
                        </SelectContent>
                      </Select>
                    </FieldBlock>
                    <FieldBlock label="AXIAL CAPACITY MODEL">
                      <Select
                        value={activeSettings.axModel}
                        onValueChange={(value) =>
                          updateActiveTypeSettings((current) => ({
                            ...current,
                            axModel: AXIAL_MODEL_OPTIONS.includes(
                              value as (typeof AXIAL_MODEL_OPTIONS)[number],
                            )
                              ? (value as MultiPileStructTypeSettings['axModel'])
                              : 'reinforced',
                          }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="reinforced">
                            REINFORCED — cage continues to bottom
                          </SelectItem>
                          <SelectItem value="partial">
                            PARTIALLY REINFORCED — cage curtailed at depth
                          </SelectItem>
                          <SelectItem value="plain">
                            UNREINFORCED — concrete-only perimeter
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </FieldBlock>
                    <FieldBlock label="PROJECT CONCRETE CLASS">
                      <Select
                        value={activeSettings.concreteClassId || '__none__'}
                        onValueChange={(value) =>
                          updateActiveTypeSettings((current) => ({
                            ...current,
                            concreteClassId: value === '__none__' ? '' : value,
                          }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select concrete class" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">Select concrete class</SelectItem>
                          {projectSpecifics.structuralDefaults.concreteClasses.map((row) => {
                            const resolved = resolveProjectConcreteClass(row).row;
                            return (
                              <SelectItem key={resolved.id} value={resolved.id}>
                                {projectConcreteLabel(resolved)}
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                    </FieldBlock>
                    <FieldBlock label="PROJECT REINFORCEMENT GRADE">
                      <Select
                        value={activeSettings.reinforcementGradeId || '__none__'}
                        onValueChange={(value) =>
                          updateActiveTypeSettings((current) => ({
                            ...current,
                            reinforcementGradeId: value === '__none__' ? '' : value,
                          }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select reinforcement grade" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">Select reinforcement grade</SelectItem>
                          {projectSpecifics.structuralDefaults.reinforcementGrades.map((row) => {
                            const resolved = normalizeProjectReinforcementGrade(row);
                            return (
                              <SelectItem key={resolved.id} value={resolved.id}>
                                {projectReinforcementLabel(resolved)}
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                    </FieldBlock>
                    <FieldBlock label="PROJECT TENDON GRADE">
                      <Select
                        value={activeSettings.tendonGradeId || '__none__'}
                        onValueChange={(value) =>
                          updateActiveTypeSettings((current) => ({
                            ...current,
                            tendonGradeId: value === '__none__' ? '' : value,
                          }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="None / reference only" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">None / reference only</SelectItem>
                          {projectSpecifics.structuralDefaults.tendonGrades.map((row) => {
                            const resolved = resolveProjectTendonGrade(row).row;
                            return (
                              <SelectItem key={resolved.id} value={resolved.id}>
                                {projectTendonLabel(resolved)}
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                    </FieldBlock>
                    <FieldBlock label="PROJECT COVER / DURABILITY CLASS">
                      <Select
                        value={activeSettings.coverDurabilityClassId || '__none__'}
                        onValueChange={(value) =>
                          updateActiveTypeSettings((current) => ({
                            ...current,
                            coverDurabilityClassId: value === '__none__' ? '' : value,
                          }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select cover / durability class" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">Select cover / durability class</SelectItem>
                          {projectSpecifics.structuralDefaults.coverDurabilityClasses.map((row) => {
                            const resolved = normalizeProjectCoverClass(row);
                            return (
                              <SelectItem key={resolved.id} value={resolved.id}>
                                {projectCoverLabel(resolved)}
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                    </FieldBlock>
                    <ReadOnlyInput
                      label="Resolved structural defaults"
                      value={resolvedInputs.summaryLabel}
                    />
                    <ReadOnlyInput
                      label="Resolved f'c"
                      value={formatMaybeValue(resolvedInputs.fc, 'MPa')}
                    />
                    <ReadOnlyInput
                      label="Resolved Ec"
                      value={formatMaybeValue(resolvedInputs.Ec, 'MPa')}
                    />
                    <ReadOnlyInput
                      label="Resolved fsy"
                      value={formatMaybeValue(resolvedInputs.fsy, 'MPa')}
                    />
                    <ReadOnlyInput
                      label="Resolved Es"
                      value={formatMaybeValue(resolvedInputs.Es, 'MPa')}
                    />
                    <ReadOnlyInput
                      label="Nominal cover (class)"
                      value={formatMaybeValue(resolvedInputs.nominalCoverMm, 'mm')}
                    />
                    <ReadOnlyInput
                      label="Design life / exposure"
                      value={
                        [
                          resolvedInputs.designLifeYears != null
                            ? `${formatMaybeNumber(resolvedInputs.designLifeYears)} years`
                            : '',
                          resolvedInputs.exposureClass,
                        ]
                          .filter(Boolean)
                          .join(' | ') || '—'
                      }
                    />
                    <ReadOnlyInput
                      label="Durability note"
                      value={resolvedInputs.durabilityNotes || '—'}
                    />
                  </div>
                  {resolvedInputs.inputWarnings.length > 0 ? (
                    <StatusCallout variant="warning">
                      <b>Input warning:</b> {resolvedInputs.inputWarnings.join(' ')}
                    </StatusCallout>
                  ) : null}
                </WorkspaceSection>

                <WorkspaceSection
                  title="LONGITUDINAL REINFORCEMENT"
                  description="Perimeter cage inputs, AS 2159 reinforcement rule selections, and read-only tags consumed by this pile type."
                >
                  <div className="grid gap-4 xl:grid-cols-2">
                    <FieldBlock label="MIN LONGITUDINAL REO RULE">
                      <Select
                        value={activeSettings.minReoRule}
                        onValueChange={(value) =>
                          updateActiveTypeSettings((current) => ({
                            ...current,
                            minReoRule:
                              value === 'other_above' ||
                              value === 'precast' ||
                              value === 'other_embedded'
                                ? value
                                : 'other_embedded',
                          }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="other_embedded">
                            OTHER PILES — FULLY EMBEDDED
                          </SelectItem>
                          <SelectItem value="other_above">
                            OTHER PILES — PORTION ABOVE GROUND
                          </SelectItem>
                          <SelectItem value="precast">PRECAST RC PILES</SelectItem>
                        </SelectContent>
                      </Select>
                    </FieldBlock>
                    <FieldBlock label="SECTION LOCATION (As,min)">
                      <Select
                        value={activeSettings.reoLoc}
                        onValueChange={(value) =>
                          updateActiveTypeSettings((current) => ({
                            ...current,
                            reoLoc: value === 'within3d' ? 'within3d' : 'below3d',
                          }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="below3d">Below 3D</SelectItem>
                          <SelectItem value="within3d">Within 3D</SelectItem>
                        </SelectContent>
                      </Select>
                    </FieldBlock>
                    <FieldBlock label="SECTION LOCATION DETAIL">
                      <Select
                        value={activeSettings.reoLocDetail}
                        onValueChange={(value) =>
                          updateActiveTypeSettings((current) => ({
                            ...current,
                            reoLocDetail:
                              value === 'above' || value === 'within3d' || value === 'below3d'
                                ? value
                                : 'below3d',
                          }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="above">AT / ABOVE GROUND</SelectItem>
                          <SelectItem value="within3d">WITHIN 3D</SelectItem>
                          <SelectItem value="below3d">BELOW 3D</SelectItem>
                        </SelectContent>
                      </Select>
                    </FieldBlock>
                    <FieldBlock label="BAR SIZE (CLASS N)">
                      <Select
                        value={String(activeSettings.barDia)}
                        onValueChange={(value) =>
                          updateActiveTypeSettings((current) => ({
                            ...current,
                            barDia: numericOr(value, current.barDia),
                          }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {BAR_DIA_OPTIONS.map((option) => (
                            <SelectItem key={option} value={String(option)}>
                              N{option}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FieldBlock>
                    <InputField
                      label="NUMBER OF BARS"
                      value={String(activeSettings.nBars)}
                      onChange={(value) =>
                        updateActiveTypeSettings((current) => ({
                          ...current,
                          nBars: Math.max(0, Math.round(numericOr(value, current.nBars))),
                        }))
                      }
                    />
                    <ReadOnlyInput
                      label="PROVIDED As,perim"
                      value={
                        providedPerimeterAs != null
                          ? `${formatMaybeNumber(providedPerimeterAs)} mm²`
                          : 'AUTO'
                      }
                    />
                    <ReadOnlyInput
                      label="PERIMETER BAR TAG"
                      value={perimeterBarTag(activeSettings)}
                    />
                    <ReadOnlyInput label="CENTRAL BAR TAG" value={centralBarTag(activeSettings)} />
                    <ReadOnlyInput label="TRANSVERSE TAG" value={transverseTag(activeSettings)} />
                    <CheckboxField
                      label="As,max OVERRIDE"
                      description="Allow As > 0.04Ag"
                      checked={activeSettings.allowAsOver}
                      onCheckedChange={(checked) =>
                        updateActiveTypeSettings((current) => ({
                          ...current,
                          allowAsOver: checked,
                        }))
                      }
                    />
                    <CheckboxField
                      label="OVERRIDE ϕ VALUES"
                      description="Advanced"
                      checked={activeSettings.phiOverride}
                      onCheckedChange={(checked) =>
                        updateActiveTypeSettings((current) => ({
                          ...current,
                          phiOverride: checked,
                        }))
                      }
                    />
                    <InputField
                      label="ϕc"
                      value={String(activeSettings.phiC)}
                      disabled={!activeSettings.phiOverride}
                      onChange={(value) =>
                        updateActiveTypeSettings((current) => ({
                          ...current,
                          phiC: clamp(numericOr(value, current.phiC), 0.4, 1.0),
                        }))
                      }
                    />
                    <InputField
                      label="ϕt"
                      value={String(activeSettings.phiT)}
                      disabled={!activeSettings.phiOverride}
                      onChange={(value) =>
                        updateActiveTypeSettings((current) => ({
                          ...current,
                          phiT: clamp(numericOr(value, current.phiT), 0.4, 1.0),
                        }))
                      }
                    />
                  </div>
                </WorkspaceSection>

                <WorkspaceSection
                  title="CENTRAL BAR (OPTIONAL — AXIAL/TENSION CONTRIBUTION)"
                  description="Optional central bar group for deep piles where the perimeter cage does not remain solver-active for the full pile length."
                >
                  <div className="grid gap-4 xl:grid-cols-2">
                    <CheckboxField
                      label="USE CENTRAL BAR(S)"
                      description="Enable central bar group"
                      checked={activeSettings.useCentralBar}
                      onCheckedChange={(checked) =>
                        updateActiveTypeSettings((current) => ({
                          ...current,
                          useCentralBar: checked,
                        }))
                      }
                    />
                    <FieldBlock label="CENTRAL BAR SIZE (CLASS N)">
                      <Select
                        value={String(activeSettings.centralBarDia)}
                        onValueChange={(value) =>
                          updateActiveTypeSettings((current) => ({
                            ...current,
                            centralBarDia: numericOr(value, current.centralBarDia),
                          }))
                        }
                        disabled={!activeSettings.useCentralBar}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {BAR_DIA_OPTIONS.map((option) => (
                            <SelectItem key={option} value={String(option)}>
                              N{option}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FieldBlock>
                    <InputField
                      label="NUMBER OF CENTRAL BARS"
                      value={String(activeSettings.centralBarCount)}
                      disabled={!activeSettings.useCentralBar}
                      onChange={(value) =>
                        updateActiveTypeSettings((current) => ({
                          ...current,
                          centralBarCount: Math.max(
                            0,
                            Math.round(numericOr(value, current.centralBarCount)),
                          ),
                        }))
                      }
                    />
                    <ReadOnlyInput
                      label="CENTRAL BAR As"
                      value={
                        providedCentralAs != null
                          ? `${formatMaybeNumber(providedCentralAs)} mm²`
                          : '—'
                      }
                    />
                    <CheckboxField
                      label="CENTRAL BAR FULLY DEVELOPED AT PILE HEAD FOR TENSION"
                      description="Central bar has adequate development length at pile head"
                      checked={activeSettings.centralBarDevelopedAtHead}
                      disabled={!activeSettings.useCentralBar}
                      onCheckedChange={(checked) =>
                        updateActiveTypeSettings((current) => ({
                          ...current,
                          centralBarDevelopedAtHead: checked,
                        }))
                      }
                    />
                  </div>
                </WorkspaceSection>

                <WorkspaceSection
                  title="PILE HEAD BAR DETAIL & PROJECTION (DETAILING / SKETCH)"
                  description="Head-detail shape and reinforcement projection above pile head for perimeter and central bars. These settings belong to the pile type and control the section-designer presentation."
                >
                  <div className="grid gap-4 xl:grid-cols-2">
                    <FieldBlock label="PERIMETER BAR HEAD DETAIL">
                      <Select
                        value={activeSettings.perimHeadDetail}
                        onValueChange={(value) =>
                          updateActiveTypeSettings((current) => ({
                            ...current,
                            perimHeadDetail: headDetailValue(value, current.perimHeadDetail),
                          }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {HEAD_DETAIL_OPTIONS.map((option) => (
                            <SelectItem key={option} value={option}>
                              {headDetailLabel(option)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FieldBlock>
                    <FieldBlock label="CENTRAL BAR HEAD DETAIL">
                      <Select
                        value={activeSettings.centralHeadDetail}
                        onValueChange={(value) =>
                          updateActiveTypeSettings((current) => ({
                            ...current,
                            centralHeadDetail: headDetailValue(value, current.centralHeadDetail),
                          }))
                        }
                        disabled={!activeSettings.useCentralBar}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {HEAD_DETAIL_OPTIONS.map((option) => (
                            <SelectItem key={option} value={option}>
                              {headDetailLabel(option)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FieldBlock>
                    <InputField
                      label="PERIMETER REINFORCEMENT PROJECTION ABOVE PILE HEAD (m)"
                      value={String(activeSettings.perimProjectionAboveHead)}
                      disabled={activeSettings.axModel === 'plain'}
                      onChange={(value) =>
                        updateActiveTypeSettings((current) => ({
                          ...current,
                          perimProjectionAboveHead: Math.max(
                            0,
                            numericOr(value, current.perimProjectionAboveHead),
                          ),
                        }))
                      }
                    />
                    <InputField
                      label="CENTRAL BAR PROJECTION ABOVE PILE HEAD (m)"
                      value={String(activeSettings.centralProjectionAboveHead)}
                      disabled={!activeSettings.useCentralBar}
                      onChange={(value) =>
                        updateActiveTypeSettings((current) => ({
                          ...current,
                          centralProjectionAboveHead: Math.max(
                            0,
                            numericOr(value, current.centralProjectionAboveHead),
                          ),
                        }))
                      }
                    />
                    <InputField
                      label="STEEL MODULUS Es (MPa)"
                      value={String(activeSettings.Es)}
                      onChange={(value) =>
                        updateActiveTypeSettings((current) => ({
                          ...current,
                          Es: Math.max(100000, numericOr(value, current.Es)),
                        }))
                      }
                    />
                    <FieldBlock label="USE BIAXIAL CHECK">
                      <Select
                        value={activeSettings.useBiax}
                        onValueChange={(value) =>
                          updateActiveTypeSettings((current) => ({
                            ...current,
                            useBiax: value === 'NO' ? 'NO' : 'YES',
                          }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="YES">YES</SelectItem>
                          <SelectItem value="NO">NO</SelectItem>
                        </SelectContent>
                      </Select>
                    </FieldBlock>
                    <FieldBlock label="BRACED / UNBRACED">
                      <Select
                        value={activeSettings.brace}
                        onValueChange={(value) =>
                          updateActiveTypeSettings((current) => ({
                            ...current,
                            brace: value === 'UNBRACED' ? 'UNBRACED' : 'BRACED',
                          }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="BRACED">BRACED</SelectItem>
                          <SelectItem value="UNBRACED">UNBRACED</SelectItem>
                        </SelectContent>
                      </Select>
                    </FieldBlock>
                    <InputField
                      label="EFFECTIVE LENGTH Le (m)"
                      value={activeSettings.Le}
                      onChange={(value) =>
                        updateActiveTypeSettings((current) => ({
                          ...current,
                          Le: value,
                        }))
                      }
                    />
                    <InputField
                      label="MAX AGGREGATE SIZE dg (mm)"
                      value={String(activeSettings.dg)}
                      onChange={(value) =>
                        updateActiveTypeSettings((current) => ({
                          ...current,
                          dg: Math.max(10, numericOr(value, current.dg)),
                        }))
                      }
                    />
                    <InputField
                      label="PERIMETER CAGE CUT-OFF DEPTH BELOW PILE HEAD (m)"
                      value={String(activeSettings.reoCutDepth)}
                      disabled={activeSettings.axModel !== 'partial'}
                      onChange={(value) =>
                        updateActiveTypeSettings((current) => ({
                          ...current,
                          reoCutDepth: Math.max(0, numericOr(value, current.reoCutDepth)),
                        }))
                      }
                    />
                    <InputField
                      label="DEVELOPMENT LENGTH Ld BELOW CUT-OFF (m)"
                      value={String(activeSettings.reoLd)}
                      disabled={activeSettings.axModel !== 'partial'}
                      onChange={(value) =>
                        updateActiveTypeSettings((current) => ({
                          ...current,
                          reoLd: Math.max(0, numericOr(value, current.reoLd)),
                        }))
                      }
                    />
                  </div>
                </WorkspaceSection>
              </div>

              <div className="space-y-6">
                <WorkspaceSection
                  title="GRAPHICAL SECTION VIEW"
                  description="Live section view from cover, bar size, bar count, central bars, and transverse system. Not to scale."
                >
                  <div className="space-y-3">
                    <MultiPileSectionSketch type={activeType} settings={activeSettings} />
                    <div className="grid gap-3 sm:grid-cols-2">
                      <SummaryLine label="Perimeter bars" value={perimeterBarTag(activeSettings)} />
                      <SummaryLine label="Central bars" value={centralBarTag(activeSettings)} />
                    </div>
                  </div>
                </WorkspaceSection>

                <WorkspaceSection
                  title="REINFORCEMENT ELEVATION (SCHEMATIC)"
                  description="Pile reinforcement arrangement in longitudinal view. Not to scale."
                >
                  <MultiPileElevationSketch type={activeType} settings={activeSettings} />
                  <div className="mt-4 space-y-2 rounded-lg border bg-muted/10 p-4 text-sm text-muted-foreground">
                    <div>
                      Perimeter cage: <b>{perimeterBarTag(activeSettings)}</b>
                    </div>
                    <div>
                      Perimeter projection above head:{' '}
                      <b>{projectionLabel(activeSettings.perimProjectionAboveHead)}</b>
                    </div>
                    <div>
                      Perimeter head detail:{' '}
                      <b>{headDetailLabel(activeSettings.perimHeadDetail)}</b>
                    </div>
                    <div>
                      Central bars: <b>{centralBarTag(activeSettings)}</b>
                    </div>
                    <div>
                      Central projection above head:{' '}
                      <b>{projectionLabel(activeSettings.centralProjectionAboveHead)}</b>
                    </div>
                    <div>
                      Central head detail:{' '}
                      <b>{headDetailLabel(activeSettings.centralHeadDetail)}</b>
                    </div>
                    <div>
                      Transverse: <b>{transverseTag(activeSettings)}</b>
                    </div>
                    <div>
                      Axial model: <b>{axialModelLabel(activeSettings.axModel)}</b>
                    </div>
                  </div>
                </WorkspaceSection>

                <WorkspaceSection
                  title="DESIGNER STATUS / COMPLIANCE"
                  description="Per pile type input readiness and stored STRUCT status."
                >
                  <div className="space-y-4">
                    <div className="flex flex-wrap gap-2">
                      <Badge variant={designerStatusVariant}>
                        {designerWarnings.length === 0 && activeEnvelopeRows.length > 0
                          ? 'Designer inputs ready'
                          : 'Designer warning'}
                      </Badge>
                      <Badge variant={storedStructVariant}>{storedStructStatus}</Badge>
                      <Badge variant="outline">
                        {governingCombinationNames || 'No governing combination stored yet'}
                      </Badge>
                    </div>
                    {designerWarnings.length > 0 ? (
                      <StatusCallout variant="warning">
                        <b>Warning:</b> {designerWarnings.join(' ')}
                      </StatusCallout>
                    ) : (
                      <StatusCallout variant="success">
                        Type-owned geometry, defaults selection, and reinforcement inputs are
                        present for this pile type. Run Envelope / STRUCT once the stored STRUCT
                        result path is exposed to populate pass / fail and capacity checks.
                      </StatusCallout>
                    )}
                    <div className="grid gap-4">
                      <SummaryLine label="Resolved defaults" value={resolvedInputs.summaryLabel} />
                      <SummaryLine
                        label="Type cover used in check"
                        value={`${formatMaybeNumber(activeSettings.cover)} mm`}
                      />
                      <SummaryLine
                        label="Perimeter reinforcement"
                        value={perimeterBarTag(activeSettings)}
                      />
                      <SummaryLine
                        label="Central reinforcement"
                        value={centralBarTag(activeSettings)}
                      />
                      <SummaryLine
                        label="Transverse system"
                        value={transverseTag(activeSettings)}
                      />
                      <SummaryLine label="Reference joint / pile" value={sourcePillLabel} />
                    </div>
                  </div>
                </WorkspaceSection>
              </div>
            </div>
          </details>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">STRUCTURAL DESIGN VERIFICATION — BY PILE TYPE</CardTitle>
          <CardDescription>
            Resolved material basis, demand provenance, P–M / shear verification, and summary
            outcomes for the active pile type.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">Type {activeType.id}</Badge>
            <Badge variant="outline">Reference {sourcePillLabel}</Badge>
            <Badge variant="outline">Cover {formatMaybeNumber(activeSettings.cover)} mm</Badge>
            <Badge variant="outline">{axialModelLabel(activeSettings.axModel)}</Badge>
            <Badge variant={storedStructVariant}>{storedStructStatus}</Badge>
          </div>

          {resolvedInputs.inputWarnings.length > 0 ? (
            <StatusCallout variant="warning">
              <b>Input warning:</b> {resolvedInputs.inputWarnings.join(' ')}
            </StatusCallout>
          ) : null}

          <details className="rounded-lg border bg-muted/10 p-4">
            <summary className="cursor-pointer text-sm font-semibold">
              View resolved verification inputs
            </summary>
            <div className="mt-4">
              <WorkspaceSection
                title="STRUCTURAL VERIFICATION INPUTS"
                description="Resolved project default rows and the type-owned settings consumed by this pile type."
              >
                <div className="grid gap-4 xl:grid-cols-2">
                  <ReadOnlyInput
                    label="Resolved structural defaults"
                    value={resolvedInputs.summaryLabel}
                  />
                  <ReadOnlyInput
                    label="Concrete class"
                    value={resolvedInputs.concreteClassLabel || '—'}
                  />
                  <ReadOnlyInput
                    label="Reinforcement grade"
                    value={resolvedInputs.reinforcementGradeLabel || '—'}
                  />
                  <ReadOnlyInput
                    label="Tendon grade"
                    value={resolvedInputs.tendonGradeLabel || '—'}
                  />
                  <ReadOnlyInput
                    label="Cover / durability class"
                    value={resolvedInputs.coverClassLabel || '—'}
                  />
                  <ReadOnlyInput
                    label="Resolved f'c"
                    value={formatMaybeValue(resolvedInputs.fc, 'MPa')}
                  />
                  <ReadOnlyInput
                    label="Resolved Ec"
                    value={formatMaybeValue(resolvedInputs.Ec, 'MPa')}
                  />
                  <ReadOnlyInput
                    label="Resolved fsy"
                    value={formatMaybeValue(resolvedInputs.fsy, 'MPa')}
                  />
                  <ReadOnlyInput
                    label="Resolved Es"
                    value={formatMaybeValue(resolvedInputs.Es, 'MPa')}
                  />
                  <ReadOnlyInput
                    label="Nominal cover (class)"
                    value={formatMaybeValue(resolvedInputs.nominalCoverMm, 'mm')}
                  />
                </div>
              </WorkspaceSection>
            </div>
          </details>

          <WorkspaceSection
            title="STRUCT RESULT SUMMARY"
            description="The active pile type reads back the stored Multi-Pile STRUCT output as a summary-first result view: latest joint / pile, capacities, utilisations, and status chips."
          >
            {!activeStructResult ? (
              <StatusCallout variant="warning">
                Latest STRUCT result: <b>PENDING</b>. Run Envelope / STRUCT to populate capacities,
                utilisation checks and the type P–M diagram.
              </StatusCallout>
            ) : (
              <div className="space-y-4">
                <PillStrip>
                  <InfoPill>LATEST JOINT/PILE {latestStructSourceLabel}</InfoPill>
                  <InfoPill>
                    ϕNu,comp = {formatMaybeValue(activeStructResult.axial.N_capacity, 'kN')}
                  </InfoPill>
                  <InfoPill>
                    ϕNu,ten = {formatMaybeValue(activeStructResult.axial.N_tension_capacity, 'kN')}
                  </InfoPill>
                  <InfoPill>
                    CAPACITY ϕVu = {formatMaybeValue(activeStructResult.shear.Vu_capacity, 'kN')}
                  </InfoPill>
                  <InfoPill>
                    CAPACITY ϕMux = {formatMaybeValue(activeStructResult.moment.Mx_capacity, 'kNm')}
                  </InfoPill>
                  <InfoPill>
                    CAPACITY ϕMuy = {formatMaybeValue(activeStructResult.moment.My_capacity, 'kNm')}
                  </InfoPill>
                  <InfoPill>
                    Comp util ={' '}
                    {formatMaybePercent(activeStructResult.axial.compressionUtilisation)}
                  </InfoPill>
                  <InfoPill>
                    Uplift util = {formatMaybePercent(activeStructResult.axial.tensionUtilisation)}
                  </InfoPill>
                </PillStrip>

                <PillStrip>
                  <InfoPill tone={activeStructResult.checks.axial ? 'success' : 'danger'}>
                    {activeStructResult.checks.axial ? 'AXIAL OK' : 'AXIAL FAIL'}
                  </InfoPill>
                  <InfoPill tone={activeStructResult.checks.shear ? 'success' : 'danger'}>
                    {activeStructResult.checks.shear ? 'SHEAR OK' : 'SHEAR FAIL'}
                  </InfoPill>
                  <InfoPill tone={activeStructResult.checks.moment ? 'success' : 'danger'}>
                    {activeStructResult.checks.moment ? 'P-M OK' : 'P-M FAIL'}
                  </InfoPill>
                  <InfoPill
                    tone={
                      activeStructResult.status === 'warning'
                        ? 'warning'
                        : activeStructResult.checks.struct
                          ? 'success'
                          : 'danger'
                    }
                  >
                    {activeStructResult.status === 'warning'
                      ? 'WARNING'
                      : activeStructResult.checks.struct
                        ? 'PASS'
                        : 'FAIL'}
                  </InfoPill>
                  <InfoPill>Interaction curve {storedStructCurveCount} point(s)</InfoPill>
                  <InfoPill>Stored demand points {storedStructDemandPointCount}</InfoPill>
                  <InfoPill>Shear demand cases {storedStructShearDemandCount}</InfoPill>
                  <InfoPill>Updated {formatTimestamp(activeStructResult.updatedAt)}</InfoPill>
                </PillStrip>

                <p className="text-sm text-muted-foreground">
                  Demand snapshot: N*max ={' '}
                  {formatMaybeValue(activeStructResult.axial.N_demand, 'kN')}, |N*min| ={' '}
                  {formatMaybeValue(activeStructResult.axial.N_tension_demand, 'kN')}, V* ={' '}
                  {formatMaybeValue(activeStructResult.shear.Vu_demand, 'kN')}, Mx,DES ={' '}
                  {formatMaybeValue(activeStructResult.moment.Mx_demand, 'kNm')}, My,DES ={' '}
                  {formatMaybeValue(activeStructResult.moment.My_demand, 'kNm')}.
                </p>

                {activeStructResult.inputWarnings.length > 0 ? (
                  <StatusCallout variant="warning">
                    <b>Input warning:</b> {activeStructResult.inputWarnings.join(' ')}
                  </StatusCallout>
                ) : null}
              </div>
            )}
          </WorkspaceSection>

          <div className="grid gap-4 xl:grid-cols-2">
            <VisualizationCard
              title={`P–M INTERACTION VIEW — TYPE ${activeType.id}`}
              description={
                <>
                  One type-owned P–M view. Axes are φM (kNm) and φN (kN), with +N compression and −N
                  uplift. The card checks below use <b>{latestStructSourceLabel}</b>; this chart
                  overlays all stored linked-joint demand points.
                </>
              }
            >
              <PmInteractionChart result={activeStructResult} pileTypeId={activeType.id} />
            </VisualizationCard>

            <VisualizationCard
              title={`SHEAR CAPACITY / DEMAND VIEW — TYPE ${activeType.id}`}
              description={
                <>
                  One type-owned shear view. The card checks below use{' '}
                  <b>{latestStructSourceLabel}</b>; this chart overlays V* for each stored linked
                  joint / pile against φVu and φVu,max on the same kN scale.
                </>
              }
            >
              <ShearDemandChart result={activeStructResult} pileTypeId={activeType.id} />

              <div className="mt-4 space-y-3 border-t pt-4">
                <div className="text-sm font-semibold tracking-wide text-foreground">
                  AS 3600 SECTION 8.2 — SHEAR CHECK
                </div>
                {!activeStructResult ? (
                  <p className="text-sm text-muted-foreground">Run Envelope / STRUCT to populate</p>
                ) : (
                  <>
                    <PillStrip>
                      <InfoPill>
                        DEMAND V* = {formatMaybeValue(activeStructResult.shear.Vu_demand, 'kN')}
                      </InfoPill>
                      <InfoPill tone={activeStructResult.shear.okMinAsv ? 'success' : 'danger'}>
                        {activeStructResult.shear.okMinAsv
                          ? 'Min shear steel OK'
                          : 'Min shear steel NOT OK'}
                      </InfoPill>
                      <InfoPill>
                        Vuc = {formatMaybeValue(activeStructResult.shear.Vuc, 'kN')}
                      </InfoPill>
                      <InfoPill>
                        Vus = {formatMaybeValue(activeStructResult.shear.Vus, 'kN')}
                      </InfoPill>
                      <InfoPill>
                        Vu = {formatMaybeValue(activeStructResult.shear.Vu, 'kN')}
                      </InfoPill>
                      <InfoPill>
                        CAPACITY ϕVu ={' '}
                        {formatMaybeValue(activeStructResult.shear.Vu_capacity, 'kN')}
                      </InfoPill>
                      <InfoPill>
                        CAPACITY ϕVu,max ={' '}
                        {formatMaybeValue(activeStructResult.shear.Vu_max_capacity, 'kN')}
                      </InfoPill>
                      <InfoPill>
                        Shear util = {formatMaybePercent(activeStructResult.shear.utilisation)}
                      </InfoPill>
                      <InfoPill>
                        Web util = {formatMaybePercent(activeStructResult.shear.webUtilisation)}
                      </InfoPill>
                      <InfoPill tone={activeStructResult.shear.pass ? 'success' : 'danger'}>
                        {activeStructResult.shear.pass ? 'PASS' : 'FAIL'}
                      </InfoPill>
                    </PillStrip>

                    <div className="space-y-1 text-sm text-muted-foreground">
                      <p>
                        {activeStructResult.shear.shearReoRequired
                          ? `Clause 8.2.1.6: Shear reinforcement REQUIRED (V* > k_s ϕV_uc). Minimum shear steel is ${activeStructResult.shear.okMinAsv ? 'OK' : 'NOT OK'}.`
                          : `Clause 8.2.1.6: Minimum shear steel is ${activeStructResult.shear.okMinAsv ? 'OK' : 'NOT OK'} for the stored section.`}
                      </p>
                      <p>
                        Strength check: ϕVu ={' '}
                        {formatMaybeValue(activeStructResult.shear.Vu_capacity, 'kN')}{' '}
                        {activeStructResult.shear.Vu_capacity + 1e-9 >=
                        activeStructResult.shear.Vu_demand
                          ? '≥'
                          : '<'}{' '}
                        V*.
                      </p>
                      <p>
                        Web crushing (8.2.3.3): ϕVu,max ={' '}
                        {formatMaybeValue(activeStructResult.shear.Vu_max_capacity, 'kN')}{' '}
                        {activeStructResult.shear.Vu_max_capacity + 1e-9 >=
                        activeStructResult.shear.Vu_demand
                          ? '≥'
                          : '<'}{' '}
                        V*.
                      </p>
                    </div>
                  </>
                )}
              </div>
            </VisualizationCard>
          </div>

          <details className="rounded-lg border bg-muted/10 p-4">
            <summary className="cursor-pointer text-sm font-semibold">
              View governing provenance and verification detail
            </summary>
            <div className="mt-4 space-y-6">
              <WorkspaceSection
                title="GOVERNING ACTION PROVENANCE"
                description={`Design derivation uses D = ${formatMaybeNumber(activeType.nominalDiameterMm / 1000)} m and e_oop = ${formatMaybeNumber(activeType.eoopM)} m for this type. Envelope provenance remains read-only downstream of the current stored snapshot.`}
              >
                {activeEnvelopeRows.length === 0 ? (
                  <StatusCallout variant="warning">Run Envelope to populate</StatusCallout>
                ) : (
                  <div className="grid gap-4 lg:grid-cols-3">
                    <ProvenanceGroupCard
                      title="AXIAL DEMAND BASIS"
                      rows={[
                        findTraceRow(traceRows, 'nMax'),
                        findTraceRow(traceRows, 'nMin'),
                      ].filter((row): row is GoverningTraceRow => Boolean(row))}
                    />
                    <ProvenanceGroupCard
                      title="MOMENT DEMAND BASIS"
                      rows={[findTraceRow(traceRows, 'mx'), findTraceRow(traceRows, 'my')].filter(
                        (row): row is GoverningTraceRow => Boolean(row),
                      )}
                    />
                    <ProvenanceGroupCard
                      title="SHEAR DEMAND BASIS"
                      rows={[findTraceRow(traceRows, 'vx'), findTraceRow(traceRows, 'vy')].filter(
                        (row): row is GoverningTraceRow => Boolean(row),
                      )}
                    />
                  </div>
                )}
              </WorkspaceSection>

              <div className="grid gap-4 xl:grid-cols-2">
                <VerificationResultCard
                  title="AXIAL CHECK"
                  status={
                    activeStructResult
                      ? activeStructResult.axial.pass
                        ? 'AXIAL OK'
                        : 'AXIAL FAIL'
                      : 'PENDING'
                  }
                  statusTone={
                    activeStructResult
                      ? activeStructResult.axial.pass
                        ? 'success'
                        : 'danger'
                      : 'warning'
                  }
                >
                  {!activeStructResult ? (
                    <p className="text-sm text-muted-foreground">
                      Run Envelope / STRUCT to populate
                    </p>
                  ) : (
                    <>
                      <PillStrip>
                        <InfoPill>
                          DEMAND N*max = {formatMaybeValue(activeStructResult.axial.N_demand, 'kN')}
                        </InfoPill>
                        <InfoPill>
                          CAPACITY ϕNu,comp ={' '}
                          {formatMaybeValue(activeStructResult.axial.N_capacity, 'kN')}
                        </InfoPill>
                        <InfoPill>
                          Comp util ={' '}
                          {formatMaybePercent(activeStructResult.axial.compressionUtilisation)}
                        </InfoPill>
                        <InfoPill>
                          DEMAND |N*min| ={' '}
                          {formatMaybeValue(activeStructResult.axial.N_tension_demand, 'kN')}
                        </InfoPill>
                        <InfoPill>
                          CAPACITY ϕNu,ten ={' '}
                          {formatMaybeValue(activeStructResult.axial.N_tension_capacity, 'kN')}
                        </InfoPill>
                        <InfoPill>
                          Uplift util ={' '}
                          {formatMaybePercent(activeStructResult.axial.tensionUtilisation)}
                        </InfoPill>
                      </PillStrip>
                      <div className="space-y-1 text-sm text-muted-foreground">
                        <p>
                          Compression demand is positive axial force. Uplift is reported as the
                          absolute value of stored N*min for the tension check.
                        </p>
                        <p>
                          Governing axial utilisation ={' '}
                          {formatMaybePercent(activeStructResult.axial.utilisation)}.
                        </p>
                      </div>
                    </>
                  )}
                </VerificationResultCard>

                <VerificationResultCard
                  title="AS2159 REINFORCEMENT COMPLIANCE"
                  status={
                    !activeStructResult
                      ? 'PENDING'
                      : (activeReinforcementCompliance?.summaryText ?? 'PARTIAL STORED RESULT')
                  }
                  statusTone={
                    !activeStructResult
                      ? 'warning'
                      : activeReinforcementCompliance
                        ? reinforcementComplianceTone(activeReinforcementCompliance)
                        : 'warning'
                  }
                >
                  {!activeStructResult ? (
                    <p className="text-sm text-muted-foreground">
                      Run Envelope / STRUCT to populate
                    </p>
                  ) : !activeReinforcementCompliance ? (
                    <div className="space-y-1 text-sm text-muted-foreground">
                      <p>
                        This stored STRUCT result predates the reinforcement-compliance exposure
                        block.
                      </p>
                      <p>
                        Re-run Envelope / STRUCT to populate stored A_s,min / A_s,max, override
                        state, and AS2159 Clause 5.3.3 result detail for this pile type.
                      </p>
                    </div>
                  ) : (
                    <>
                      <PillStrip>
                        <InfoPill>
                          A_s,perim ={' '}
                          {formatMaybeNumber(activeReinforcementCompliance.provided.As_perim)} mm²
                        </InfoPill>
                        {activeReinforcementCompliance.provided.As_central > 0 ? (
                          <InfoPill>
                            A_s,central ={' '}
                            {formatMaybeNumber(activeReinforcementCompliance.provided.As_central)}{' '}
                            mm²
                          </InfoPill>
                        ) : null}
                        <InfoPill>
                          A_s,total ={' '}
                          {formatMaybeNumber(activeReinforcementCompliance.provided.As_total)} mm²
                        </InfoPill>
                        <InfoPill>
                          A_s,min ={' '}
                          {formatMaybeNumber(activeReinforcementCompliance.required.As_min)} mm²
                        </InfoPill>
                        <InfoPill>
                          A_s,max ={' '}
                          {formatMaybeNumber(activeReinforcementCompliance.required.As_max)} mm²
                        </InfoPill>
                        {activeReinforcementCompliance.required.As_req_tension > 0 ? (
                          <InfoPill>
                            A_s,req,tension ={' '}
                            {formatMaybeNumber(
                              activeReinforcementCompliance.required.As_req_tension,
                            )}{' '}
                            mm²
                          </InfoPill>
                        ) : null}
                        <InfoPill
                          tone={reinforcementComplianceMinimumTone(activeReinforcementCompliance)}
                        >
                          {activeReinforcementCompliance.minimumStatusText}
                        </InfoPill>
                        <InfoPill
                          tone={reinforcementComplianceMaximumTone(activeReinforcementCompliance)}
                        >
                          {activeReinforcementCompliance.maximumStatusText}
                        </InfoPill>
                        <InfoPill>{activeReinforcementCompliance.context.minReoRuleLabel}</InfoPill>
                        <InfoPill>
                          {activeReinforcementCompliance.context.reoLocDetailLabel}
                        </InfoPill>
                        <InfoPill>{`Stored check basis ${activeReinforcementCompliance.context.providedAreaBasisLabel}`}</InfoPill>
                        <InfoPill
                          tone={
                            activeReinforcementCompliance.checks.overrideOn ? 'warning' : 'neutral'
                          }
                        >
                          {activeReinforcementCompliance.checks.overrideOn
                            ? 'As,max override enabled'
                            : 'As,max override off'}
                        </InfoPill>
                        {activeReinforcementCompliance.context.reinforcementGradeLabel ? (
                          <InfoPill>
                            {activeReinforcementCompliance.context.reinforcementGradeLabel}
                          </InfoPill>
                        ) : null}
                      </PillStrip>
                      <div className="space-y-1 text-sm text-muted-foreground">
                        <p>{activeReinforcementCompliance.detailText}</p>
                        <p>
                          {activeReinforcementCompliance.context.clauseRef} using{' '}
                          {activeReinforcementCompliance.context.minReoRuleLabel}; design region
                          basis {activeReinforcementCompliance.context.reoLocDetailLabel}; perimeter
                          cage {activeReinforcementCompliance.context.nBars} x N
                          {formatMaybeNumber(activeReinforcementCompliance.context.barDia)}.
                        </p>
                        {activeReinforcementCompliance.provided.As_total >
                        activeReinforcementCompliance.provided.As_perim + 1e-9 ? (
                          <p>
                            A_s,total includes central bars and is shown for context. The stored
                            reinforcement compliance verdict is evaluated on{' '}
                            {activeReinforcementCompliance.context.providedAreaBasisLabel}.
                          </p>
                        ) : null}
                      </div>
                    </>
                  )}
                </VerificationResultCard>

                <VerificationResultCard
                  title="P–M INTERACTION CHECK"
                  status={
                    activeStructResult
                      ? activeStructResult.moment.pass
                        ? 'P-M OK'
                        : 'P-M FAIL'
                      : 'PENDING'
                  }
                  statusTone={
                    activeStructResult
                      ? activeStructResult.moment.pass
                        ? 'success'
                        : 'danger'
                      : 'warning'
                  }
                >
                  {!activeStructResult ? (
                    <p className="text-sm text-muted-foreground">
                      Run Envelope / STRUCT to populate
                    </p>
                  ) : (
                    <>
                      <PillStrip>
                        <InfoPill>
                          DEMAND Mx,DES ={' '}
                          {formatMaybeValue(activeStructResult.moment.Mx_demand, 'kNm')}
                        </InfoPill>
                        <InfoPill>
                          DEMAND My,DES ={' '}
                          {formatMaybeValue(activeStructResult.moment.My_demand, 'kNm')}
                        </InfoPill>
                        <InfoPill>
                          CAPACITY ϕMux ={' '}
                          {formatMaybeValue(activeStructResult.moment.Mx_capacity, 'kNm')}
                        </InfoPill>
                        <InfoPill>
                          CAPACITY ϕMuy ={' '}
                          {formatMaybeValue(activeStructResult.moment.My_capacity, 'kNm')}
                        </InfoPill>
                        <InfoPill>
                          Biaxial α_n = {formatMaybeNumber(activeStructResult.moment.alphaN)}
                        </InfoPill>
                        <InfoPill>
                          Utilization = {formatMaybePercent(activeStructResult.moment.utilisation)}
                        </InfoPill>
                        <InfoPill>
                          {activeStructResult.moment.biaxial
                            ? 'Biaxial interaction'
                            : 'Worst-axis interaction'}
                        </InfoPill>
                      </PillStrip>
                      <div className="space-y-1 text-sm text-muted-foreground">
                        {buildPmExplanation(activeStructResult).map((line) => (
                          <p key={line}>{line}</p>
                        ))}
                        <p>
                          Compression is positive axial force. Uplift is negative axial force. ϕMux
                          / ϕMuy are section capacities, not applied loads.
                        </p>
                      </div>
                    </>
                  )}
                </VerificationResultCard>

                <VerificationResultCard
                  title="SHEAR CAPACITY / DEMAND VIEW"
                  status={
                    activeStructResult
                      ? activeStructResult.shear.pass
                        ? 'SHEAR OK'
                        : 'SHEAR FAIL'
                      : 'PENDING'
                  }
                  statusTone={
                    activeStructResult
                      ? activeStructResult.shear.pass
                        ? 'success'
                        : 'danger'
                      : 'warning'
                  }
                >
                  {!activeStructResult ? (
                    <p className="text-sm text-muted-foreground">
                      Run Envelope / STRUCT to populate
                    </p>
                  ) : (
                    <>
                      <PillStrip>
                        <InfoPill>
                          DEMAND V* = {formatMaybeValue(activeStructResult.shear.Vu_demand, 'kN')}
                        </InfoPill>
                        <InfoPill>
                          Vuc = {formatMaybeValue(activeStructResult.shear.Vuc, 'kN')}
                        </InfoPill>
                        <InfoPill>
                          Vus = {formatMaybeValue(activeStructResult.shear.Vus, 'kN')}
                        </InfoPill>
                        <InfoPill>
                          Vu = {formatMaybeValue(activeStructResult.shear.Vu, 'kN')}
                        </InfoPill>
                        <InfoPill>
                          CAPACITY ϕVu ={' '}
                          {formatMaybeValue(activeStructResult.shear.Vu_capacity, 'kN')}
                        </InfoPill>
                        <InfoPill>
                          CAPACITY ϕVu,max ={' '}
                          {formatMaybeValue(activeStructResult.shear.Vu_max_capacity, 'kN')}
                        </InfoPill>
                        <InfoPill>
                          Shear util = {formatMaybePercent(activeStructResult.shear.utilisation)}
                        </InfoPill>
                        <InfoPill>
                          Web util = {formatMaybePercent(activeStructResult.shear.webUtilisation)}
                        </InfoPill>
                        <InfoPill tone={activeStructResult.shear.okMinAsv ? 'success' : 'danger'}>
                          {activeStructResult.shear.okMinAsv
                            ? 'Min shear steel OK'
                            : 'Min shear steel NOT OK'}
                        </InfoPill>
                      </PillStrip>
                      <div className="space-y-1 text-sm text-muted-foreground">
                        <p>
                          Stored shear demand cases {storedStructShearDemandCount} ·{' '}
                          {activeStructResult.shear.pass ? 'PASS' : 'FAIL'}.
                        </p>
                        <p>
                          Governing shear demand remains read-only downstream of the current stored
                          envelope snapshot.
                        </p>
                      </div>
                    </>
                  )}
                </VerificationResultCard>
              </div>
            </div>
          </details>
        </CardContent>
      </Card>
    </div>
  );
}

function buildSourceOptions(
  draft: MultiPileState,
  linkedJoints: MultiPileState['joints'],
): SourceOption[] {
  return linkedJoints.map((joint) => {
    const representativePile =
      draft.generatedPiles
        .filter((pile) => pile.parentJointId === joint.id)
        .sort((left, right) => left.supportIndex - right.supportIndex)[0] ?? null;
    const pileLabel = representativePile?.id ?? `${joint.id}-P1`;
    return {
      jointId: joint.id,
      pileId: representativePile?.id ?? '',
      label: `${jointDisplayLabel(joint)} / ${pileLabel}`,
      supportCount: Math.max(1, joint.supportCount || joint.noOfSupports || 1),
    };
  });
}

function buildSourcePatternRows(draft: MultiPileState, jointId: string) {
  if (!jointId) {
    return [];
  }

  return draft.loadPatterns
    .slice()
    .sort((left, right) => left.order - right.order)
    .map((pattern) => {
      const row = draft.jointLoads.find(
        (candidate) => candidate.jointId === jointId && candidate.patternId === pattern.id,
      );
      return {
        patternId: pattern.id,
        patternType: pattern.patternType,
        p: row?.p ?? 0,
        vx: row?.vx ?? 0,
        vy: row?.vy ?? 0,
        mx: row?.mx ?? 0,
        my: row?.my ?? 0,
        mz: row?.mz ?? 0,
      };
    });
}

function buildStructSummaryRow({
  draft,
  pileType,
  projectSpecifics,
  latestRun,
}: {
  draft: MultiPileState;
  pileType: MultiPilePileTypeDefinition;
  projectSpecifics: MultiPileProjectSpecifics;
  latestRun: MultiPileEnvelopeRunSummary | null | undefined;
}): StructSummaryRow {
  const settings = hydrateStructTypeSettingsWithProjectAssignments(
    getStructTypeSettings(draft, pileType),
    projectSpecifics,
  );
  const resolvedInputs = resolveTypeStructuralInputs(projectSpecifics, settings);
  const linkedJoints = draft.joints.filter(
    (joint) => joint.pileTypeId === pileType.id && joint.active,
  );
  const sourceOption = buildSourceOptions(draft, linkedJoints)[0];
  const envelopeRows = (latestRun?.envelope?.jointResults ?? []).filter(
    (row) => row.pileTypeId === pileType.id,
  );
  const structResult = latestRun?.envelope?.structResults?.[pileType.id] ?? null;
  const traceRows = buildGoverningTraceRows(envelopeRows);
  const governingBits = [
    traceSummaryText(findTraceRow(traceRows, 'nMax')),
    traceSummaryText(findTraceRow(traceRows, 'mx')),
  ].filter(Boolean);

  return {
    pileType,
    settings,
    resolvedInputs,
    linkedJointsCount: linkedJoints.length,
    sourceLabel: sourceOption?.label ?? 'No linked joint / representative pile',
    governingLabel: governingBits.join(' | ') || 'Run Envelope to populate',
    concreteLabel: resolvedInputs.concreteClassLabel || 'Not selected',
    reinforcementLabel: resolvedInputs.reinforcementGradeLabel || 'Not selected',
    coverLabel:
      resolvedInputs.coverClassLabel ||
      (resolvedInputs.nominalCoverMm != null
        ? `${formatMaybeNumber(resolvedInputs.nominalCoverMm)} mm`
        : 'Not selected'),
    axialUtilisation: structResult?.utilisation.axial ?? null,
    momentUtilisation: structResult?.utilisation.moment ?? null,
    shearUtilisation: structResult?.utilisation.shear ?? null,
    statusKey: structResult
      ? structResult.status === 'pass'
        ? 'pass'
        : structResult.status === 'fail'
          ? 'fail'
          : 'warning'
      : 'pending',
    structResultLabel: structResultLabel(structResult),
    structResultVariant: structResultVariant(structResult),
  };
}

function hydrateStructTypeSettingsWithProjectAssignments(
  settings: MultiPileStructTypeSettings,
  projectSpecifics: MultiPileProjectSpecifics,
): MultiPileStructTypeSettings {
  return {
    ...settings,
    ...hydrateMultiPileStructTypeSettingsWithProjectAssignments(settings, projectSpecifics),
  } as MultiPileStructTypeSettings;
}

function resolveTypeStructuralInputs(
  projectSpecifics: MultiPileProjectSpecifics,
  settings: MultiPileStructTypeSettings,
): ResolvedTypeStructuralInputs {
  const concreteRows = projectSpecifics.structuralDefaults.concreteClasses.map(
    (row) => resolveProjectConcreteClass(row).row,
  );
  const reinforcementRows = projectSpecifics.structuralDefaults.reinforcementGrades.map((row) =>
    normalizeProjectReinforcementGrade(row),
  );
  const tendonRows = projectSpecifics.structuralDefaults.tendonGrades.map(
    (row) => resolveProjectTendonGrade(row).row,
  );
  const coverRows = projectSpecifics.structuralDefaults.coverDurabilityClasses.map((row) =>
    normalizeProjectCoverClass(row),
  );

  const hasProjectRows =
    concreteRows.length > 0 && reinforcementRows.length > 0 && coverRows.length > 0;
  const selectedConcrete = concreteRows.find((row) => row.id === settings.concreteClassId) ?? null;
  const selectedReinforcement =
    reinforcementRows.find((row) => row.id === settings.reinforcementGradeId) ?? null;
  const selectedTendon = tendonRows.find((row) => row.id === settings.tendonGradeId) ?? null;
  const selectedCover = coverRows.find((row) => row.id === settings.coverDurabilityClassId) ?? null;

  const concreteClass = selectedConcrete;
  const reinforcementGrade = selectedReinforcement;
  const coverClass = selectedCover;
  const fallbackCategories: string[] = [];
  if (!concreteClass) fallbackCategories.push('Concrete class');
  if (!reinforcementGrade) fallbackCategories.push('Reinforcement grade');
  if (!coverClass) fallbackCategories.push('Cover / durability class');
  const usedLegacyFallback = fallbackCategories.length > 0;
  const resolutionMode = usedLegacyFallback
    ? 'migration-fallback'
    : concreteClass || reinforcementGrade || coverClass
      ? 'project-library'
      : 'missing';

  const missingSelections: string[] = [];
  if (!settings.concreteClassId) missingSelections.push('Concrete class');
  if (!settings.reinforcementGradeId) missingSelections.push('Reinforcement grade');
  if (!settings.coverDurabilityClassId) missingSelections.push('Cover / durability class');

  const missingSelectedRows: string[] = [];
  if (settings.concreteClassId && !selectedConcrete) missingSelectedRows.push('Concrete class');
  if (settings.reinforcementGradeId && !selectedReinforcement) {
    missingSelectedRows.push('Reinforcement grade');
  }
  if (settings.coverDurabilityClassId && !selectedCover) {
    missingSelectedRows.push('Cover / durability class');
  }
  if (settings.tendonGradeId && !selectedTendon) {
    missingSelectedRows.push('Tendon grade');
  }

  const inputWarnings: string[] = [];
  if (missingSelections.length > 0) {
    inputWarnings.push(`Missing project defaults selection: ${missingSelections.join(', ')}.`);
  }
  if (missingSelectedRows.length > 0) {
    inputWarnings.push(
      `Selected project defaults could not be resolved: ${missingSelectedRows.join(', ')}.`,
    );
  }
  if (usedLegacyFallback) {
    inputWarnings.push(
      hasProjectRows
        ? `Saved pile-type structural values are being used for: ${fallbackCategories.join(', ')} because this pile type is not yet mapped to matching project structural library rows.`
        : `Saved pile-type structural values are being used for: ${fallbackCategories.join(', ')} because this project does not yet expose all project structural library rows required by this designer.`,
    );
  }

  const concreteClassLabel = concreteClass ? projectConcreteLabel(concreteClass) : '';
  const reinforcementGradeLabel = reinforcementGrade
    ? projectReinforcementLabel(reinforcementGrade)
    : '';
  const tendonGradeLabel = selectedTendon ? projectTendonLabel(selectedTendon) : '';
  const coverClassLabel = coverClass
    ? projectCoverLabel(coverClass)
    : settings.cover > 0
      ? 'Saved pile-type cover'
      : '';
  const summaryLabel =
    [concreteClassLabel, reinforcementGradeLabel, coverClassLabel].filter(Boolean).join(' / ') ||
    (usedLegacyFallback
      ? 'Saved pile-type structural values'
      : 'Project structural defaults not fully selected');
  const nominalCoverMm = coverClass
    ? (coverClass.minCoverCastInPlace_mm ?? coverClass.nominalCover_mm ?? null)
    : settings.cover;
  const durabilityNotes = coverClass
    ? [coverClass.durabilityNotes, coverClass.aggressivityNotes].filter(Boolean).join(' | ')
    : settings.cover > 0
      ? 'Saved pile-type value from pile-type settings.'
      : '';

  return {
    concreteClass,
    reinforcementGrade,
    tendonGrade: selectedTendon ?? null,
    coverClass,
    concreteClassLabel,
    reinforcementGradeLabel,
    tendonGradeLabel,
    coverClassLabel,
    summaryLabel,
    fc: concreteClass?.fc_MPa ?? settings.fc,
    Ec: concreteClass?.Ec_MPa ?? settings.Ec,
    fsy: reinforcementGrade?.fsy_MPa ?? settings.fsy,
    Es: reinforcementGrade?.Es_MPa ?? settings.Es,
    nominalCoverMm,
    durabilityNotes,
    designLifeYears: coverClass?.designLifeYears ?? null,
    exposureClass: coverClass?.exposureClass || coverClass?.exposureClassification || '',
    usedLegacyFallback,
    resolutionMode,
    inputWarnings,
  };
}

function collectStructDesignerWarnings({
  linkedJointCount,
  envelopeRowCount,
  settings,
  resolvedInputs,
}: {
  linkedJointCount: number;
  envelopeRowCount: number;
  settings: MultiPileStructTypeSettings | null;
  resolvedInputs: ResolvedTypeStructuralInputs | null;
}) {
  const warnings = [...(resolvedInputs?.inputWarnings ?? [])];

  if (linkedJointCount === 0) {
    warnings.push('No linked joint / representative pile exists for this type yet.');
  }
  if (envelopeRowCount === 0) {
    warnings.push('Run Envelope to populate governing actions for this type.');
  }
  if (settings && settings.nBars <= 0) {
    warnings.push('NUMBER OF BARS is 0. Provide a perimeter cage to author this type fully.');
  }
  if (settings && settings.useCentralBar && settings.centralBarCount <= 0) {
    warnings.push('USE CENTRAL BAR(S) is enabled but NUMBER OF CENTRAL BARS is 0.');
  }

  return Array.from(new Set(warnings));
}

function buildGoverningTraceRows(rows: MultiPileJointEnvelopeSnapshot[]): GoverningTraceRow[] {
  return [
    pickGoverningTraceRow(rows, 'nMax', 'Governing N*max', 'kN', (row) => row.nMax, 'max'),
    pickGoverningTraceRow(rows, 'nMin', 'Governing N*min', 'kN', (row) => row.nMin, 'min'),
    pickGoverningTraceRow(rows, 'vx', 'Governing Vx,DES', 'kN', (row) => row.vx, 'max-abs'),
    pickGoverningTraceRow(rows, 'vy', 'Governing Vy,DES', 'kN', (row) => row.vy, 'max-abs'),
    pickGoverningTraceRow(rows, 'mx', 'Governing Mx,DES', 'kNm', (row) => row.mx, 'max-abs'),
    pickGoverningTraceRow(rows, 'my', 'Governing My,DES', 'kNm', (row) => row.my, 'max-abs'),
  ];
}

function pickGoverningTraceRow(
  rows: MultiPileJointEnvelopeSnapshot[],
  key: GoverningTraceRow['key'],
  label: string,
  unit: string,
  accessor: (row: MultiPileJointEnvelopeSnapshot) => MultiPileEnvelopeValue,
  mode: 'max' | 'min' | 'max-abs',
): GoverningTraceRow {
  let selectedIndex = -1;
  let selectedValue: MultiPileEnvelopeValue | null = null;

  rows.forEach((row, index) => {
    const candidateValue = accessor(row);
    if (!selectedValue) {
      selectedIndex = index;
      selectedValue = candidateValue;
      return;
    }

    const candidateScore =
      mode === 'max-abs' ? Math.abs(candidateValue.value) : candidateValue.value;
    const selectedScore = mode === 'max-abs' ? Math.abs(selectedValue.value) : selectedValue.value;
    const shouldReplace =
      mode === 'min' ? candidateScore < selectedScore : candidateScore > selectedScore;

    if (shouldReplace) {
      selectedIndex = index;
      selectedValue = candidateValue;
    }
  });

  const selectedRow = selectedIndex >= 0 ? rows[selectedIndex] : null;

  return {
    key,
    label,
    unit,
    jointId: selectedRow?.jointId ?? '',
    jointLabel: selectedRow?.jointDisplayName || selectedRow?.jointId || '',
    value: selectedValue,
  };
}

function collectGoverningCombinationNames(rows: GoverningTraceRow[]) {
  return Array.from(
    new Set(
      rows
        .map((row) => row.value?.combinationName?.trim())
        .filter((value): value is string => Boolean(value)),
    ),
  ).join(', ');
}

function findTraceRow(rows: GoverningTraceRow[], key: GoverningTraceRow['key']) {
  return rows.find((row) => row.key === key) ?? null;
}

function traceSummaryText(row: GoverningTraceRow | null) {
  if (!row?.value) {
    return '';
  }

  return `${row.label} ${formatMaybeNumber(row.value.value)} ${row.unit}`;
}

function formatTraceValue(row: GoverningTraceRow | null) {
  if (!row?.value) {
    return 'Run Envelope to populate';
  }
  return `${formatMaybeNumber(row.value.value)} ${row.unit}`;
}

function interactionDemandPoints(result: MultiPileStructResult) {
  const storedPoints = Array.isArray(result.interaction.demandPoints)
    ? result.interaction.demandPoints.filter(
        (point) => point != null && Number.isFinite(point.N) && Number.isFinite(point.M),
      )
    : [];

  if (storedPoints.length > 0) {
    return storedPoints;
  }

  const demandPoint = result.interaction.demandPoint;
  if (demandPoint && Number.isFinite(demandPoint.N) && Number.isFinite(demandPoint.M)) {
    return [demandPoint];
  }

  return [];
}

function jointPileResultLabel(
  draft: Pick<MultiPileState, 'joints'>,
  jointId: string | null | undefined,
  pileId: string | null | undefined,
  fallback: string,
) {
  const joint = draft.joints.find((row) => row.id === jointId) ?? null;
  if (!joint && !pileId) {
    return fallback;
  }

  const jointLabel = joint ? jointDisplayLabel(joint) : jointId || '—';
  return pileId ? `${jointLabel} / ${pileId}` : jointLabel;
}

function minReoRuleLabel(value: MultiPileStructTypeSettings['minReoRule']) {
  if (value === 'precast') return 'PRECAST RC PILES';
  if (value === 'other_above') return 'OTHER PILES — PORTION ABOVE GROUND';
  return 'OTHER PILES — FULLY EMBEDDED';
}

function reoLocationLabel(value: MultiPileStructTypeSettings['reoLocDetail']) {
  if (value === 'above') return 'AT / ABOVE GROUND';
  if (value === 'within3d') return 'WITHIN 3D';
  return 'BELOW 3D';
}

function buildPmExplanation(result: MultiPileStructResult) {
  const bothUniaxialBelow =
    result.moment.Mx_demand <= result.moment.Mx_capacity + 1e-9 &&
    result.moment.My_demand <= result.moment.My_capacity + 1e-9;

  if (result.moment.biaxial) {
    const lead =
      !result.moment.pass && bothUniaxialBelow
        ? 'Although each uniaxial demand is less than its corresponding uniaxial capacity, the combined biaxial interaction exceeds unity.'
        : result.moment.pass
          ? 'The combined biaxial interaction is within unity.'
          : 'The combined biaxial interaction exceeds unity.';

    return [
      lead,
      `Interaction equation: (Mx,DES/ϕMux)^αn + (My,DES/ϕMuy)^αn = (${formatMaybeNumber(result.moment.Mx_demand)}/${formatMaybeNumber(result.moment.Mx_capacity)})^${formatMaybeNumber(result.moment.alphaN)} + (${formatMaybeNumber(result.moment.My_demand)}/${formatMaybeNumber(result.moment.My_capacity)})^${formatMaybeNumber(result.moment.alphaN)} = ${formatMaybeNumber(result.moment.utilisation)} ${result.moment.pass ? '≤' : '>'} 1.0.`,
      `Uniaxial comparison only: Mx,DES = ${formatMaybeValue(result.moment.Mx_demand, 'kNm')} vs ϕMux = ${formatMaybeValue(result.moment.Mx_capacity, 'kNm')}; My,DES = ${formatMaybeValue(result.moment.My_demand, 'kNm')} vs ϕMuy = ${formatMaybeValue(result.moment.My_capacity, 'kNm')}.`,
    ];
  }

  const rx = result.moment.Mx_demand / Math.max(result.moment.Mx_capacity, 1e-9);
  const ry = result.moment.My_demand / Math.max(result.moment.My_capacity, 1e-9);

  return [
    'Uniaxial worst-axis interaction is being used for this type.',
    `Interaction equation: max(Mx,DES/ϕMux, My,DES/ϕMuy) = max(${formatMaybeNumber(rx)}, ${formatMaybeNumber(ry)}) = ${formatMaybeNumber(result.moment.utilisation)} ${result.moment.pass ? '≤' : '>'} 1.0.`,
  ];
}

function formatMaybePercent(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) {
    return '—';
  }
  return `${(value * 100).toFixed(1).replace(/\.0$/, '')}%`;
}

function structResultLabel(result: MultiPileStructResult | null | undefined) {
  if (!result) {
    return 'Run Envelope / STRUCT to populate';
  }
  if (result.status === 'pass') {
    return 'Stored PASS';
  }
  if (result.status === 'fail') {
    return 'Stored FAIL';
  }
  return 'Stored WARNING';
}

function structResultVariant(result: MultiPileStructResult | null | undefined) {
  if (!result) {
    return 'outline' as const;
  }
  if (result.status === 'pass') {
    return 'success' as const;
  }
  if (result.status === 'fail') {
    return 'destructive' as const;
  }
  return 'warning' as const;
}

type StoredReinforcementCompliance = NonNullable<MultiPileStructResult['reinforcementCompliance']>;

function reinforcementComplianceTone(compliance: StoredReinforcementCompliance) {
  if (compliance.status === 'pass') {
    return 'success' as const;
  }
  if (compliance.status === 'fail') {
    return 'danger' as const;
  }
  return 'warning' as const;
}

function reinforcementComplianceMinimumTone(compliance: StoredReinforcementCompliance) {
  return compliance.checks.okAsMin ? ('success' as const) : ('warning' as const);
}

function reinforcementComplianceMaximumTone(compliance: StoredReinforcementCompliance) {
  if (compliance.checks.okAsMax) {
    return 'success' as const;
  }
  if (compliance.checks.overrideOn) {
    return 'warning' as const;
  }
  return 'danger' as const;
}

function barAreaFromDia(diameterMm: number) {
  const standardAreaByDia: Record<number, number> = {
    16: 201,
    20: 314,
    24: 452,
    28: 616,
    32: 804,
    36: 1018,
    40: 1257,
  };

  return standardAreaByDia[diameterMm] ?? (Math.PI * diameterMm ** 2) / 4;
}

function perimeterBarTag(settings: MultiPileStructTypeSettings) {
  if (settings.nBars <= 0) {
    return '—';
  }
  return `${settings.nBars}-N${settings.barDia}`;
}

function centralBarTag(settings: MultiPileStructTypeSettings) {
  if (!settings.useCentralBar || settings.centralBarCount <= 0) {
    return '—';
  }
  return `${settings.centralBarCount}xN${settings.centralBarDia}`;
}

function transverseTag(settings: MultiPileStructTypeSettings) {
  if (settings.transverseSystem === 'spiral') {
    return `N${settings.spiralDia} @ ${formatMaybeNumber(settings.spiralPitch)} pitch`;
  }
  return `N${settings.tieDia} @ ${formatMaybeNumber(settings.tieS)}, ${formatMaybeNumber(settings.tieLegs)} legs`;
}

function projectionLabel(value: number) {
  return value > 0 ? `${formatMaybeNumber(value)} m` : '0 m';
}

function axialModelLabel(value: MultiPileStructTypeSettings['axModel']) {
  if (value === 'partial') return 'Partially reinforced';
  if (value === 'plain') return 'Unreinforced';
  return 'Reinforced';
}

function headDetailValue(
  value: string,
  fallback: MultiPileStructTypeSettings['perimHeadDetail'],
): MultiPileStructTypeSettings['perimHeadDetail'] {
  return HEAD_DETAIL_OPTIONS.includes(value as (typeof HEAD_DETAIL_OPTIONS)[number])
    ? (value as MultiPileStructTypeSettings['perimHeadDetail'])
    : fallback;
}

function headDetailLabel(value: string) {
  switch (value) {
    case '90out':
      return '90° out';
    case '90in':
      return '90° in';
    case '180in':
      return '180° in';
    case '180out':
      return '180° out';
    default:
      return 'Straight';
  }
}

function numericOr(value: string, fallback: number) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function formatMaybeNumber(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) {
    return 'n/a';
  }
  return Number.isInteger(value) ? value.toFixed(0) : value.toFixed(3).replace(/\.?0+$/, '');
}

function formatChartNumber(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) {
    return '—';
  }
  if (Math.abs(value) >= 1000) {
    return value.toFixed(0);
  }
  if (Math.abs(value) >= 100) {
    return value.toFixed(1).replace(/\.0$/, '');
  }
  return value.toFixed(2).replace(/\.?0+$/, '');
}

function formatMaybeValue(value: number | null | undefined, unit: string) {
  if (value == null || !Number.isFinite(value)) {
    return '—';
  }
  return `${formatMaybeNumber(value)} ${unit}`;
}

function projectConcreteLabel(row: MultiPileProjectConcreteClass) {
  return `${row.displayName || row.id}${row.fc_MPa != null ? ` · f'c ${formatMaybeNumber(row.fc_MPa)} MPa` : ''}`;
}

function projectReinforcementLabel(row: MultiPileProjectReinforcementGrade) {
  return `${row.displayName || row.designationGrade || row.id}${row.fsy_MPa != null ? ` · fsy ${formatMaybeNumber(row.fsy_MPa)} MPa` : ''}`;
}

function projectTendonLabel(row: MultiPileProjectTendonGrade) {
  return `${row.displayName || row.tendonType || row.id}${row.nominalDiameter_mm != null ? ` · ${formatMaybeNumber(row.nominalDiameter_mm)} mm` : ''}`;
}

function projectCoverLabel(row: MultiPileProjectCoverDurabilityClass) {
  return `${row.displayName || row.exposureClass || row.id}${row.nominalCover_mm != null ? ` · ${formatMaybeNumber(row.nominalCover_mm)} mm` : ''}`;
}

function WorkspaceSection({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-4 rounded-lg border bg-background p-5">
      <div className="space-y-1">
        <div className="text-sm font-semibold tracking-wide text-foreground">{title}</div>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      {children}
    </section>
  );
}

function FieldBlock({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-2">
      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      {children}
    </div>
  );
}

function CompactResultStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-muted/20 p-3">
      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="mt-2 text-sm font-semibold">{value}</div>
    </div>
  );
}

function SummaryLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1 rounded-lg border bg-muted/10 p-4">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-sm font-medium">{value}</div>
    </div>
  );
}

function PillStrip({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap gap-2">{children}</div>;
}

function InfoPill({
  tone = 'neutral',
  children,
}: {
  tone?: 'neutral' | 'success' | 'warning' | 'danger';
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium',
        tone === 'success' && 'border-emerald-200 bg-emerald-50 text-emerald-700',
        tone === 'warning' && 'border-amber-200 bg-amber-50 text-amber-800',
        tone === 'danger' && 'border-red-200 bg-red-50 text-red-700',
        tone === 'neutral' && 'border-slate-200 bg-slate-50 text-slate-700',
      )}
    >
      {children}
    </span>
  );
}

function VisualizationCard({
  title,
  description,
  children,
}: {
  title: string;
  description: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="space-y-4 rounded-lg border bg-background p-5">
      <div className="space-y-1">
        <div className="text-sm font-semibold tracking-wide text-foreground">{title}</div>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      {children}
    </section>
  );
}

function VerificationResultCard({
  title,
  status,
  statusTone,
  children,
}: {
  title: string;
  status: string;
  statusTone: 'neutral' | 'success' | 'warning' | 'danger';
  children: ReactNode;
}) {
  return (
    <section className="space-y-4 rounded-lg border bg-background p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="text-sm font-semibold tracking-wide text-foreground">{title}</div>
        <InfoPill tone={statusTone}>{status}</InfoPill>
      </div>
      {children}
    </section>
  );
}

function ProvenanceGroupCard({ title, rows }: { title: string; rows: GoverningTraceRow[] }) {
  return (
    <div className="space-y-3 rounded-lg border bg-muted/10 p-4">
      <div className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {title}
      </div>
      {rows.map((row) => (
        <div key={row.key} className="space-y-1 rounded-lg border bg-background p-3">
          <div className="flex items-start justify-between gap-3">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">{row.label}</div>
            <div className="text-sm font-medium">{formatTraceValue(row)}</div>
          </div>
          <div className="text-sm text-muted-foreground">
            {row.value?.combinationName || 'Combination unavailable'}
          </div>
          <div className="text-xs text-muted-foreground">
            {[row.value?.source || '', row.jointLabel || row.jointId || '']
              .filter(Boolean)
              .join(' · ') || 'Stored provenance unavailable'}
          </div>
          {row.value?.expressionSummary ? (
            <div className="text-xs text-muted-foreground">{row.value.expressionSummary}</div>
          ) : null}
        </div>
      ))}
    </div>
  );
}

function SvgChartPlaceholder({
  height,
  label,
  message,
}: {
  height: number;
  label: string;
  message: string;
}) {
  return (
    <div className="overflow-x-auto">
      <svg
        viewBox={`0 0 720 ${height}`}
        preserveAspectRatio="xMidYMid meet"
        aria-label={label}
        className="h-auto w-full rounded-xl border bg-white"
      >
        <text x="360" y={height / 2} textAnchor="middle" className="fill-slate-500 text-[11px]">
          {message}
        </text>
      </svg>
    </div>
  );
}

function PmInteractionChart({
  result,
  pileTypeId,
}: {
  result: MultiPileStructResult | null;
  pileTypeId: string;
}) {
  if (!result) {
    return (
      <SvgChartPlaceholder
        height={360}
        label={`Axial load–moment diagram for ${pileTypeId}`}
        message="Run Envelope / STRUCT to populate"
      />
    );
  }

  const curve = result.interaction.curve ?? [];
  const demands = interactionDemandPoints(result);
  if (curve.length === 0 || demands.length === 0) {
    return (
      <SvgChartPlaceholder
        height={360}
        label={`Axial load–moment diagram for ${pileTypeId}`}
        message="Stored STRUCT result does not yet expose this chart input"
      />
    );
  }

  const W = 720;
  const H = 360;
  const m = { l: 84, r: 28, t: 20, b: 58 };
  const iw = W - m.l - m.r;
  const ih = H - m.t - m.b;

  const allN = [...curve.map((point) => point.N), ...demands.map((point) => point.N)];
  const allM = [...curve.map((point) => point.M), ...demands.map((point) => Math.abs(point.M))];
  const maxN = Math.max(result.moment.phiNuo || 0, ...allN);
  const minN = Math.min(0, ...allN);
  const maxM = Math.max(result.moment.phiMu0 || 0, ...allM);

  const nMax = maxN === 0 ? 1 : maxN * 1.08;
  const nMin = minN === maxN ? minN - 1 : minN * 1.08;
  const mMax = maxM === 0 ? 1 : maxM * 1.1;
  const mMin = 0;
  const x = (value: number) => m.l + ((value - mMin) / Math.max(mMax - mMin, 1e-9)) * iw;
  const y = (value: number) => m.t + ih - ((value - nMin) / Math.max(nMax - nMin, 1e-9)) * ih;

  const gridLines = Array.from({ length: 5 }, (_, index) => index);
  const xTicks = Array.from({ length: 5 }, (_, index) => {
    const value = mMin + (index / 4) * (mMax - mMin);
    return { value, x: x(value) };
  });
  const yTicks = Array.from({ length: 6 }, (_, index) => {
    const value = nMin + (index / 5) * (nMax - nMin);
    return { value, y: y(value) };
  });
  const legendItems = [
    { kind: 'line' as const, label: 'Interaction curve', stroke: '#111827' },
    { kind: 'line' as const, label: 'Capacity trigger lines', stroke: '#6b7280', dash: '5 4' },
    { kind: 'dot' as const, label: 'Compression demand', fill: '#111827' },
    { kind: 'dot' as const, label: 'Uplift / Nmin demand', fill: '#dc2626' },
  ];

  return (
    <div className="overflow-x-auto">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="xMidYMid meet"
        aria-label={`Axial load–moment diagram for ${pileTypeId}`}
        className="h-auto w-full rounded-xl border bg-white"
      >
        {gridLines.map((index) => {
          const gx = m.l + (index / 4) * iw;
          const gy = m.t + (index / 4) * ih;
          return (
            <g key={`grid-${index}`}>
              <line x1={gx} x2={gx} y1={m.t} y2={m.t + ih} stroke="#eaeaea" strokeWidth="1" />
              <line x1={m.l} x2={m.l + iw} y1={gy} y2={gy} stroke="#eaeaea" strokeWidth="1" />
            </g>
          );
        })}

        <line x1={m.l} x2={m.l + iw} y1={y(0)} y2={y(0)} stroke="#111827" strokeWidth="1.5" />
        <line x1={m.l} x2={m.l} y1={m.t} y2={m.t + ih} stroke="#111827" strokeWidth="1.5" />

        <text
          x={m.l + iw / 2}
          y={H - 12}
          textAnchor="middle"
          className="fill-slate-700 text-[11px]"
        >
          DESIGN MOMENT φM (kNm)
        </text>
        <text
          x={22}
          y={m.t + ih / 2}
          textAnchor="middle"
          transform={`rotate(-90 22 ${m.t + ih / 2})`}
          className="fill-slate-700 text-[11px]"
        >
          DESIGN AXIAL FORCE φN (kN)
        </text>

        {xTicks.map((tick) => (
          <g key={`xtick-${tick.value}`}>
            <line
              x1={tick.x}
              x2={tick.x}
              y1={m.t + ih}
              y2={m.t + ih + 6}
              stroke="#111827"
              strokeWidth="1"
            />
            <text
              x={tick.x}
              y={m.t + ih + 21}
              textAnchor="middle"
              className="fill-slate-900 text-[11px]"
            >
              {formatChartNumber(tick.value)}
            </text>
          </g>
        ))}

        {yTicks.map((tick) => (
          <g key={`ytick-${tick.value}`}>
            <line x1={m.l - 6} x2={m.l} y1={tick.y} y2={tick.y} stroke="#111827" strokeWidth="1" />
            <text
              x={m.l - 12}
              y={tick.y + 4}
              textAnchor="end"
              className="fill-slate-900 text-[11px]"
            >
              {formatChartNumber(tick.value)}
            </text>
          </g>
        ))}

        {[
          { value: 0.75 * result.moment.phiNuo, label: '0.75ϕNuo' },
          { value: result.moment.phiN03Agfc, label: "0.3Ag f'c (ϕ)" },
        ]
          .filter((line) => line.value > 0)
          .map((line) => (
            <g key={line.label}>
              <line
                x1={m.l}
                x2={m.l + iw}
                y1={y(line.value)}
                y2={y(line.value)}
                stroke="#6b7280"
                strokeWidth="1"
                strokeDasharray="5 4"
              />
              <text x={m.l + 6} y={y(line.value) - 4} className="fill-slate-900 text-[11px]">
                {line.label}
              </text>
            </g>
          ))}

        {result.moment.phiMu0 > 0 ? (
          <g>
            <line
              x1={x(0.6 * result.moment.phiMu0)}
              x2={x(0.6 * result.moment.phiMu0)}
              y1={m.t}
              y2={m.t + ih}
              stroke="#6b7280"
              strokeWidth="1"
              strokeDasharray="5 4"
            />
            <text
              x={x(0.6 * result.moment.phiMu0) + 6}
              y={m.t + 12}
              className="fill-slate-900 text-[11px]"
            >
              0.6ϕMu
            </text>
          </g>
        ) : null}

        <polyline
          points={curve.map((point) => `${x(point.M)},${y(point.N)}`).join(' ')}
          fill="none"
          stroke="#111827"
          strokeWidth="2"
        />

        {demands.map((point, index) => {
          const cx = x(Math.abs(point.M));
          const cy = y(point.N);
          const fill = point.cls === 'pmDotTen' ? '#dc2626' : '#111827';
          return (
            <g key={`${point.label || 'demand'}-${index}`}>
              <circle cx={cx} cy={cy} r="5" fill={fill} />
              <text x={cx + 8} y={cy - 8} className="fill-slate-900 text-[11px]">
                {point.label || `DEMAND ${index + 1}`}
              </text>
            </g>
          );
        })}

        {legendItems.map((item, index) => {
          const legendY = m.t + 16 + index * 18;
          return (
            <g key={item.label}>
              {item.kind === 'line' ? (
                <line
                  x1={W - 170}
                  x2={W - 145}
                  y1={legendY}
                  y2={legendY}
                  stroke={item.stroke}
                  strokeWidth="2"
                  strokeDasharray={item.dash}
                />
              ) : (
                <circle cx={W - 158} cy={legendY} r="5" fill={item.fill} />
              )}
              <text x={W - 140} y={legendY + 4} className="fill-slate-900 text-[11px]">
                {item.label}
              </text>
            </g>
          );
        })}

        <text x={W - 20} y={H - 12} textAnchor="end" className="fill-slate-900 text-[11px]">
          +N compression | -N uplift
        </text>
      </svg>
    </div>
  );
}

function ShearDemandChart({
  result,
  pileTypeId,
}: {
  result: MultiPileStructResult | null;
  pileTypeId: string;
}) {
  if (!result) {
    return (
      <SvgChartPlaceholder
        height={300}
        label={`Shear capacity and demand view for ${pileTypeId}`}
        message="Run Envelope / STRUCT to populate"
      />
    );
  }

  const cases = result.shear.demandCases ?? [];
  const capacities = [
    result.shear.Vuc,
    result.shear.Vu,
    result.shear.Vu_capacity,
    result.shear.Vu_max_capacity,
  ].filter((value) => Number.isFinite(value));

  if (cases.length === 0 || capacities.length === 0) {
    return (
      <SvgChartPlaceholder
        height={300}
        label={`Shear capacity and demand view for ${pileTypeId}`}
        message="Stored STRUCT result does not yet expose this chart input"
      />
    );
  }

  const W = 720;
  const H = Math.max(300, 120 + cases.length * 26);
  const m = { l: 190, r: 24, t: 26, b: 46 };
  const iw = W - m.l - m.r;
  const ih = H - m.t - m.b;
  const maxDemand = Math.max(0, ...cases.map((row) => Number(row.Vstar || 0)));
  const maxCap = Math.max(maxDemand, ...capacities);
  const xMax = Math.max(1, maxCap * 1.15);
  const x = (value: number) => m.l + (Number(value || 0) / xMax) * iw;
  const rowStep = cases.length > 0 ? ih / Math.max(cases.length, 1) : ih;
  const referenceLines = [
    { value: result.shear.Vuc, color: '#94a3b8', dash: '4 4', label: 'Vuc' },
    { value: result.shear.Vu, color: '#64748b', dash: '8 4', label: 'Vu' },
    { value: result.shear.Vu_capacity, color: '#0f766e', dash: undefined, label: 'ϕVu' },
    { value: result.shear.Vu_max_capacity, color: '#b91c1c', dash: '6 3', label: 'ϕVu,max' },
  ];

  return (
    <div className="overflow-x-auto">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="xMidYMid meet"
        aria-label={`Shear capacity and demand view for ${pileTypeId}`}
        className="h-auto w-full rounded-xl border bg-white"
      >
        {Array.from({ length: 7 }, (_, index) => {
          const value = (index / 6) * xMax;
          const gx = x(value);
          return (
            <g key={`grid-${index}`}>
              <line x1={gx} x2={gx} y1={m.t} y2={m.t + ih} stroke="#eaeaea" strokeWidth="1" />
              <text x={gx} y={H - 14} textAnchor="middle" className="fill-slate-900 text-[11px]">
                {formatChartNumber(value)}
              </text>
            </g>
          );
        })}

        <line
          x1={m.l}
          x2={m.l + iw}
          y1={m.t + ih}
          y2={m.t + ih}
          stroke="#111827"
          strokeWidth="1.5"
        />
        <text x={m.l + iw / 2} y={H - 2} textAnchor="middle" className="fill-slate-700 text-[11px]">
          SHEAR FORCE (kN)
        </text>

        {referenceLines
          .filter((line) => Number.isFinite(line.value) && line.value > 0)
          .map((line, index) => (
            <g key={line.label}>
              <line
                x1={x(line.value)}
                x2={x(line.value)}
                y1={m.t}
                y2={m.t + ih}
                stroke={line.color}
                strokeWidth={line.label === 'ϕVu' ? '3' : '2'}
                strokeDasharray={line.dash}
              />
              <text
                x={x(line.value) + 6}
                y={m.t + 14 + index * 14}
                className="fill-slate-900 text-[11px]"
              >
                {line.label} = {formatChartNumber(line.value)} kN
              </text>
            </g>
          ))}

        {cases.map((row, index) => {
          const cy = m.t + rowStep * (index + 0.5);
          return (
            <g key={`${row.label || row.jointId}-${index}`}>
              <line x1={m.l} x2={x(row.Vstar)} y1={cy} y2={cy} stroke="#cbd5e1" strokeWidth="3" />
              <circle
                cx={x(row.Vstar)}
                cy={cy}
                r="5"
                fill={row.pass ? '#0f766e' : '#dc2626'}
                stroke="#111827"
                strokeWidth="1"
              />
              <text x={m.l - 8} y={cy + 4} textAnchor="end" className="fill-slate-900 text-[11px]">
                {row.label || `${row.jointId}/${row.pileId || 'P1'} ULS-V`}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function ReadOnlyInput({ label, value }: { label: string; value: string }) {
  return (
    <FieldBlock label={label}>
      <Input value={value} readOnly className="bg-muted/20" />
    </FieldBlock>
  );
}

function InputField({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  return (
    <FieldBlock label={label}>
      <Input value={value} disabled={disabled} onChange={(event) => onChange(event.target.value)} />
    </FieldBlock>
  );
}

function CheckboxField({
  label,
  description,
  checked,
  disabled,
  onCheckedChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <FieldBlock label={label}>
      <label className="flex items-start gap-3 rounded-lg border bg-muted/10 p-3 text-sm">
        <input
          type="checkbox"
          className="mt-0.5 h-4 w-4 rounded border border-input"
          checked={checked}
          disabled={disabled}
          onChange={(event) => onCheckedChange(event.target.checked)}
        />
        <span className="text-muted-foreground">{description}</span>
      </label>
    </FieldBlock>
  );
}

function StatusCallout({
  variant,
  children,
}: {
  variant: 'warning' | 'success';
  children: ReactNode;
}) {
  const className =
    variant === 'success'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
      : 'border-amber-300 bg-amber-50 text-amber-900';

  return <div className={`rounded-lg border p-4 text-sm ${className}`}>{children}</div>;
}

function EmptyHint({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
      {children}
    </div>
  );
}
