import * as React from 'react';
import type { DraftingLayer, DraftingObject, DraftingPoint } from '@eng/shared';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { AnchorTiebackProperties } from '../properties/anchor-tieback-properties';
import { BoreholeProperties } from '../properties/borehole-properties';
import { CalloutProperties } from '../properties/callout-properties';
import { CappingBeamProperties } from '../properties/capping-beam-properties';
import { DimensionChainProperties } from '../properties/dimension-chain-properties';
import { formatDraftingTimestamp } from '../model-utils';
import {
  DraftingCommonObjectProperties,
  PropertySection,
} from '../properties/common-object-properties';
import { ExcavationLineProperties } from '../properties/excavation-line-properties';
import { LeaderNoteProperties } from '../properties/leader-note-properties';
import { MonitoringPointProperties } from '../properties/monitoring-point-properties';
import { PileProperties } from '../properties/pile-properties';
import { ProjectGridProperties } from '../properties/project-grid-properties';
import { SecantPileWallProperties } from '../properties/secant-pile-wall-properties';
import { SectionMarkerProperties } from '../properties/section-marker-properties';
import { ServiceCrossingProperties } from '../properties/service-crossing-properties';
import { ServiceRunProperties } from '../properties/service-run-properties';
import { SoldierPileWallProperties } from '../properties/soldier-pile-wall-properties';
import { WalerProperties } from '../properties/waler-properties';

export function DraftingPropertiesPanel({
  layers,
  object,
  objects = [],
  onDelete,
  onRefreshSource,
  onUpdate,
  referenceDatum,
  sourceRefreshState = 'current',
  sourceManageHref,
}: {
  layers: DraftingLayer[];
  object: DraftingObject | null;
  objects?: DraftingObject[];
  onDelete: () => void;
  onRefreshSource?: (object: DraftingObject, options?: { updateCoordinates?: boolean }) => void;
  onUpdate: (nextObject: DraftingObject) => void;
  referenceDatum?: string;
  sourceRefreshState?: 'current' | 'stale' | 'missing';
  sourceManageHref?: string;
}) {
  if (!object) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">No selection</CardTitle>
          <CardDescription>
            Select a drafting object to edit properties. Layers, sources, underlays, sheets, and
            schedules stay available in their own inspector tabs.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-2 text-xs text-muted-foreground sm:grid-cols-3">
          <PanelHint title="Properties">
            Edit geometry, style, layer, and object metadata.
          </PanelHint>
          <PanelHint title="Locks">Object and layer locks are shown after selection.</PanelHint>
          <PanelHint title="Sources">Source provenance appears only for linked objects.</PanelHint>
        </CardContent>
      </Card>
    );
  }

  const objectLayer = layers.find((layer) => layer.id === object.layerId);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle className="text-base">Selected Object</CardTitle>
            {object.locked ? <Badge variant="secondary">Object locked</Badge> : null}
            {objectLayer?.locked ? <Badge variant="secondary">Layer locked</Badge> : null}
            {object.visible === false ? <Badge variant="outline">Hidden</Badge> : null}
          </div>
          <CardDescription>
            {object.type.replaceAll('_', ' ')} · Created {formatDraftingTimestamp(object.createdAt)}
            {objectLayer ? ` · Layer ${objectLayer.name}` : ''}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <DraftingSourceRefProperties
            object={object}
            onRefreshSource={onRefreshSource}
            onUpdate={onUpdate}
            sourceRefreshState={sourceRefreshState}
            sourceManageHref={sourceManageHref}
          />

          <DraftingCommonObjectProperties layers={layers} object={object} onUpdate={onUpdate} />

          <DraftingCoordinateSummary object={object} referenceDatum={referenceDatum} />

          <PropertySection title={propertySectionTitle(object)}>
            {object.type === 'pile' ? <PileProperties object={object} onUpdate={onUpdate} /> : null}
            {object.type === 'secant_pile_wall' ? (
              <SecantPileWallProperties object={object} onUpdate={onUpdate} />
            ) : null}
            {object.type === 'soldier_pile_wall' ? (
              <SoldierPileWallProperties object={object} onUpdate={onUpdate} />
            ) : null}
            {object.type === 'anchor_tieback' ? (
              <AnchorTiebackProperties object={object} onUpdate={onUpdate} />
            ) : null}
            {object.type === 'capping_beam' ? (
              <CappingBeamProperties object={object} onUpdate={onUpdate} />
            ) : null}
            {object.type === 'waler' ? (
              <WalerProperties object={object} onUpdate={onUpdate} />
            ) : null}
            {object.type === 'monitoring_point' ? (
              <MonitoringPointProperties object={object} onUpdate={onUpdate} />
            ) : null}
            {object.type === 'leader_note' ? (
              <LeaderNoteProperties object={object} onUpdate={onUpdate} />
            ) : null}
            {object.type === 'excavation_line' ? (
              <ExcavationLineProperties object={object} onUpdate={onUpdate} />
            ) : null}
            {object.type === 'dimension_chain' ? (
              <DimensionChainProperties objects={objects} object={object} onUpdate={onUpdate} />
            ) : null}
            {object.type === 'callout' ? (
              <CalloutProperties object={object} onUpdate={onUpdate} />
            ) : null}
            {object.type === 'section_marker' ? (
              <SectionMarkerProperties object={object} onUpdate={onUpdate} />
            ) : null}
            {object.type === 'borehole' ? (
              <BoreholeProperties object={object} onUpdate={onUpdate} />
            ) : null}
            {object.type === 'service_run' ? (
              <ServiceRunProperties object={object} onUpdate={onUpdate} />
            ) : null}
            {object.type === 'service_crossing' ? (
              <ServiceCrossingProperties object={object} onUpdate={onUpdate} />
            ) : null}
            {object.type === 'project_grid' ? (
              <ProjectGridProperties
                disabled={Boolean(object.locked || objectLayer?.locked)}
                object={object}
                onUpdate={onUpdate}
              />
            ) : null}
          </PropertySection>

          <Separator />

          <div className="flex gap-2">
            <Button variant="destructive" onClick={onDelete}>
              Delete Object
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function PanelHint({ children, title }: { children: React.ReactNode; title: string }) {
  return (
    <div className="rounded-md border border-dashed px-2 py-1.5">
      <div className="font-medium text-foreground">{title}</div>
      <div>{children}</div>
    </div>
  );
}

