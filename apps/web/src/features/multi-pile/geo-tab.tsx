'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  MULTI_PILE_GEO_ARR_ITEMS,
  adoptedPhiForRedundancy,
  type MultiPileGeoResultRow,
  type MultiPileProjectSpecifics,
  type MultiPileState,
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
  resolveProjectGeotechnicalMaterialLabel,
  resolveProjectReferenceLabel,
  selectProjectGeotechnicalMaterials,
  summarizeProjectGeotechnical,
} from '@/features/projects/project-specifics-utils';
import { MultiPileFieldFilter } from './runtime-shell';
import { defaultGeoTypeSettings, numberFromInput, type MultiPileDraftUpdater } from './utils';

type ProjectGeoMaterial = MultiPileProjectSpecifics['geotechnicalMaterials']['materials'][number];
type ProjectReference = MultiPileProjectSpecifics['references'][number];
type GeoLayerPreviewRow = {
  slot: number;
  H: number;
  fmsComp: number;
  fmsTen: number;
  label: string;
  sourceReferenceLabel: string;
  resolutionMode: string;
};
type FoundingPreview = {
  label: string;
  sourceReferenceLabel: string;
  sourceSummary: string;
  resolutionMode: string;
  fmsComp: number | null;
  fmsTen: number | null;
  fbUlt: number | null;
  notes: string;
};
type StatusBadgeVariant = 'outline' | 'success' | 'warning' | 'destructive';
type GeoTypeSummaryRow = {
  pileTypeId: string;
  pileTypeLabel: string;
  representativeJointId: string;
  representativeJointLabel: string;
  representativePileId: string;
  foundingLabel: string;
  adoptedSocketLength: number | null;
  compUtil: number | null;
  upliftUtil: number | null;
  status: 'pass' | 'fail' | 'pending';
};

interface GeoTabProps {
  draft: MultiPileState;
  projectSpecifics: MultiPileProjectSpecifics;
  editProjectArrHref: string;
  updateDraft: MultiPileDraftUpdater;
  selectedTypeId?: string | null;
  selectedJointId?: string | null;
}

