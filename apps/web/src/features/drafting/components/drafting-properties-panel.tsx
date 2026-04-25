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