function DraftingSourceRefProperties({
  object,
  onRefreshSource,
  onUpdate,
  sourceRefreshState,
  sourceManageHref,
}: {
  object: DraftingObject;
  onRefreshSource?: (object: DraftingObject, options?: { updateCoordinates?: boolean }) => void;
  onUpdate: (nextObject: DraftingObject) => void;
  sourceRefreshState: 'current' | 'stale' | 'missing';
  sourceManageHref?: string;
}) {
  const sourceRef = object.sourceRef ?? {
    sourceType: 'manual' as const,
    status: 'manual' as const,
  };
  const status = sourceRef.status ?? (sourceRef.sourceType === 'manual' ? 'manual' : 'snapshot');
  const isMissingSource = status === 'missing_source' || sourceRefreshState === 'missing';
  const isStaleSource =
    !isMissingSource && sourceRef.sourceType !== 'manual' && sourceRefreshState === 'stale';

  function updateSourceRef(nextSourceRef: DraftingObject['sourceRef']) {
    onUpdate({
      ...object,
      ...(nextSourceRef ? { sourceRef: nextSourceRef } : { sourceRef: undefined }),
      updatedAt: new Date().toISOString(),
    });
  }

  return (
    <PropertySection title="Source / Provenance">
      <div className="grid gap-2 text-xs sm:grid-cols-5">
        <SourceField
          label="Source status"
          value={
            isMissingSource
              ? 'Source missing'
              : isStaleSource
                ? 'Source may have changed'
                : formatSourceValue(status)
          }
        />
        <SourceField label="Source kind" value={formatSourceKind(object, sourceRef.sourceType)} />
        <SourceField label="Source code" value={sourceRef.sourceLabel ?? 'Sketch / unlinked'} />
        <SourceField label="Completeness" value={formatSourceCompleteness(object)} />
        <SourceField
          label="Snapshot date"
          value={sourceRef.linkedAt ? formatDraftingTimestamp(sourceRef.linkedAt) : 'Not recorded'}
        />
        <SourceField label="Source module" value={formatSourceModule(sourceRef.snapshot)} />
        <SourceField label="Source path" value={formatSourcePath(sourceRef.snapshot)} />
      </div>
      {(object.type === 'pile' && sourceRef.sourceType === 'foundation_pile') ||
      (object.type === 'structural_joint' && sourceRef.sourceType === 'foundation_joint') ? (
        <p className="mt-2 text-xs text-muted-foreground">
          Coordinates come from the Foundations source. Use Refresh + coordinates to move this
          drafting object to the current source coordinates.
        </p>
      ) : null}
      {object.type === 'pile' && sourceRef.sourceType === 'foundation_pile_type' ? (
        <p className="mt-2 text-xs text-muted-foreground">
          Refresh from source updates engineering fields from the pile type library and keeps the
          current drafting position.
        </p>
      ) : null}
      {sourceRef.sourceType === 'manual' ? (
        <p className="mt-2 text-xs text-muted-foreground">
          This object is not linked to project engineering data.
        </p>
      ) : null}
      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          className="h-8"
          disabled={sourceRef.sourceType === 'manual' || !onRefreshSource}
          size="sm"
          title="Source refresh requires the originating source record to be available in the current workspace."
          type="button"
          variant="outline"
          onClick={() => onRefreshSource?.(object)}
        >
          {getRefreshButtonLabel(object, sourceRef.sourceType)}
        </Button>
        {(object.type === 'pile' &&
          (sourceRef.sourceType === 'foundation_pile' ||
            sourceRef.sourceType === 'foundation_joint')) ||
        (object.type !== 'pile' && sourceRef.sourceType !== 'manual') ? (
          <Button
            className="h-8"
            disabled={!onRefreshSource}
            size="sm"
            type="button"
            variant="outline"
            onClick={() => onRefreshSource?.(object, { updateCoordinates: true })}
          >
            Refresh + coordinates
          </Button>
        ) : null}
        {object.type === 'pile' && sourceRef.sourceType !== 'manual' && sourceManageHref ? (
          <a
            className="inline-flex h-8 items-center justify-center rounded-md border border-input bg-background px-3 text-sm font-medium hover:bg-accent hover:text-accent-foreground"
            href={sourceManageHref}
          >
            {sourceRef.sourceType === 'foundation_pile_type' ? 'Manage pile type' : 'Manage source'}
          </a>
        ) : null}
        <Button
          className="h-8"
          disabled={sourceRef.sourceType === 'manual'}
          size="sm"
          type="button"
          variant="outline"
          onClick={() => updateSourceRef(undefined)}
        >
          Unlink
        </Button>
        <Button
          className="h-8"
          size="sm"
          type="button"
          variant={sourceRef.sourceType === 'manual' ? 'secondary' : 'outline'}
          onClick={() =>
            updateSourceRef({
              sourceType: 'manual',
              status: 'manual',
              linkedAt: new Date().toISOString(),
              sourceLabel: object.name ?? object.type.replaceAll('_', ' '),
            })
          }
        >
          Convert to sketch/unlinked
        </Button>
      </div>
      {sourceRef.sourceId ? (
        <p className="mt-2 break-all text-xs text-muted-foreground">
          Source ID {sourceRef.sourceId}
        </p>
      ) : null}
    </PropertySection>
  );
}