export function GeoTab({
  draft,
  projectSpecifics,
  editProjectArrHref,
  updateDraft,
  selectedTypeId,
  selectedJointId,
}: GeoTabProps) {
  const [activeTypeId, setActiveTypeId] = useState(draft.pileTypes[0]?.id ?? '');
  const [activeJointId, setActiveJointId] = useState('');
  const [summaryTypeFilter, setSummaryTypeFilter] = useState('all');
  const [summaryStatusFilter, setSummaryStatusFilter] = useState<
    'all' | 'pass' | 'fail' | 'pending'
  >('all');
  const [summarySearchText, setSummarySearchText] = useState('');
  const [summaryRowLimit, setSummaryRowLimit] = useState('25');
  const geotechnicalSummary = summarizeProjectGeotechnical(projectSpecifics);
  const includedProjectMaterials = selectProjectGeotechnicalMaterials(projectSpecifics);
  const projectMaterialById = new Map(
    projectSpecifics.geotechnicalMaterials.materials.map((material) => [material.id, material]),
  );
  const projectReferenceById = new Map(
    projectSpecifics.references.map((reference) => [reference.id, reference]),
  );

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

  const linkedJoints = draft.joints.filter(
    (joint) => joint.pileTypeId === activeTypeId && joint.active,
  );
  const activeRow = activeJointId ? (draft.geoResults[activeJointId] ?? null) : null;
  const activeJoint = linkedJoints.find((joint) => joint.id === activeJointId) ?? null;

  useEffect(() => {
    if (linkedJoints.length === 0) {
      if (activeJointId) setActiveJointId('');
      return;
    }
    if (!linkedJoints.some((joint) => joint.id === activeJointId)) {
      setActiveJointId(linkedJoints[0]?.id ?? '');
    }
  }, [activeJointId, linkedJoints]);

  useEffect(() => {
    if (!selectedJointId) {
      return;
    }
    if (!draft.joints.some((joint) => joint.id === selectedJointId)) {
      return;
    }
    setActiveJointId(selectedJointId);
  }, [draft.joints, selectedJointId]);

  const activeType = draft.pileTypes.find((pileType) => pileType.id === activeTypeId) ?? null;
  const activeTypeSettings = activeType
    ? (draft.geoTypeSettings[activeType.id] ?? defaultGeoTypeSettings(activeType))
    : null;
  const arrSettings = projectSpecifics.geotechnicalBasis.arrAssessment;
  const adoptedPhi = activeTypeSettings
    ? adoptedPhiForRedundancy(arrSettings, activeTypeSettings.redundancy)
    : null;
  const detailRow = activeRow ?? null;
  const displayLayerRows: GeoLayerPreviewRow[] = detailRow?.layerRows.length
    ? detailRow.layerRows
    : buildLayerPreview(
        activeTypeSettings,
        projectMaterialById,
        projectReferenceById,
        geotechnicalSummary.activeReferenceTitle,
      );
  const foundingMaterial = activeTypeSettings?.foundingMaterialId
    ? (projectMaterialById.get(activeTypeSettings.foundingMaterialId) ?? null)
    : null;
  const displayFounding = buildFoundingPreview({
    detailRow,
    settings: activeTypeSettings,
    material: foundingMaterial,
    projectReferenceById,
    activeProjectSourceLabel: geotechnicalSummary.activeReferenceTitle,
  });
  const detailStatus = detailRow?.status ?? 'pending';
  const pendingMessage = resolvePendingMessage({
    activeType,
    activeJointId,
    activeTypeSettings,
    detailRow,
    displayLayerRows,
    displayFounding,
  });
  const geoTypeSummaryRows: GeoTypeSummaryRow[] = draft.pileTypes
    .slice()
    .sort((left, right) => left.order - right.order)
    .map((pileType) => {
      const representativeJoint =
        draft.joints
          .filter((joint) => joint.pileTypeId === pileType.id && joint.active)
          .sort((left, right) => left.order - right.order)[0] ?? null;
      const summaryRow = representativeJoint
        ? (draft.geoResults[representativeJoint.id] ?? null)
        : null;
      const typeSettings = draft.geoTypeSettings[pileType.id] ?? defaultGeoTypeSettings(pileType);
      const typeFoundingMaterial = typeSettings?.foundingMaterialId
        ? (projectMaterialById.get(typeSettings.foundingMaterialId) ?? null)
        : null;
      const foundingPreview = buildFoundingPreview({
        detailRow: summaryRow,
        settings: typeSettings,
        material: typeFoundingMaterial,
        projectReferenceById,
        activeProjectSourceLabel: geotechnicalSummary.activeReferenceTitle,
      });
      const representativePileId = representativeJoint
        ? (draft.generatedPiles
            .filter((pile) => pile.parentJointId === representativeJoint.id)
            .sort((left, right) => left.supportIndex - right.supportIndex)[0]?.id ?? '')
        : '';

      return {
        pileTypeId: pileType.id,
        pileTypeLabel: pileType.displayName || pileType.id,
        representativeJointId: representativeJoint?.id ?? '',
        representativeJointLabel:
          representativeJoint?.displayName ||
          representativeJoint?.jointDisplayName ||
          representativeJoint?.id ||
          'No linked joint',
        representativePileId,
        foundingLabel: foundingPreview.label,
        adoptedSocketLength: summaryRow?.LsAdopted ?? resolvePreviewSocketLength(typeSettings),
        compUtil: summaryRow?.utilComp ?? null,
        upliftUtil: summaryRow?.utilTen ?? null,
        status: summaryRow?.status === 'resolved' ? (summaryRow.ok ? 'pass' : 'fail') : 'pending',
      };
    });
  const filteredSummaryRows = geoTypeSummaryRows
    .filter((row) => {
      if (summaryTypeFilter !== 'all' && row.pileTypeId !== summaryTypeFilter) {
        return false;
      }
      if (summaryStatusFilter !== 'all' && row.status !== summaryStatusFilter) {
        return false;
      }
      if (!summarySearchText.trim()) {
        return true;
      }

      const search = summarySearchText.trim().toLowerCase();
      return [
        row.pileTypeId,
        row.pileTypeLabel,
        row.representativeJointId,
        row.representativeJointLabel,
        row.representativePileId,
        row.foundingLabel,
      ]
        .join(' ')
        .toLowerCase()
        .includes(search);
    })
    .slice(0, Math.max(1, Number(summaryRowLimit) || 25));
  const primaryGeotechnicalReference = projectSpecifics.references.find(
    (reference) => reference.active && reference.primaryGeotechnical,
  );
  const primaryGeotechnicalReferenceLabel = primaryGeotechnicalReference
    ? resolveProjectReferenceLabel(primaryGeotechnicalReference)
    : 'Not set';
  const activeJointLabel =
    activeJoint?.displayName ||
    activeJoint?.jointDisplayName ||
    activeJoint?.id ||
    'No linked joint';
  const storedGeoStatusLabel =
    detailStatus === 'resolved'
      ? detailRow?.ok
        ? 'Stored GEO PASS'
        : 'Stored GEO FAIL'
      : 'Stored GEO Pending';
  const storedGeoBadgeVariant: StatusBadgeVariant =
    detailStatus === 'resolved' ? (detailRow?.ok ? 'success' : 'warning') : 'warning';
  const baseResistanceLabel =
    (detailRow?.useBase ?? activeTypeSettings?.useBase === 'YES') ? 'Included' : 'Excluded';
  const projectMaterialPreview =
    geotechnicalSummary.materialPreviewLabels.join(', ') || 'No included project materials yet.';
  const layerStackSummary = displayLayerRows.length
    ? displayLayerRows
        .map(
          (row) =>
            `L${row.slot}: ${row.label} @ ${formatMaybeNumberWithUnit(row.H, 'm')} (${row.sourceReferenceLabel || '—'})`,
        )
        .join('; ')
    : 'No layer thicknesses are currently authored for this type.';
  const layerResolutionSummary = summarizeLayerResolution(displayLayerRows);
  const adoptedSocketLength =
    detailRow?.LsAdopted ?? resolvePreviewSocketLength(activeTypeSettings);
  const adoptedSocketLengthLabel = formatPositiveMaybeNumber(adoptedSocketLength);
  const socketModeLabel = resolveSocketModeLabel(
    detailRow?.socketMode ?? detailRow?.LsMode ?? activeTypeSettings?.LsMode,
  );
  const socketAdoptionSummary = detailRow?.socketAdoptionNote || pendingMessage;
  const projectGeotechnicalContextIntro = resolveProjectGeotechnicalContextIntro(projectSpecifics);
  const foundingResolutionLabel = formatResolutionMode(displayFounding.resolutionMode);
  const foundingBasisSummary = buildFoundingBasisSummary(displayFounding, baseResistanceLabel);
  const storedGeoDetailSummary =
    detailStatus === 'resolved'
      ? detailRow?.ok
        ? 'Stored GEO row available and currently passing.'
        : 'Stored GEO row available and currently failing.'
      : 'No stored GEO row is currently available for this representative joint.';
  const storedGeoUpdatedAtLabel = formatDateTime(detailRow?.updatedAt);
  const activeTypeDiameterM =
    activeType != null
      ? Math.max(0, Number(activeType.Dmm || activeType.nominalDiameterMm || 0)) / 1000
      : 0;
  const defaultSocketIntoBearing = activeTypeDiameterM > 0 ? 1.5 * activeTypeDiameterM : 0;
  const effectiveMinimumSocketIntoBearing = detailRow?.LsMin
    ? detailRow.LsMin
    : activeTypeSettings?.useLsMinOverride
      ? activeTypeSettings.LsMinOverride
      : defaultSocketIntoBearing;

  function updateGeoTypeSettings(
    pileTypeId: string,
    updater: (
      settings: MultiPileState['geoTypeSettings'][string],
    ) => MultiPileState['geoTypeSettings'][string],
  ) {
    updateDraft((current) => {
      const pileType = current.pileTypes.find((row) => row.id === pileTypeId);
      if (!pileType) {
        return current;
      }
      const currentSettings =
        current.geoTypeSettings[pileType.id] ?? defaultGeoTypeSettings(pileType);
      return {
        ...current,
        geoTypeSettings: {
          ...current.geoTypeSettings,
          [pileType.id]: updater(currentSettings),
        },
      };
    });
  }

  const activeDesignerLayerRows = activeTypeSettings
    ? [
        {
          key: 's1MaterialId' as const,
          heightKey: 's1H' as const,
          label: 'Layer 1',
          height: activeTypeSettings.s1H,
          materialId: activeTypeSettings.s1MaterialId,
        },
        {
          key: 's2MaterialId' as const,
          heightKey: 's2H' as const,
          label: 'Layer 2',
          height: activeTypeSettings.s2H,
          materialId: activeTypeSettings.s2MaterialId,
        },
        {
          key: 's3MaterialId' as const,
          heightKey: 's3H' as const,
          label: 'Layer 3',
          height: activeTypeSettings.s3H,
          materialId: activeTypeSettings.s3MaterialId,
        },
      ]
    : [];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div className="space-y-1">
            <CardTitle className="text-base">GEO Overview</CardTitle>
            <CardDescription>
              Shared project geotechnical context is compact by default here. The selected pile type
              and representative row open the detailed adopted basis only when you need it.
            </CardDescription>
          </div>
          <Link
            href={editProjectArrHref}
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            Edit Foundations Basis
          </Link>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-3 xl:grid-cols-6">
            <MetricCard
              label="Project source"
              value={geotechnicalSummary.activeReferenceTitle}
              compact
            />
            <MetricCard
              label="Included materials"
              value={`${includedProjectMaterials.length} / ${projectSpecifics.geotechnicalMaterials.materials.length}`}
            />
            <MetricCard label="ARR band" value={arrSettings.arrBand} />
            <MetricCard
              label="phi_g LOW / HIGH"
              value={`${formatMaybeNumber(arrSettings.phiGLow)} / ${formatMaybeNumber(arrSettings.phiGHigh)}`}
            />
            <MetricCard
              label="Selected type / joint"
              value={`${activeType?.displayName || activeType?.id || '—'} / ${activeJointLabel}`}
              compact
            />
            <MetricCard label="Selected status" value={storedGeoStatusLabel} compact />
          </div>

          <details className="rounded-lg border bg-muted/10 p-4">
            <summary className="cursor-pointer text-sm font-semibold">
              View project geotechnical basis and ARR detail
            </summary>
            <div className="mt-4 space-y-4">
              <div className="rounded-lg border bg-background p-4 text-sm text-muted-foreground">
                {projectGeotechnicalContextIntro}
              </div>

              <div className="grid gap-4 xl:grid-cols-3">
                <ContextPanel
                  title="Project Geotechnical Material Library Summary"
                  description="Only project geotechnical materials flagged for inclusion are read here. The active GEO workspace adopts these rows read-only."
                >
                  <ContextLine
                    label="Primary geotechnical report"
                    value={primaryGeotechnicalReferenceLabel}
                  />
                  <ContextLine label="Included material preview" value={projectMaterialPreview} />
                  <ContextLine
                    label="Project source of truth"
                    value="Project page geotechnical materials library"
                  />
                </ContextPanel>

                <ContextPanel
                  title="Project Geotechnical Basis / Global GEO Controls"
                  description="Project-level groundwater, uplift, socket, and founding commentary adopted as shared GEO context for the current workspace."
                >
                  <ContextLine
                    label="Groundwater design notes"
                    value={formatLongTextValue(
                      projectSpecifics.geotechnicalBasis.groundwaterDesignNotes,
                    )}
                  />
                  <ContextLine
                    label="Default CFA uplift logic"
                    value={geotechnicalSummary.cfaUpliftSummary}
                  />
                  <ContextLine
                    label="Default socket assumptions"
                    value={formatLongTextValue(
                      projectSpecifics.geotechnicalBasis.defaultSocketAssumptions,
                    )}
                  />
                  <ContextLine
                    label="Project-level founding notes"
                    value={formatLongTextValue(projectSpecifics.geotechnicalBasis.foundingNotes)}
                  />
                  <ContextLine
                    label="Geotechnical commentary"
                    value={formatLongTextValue(projectSpecifics.geotechnicalBasis.commentary)}
                  />
                </ContextPanel>

                <ContextPanel
                  title="ARR / phi_g Project Assessment"
                  description="AS 2159 Section 4.3 assessment is project-owned. The current type only selects redundancy and adopts the corresponding phi_g here."
                >
                  <ContextLine
                    label="Project ARR / band"
                    value={`${formatMaybeNumber(arrSettings.arrValue)} / ${arrSettings.arrBand}`}
                  />
                  <ContextLine
                    label="Testing / phi_tf / K"
                    value={`${geotechnicalSummary.testingSummary} / ${arrSettings.phiTf == null ? 'phi_gb' : formatMaybeNumber(arrSettings.phiTf)} / ${formatMaybeNumber(arrSettings.testBenefitK)}`}
                  />
                  <ContextLine
                    label="Project phi_g LOW / HIGH"
                    value={`${formatMaybeNumber(arrSettings.phiGLow)} / ${formatMaybeNumber(arrSettings.phiGHigh)}`}
                  />
                  <ContextLine
                    label="Adopted phi_g for this type"
                    value={
                      adoptedPhi != null && activeTypeSettings
                        ? `${formatMaybeNumber(adoptedPhi)} (${activeTypeSettings.redundancy} redundancy)`
                        : 'No active pile type redundancy available'
                    }
                  />
                  <ContextLine
                    label="Project phi_gb LOW / HIGH"
                    value={`${formatMaybeNumber(arrSettings.phiGbLow)} / ${formatMaybeNumber(arrSettings.phiGbHigh)}`}
                  />
                </ContextPanel>
              </div>

              <div className="overflow-x-auto rounded-lg border">
                <Table className="text-xs">
                  <TableHeader className="[&_th]:bg-background">
                    <TableRow>
                      <TableHead>Category</TableHead>
                      <TableHead>Risk factor</TableHead>
                      <TableHead>wi</TableHead>
                      <TableHead>IRR</TableHead>
                      <TableHead>wi x IRR</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {MULTI_PILE_GEO_ARR_ITEMS.map((item, index) => {
                      const irr = arrSettings.irrValues[index] ?? 3;
                      return (
                        <TableRow key={item.name}>
                          <TableCell className="py-2">{item.category}</TableCell>
                          <TableCell className="min-w-[18rem] py-2">{item.name}</TableCell>
                          <TableCell className="py-2">
                            {formatMaybeNumber(item.weighting)}
                          </TableCell>
                          <TableCell className="py-2">{formatMaybeNumber(irr)}</TableCell>
                          <TableCell className="py-2">
                            {formatMaybeNumber(item.weighting * irr)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          </details>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">GEO Summary Table</CardTitle>
          <CardDescription>
            One row per pile type keeps the GEO workspace compact. Selecting a row focuses the
            representative joint detail below.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <MultiPileFieldFilter label="Pile type">
              <Select value={summaryTypeFilter} onValueChange={setSummaryTypeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All pile types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All pile types</SelectItem>
                  {draft.pileTypes
                    .slice()
                    .sort((left, right) => left.order - right.order)
                    .map((pileType) => (
                      <SelectItem key={pileType.id} value={pileType.id}>
                        {pileType.displayName || pileType.id}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </MultiPileFieldFilter>

            <MultiPileFieldFilter label="Status">
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
                  <SelectItem value="pending">Pending only</SelectItem>
                </SelectContent>
              </Select>
            </MultiPileFieldFilter>

            <MultiPileFieldFilter label="Search">
              <Input
                value={summarySearchText}
                onChange={(event) => setSummarySearchText(event.target.value)}
                placeholder="Type, joint, material"
              />
            </MultiPileFieldFilter>

            <MultiPileFieldFilter label="Visible rows">
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
            </MultiPileFieldFilter>
          </div>

          {filteredSummaryRows.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No pile types match the current GEO summary filters.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-lg border">
              <Table className="text-xs">
                <TableHeader className="[&_th]:bg-background">
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Representative joint / pile</TableHead>
                    <TableHead>Founding material</TableHead>
                    <TableHead>Adopted socket</TableHead>
                    <TableHead>Comp util</TableHead>
                    <TableHead>Uplift util</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSummaryRows.map((row) => {
                    const isActiveRow = row.pileTypeId === activeTypeId;

                    return (
                      <TableRow
                        key={row.pileTypeId}
                        className={isActiveRow ? 'bg-muted/40' : undefined}
                        onClick={() => {
                          setActiveTypeId(row.pileTypeId);
                          setActiveJointId(row.representativeJointId);
                        }}
                      >
                        <TableCell className="cursor-pointer py-2">
                          <div className="font-medium">{row.pileTypeId}</div>
                          <div className="text-xs text-muted-foreground">{row.pileTypeLabel}</div>
                        </TableCell>
                        <TableCell className="cursor-pointer py-2">
                          <div className="font-medium">{row.representativeJointLabel}</div>
                          <div className="text-xs text-muted-foreground">
                            {row.representativePileId || 'No representative pile'}
                          </div>
                        </TableCell>
                        <TableCell className="cursor-pointer py-2">{row.foundingLabel}</TableCell>
                        <TableCell className="cursor-pointer py-2">
                          {formatPositiveMaybeNumber(row.adoptedSocketLength)}
                        </TableCell>
                        <TableCell className="cursor-pointer py-2">
                          {formatMaybePercent(row.compUtil)}
                        </TableCell>
                        <TableCell className="cursor-pointer py-2">
                          {formatMaybePercent(row.upliftUtil)}
                        </TableCell>
                        <TableCell className="py-2">
                          <Badge variant={geoSummaryStatusVariant(row.status)}>
                            {geoSummaryStatusLabel(row.status)}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Active Pile Type GEO Designer</CardTitle>
          <CardDescription>
            The summary stays above. The active pile type below exposes type-level material mapping,
            socket controls, and stored GEO results.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-[1fr_1fr_2fr]">
            <div>
              <div className="mb-2 text-sm font-medium">Active pile type</div>
              <Select
                value={activeTypeId || '__none__'}
                onValueChange={(nextValue) =>
                  setActiveTypeId(nextValue === '__none__' ? '' : nextValue)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select pile type" />
                </SelectTrigger>
                <SelectContent>
                  {draft.pileTypes.map((pileType) => (
                    <SelectItem key={pileType.id} value={pileType.id}>
                      {pileType.displayName || pileType.id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <div className="mb-2 text-sm font-medium">Representative joint</div>
              <Select
                value={activeJointId || '__none__'}
                onValueChange={(nextValue) =>
                  setActiveJointId(nextValue === '__none__' ? '' : nextValue)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select joint" />
                </SelectTrigger>
                <SelectContent>
                  {linkedJoints.length === 0 ? (
                    <SelectItem value="__none__">No linked joint available</SelectItem>
                  ) : (
                    linkedJoints.map((joint) => (
                      <SelectItem key={joint.id} value={joint.id}>
                        {joint.displayName || joint.jointDisplayName || joint.id}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-wrap items-end gap-2">
              {activeType ? <Badge variant="outline">{activeType.id}</Badge> : null}
              {activeTypeSettings ? (
                <Badge variant="outline">{activeTypeSettings.redundancy} redundancy</Badge>
              ) : null}
              {adoptedPhi != null ? (
                <Badge variant="outline">phi_g {formatMaybeNumber(adoptedPhi)}</Badge>
              ) : null}
              {activeTypeDiameterM > 0 ? (
                <Badge variant="outline">
                  D {formatMaybeNumberWithUnit(activeTypeDiameterM, 'm')}
                </Badge>
              ) : null}
              <Badge variant={storedGeoBadgeVariant}>{storedGeoStatusLabel}</Badge>
            </div>
          </div>

          {!activeType || !activeTypeSettings ? (
            <div className="rounded-lg border border-dashed border-border/80 px-4 py-8 text-sm text-muted-foreground">
              Select an active pile type to restore its by-pile-type GEO designer.
            </div>
          ) : (
            <>
              {includedProjectMaterials.length === 0 ? (
                <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
                  No project geotechnical materials have been recorded yet. Layer and founding /
                  socket selectors stay empty until project-owned material rows are added on the
                  Project page.
                </div>
              ) : null}

              <div className="grid gap-4 lg:grid-cols-3 xl:grid-cols-6">
                <MetricCard label="Founding material" value={displayFounding.label} compact />
                <MetricCard
                  label="Socket mode / adopted Ls"
                  value={`${socketModeLabel} / ${adoptedSocketLengthLabel}`}
                  compact
                />
                <MetricCard
                  label="Min socket into bearing"
                  value={formatMaybeNumberWithUnit(effectiveMinimumSocketIntoBearing, 'm')}
                  compact
                />
                <MetricCard
                  label="Comp util"
                  value={formatMaybePercent(detailRow?.utilComp)}
                  compact
                />
                <MetricCard
                  label="Uplift util"
                  value={formatMaybePercent(detailRow?.utilTen)}
                  compact
                />
                <MetricCard label="Base resistance" value={baseResistanceLabel} compact />
              </div>

              {detailStatus === 'resolved' ? (
                <div className="rounded-lg border bg-muted/10 p-4 text-sm">
                  Compression utilisation {formatMaybePercent(detailRow?.utilComp)}. Uplift
                  utilisation {formatMaybePercent(detailRow?.utilTen)}.{' '}
                  {detailRow?.socketAdoptionNote}
                </div>
              ) : (
                <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
                  {pendingMessage}
                </div>
              )}

              {detailRow?.inputWarnings?.length ? (
                <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
                  {detailRow.inputWarnings.join(' ')}
                </div>
              ) : null}

              <div className="grid gap-4 xl:grid-cols-4">
                <div className="space-y-3 rounded-lg border bg-muted/10 p-4">
                  <div className="space-y-1">
                    <div className="text-sm font-semibold">REDUNDANCY / ADOPTED phi_g</div>
                    <p className="text-sm text-muted-foreground">
                      AS 2159 Section 4.3 remains project-owned. This type only selects LOW or HIGH
                      redundancy and adopts the matching phi_g here.
                    </p>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <div className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">
                        Redundancy
                      </div>
                      <Select
                        value={activeTypeSettings.redundancy}
                        onValueChange={(nextValue) =>
                          updateGeoTypeSettings(activeType.id, (current) => ({
                            ...current,
                            redundancy: nextValue === 'HIGH' ? 'HIGH' : 'LOW',
                          }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="LOW">LOW</SelectItem>
                          <SelectItem value="HIGH">HIGH</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="rounded-md border bg-background p-3 text-sm text-muted-foreground">
                      Adopted phi_g from project ARR assessment: {formatMaybeNumber(adoptedPhi)}
                      <div className="mt-1 text-xs">
                        Project LOW / HIGH phi_g = {formatMaybeNumber(arrSettings.phiGLow)} /{' '}
                        {formatMaybeNumber(arrSettings.phiGHigh)}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-3 rounded-lg border bg-muted/10 p-4">
                  <div className="space-y-1">
                    <div className="text-sm font-semibold">SHAFT REDUCTION (eta_s)</div>
                    <p className="text-sm text-muted-foreground">
                      Type-owned shaft reduction factors are restored here for compression and
                      tension.
                    </p>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div>
                      <div className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">
                        Compression
                      </div>
                      <Input
                        type="number"
                        step="0.05"
                        value={activeTypeSettings.shaftRedComp}
                        onChange={(event) =>
                          updateGeoTypeSettings(activeType.id, (current) => ({
                            ...current,
                            shaftRedComp: Math.max(0, numberFromInput(event.target.value)),
                          }))
                        }
                      />
                    </div>
                    <div>
                      <div className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">
                        Tension
                      </div>
                      <Input
                        type="number"
                        step="0.05"
                        value={activeTypeSettings.shaftRedTen}
                        onChange={(event) =>
                          updateGeoTypeSettings(activeType.id, (current) => ({
                            ...current,
                            shaftRedTen: Math.max(0, numberFromInput(event.target.value)),
                          }))
                        }
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-3 rounded-lg border bg-muted/10 p-4">
                  <div className="space-y-1">
                    <div className="text-sm font-semibold">NEGATIVE FRICTION / DOWNDRAG</div>
                    <p className="text-sm text-muted-foreground">
                      Include Nnf only when this type should add downdrag into compression demand.
                    </p>
                  </div>
                  <label className="flex items-center gap-2 text-sm font-medium">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border border-input"
                      checked={activeTypeSettings.useNnf}
                      onChange={(event) =>
                        updateGeoTypeSettings(activeType.id, (current) => ({
                          ...current,
                          useNnf: event.target.checked,
                        }))
                      }
                    />
                    Include Nnf
                  </label>
                  <div>
                    <div className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">
                      Nnf (kN)
                    </div>
                    <Input
                      type="number"
                      step="1"
                      value={activeTypeSettings.Nnf}
                      disabled={!activeTypeSettings.useNnf}
                      onChange={(event) =>
                        updateGeoTypeSettings(activeType.id, (current) => ({
                          ...current,
                          Nnf: Math.max(0, numberFromInput(event.target.value)),
                        }))
                      }
                    />
                  </div>
                </div>

                <div className="space-y-3 rounded-lg border bg-muted/10 p-4">
                  <div className="space-y-1">
                    <div className="text-sm font-semibold">STORED GEO RESULT / CHECK OUTPUT</div>
                    <p className="text-sm text-muted-foreground">
                      GEO results still come from the existing calc-engine and representative joint
                      result path.
                    </p>
                  </div>
                  <ContextLine label="Representative joint" value={activeJointLabel} />
                  <ContextLine label="Stored GEO detail" value={storedGeoDetailSummary} />
                  <ContextLine label="Updated" value={storedGeoUpdatedAtLabel} />
                </div>
              </div>

              <div className="grid gap-4 xl:grid-cols-2">
                <div className="space-y-4 rounded-lg border bg-muted/10 p-4">
                  <div className="space-y-1">
                    <div className="text-sm font-semibold">SOIL / GEOLOGICAL LAYERS (SHAFT)</div>
                    <p className="text-sm text-muted-foreground">
                      Author layer thicknesses and project geotechnical material mapping for the
                      active pile type. Only project-owned material rows are selectable here.
                    </p>
                  </div>

                  {activeDesignerLayerRows.map((layer) => {
                    const selectedMaterial = layer.materialId
                      ? (projectMaterialById.get(layer.materialId) ?? null)
                      : null;
                    const selectorOptions = selectProjectGeotechnicalMaterials(projectSpecifics, {
                      selectedId: layer.materialId,
                    });
                    const selectedLabel = selectedMaterial
                      ? resolveProjectGeotechnicalMaterialLabel(selectedMaterial)
                      : layer.materialId
                        ? `Missing material (${layer.materialId})`
                        : 'No project geo material selected';
                    const sourceReferenceLabel = selectedMaterial
                      ? resolveProjectGeoMaterialSourceReferenceLabel(
                          selectedMaterial,
                          projectReferenceById,
                          geotechnicalSummary.activeReferenceTitle,
                        )
                      : '—';

                    return (
                      <div
                        key={layer.key}
                        className="grid gap-4 rounded-lg border bg-background p-4 lg:grid-cols-[0.8fr_1.2fr_1.8fr]"
                      >
                        <div>
                          <div className="mb-2 text-sm font-medium">{layer.label} H</div>
                          <Input
                            type="number"
                            step="0.01"
                            value={layer.height}
                            onChange={(event) =>
                              updateGeoTypeSettings(activeType.id, (current) => ({
                                ...current,
                                [layer.heightKey]: Math.max(0, numberFromInput(event.target.value)),
                              }))
                            }
                          />
                        </div>
                        <div>
                          <div className="mb-2 text-sm font-medium">{layer.label} material</div>
                          <Select
                            value={layer.materialId || '__none__'}
                            onValueChange={(nextValue) =>
                              updateGeoTypeSettings(activeType.id, (current) => ({
                                ...current,
                                [layer.key]: nextValue === '__none__' ? '' : nextValue,
                              }))
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select project geo material" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__none__">
                                No project geo material selected
                              </SelectItem>
                              {layer.materialId && !selectedMaterial ? (
                                <SelectItem value={layer.materialId}>
                                  Missing material ({layer.materialId})
                                </SelectItem>
                              ) : null}
                              {selectorOptions.map((material) => (
                                <SelectItem key={material.id} value={material.id}>
                                  {resolveProjectGeotechnicalMaterialLabel(material)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1 text-sm text-muted-foreground">
                          <div className="font-medium text-foreground">{selectedLabel}</div>
                          {selectedMaterial ? (
                            <>
                              <div>
                                f_m,s comp. {selectedMaterial.pile_fms_comp_kPa ?? 'n/a'} kPa
                                {' · '}f_m,s tension{' '}
                                {selectedMaterial.pile_fms_tension_kPa ?? 'n/a'} kPa
                              </div>
                              <div>Source: {sourceReferenceLabel}</div>
                            </>
                          ) : layer.materialId ? (
                            <div className="text-destructive">
                              Saved selection could not be resolved from the project-owned
                              geotechnical materials.
                            </div>
                          ) : (
                            <div>No material selected for this layer.</div>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  <div className="rounded-lg border bg-background p-4 text-sm text-muted-foreground">
                    <div className="font-medium text-foreground">
                      {layerResolutionSummary.label}
                    </div>
                    <div className="mt-1">{layerResolutionSummary.detail}</div>
                    <div className="mt-2">{layerStackSummary}</div>
                  </div>
                </div>

                <div className="space-y-4 rounded-lg border bg-muted/10 p-4">
                  <div className="space-y-1">
                    <div className="text-sm font-semibold">ROCK SOCKET / BASE</div>
                    <p className="text-sm text-muted-foreground">
                      Founding / socket selection stays type-owned, but the adopted strengths are
                      still read from the project geotechnical material library.
                    </p>
                  </div>

                  <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
                    <div>
                      <div className="mb-2 text-sm font-medium">Founding / socket material</div>
                      <Select
                        value={activeTypeSettings.foundingMaterialId || '__none__'}
                        onValueChange={(nextValue) =>
                          updateGeoTypeSettings(activeType.id, (current) => ({
                            ...current,
                            foundingMaterialId: nextValue === '__none__' ? '' : nextValue,
                          }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select founding / socket material" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">
                            No founding / socket material selected
                          </SelectItem>
                          {activeTypeSettings.foundingMaterialId && !foundingMaterial ? (
                            <SelectItem value={activeTypeSettings.foundingMaterialId}>
                              Missing material ({activeTypeSettings.foundingMaterialId})
                            </SelectItem>
                          ) : null}
                          {selectProjectGeotechnicalMaterials(projectSpecifics, {
                            selectedId: activeTypeSettings.foundingMaterialId,
                          }).map((material) => (
                            <SelectItem key={material.id} value={material.id}>
                              {resolveProjectGeotechnicalMaterialLabel(material)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <div className="mb-2 text-sm font-medium">Include base resistance?</div>
                      <Select
                        value={activeTypeSettings.useBase}
                        onValueChange={(nextValue) =>
                          updateGeoTypeSettings(activeType.id, (current) => ({
                            ...current,
                            useBase: nextValue === 'NO' ? 'NO' : 'YES',
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
                    </div>
                  </div>

                  <div className="grid gap-3 rounded-lg border bg-background p-4 md:grid-cols-2">
                    <ContextLine label="Resolved f_m,s / f_b basis" value={displayFounding.label} />
                    <ContextLine label="Founding resolution mode" value={foundingResolutionLabel} />
                    <ContextLine
                      label="Source / provenance"
                      value={displayFounding.sourceSummary || displayFounding.sourceReferenceLabel}
                    />
                    <ContextLine label="Current basis summary" value={foundingBasisSummary} />
                  </div>

                  <div className="rounded-lg border bg-background p-4 text-sm text-muted-foreground">
                    <div>
                      f_m,s comp ={' '}
                      <b>{formatMaybeNumberWithUnit(displayFounding.fmsComp, 'kPa')}</b>
                      {' · '}f_m,s tension ={' '}
                      <b>{formatMaybeNumberWithUnit(displayFounding.fmsTen, 'kPa')}</b>
                      {' · '}f_b ult ={' '}
                      <b>{formatMaybeNumberWithUnit(displayFounding.fbUlt, 'kPa')}</b>
                    </div>
                    {displayFounding.notes ? (
                      <div className="mt-2">{displayFounding.notes}</div>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="grid gap-4 xl:grid-cols-[1.5fr_1fr]">
                <div className="space-y-4 rounded-lg border bg-muted/10 p-4">
                  <div className="space-y-1">
                    <div className="text-sm font-semibold">SOCKET / FOUNDING LENGTH</div>
                    <p className="text-sm text-muted-foreground">
                      Restore auto-solved socket length, adopted socket length, minimum socket into
                      bearing, and honest auto / manual / pending adoption behavior.
                    </p>
                  </div>

                  <div className="grid gap-4 lg:grid-cols-3">
                    <div className="rounded-lg border bg-background p-4">
                      <div className="text-xs uppercase tracking-wide text-muted-foreground">
                        Auto-solved socket length Ls (m)
                      </div>
                      <div className="mt-2 text-lg font-semibold">
                        {activeTypeSettings.LsSolved > 0
                          ? activeTypeSettings.LsSolved.toFixed(2)
                          : '—'}
                      </div>
                    </div>
                    <div className="rounded-lg border bg-background p-4">
                      <div className="text-xs uppercase tracking-wide text-muted-foreground">
                        Adopted socket length Ls (m)
                      </div>
                      <div className="mt-2 text-lg font-semibold">{adoptedSocketLengthLabel}</div>
                      <div className="text-sm text-muted-foreground">{socketModeLabel}</div>
                    </div>
                    <div className="rounded-lg border bg-background p-4">
                      <div className="text-xs uppercase tracking-wide text-muted-foreground">
                        Effective minimum socket into bearing
                      </div>
                      <div className="mt-2 text-lg font-semibold">
                        {formatMaybeNumberWithUnit(effectiveMinimumSocketIntoBearing, 'm')}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Default 1.5D = {formatMaybeNumberWithUnit(defaultSocketIntoBearing, 'm')}
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-4 rounded-lg border bg-background p-4 lg:grid-cols-[1.4fr_1.2fr]">
                    <div className="space-y-3">
                      <label className="flex items-center gap-2 text-sm font-medium">
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border border-input"
                          checked={activeTypeSettings.useLsMinOverride}
                          onChange={(event) =>
                            updateGeoTypeSettings(activeType.id, (current) => ({
                              ...current,
                              useLsMinOverride: event.target.checked,
                            }))
                          }
                        />
                        Minimum socket into bearing override
                      </label>
                      <Input
                        type="number"
                        step="0.05"
                        value={activeTypeSettings.LsMinOverride}
                        disabled={!activeTypeSettings.useLsMinOverride}
                        onChange={(event) =>
                          updateGeoTypeSettings(activeType.id, (current) => ({
                            ...current,
                            LsMinOverride: Math.max(0, numberFromInput(event.target.value)),
                          }))
                        }
                      />
                      <div className="text-sm text-muted-foreground">
                        Default = 1.5D. Override only when the project basis requires a different
                        minimum embedment.
                      </div>
                    </div>

                    <div className="space-y-3">
                      <label className="flex items-center gap-2 text-sm font-medium">
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border border-input"
                          checked={activeTypeSettings.socketOverrideEnabled}
                          onChange={(event) =>
                            updateGeoTypeSettings(activeType.id, (current) => ({
                              ...current,
                              socketOverrideEnabled: event.target.checked,
                              LsMode:
                                event.target.checked && current.LsManual > 0 ? 'manual' : 'pending',
                              LsAdopted:
                                event.target.checked && current.LsManual > 0 ? current.LsManual : 0,
                              Ls:
                                event.target.checked && current.LsManual > 0 ? current.LsManual : 0,
                            }))
                          }
                        />
                        Override adopted socket length
                      </label>
                      <Input
                        type="number"
                        step="0.05"
                        value={activeTypeSettings.LsManual}
                        disabled={!activeTypeSettings.socketOverrideEnabled}
                        onChange={(event) =>
                          updateGeoTypeSettings(activeType.id, (current) => {
                            const manual = Math.max(0, numberFromInput(event.target.value));
                            return {
                              ...current,
                              LsManual: manual,
                              LsMode:
                                current.socketOverrideEnabled && manual > 0 ? 'manual' : 'pending',
                              LsAdopted: current.socketOverrideEnabled && manual > 0 ? manual : 0,
                              Ls: current.socketOverrideEnabled && manual > 0 ? manual : 0,
                            };
                          })
                        }
                      />
                      <div className="text-sm text-muted-foreground">
                        Mode: <b>{socketModeLabel}</b>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4 rounded-lg border bg-muted/10 p-4">
                  <div className="space-y-1">
                    <div className="text-sm font-semibold">SUPPORTING NOTES / WARNINGS</div>
                    <p className="text-sm text-muted-foreground">
                      Compact notes stay alongside the active type rather than repeating large
                      project context blocks.
                    </p>
                  </div>
                  <ContextLine
                    label="Project geotechnical source"
                    value={geotechnicalSummary.activeReferenceTitle}
                  />
                  <ContextLine label="Layer resolution" value={layerResolutionSummary.detail} />
                  <ContextLine label="Socket adoption note" value={socketAdoptionSummary} />
                  <ContextLine label="Founding / socket basis" value={foundingBasisSummary} />
                  <ContextLine
                    label="Project-level founding notes"
                    value={formatLongTextValue(projectSpecifics.geotechnicalBasis.foundingNotes)}
                  />
                </div>
              </div>

              <div className="space-y-4 rounded-lg border bg-muted/10 p-4">
                <div className="space-y-1">
                  <div className="text-sm font-semibold">SOCKET / SHAFT BREAKDOWN</div>
                  <p className="text-sm text-muted-foreground">
                    Use current stored GEO result rows only. No solver rewrite or duplicate runtime
                    state is introduced here.
                  </p>
                </div>
                <div className="overflow-x-auto rounded-lg border bg-background">
                  <Table className="text-xs">
                    <TableHeader className="[&_th]:bg-background">
                      <TableRow>
                        <TableHead>Layer</TableHead>
                        <TableHead>H</TableHead>
                        <TableHead>f_m,s</TableHead>
                        <TableHead>Rs,ult</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {detailRow?.socketContributionBreakdown?.length ? (
                        detailRow.socketContributionBreakdown.map((row, index) => (
                          <TableRow key={`${row.label}-${index}`}>
                            <TableCell className="py-2">{row.label}</TableCell>
                            <TableCell className="py-2">{formatMaybeNumber(row.H)}</TableCell>
                            <TableCell className="py-2">{formatMaybeNumber(row.fms)}</TableCell>
                            <TableCell className="py-2">{formatMaybeNumber(row.Rs)}</TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center text-muted-foreground">
                            No stored socket / shaft breakdown is available for this representative
                            joint yet.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>

              <details className="rounded-lg border bg-muted/10 p-4">
                <summary className="cursor-pointer text-sm font-semibold">
                  View adopted basis and project context
                </summary>
                <div className="mt-4 grid gap-4 xl:grid-cols-3">
                  <StagePanel
                    title="1. Project-Owned Library / Basis Context"
                    description="Hydrated project-owned paths feeding this GEO workspace. Editing remains on the Project page."
                    badge={<Badge variant="outline">Project page source of truth</Badge>}
                  >
                    <ContextLine
                      label="Project geotechnical source"
                      value={geotechnicalSummary.activeReferenceTitle}
                    />
                    <ContextLine
                      label="Included project materials"
                      value={`${includedProjectMaterials.length} / ${projectSpecifics.geotechnicalMaterials.materials.length} material rows currently in use`}
                    />
                    <ContextLine
                      label="Default socket assumptions"
                      value={formatLongTextValue(
                        projectSpecifics.geotechnicalBasis.defaultSocketAssumptions,
                      )}
                    />
                    <ContextLine
                      label="Project-level founding notes"
                      value={formatLongTextValue(projectSpecifics.geotechnicalBasis.foundingNotes)}
                    />
                  </StagePanel>

                  <StagePanel
                    title="2. Adopted Material Resolved For This GEO View"
                    description="Active type material adoption immediately upstream of the GEO check."
                    badge={
                      <Badge
                        variant={badgeVariantForResolutionMode(displayFounding.resolutionMode)}
                      >
                        {foundingResolutionLabel}
                      </Badge>
                    }
                  >
                    <ContextLine label="Founding / socket material" value={displayFounding.label} />
                    <ContextLine
                      label="Source / provenance"
                      value={displayFounding.sourceSummary || displayFounding.sourceReferenceLabel}
                    />
                    <ContextLine
                      label="Layer material resolution"
                      value={layerResolutionSummary.detail}
                    />
                    <ContextLine label="Adopted layer stack" value={layerStackSummary} />
                    <ContextLine
                      label="Socket mode / adopted Ls"
                      value={`${socketModeLabel} / ${adoptedSocketLengthLabel}`}
                    />
                  </StagePanel>

                  <StagePanel
                    title="3. Stored GEO Result / Check Output"
                    description="Stored row keyed to the representative joint, downstream of the adopted project-owned basis."
                    badge={<Badge variant={storedGeoBadgeVariant}>{storedGeoStatusLabel}</Badge>}
                  >
                    <ContextLine label="Representative joint" value={activeJointLabel} />
                    <ContextLine label="Stored GEO detail" value={storedGeoDetailSummary} />
                    <ContextLine label="Updated" value={storedGeoUpdatedAtLabel} />
                    <ContextLine
                      label="Downstream status note"
                      value={detailStatus === 'resolved' ? socketAdoptionSummary : pendingMessage}
                    />
                  </StagePanel>
                </div>
              </details>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function geoSummaryStatusLabel(status: GeoTypeSummaryRow['status']) {
  if (status === 'pass') {
    return 'PASS';
  }
  if (status === 'fail') {
    return 'FAIL';
  }
  return 'PENDING';
}

function geoSummaryStatusVariant(status: GeoTypeSummaryRow['status']): StatusBadgeVariant {
  if (status === 'pass') {
    return 'success';
  }
  if (status === 'fail') {
    return 'warning';
  }
  return 'outline';
}

function buildLayerPreview(
  settings: MultiPileState['geoTypeSettings'][string] | null,
  projectMaterialById: Map<string, ProjectGeoMaterial>,
  projectReferenceById: Map<string, ProjectReference>,
  activeProjectSourceLabel: string,
): GeoLayerPreviewRow[] {
  if (!settings) {
    return [];
  }

  return [
    { slot: 1, H: settings.s1H, materialId: settings.s1MaterialId },
    { slot: 2, H: settings.s2H, materialId: settings.s2MaterialId },
    { slot: 3, H: settings.s3H, materialId: settings.s3MaterialId },
  ]
    .filter((row) => row.H > 0)
    .map((row) => {
      const material = row.materialId ? (projectMaterialById.get(row.materialId) ?? null) : null;
      return {
        slot: row.slot,
        H: row.H,
        fmsComp: material?.pile_fms_comp_kPa ?? 0,
        fmsTen: material?.pile_fms_tension_kPa ?? 0,
        label: material
          ? resolveProjectGeotechnicalMaterialLabel(material)
          : row.materialId
            ? `Missing material (${row.materialId})`
            : 'No project geo material selected',
        sourceReferenceLabel: material
          ? resolveProjectGeoMaterialSourceReferenceLabel(
              material,
              projectReferenceById,
              activeProjectSourceLabel,
            )
          : '—',
        resolutionMode: material ? 'project-library' : 'missing',
      };
    });
}

function buildFoundingPreview({
  detailRow,
  settings,
  material,
  projectReferenceById,
  activeProjectSourceLabel,
}: {
  detailRow: MultiPileGeoResultRow | null;
  settings: MultiPileState['geoTypeSettings'][string] | null;
  material: ProjectGeoMaterial | null;
  projectReferenceById: Map<string, ProjectReference>;
  activeProjectSourceLabel: string;
}): FoundingPreview {
  const sourceReferenceLabel = material
    ? resolveProjectGeoMaterialSourceReferenceLabel(
        material,
        projectReferenceById,
        activeProjectSourceLabel,
      )
    : resolveProjectGeoSourceFallbackLabel(activeProjectSourceLabel);
  const sourceSummary = material
    ? buildProjectGeoMaterialSourceSummary(material, projectReferenceById, activeProjectSourceLabel)
    : sourceReferenceLabel;

  if (!settings) {
    return {
      label: 'No founding / socket material selected',
      sourceReferenceLabel: '—',
      sourceSummary: 'No source reference recorded',
      resolutionMode: 'missing',
      fmsComp: null,
      fmsTen: null,
      fbUlt: null,
      notes: '',
    };
  }

  if (detailRow) {
    return {
      label: detailRow.foundingMaterialLabel || detailRow.foundingLabel || '—',
      sourceReferenceLabel: detailRow.foundingSourceReferenceLabel || sourceReferenceLabel,
      sourceSummary: material
        ? sourceSummary
        : detailRow.foundingSourceReferenceLabel || sourceReferenceLabel || '—',
      resolutionMode: detailRow.foundingResolutionMode,
      fmsComp: detailRow.foundingFmsComp ?? detailRow.resolvedFmSComp,
      fmsTen: detailRow.foundingFmsTen ?? detailRow.resolvedFmSTen,
      fbUlt: detailRow.foundingFbUlt ?? detailRow.resolvedFbUlt,
      notes: material?.notes.trim() || '',
    };
  }

  return {
    label: material
      ? resolveProjectGeotechnicalMaterialLabel(material)
      : settings.foundingMaterialId
        ? `Missing material (${settings.foundingMaterialId})`
        : 'No founding / socket material selected',
    sourceReferenceLabel: material ? sourceReferenceLabel : '—',
    sourceSummary: material
      ? sourceSummary
      : settings.foundingMaterialId
        ? 'Saved founding / socket selection could not be resolved from the project-owned geotechnical materials.'
        : 'No source reference recorded',
    resolutionMode: material ? 'project-library' : 'missing',
    fmsComp: material?.pile_fms_comp_kPa ?? null,
    fmsTen: material?.pile_fms_tension_kPa ?? null,
    fbUlt: material?.pile_fb_ult_kPa ?? null,
    notes: material?.notes.trim() || '',
  };
}

function resolvePendingMessage({
  activeType,
  activeJointId,
  activeTypeSettings,
  detailRow,
  displayLayerRows,
  displayFounding,
}: {
  activeType: MultiPileState['pileTypes'][number] | null;
  activeJointId: string;
  activeTypeSettings: MultiPileState['geoTypeSettings'][string] | null;
  detailRow: MultiPileGeoResultRow | null;
  displayLayerRows: Array<{
    slot: number;
    H: number;
    fmsComp: number;
    fmsTen: number;
    label: string;
    sourceReferenceLabel: string;
    resolutionMode: string;
  }>;
  displayFounding: { label: string; sourceReferenceLabel: string };
}) {
  if (detailRow?.pendingReason) {
    return detailRow.pendingReason;
  }
  if (!activeType) {
    return 'No pile type is available for GEO verification yet.';
  }
  if (!activeJointId) {
    return 'No linked joint / representative pile exists for this type yet.';
  }
  if (displayLayerRows.some((row) => row.resolutionMode !== 'project-library')) {
    return 'One or more layer materials are still unresolved. GEO will stay pending until those project-owned materials are resolved.';
  }
  if (
    displayFounding.label.startsWith('Missing material') ||
    displayFounding.label.startsWith('No founding')
  ) {
    return 'The founding / socket material is unresolved. GEO will stay pending until that project-owned material is resolved.';
  }
  if (activeTypeSettings?.socketOverrideEnabled && activeTypeSettings.LsManual <= 0) {
    return 'Manual socket override is enabled but no adopted socket length is authored yet.';
  }
  return 'Run Envelope + GEO to generate the stored geotechnical row for this representative joint.';
}

function resolveSocketModeLabel(mode: string | null | undefined) {
  if (mode === 'manual') return 'Manual override';
  if (mode === 'auto') return 'Auto';
  return 'Pending';
}

function formatResolutionMode(mode: string | null | undefined) {
  if (mode === 'project-library') return 'Project library';
  if (mode === 'migration-fallback') return 'Saved pile-type basis';
  return 'Pending';
}

function badgeVariantForResolutionMode(mode: string | null | undefined): StatusBadgeVariant {
  if (mode === 'project-library') return 'success';
  if (mode === 'migration-fallback') return 'warning';
  return 'destructive';
}

function summarizeLayerResolution(rows: Array<{ resolutionMode: string }>): {
  label: string;
  detail: string;
  variant: StatusBadgeVariant;
} {
  if (rows.length === 0) {
    return {
      label: 'No layer stack authored',
      detail: 'No layer material mapping is currently authored for this type.',
      variant: 'outline',
    };
  }

  const projectLibraryCount = rows.filter((row) => row.resolutionMode === 'project-library').length;
  const migrationFallbackCount = rows.filter(
    (row) => row.resolutionMode === 'migration-fallback',
  ).length;
  const missingCount = rows.length - projectLibraryCount - migrationFallbackCount;

  if (projectLibraryCount === rows.length) {
    return {
      label: 'Project-library resolved',
      detail: `${projectLibraryCount} of ${rows.length} layers resolved from the project geotechnical material library.`,
      variant: 'success',
    };
  }

  if (missingCount === 0) {
    return {
      label: 'Saved pile-type basis in use',
      detail: `${projectLibraryCount} project-library layer(s) and ${migrationFallbackCount} saved pile-type layer(s) are currently adopted.`,
      variant: 'warning',
    };
  }

  return {
    label: 'Resolution pending',
    detail: `${projectLibraryCount} project-library layer(s), ${migrationFallbackCount} saved pile-type layer(s), and ${missingCount} unresolved layer(s) are currently mapped.`,
    variant: 'warning',
  };
}

function buildFoundingBasisSummary(displayFounding: FoundingPreview, baseResistanceLabel: string) {
  return uniqueNonEmptyText([
    displayFounding.label,
    displayFounding.fmsComp != null
      ? `f_m,s comp ${formatMaybeNumberWithUnit(displayFounding.fmsComp, 'kPa')}`
      : '',
    displayFounding.fmsTen != null
      ? `f_m,s tension ${formatMaybeNumberWithUnit(displayFounding.fmsTen, 'kPa')}`
      : '',
    displayFounding.fbUlt != null
      ? `f_b ult ${formatMaybeNumberWithUnit(displayFounding.fbUlt, 'kPa')}`
      : '',
    `Base resistance ${baseResistanceLabel}`,
  ]);
}

function resolveProjectGeotechnicalContextIntro(projectSpecifics: MultiPileProjectSpecifics) {
  if (projectSpecifics.geotechnicalMaterials.templateState === 'seeded') {
    return 'Project geotechnical materials were template-seeded and remain fully editable project data.';
  }
  if (projectSpecifics.geotechnicalMaterials.templateState === 'imported') {
    return 'Imported pile-type geotechnical values were loaded into the project geotechnical materials library and should be reviewed.';
  }
  if (projectSpecifics.geotechnicalMaterials.activeReferenceId) {
    return 'Project geotechnical materials remain editable project data and are currently linked to the selected project geotechnical report for provenance.';
  }
  return 'Project geotechnical materials are editable project data. A geotechnical report is linked only when the designer chooses to record explicit provenance for the adopted material strengths.';
}

function resolveProjectGeoMaterialSourceReferenceLabel(
  material: ProjectGeoMaterial,
  projectReferenceById: Map<string, ProjectReference>,
  activeProjectSourceLabel: string,
) {
  if (material.sourceReferenceId) {
    const reference = projectReferenceById.get(material.sourceReferenceId);
    return reference ? resolveProjectReferenceLabel(reference) : material.sourceReferenceId;
  }
  return resolveProjectGeoSourceFallbackLabel(activeProjectSourceLabel);
}

function buildProjectGeoMaterialSourceSummary(
  material: ProjectGeoMaterial,
  projectReferenceById: Map<string, ProjectReference>,
  activeProjectSourceLabel: string,
) {
  return uniqueNonEmptyText([
    resolveProjectGeoMaterialSourceReferenceLabel(
      material,
      projectReferenceById,
      activeProjectSourceLabel,
    ),
    material.sourceDocument,
    material.sourceProject,
    material.sourceSite,
    material.sourceSection,
    material.sourceTable,
  ]);
}

function resolveProjectGeoSourceFallbackLabel(activeProjectSourceLabel: string) {
  return activeProjectSourceLabel.startsWith('No ')
    ? 'Project geotechnical material library'
    : activeProjectSourceLabel;
}

function resolvePreviewSocketLength(settings: MultiPileState['geoTypeSettings'][string] | null) {
  if (!settings) return null;
  if (settings.socketOverrideEnabled && settings.LsManual > 0) return settings.LsManual;
  if (settings.LsAdopted > 0) return settings.LsAdopted;
  if (settings.LsSolved > 0) return settings.LsSolved;
  return null;
}

function formatMaybeNumberWithUnit(value: number | null | undefined, unit: string) {
  const formatted = formatMaybeNumber(value);
  return formatted === '—' ? formatted : `${formatted} ${unit}`;
}

function formatPositiveMaybeNumber(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value) || value <= 0) return '—';
  return formatMaybeNumber(value);
}

function formatLongTextValue(value: string | null | undefined) {
  const trimmed = String(value ?? '').trim();
  return trimmed || 'Not recorded';
}

function uniqueNonEmptyText(values: Array<string | null | undefined>) {
  const seen = new Set<string>();
  const parts: string[] = [];

  values.forEach((value) => {
    const trimmed = String(value ?? '').trim();
    if (!trimmed) return;
    if (seen.has(trimmed)) return;
    seen.add(trimmed);
    parts.push(trimmed);
  });

  return parts.join(' · ');
}

function formatMaybeNumber(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) return '—';
  return value.toFixed(3).replace(/0+$/, '').replace(/\.$/, '');
}

function formatMaybePercent(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) return '—';
  return `${value.toFixed(1)}%`;
}

function formatDateTime(value: string | null | undefined) {
  const trimmed = String(value ?? '').trim();
  if (!trimmed) return 'Not yet stored';
  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return trimmed;
  return new Intl.DateTimeFormat('en-AU', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(parsed);
}

function MetricCard({
  label,
  value,
  compact = false,
}: {
  label: string;
  value: string;
  compact?: boolean;
}) {
  return (
    <div className="rounded-lg border bg-muted/10 p-4">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div
        className={
          compact ? 'mt-2 text-sm font-semibold leading-snug' : 'mt-2 text-lg font-semibold'
        }
      >
        {value}
      </div>
    </div>
  );
}

function ContextPanel({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-3 rounded-lg border bg-background p-4">
      <div className="space-y-1">
        <div className="text-sm font-semibold">{title}</div>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function StagePanel({
  title,
  description,
  badge,
  children,
}: {
  title: string;
  description: string;
  badge?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-3 rounded-lg border bg-background p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="space-y-1">
          <div className="text-sm font-semibold">{title}</div>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        {badge}
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function ContextLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1 rounded-md border bg-muted/10 p-3">
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-sm font-medium leading-snug">{value}</div>
    </div>
  );
}
