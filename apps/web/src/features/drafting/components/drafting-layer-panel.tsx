import * as React from 'react';
import type { DraftingLayer } from '@eng/shared';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Field, NumberField, normalizeColorInput } from '../properties/common-object-properties';

export function DraftingLayerPanel({
  layers,
  onUpdate,
}: {
  layers: DraftingLayer[];
  onUpdate: (nextLayer: DraftingLayer) => void;
}) {
  return (
    <div className="space-y-3">
      {layers.map((layer) => (
        <LayerEditor key={layer.id} layer={layer} onUpdate={onUpdate} />
      ))}
    </div>
  );
}

function LayerEditor({
  layer,
  onUpdate,
}: {
  layer: DraftingLayer;
  onUpdate: (nextLayer: DraftingLayer) => void;
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{layer.name}</CardTitle>
        <CardDescription>{layer.id}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Visible">
            <Button
              variant={layer.visible ? 'default' : 'outline'}
              onClick={() => onUpdate({ ...layer, visible: !layer.visible })}
            >
              {layer.visible ? 'Visible' : 'Hidden'}
            </Button>
          </Field>

          <Field label="Locked">
            <Button
              variant={layer.locked ? 'default' : 'outline'}
              onClick={() => onUpdate({ ...layer, locked: !layer.locked })}
            >
              {layer.locked ? 'Locked' : 'Unlocked'}
            </Button>
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Color">
            <Input
              type="color"
              value={normalizeColorInput(layer.color, '#334155')}
              onChange={(event) => onUpdate({ ...layer, color: event.target.value })}
            />
          </Field>

          <NumberField
            label="Line Weight"
            value={layer.lineWeight}
            onChange={(value) => onUpdate({ ...layer, lineWeight: value })}
          />
        </div>
      </CardContent>
    </Card>
  );
}