function SourceField({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <div className="font-medium text-muted-foreground">{label}</div>
      <div className="truncate text-foreground" title={value}>
        {value}
      </div>
    </div>
  );
}

function DraftingCoordinateSummary({
  object,
  referenceDatum,
}: {
  object: DraftingObject;
  referenceDatum?: string;
}) {
  const point = getPrimaryCoordinatePoint(object);
  if (!point) {
    return null;
  }

  return (
    <PropertySection title="Coordinates / RL">
      <div className="grid gap-2 text-xs sm:grid-cols-5">
        <SourceField label="X" value={formatCoordinateValue(point.x)} />
        <SourceField label="Y" value={formatCoordinateValue(point.y)} />
        <SourceField label="Z" value={formatOptionalCoordinateValue(point.z)} />
        <SourceField label="RL" value={formatOptionalCoordinateValue(point.rl)} />
        <SourceField label="Datum" value={referenceDatum?.trim() || 'Not recorded'} />
      </div>
    </PropertySection>
  );
}

function getPrimaryCoordinatePoint(object: DraftingObject): DraftingPoint | null {
  switch (object.type) {
    case 'pile':
      return object.geometry.centre;
    case 'borehole':
    case 'monitoring_point':
      return object.geometry.point;
    case 'service_crossing':
      return object.geometry.crossingPoint;
    case 'draft_circle':
      return object.geometry.centre;
    case 'structural_joint':
      return object.geometry.point;
    case 'geotech_surface':
      return object.geometry.points[0] ?? null;
    case 'project_grid':
      return object.geometry.origin;
    default:
      return null;
  }
}

