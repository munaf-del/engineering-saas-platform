import * as React from 'react';
import type { DraftingLayer, DraftingObject } from '@eng/shared';
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
import { SecantPileWallProperties } from '../properties/secant-pile-wall-properties';
import { SectionMarkerProperties } from '../properties/section-marker-properties';
import { ServiceCrossingProperties } from '../properties/service-crossing-properties';
import { ServiceRunProperties } from '../properties/service-run-properties';
import { SoldierPileWallProperties } from '../properties/soldier-pile-wall-properties';
import { WalerProperties } from '../properties/waler-properties';

export function DraftingPropertiesPanel({
  layers,
  object,
  onDelete,
  onUpdate,
}: {
  layers: DraftingLayer[];
  object: DraftingObject | null;
  onDelete: () => void;
  onUpdate: (nextObject: DraftingObject) => void;
}) {
  if (!object) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">No selection</CardTitle>
          <CardDescription>
            Select a drafting object to edit its layer, geometry, style, and metadata.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Selected Object</CardTitle>
          <CardDescription>
            {object.type.replaceAll('_', ' ')} · Created {formatDraftingTimestamp(object.createdAt)}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <DraftingSourceRefProperties object={object} onUpdate={onUpdate} />

          <DraftingCommonObjectProperties layers={layers} object={object} onUpdate={onUpdate} />

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
              <DimensionChainProperties object={object} onUpdate={onUpdate} />
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

function DraftingSourceRefProperties({
  object,
  onUpdate,
}: {
  object: DraftingObject;
  onUpdate: (nextObject: DraftingObject) => void;
}) {
  const sourceRef = object.sourceRef ?? {
    sourceType: 'manual' as const,
    status: 'manual' as const,
  };
  const status = sourceRef.status ?? (sourceRef.sourceType === 'manual' ? 'manual' : 'snapshot');

  function updateSourceRef(nextSourceRef: DraftingObject['sourceRef']) {
    onUpdate({
      ...object,
      ...(nextSourceRef ? { sourceRef: nextSourceRef } : { sourceRef: undefined }),
      updatedAt: new Date().toISOString(),
    });
  }

  return (
    <PropertySection title="Source / Provenance">
      <div className="grid gap-2 text-xs sm:grid-cols-4">
        <SourceField label="Status" value={formatSourceValue(status)} />
        <SourceField label="Source type" value={formatSourceValue(sourceRef.sourceType)} />
        <SourceField label="Source label" value={sourceRef.sourceLabel ?? 'Manual object'} />
        <SourceField
          label="Snapshot date"
          value={sourceRef.linkedAt ? formatDraftingTimestamp(sourceRef.linkedAt) : 'Not recorded'}
        />
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          className="h-8"
          disabled={sourceRef.sourceType === 'manual'}
          size="sm"
          title="Source refresh requires the originating source record to be available in the current workspace."
          type="button"
          variant="outline"
        >
          Refresh from source
        </Button>
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
          Convert to manual
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

function formatSourceValue(value: string | undefined) {
  return value ? value.replaceAll('_', ' ') : 'Not recorded';
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
    case 'dimension_chain':
    case 'callout':
    case 'section_marker':
    case 'excavation_line':
      return 'Geometry / Engineering';
    default:
      return 'Geometry';
  }
}
