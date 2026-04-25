import * as React from 'react';
import type {
  DraftingObject,
  DraftingObjectSourceRef,
  DraftingModel,
  DraftingRegistrySourceBase,
  FoundationPileTypeSource,
  ProjectEngineeringSourceRegistry,
  SpatialFeatureSource,
  SpatialServiceSource,
} from '@eng/shared';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import type {
  DraftingPileSourceRecord,
  DraftingSpatialSourceRecord,
} from '../source-binding-utils';

type SourceCoverageRow = {
  id: string;
  label: string;
  typeLabel: string;
  sourceId: string;
  sourceType: string;
  sourceVersion?: string;
  originModule?: string;
  sourcePath?: string;
  completeness?: string;
  status?: string;
  linkedObjects: DraftingObject[];
  placeablePileSource?: DraftingPileSourceRecord;
  placeableSpatialSource?: DraftingSpatialSourceRecord;
  manageHref?: string;
  isDefinition?: boolean;
  noCoordinates?: boolean;
};

export function DraftingSourceCoveragePanel({
  model,
  onPlacePileSource,
  onPlacePileSources,
  onPlaceSpatialSource,
  onPlaceSpatialSources,
  onRefreshObject,
  onRefreshObjects,
  onSelectObject,
  pileSourceManageHref,
  pileSources,
  registry,
  spatialSources,
}: {
  model: DraftingModel;
  onPlacePileSource: (source: DraftingPileSourceRecord) => void;
  onPlacePileSources?: (sources: DraftingPileSourceRecord[]) => void;
  onPlaceSpatialSource: (source: DraftingSpatialSourceRecord) => void;
  onPlaceSpatialSources?: (sources: DraftingSpatialSourceRecord[]) => void;
  onRefreshObject: (object: DraftingObject, options?: { updateCoordinates?: boolean }) => void;
  onRefreshObjects?: (objects: DraftingObject[], options?: { updateCoordinates?: boolean }) => void;
  onSelectObject: (objectId: string) => void;
  pileSourceManageHref?: string;
  pileSources: DraftingPileSourceRecord[];
  registry?: ProjectEngineeringSourceRegistry;
  spatialSources: DraftingSpatialSourceRecord[];
}) {
  const [selectedSourceIds, setSelectedSourceIds] = React.useState<Set<string>>(() => new Set());
  const coverage = React.useMemo(
    () =>
      buildSourceCoverageRows({
        model,
        pileSourceManageHref,
        pileSources,
        registry,
        spatialSources,
      }),
    [model, pileSourceManageHref, pileSources, registry, spatialSources],
  );
  const selectedPlaceableRows = coverage.placeableRows.filter((row) =>
    selectedSourceIds.has(row.id),
  );
  const staleObjects = coverage.sourceLinkedObjects.filter((object) =>
    isObjectStaleOrMissing(object, coverage.rowsBySourceId.get(object.sourceRef?.sourceId ?? '')),
  );

  function toggleRow(row: SourceCoverageRow) {
    setSelectedSourceIds((current) => {
      const next = new Set(current);
      if (next.has(row.id)) {
        next.delete(row.id);
      } else {
        next.add(row.id);
      }
      return next;
    });
  }

  function placeRow(row: SourceCoverageRow) {
    if (row.placeablePileSource) {
      onPlacePileSource(row.placeablePileSource);
      return;
    }
    if (row.placeableSpatialSource) {
      onPlaceSpatialSource(row.placeableSpatialSource);
    }
  }

  function placeSelectedRows() {
    if (selectedPlaceableRows.length === 0) {
      return;
    }
    if (
      selectedPlaceableRows.length > 1 &&
      !window.confirm(`Place ${selectedPlaceableRows.length} selected source objects?`)
    ) {
      return;
    }
    const pileSourcesToPlace = selectedPlaceableRows
      .map((row) => row.placeablePileSource)
      .filter((source): source is DraftingPileSourceRecord => Boolean(source));
    const spatialSourcesToPlace = selectedPlaceableRows
      .map((row) => row.placeableSpatialSource)
      .filter((source): source is DraftingSpatialSourceRecord => Boolean(source));
    if (onPlacePileSources) {
      onPlacePileSources(pileSourcesToPlace);
    } else {
      pileSourcesToPlace.forEach(onPlacePileSource);
    }
    if (onPlaceSpatialSources) {
      onPlaceSpatialSources(spatialSourcesToPlace);
    } else {
      spatialSourcesToPlace.forEach(onPlaceSpatialSource);
    }
    setSelectedSourceIds(new Set());
  }

  function selectAllMissingWithGeometry() {
    setSelectedSourceIds(new Set(coverage.placeableRows.map((row) => row.id)));
  }

  return (
    <div className="space-y-4 text-sm" data-testid="drafting-source-coverage-panel">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-base font-semibold">Project Source Coverage</h3>
          <p className="text-xs text-muted-foreground">
            Registry-backed sources available to represent in the Project Model Canvas.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            disabled={staleObjects.length === 0}
            onClick={() =>
              onRefreshObjects
                ? onRefreshObjects(staleObjects)
                : staleObjects.forEach((object) => onRefreshObject(object))
            }
            size="sm"
            type="button"
            variant="outline"
          >
            Refresh stale snapshots
          </Button>
          <Button
            disabled={coverage.placeableRows.length === 0}
            onClick={selectAllMissingWithGeometry}
            size="sm"
            type="button"
            variant="outline"
          >
            Select all missing with coordinates
          </Button>
          <Button
            disabled={selectedPlaceableRows.length === 0}
            onClick={placeSelectedRows}
            size="sm"
            type="button"
          >
            Place selected missing sources
          </Button>
          <Button
            disabled={selectedSourceIds.size === 0}
            onClick={() => setSelectedSourceIds(new Set())}
            size="sm"
            type="button"
            variant="ghost"
          >
            Clear selection
          </Button>
        </div>
      </div>

      <div className="grid gap-2 md:grid-cols-4">
        <CoverageMetric label="Registry sources" value={coverage.sourceCount} />
        <CoverageMetric label="Source-linked objects" value={coverage.sourceLinkedObjects.length} />
        <CoverageMetric label="Sketch / unlinked" value={coverage.sketchObjects.length} />
        <CoverageMetric label="Missing placeable" value={coverage.placeableRows.length} />
      </div>

      <CoverageGroup
        rows={coverage.foundationPileTypeRows}
        selectedSourceIds={selectedSourceIds}
        title="Foundation / Pile type library"
        onPlaceRow={placeRow}
        onRefreshObject={onRefreshObject}
        onSelectObject={onSelectObject}
        onToggleRow={toggleRow}
      />
      <CoverageGroup
        rows={coverage.foundationPlacedPileRows}
        selectedSourceIds={selectedSourceIds}
        title="Foundation / Existing placed piles and joints"
        onPlaceRow={placeRow}
        onRefreshObject={onRefreshObject}
        onSelectObject={onSelectObject}
        onToggleRow={toggleRow}
      />
      <CoverageGroup
        rows={coverage.boreholeRows}
        selectedSourceIds={selectedSourceIds}
        title="Geotech / Boreholes"
        onPlaceRow={placeRow}
        onRefreshObject={onRefreshObject}
        onSelectObject={onSelectObject}
        onToggleRow={toggleRow}
      />
      <CoverageGroup
        rows={coverage.monitoringRows}
        selectedSourceIds={selectedSourceIds}
        title="Monitoring / Monitoring points"
        onPlaceRow={placeRow}
        onRefreshObject={onRefreshObject}
        onSelectObject={onSelectObject}
        onToggleRow={toggleRow}
      />
      <CoverageGroup
        rows={coverage.serviceRunRows}
        selectedSourceIds={selectedSourceIds}
        title="Spatial / Services / Service runs"
        onPlaceRow={placeRow}
        onRefreshObject={onRefreshObject}
        onSelectObject={onSelectObject}
        onToggleRow={toggleRow}
      />
      <CoverageGroup
        rows={coverage.serviceCrossingRows}
        selectedSourceIds={selectedSourceIds}
        title="Spatial / Services / Service crossings"
        onPlaceRow={placeRow}
        onRefreshObject={onRefreshObject}
        onSelectObject={onSelectObject}
        onToggleRow={toggleRow}
      />
      <CoverageGroup
        rows={coverage.spatialContextRows}
        selectedSourceIds={selectedSourceIds}
        title="Spatial / Boundaries and reference features"
        onPlaceRow={placeRow}
        onRefreshObject={onRefreshObject}
        onSelectObject={onSelectObject}
        onToggleRow={toggleRow}
      />

      <div className="rounded-md border">
        <div className="flex items-center justify-between border-b px-3 py-2">
          <h4 className="text-sm font-semibold">Sketch / Unlinked objects</h4>
          <Badge variant="secondary">{coverage.sketchObjects.length}</Badge>
        </div>
        {coverage.sketchObjects.length === 0 ? (
          <div className="px-3 py-2 text-xs text-muted-foreground">No sketch objects.</div>
        ) : (
          <div className="divide-y">
            {coverage.sketchObjects.map((object) => (
              <button
                className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left hover:bg-accent"
                key={object.id}
                onClick={() => onSelectObject(object.id)}
                type="button"
              >
                <span>
                  <span className="block font-medium">
                    {object.name || object.type.replaceAll('_', ' ')}
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    {object.type.replaceAll('_', ' ')}
                  </span>
                </span>
                <Badge variant="outline">Sketch / unlinked</Badge>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function CoverageMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border px-3 py-2">
      <div className="text-lg font-semibold">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

function CoverageGroup({
  onPlaceRow,
  onRefreshObject,
  onSelectObject,
  onToggleRow,
  rows,
  selectedSourceIds,
  title,
}: {
  onPlaceRow: (row: SourceCoverageRow) => void;
  onRefreshObject: (object: DraftingObject, options?: { updateCoordinates?: boolean }) => void;
  onSelectObject: (objectId: string) => void;
  onToggleRow: (row: SourceCoverageRow) => void;
  rows: SourceCoverageRow[];
  selectedSourceIds: Set<string>;
  title: string;
}) {
  return (
    <details className="rounded-md border" open>
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-2">
        <span className="font-semibold">{title}</span>
        <Badge variant="secondary">{rows.length}</Badge>
      </summary>
      {rows.length === 0 ? (
        <div className="border-t px-3 py-2 text-xs text-muted-foreground">No sources found.</div>
      ) : (
        <div className="divide-y border-t">
          {rows.map((row) => {
            const firstLinkedObject = row.linkedObjects[0];
            const isPlaceableMissing =
              row.linkedObjects.length === 0 &&
              Boolean(row.placeablePileSource || row.placeableSpatialSource);
            return (
              <div className="grid gap-2 px-3 py-2 lg:grid-cols-[minmax(0,1fr)_auto]" key={row.id}>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    {isPlaceableMissing ? (
                      <input
                        aria-label={`Select ${row.label}`}
                        checked={selectedSourceIds.has(row.id)}
                        className="h-4 w-4"
                        onChange={() => onToggleRow(row)}
                        type="checkbox"
                      />
                    ) : null}
                    <span className="font-medium">{row.label}</span>
                    <Badge variant="outline">{row.typeLabel}</Badge>
                    {statusBadges(row).map((badge) => (
                      <Badge
                        key={badge}
                        variant={badge.includes('Missing') ? 'warning' : 'secondary'}
                      >
                        {badge}
                      </Badge>
                    ))}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {row.originModule ? `${row.originModule} · ` : ''}
                    {row.sourcePath ?? 'source path not recorded'} · {row.linkedObjects.length}{' '}
                    linked drafting object(s)
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {firstLinkedObject ? (
                    <>
                      <Button
                        onClick={() => onSelectObject(firstLinkedObject.id)}
                        size="sm"
                        type="button"
                        variant="outline"
                      >
                        Select placed object
                      </Button>
                      <Button
                        onClick={() => onRefreshObject(firstLinkedObject)}
                        size="sm"
                        type="button"
                        variant="outline"
                      >
                        Refresh from source
                      </Button>
                      <Button
                        onClick={() =>
                          onRefreshObject(firstLinkedObject, { updateCoordinates: true })
                        }
                        size="sm"
                        type="button"
                        variant="outline"
                      >
                        Refresh + coordinates
                      </Button>
                    </>
                  ) : isPlaceableMissing ? (
                    <Button onClick={() => onPlaceRow(row)} size="sm" type="button">
                      Place linked object
                    </Button>
                  ) : row.manageHref ? (
                    <a
                      className={buttonVariants({ size: 'sm', variant: 'outline' })}
                      href={row.manageHref}
                    >
                      Manage source
                    </a>
                  ) : (
                    <Badge variant="outline">
                      {row.noCoordinates ? 'No coordinates' : 'Cannot auto-place'}
                    </Badge>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </details>
  );
}

function statusBadges(row: SourceCoverageRow) {
  if (row.isDefinition) {
    return [
      row.completeness ? completenessLabel(row.completeness) : 'Completeness unknown',
      `Used by ${row.linkedObjects.length}`,
    ];
  }
  if (row.linkedObjects.length === 0) {
    return [row.noCoordinates ? 'No coordinates' : 'Missing'];
  }
  const stale = row.linkedObjects.some((object) => isObjectStaleOrMissing(object, row));
  return [stale ? 'Stale possible' : 'Placed'];
}

function completenessLabel(value: string) {
  if (value === 'complete') {
    return 'Complete source';
  }
  if (value === 'diameter_only') {
    return 'Diameter only';
  }
  if (value === 'missing_key_fields') {
    return 'Incomplete source';
  }
  return value === 'unknown' ? 'Completeness unknown' : 'Partial source';
}

function buildSourceCoverageRows({
  model,
  pileSourceManageHref,
  pileSources,
  registry,
  spatialSources,
}: {
  model: DraftingModel;
  pileSourceManageHref?: string;
  pileSources: DraftingPileSourceRecord[];
  registry?: ProjectEngineeringSourceRegistry;
  spatialSources: DraftingSpatialSourceRecord[];
}) {
  const objects = model.objects;
  const sourceLinkedObjects = objects.filter(
    (object) => object.sourceRef && object.sourceRef.sourceType !== 'manual',
  );
  const sketchObjects = objects.filter(
    (object) => !object.sourceRef || object.sourceRef.sourceType === 'manual',
  );
  const linkedObjectsFor = (sourceId: string) =>
    objects.filter((object) => object.sourceRef?.sourceId === sourceId);
  const pileSourceById = new Map(pileSources.map((source) => [source.sourceId, source]));
  const spatialSourceById = new Map(spatialSources.map((source) => [source.sourceId, source]));
  const serviceRuns =
    registry?.sources.services?.serviceRuns ??
    (registry?.sources.spatial.services ?? []).filter(
      (source) => source.category === 'service_run',
    );
  const serviceCrossings =
    registry?.sources.services?.serviceCrossings ??
    (registry?.sources.spatial.services ?? []).filter(
      (source) => source.category === 'service_crossing',
    );

  const foundationPileTypeRows = (registry?.sources.foundation.pileTypes ?? []).map((source) =>
    sourceRowFromRegistrySource(source, linkedObjectsFor(source.sourceId), {
      isDefinition: true,
      manageHref: pileSourceManageHref,
      typeLabel: 'Pile type library',
    }),
  );
  const foundationPlacedPileRows = (registry?.sources.foundation.placedPiles ?? []).map((source) =>
    sourceRowFromRegistrySource(source, linkedObjectsFor(source.sourceId), {
      placeablePileSource: pileSourceById.get(source.sourceId),
      typeLabel: 'Existing placed pile/joint',
    }),
  );
  const boreholeRows = (registry?.sources.geotech.boreholes ?? []).map((source) =>
    sourceRowFromRegistrySource(source, linkedObjectsFor(source.sourceId), {
      placeableSpatialSource: spatialSourceById.get(source.sourceId),
      typeLabel: 'Linked borehole',
    }),
  );
  const monitoringRows = (registry?.sources.monitoring.monitoringPoints ?? []).map((source) =>
    sourceRowFromRegistrySource(source, linkedObjectsFor(source.sourceId), {
      placeableSpatialSource: spatialSourceById.get(source.sourceId),
      typeLabel: 'Linked monitoring point',
    }),
  );
  const serviceRunRows = serviceRuns.map((source) =>
    sourceRowFromRegistrySource(source, linkedObjectsFor(source.sourceId), {
      placeableSpatialSource: spatialSourceById.get(source.sourceId),
      typeLabel: 'Existing project service run',
    }),
  );
  const serviceCrossingRows = serviceCrossings.map((source) =>
    sourceRowFromRegistrySource(source, linkedObjectsFor(source.sourceId), {
      placeableSpatialSource: spatialSourceById.get(source.sourceId),
      typeLabel: 'Existing project crossing',
    }),
  );
  const spatialContextRows = [
    ...(registry?.sources.spatial.boundaries ?? []),
    ...(registry?.sources.spatial.referencePoints ?? []),
    ...(registry?.sources.spatial.features ?? []),
  ].map((source) =>
    sourceRowFromRegistrySource(source, linkedObjectsFor(source.sourceId), {
      typeLabel: spatialTypeLabel(source),
    }),
  );
  const allRows = [
    ...foundationPileTypeRows,
    ...foundationPlacedPileRows,
    ...boreholeRows,
    ...monitoringRows,
    ...serviceRunRows,
    ...serviceCrossingRows,
    ...spatialContextRows,
  ];
  const rowsBySourceId = new Map(allRows.map((row) => [row.sourceId, row]));
  const placeableRows = allRows.filter(
    (row) =>
      row.linkedObjects.length === 0 &&
      !row.isDefinition &&
      Boolean(row.placeablePileSource || row.placeableSpatialSource),
  );

  return {
    boreholeRows,
    foundationPileTypeRows,
    foundationPlacedPileRows,
    monitoringRows,
    placeableRows,
    rowsBySourceId,
    serviceCrossingRows,
    serviceRunRows,
    sketchObjects,
    sourceCount: allRows.length,
    sourceLinkedObjects,
    spatialContextRows,
  };
}

function sourceRowFromRegistrySource(
  source: DraftingRegistrySourceBase,
  linkedObjects: DraftingObject[],
  options: {
    isDefinition?: boolean;
    manageHref?: string;
    placeablePileSource?: DraftingPileSourceRecord;
    placeableSpatialSource?: DraftingSpatialSourceRecord;
    typeLabel: string;
  },
): SourceCoverageRow {
  return {
    id: `${source.sourceType}:${source.sourceId}`,
    label: source.sourceLabel,
    typeLabel: options.typeLabel,
    sourceId: source.sourceId,
    sourceType: source.sourceType,
    sourceVersion: source.sourceVersion,
    originModule: source.originModule,
    sourcePath: source.sourcePath,
    completeness: source.completeness,
    status: source.status,
    linkedObjects,
    manageHref: options.manageHref,
    placeablePileSource: options.placeablePileSource,
    placeableSpatialSource: options.placeableSpatialSource,
    isDefinition: options.isDefinition,
    noCoordinates:
      linkedObjects.length === 0 &&
      !options.isDefinition &&
      !options.placeablePileSource &&
      !options.placeableSpatialSource,
  };
}

function spatialTypeLabel(source: SpatialFeatureSource | SpatialServiceSource) {
  if (source.category === 'boundary') {
    return 'Boundary';
  }
  if (source.category === 'reference_point') {
    return 'Reference feature';
  }
  return 'Spatial feature';
}

function isObjectStaleOrMissing(object: DraftingObject, row: SourceCoverageRow | undefined) {
  const sourceRef = object.sourceRef as DraftingObjectSourceRef | undefined;
  if (!sourceRef || sourceRef.sourceType === 'manual') {
    return false;
  }
  if (sourceRef.status === 'missing_source') {
    return true;
  }
  return Boolean(
    row?.sourceVersion && sourceRef.sourceVersion && row.sourceVersion !== sourceRef.sourceVersion,
  );
}