function formatCoordinateValue(value: number) {
  return Number.isFinite(value) ? value.toFixed(3) : 'Not recorded';
}

function formatOptionalCoordinateValue(value: number | undefined) {
  return typeof value === 'number' && Number.isFinite(value) ? value.toFixed(3) : 'Not recorded';
}

function formatSourceValue(value: string | undefined) {
  return value ? value.replaceAll('_', ' ') : 'Not recorded';
}

function formatSourceModule(snapshot: Record<string, unknown> | undefined) {
  const value = snapshot?.originModule;
  return typeof value === 'string' ? formatSourceValue(value) : 'Not recorded';
}

function formatSourcePath(snapshot: Record<string, unknown> | undefined) {
  const value = snapshot?.sourcePath;
  return typeof value === 'string' ? value : 'Not recorded';
}

function formatSourceKind(object: DraftingObject, sourceType: string | undefined) {
  if (object.type === 'pile' || object.type === 'structural_joint') {
    if (sourceType === 'foundation_pile_type') {
      return 'Pile type library';
    }
    if (sourceType === 'foundation_pile') {
      return 'Existing placed pile/joint';
    }
    if (sourceType === 'foundation_joint') {
      return 'Existing foundation joint';
    }
    if (sourceType === 'manual') {
      return 'Sketch / unlinked';
    }
  }

  if (object.type === 'borehole' && sourceType !== 'manual') {
    return 'Linked borehole';
  }

  if (object.type === 'monitoring_point' && sourceType !== 'manual') {
    return 'Linked monitoring point';
  }

  if (
    (object.type === 'service_run' || object.type === 'service_crossing') &&
    sourceType !== 'manual'
  ) {
    return object.type === 'service_run'
      ? 'Existing project service run'
      : 'Existing project crossing';
  }

  if (sourceType === 'manual') {
    return 'Sketch / unlinked';
  }

  return formatSourceValue(sourceType);
}

function getRefreshButtonLabel(object: DraftingObject, sourceType: string | undefined) {
  if (object.type === 'pile' && sourceType !== 'manual') {
    return 'Refresh engineering fields';
  }
  if (object.type === 'structural_joint' && sourceType !== 'manual') {
    return 'Refresh joint source';
  }
  if (
    (object.type === 'service_run' || object.type === 'service_crossing') &&
    sourceType !== 'manual'
  ) {
    return 'Refresh service fields';
  }
  return 'Refresh from source';
}

function formatSourceCompleteness(object: DraftingObject) {
  if (object.type === 'pile') {
    return object.metadata.sourceCompleteness
      ? object.metadata.sourceCompleteness.replaceAll('_', ' ')
      : 'Not recorded';
  }
  const completeness = object.sourceRef?.snapshot?.completeness;
  return typeof completeness === 'string' ? completeness.replaceAll('_', ' ') : 'Not recorded';
}

function propertySectionTitle(object: DraftingObject) {
  switch (object.type) {
    case 'pile':
    case 'secant_pile_wall':
    case 'soldier_pile_wall':
    case 'anchor_tieback':
    case 'capping_beam':
    case 'waler':
    case 'service_run':
    case 'service_crossing':
    case 'draft_line':
    case 'draft_polyline':
    case 'draft_rectangle':
    case 'draft_circle':
    case 'draft_polygon':
    case 'structural_joint':
    case 'geotech_surface':
    case 'project_grid':
    case 'dimension_chain':
    case 'callout':
    case 'section_marker':
    case 'excavation_line':
      return 'Geometry / Engineering';
    default:
      return 'Geometry';
  }
}
