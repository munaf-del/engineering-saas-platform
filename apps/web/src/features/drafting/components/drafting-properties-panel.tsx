import * as React from 'react';
import type { DraftingLayer, DraftingObject } from '@eng/shared';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { formatDraftingTimestamp } from '../model-utils';
import { DraftingCommonObjectProperties } from '../properties/common-object-properties';
import { ExcavationLineProperties } from '../properties/excavation-line-properties';
import { LeaderNoteProperties } from '../properties/leader-note-properties';
import { MonitoringPointProperties } from '../properties/monitoring-point-properties';
import { PileProperties } from '../properties/pile-properties';

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

          {object.type === 'pile' ? <PileProperties object={object} onUpdate={onUpdate} /> : null}
          {object.type === 'monitoring_point' ? (
            <MonitoringPointProperties object={object} onUpdate={onUpdate} />
          ) : null}
          {object.type === 'leader_note' ? (
            <LeaderNoteProperties object={object} onUpdate={onUpdate} />
          ) : null}
          {object.type === 'excavation_line' ? (
            <ExcavationLineProperties object={object} onUpdate={onUpdate} />
          ) : null}

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
