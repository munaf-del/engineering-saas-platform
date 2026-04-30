import * as React from 'react';
import type { DraftingShaftConstructionType, DraftingShaftObject } from '@eng/shared';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Field, NumberField } from './common-object-properties';

export function ShaftProperties({
  disabled = false,
  object,
  onUpdate,
}: {
  disabled?: boolean;
  object: DraftingShaftObject;
  onUpdate: (nextObject: DraftingShaftObject) => void;
}) {
  function updateObject(patch: Partial<DraftingShaftObject>) {
    onUpdate({
      ...object,
      ...patch,
      updatedAt: new Date().toISOString(),
    });
  }

  function updateGeometry(patch: Partial<DraftingShaftObject['geometry']>) {
    updateObject({
      geometry: {
        ...object.geometry,
        ...patch,
      },
    });
  }

  function updateParameters(patch: Partial<DraftingShaftObject['parameters']>) {
    updateObject({
      parameters: {
        ...object.parameters,
        ...patch,
      },
    });
  }

  function updateMetadata(patch: Partial<DraftingShaftObject['metadata']>) {
    updateObject({
      metadata: {
        ...object.metadata,
        ...patch,
      },
    });
  }

  function setOptionalParameter<K extends keyof DraftingShaftObject['parameters']>(
    key: K,
    value: DraftingShaftObject['parameters'][K] | undefined,
  ) {
    const nextParameters = { ...object.parameters };
    if (value === undefined || value === '') {
      delete nextParameters[key];
    } else {
      nextParameters[key] = value;
    }
    updateObject({ parameters: nextParameters });
  }

  function setOptionalMetadata<K extends keyof DraftingShaftObject['metadata']>(
    key: K,
    value: DraftingShaftObject['metadata'][K] | undefined,
  ) {
    const nextMetadata = { ...object.metadata };
    if (value === undefined || value === '') {
      delete nextMetadata[key];
    } else {
      nextMetadata[key] = value;
    }
    updateObject({ metadata: nextMetadata });
  }

  return (
    <div className="space-y-4">
      {disabled ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          Shaft geometry and style edits are disabled while the object or layer is locked.
        </div>
      ) : null}

      <ShaftPropertyGroup title="Shaft Reference">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Shaft ID">
            <Input
              disabled={disabled}
              value={object.metadata.shaftId}
              onChange={(event) => updateMetadata({ shaftId: event.target.value || 'SH' })}
            />
          </Field>
          <Field label="Label">
            <Input
              disabled={disabled}
              value={object.metadata.label ?? ''}
              onChange={(event) => setOptionalMetadata('label', event.target.value || undefined)}
            />
          </Field>
          <Field label="Construction type">
            <Select
              disabled={disabled}
              value={object.parameters.constructionType}
              onValueChange={(value) =>
                updateParameters({ constructionType: value as DraftingShaftConstructionType })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="secant_piles">Secant piles</SelectItem>
                <SelectItem value="contiguous_piles">Contiguous piles</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        </div>
        <p className="text-xs text-muted-foreground">
          Shaft layout symbols support Secant piles or Contiguous piles; confirm project-specific
          construction details separately.
        </p>
      </ShaftPropertyGroup>

      <ShaftPropertyGroup title="Geometry">
        <div className="grid gap-4 sm:grid-cols-4">
          <NumberField
            disabled={disabled}
            label="Centre X"
            value={object.geometry.centre.x}
            onChange={(value) =>
              updateGeometry({ centre: { ...object.geometry.centre, x: value } })
            }
          />
          <NumberField
            disabled={disabled}
            label="Centre Y"
            value={object.geometry.centre.y}
            onChange={(value) =>
              updateGeometry({ centre: { ...object.geometry.centre, y: value } })
            }
          />
          <NumberField
            disabled={disabled}
            label="Radius mm"
            value={object.geometry.radiusMm}
            onChange={(value) => updateGeometry({ radiusMm: Math.max(1, value) })}
          />
          <NumberField
            disabled={disabled}
            label="Rotation deg"
            value={object.geometry.rotationDeg ?? 0}
            onChange={(value) => updateGeometry({ rotationDeg: value })}
          />
        </div>
      </ShaftPropertyGroup>

      <ShaftPropertyGroup title="Pile Layout Symbol">
        <div className="grid gap-4 sm:grid-cols-3">
          <NumberField
            disabled={disabled}
            label="Pile diameter mm"
            value={object.parameters.pileDiameterMm}
            onChange={(value) => updateParameters({ pileDiameterMm: Math.max(1, value) })}
          />
          <NumberField
            disabled={disabled}
            label="Spacing mm"
            value={object.parameters.spacingMm}
            onChange={(value) => updateParameters({ spacingMm: Math.max(1, value) })}
          />
          <Field label="Start pile ID">
            <Input
              disabled={disabled}
              value={object.parameters.startPileId ?? ''}
              onChange={(event) =>
                setOptionalParameter('startPileId', event.target.value || undefined)
              }
            />
          </Field>
        </div>
        <p className="text-xs text-muted-foreground">
          Shaft pile markers are diagrammatic renderer output only; they are not separate pile model
          objects.
        </p>
      </ShaftPropertyGroup>

      <ShaftPropertyGroup title="Notes">
        <Field label="Project notes">
          <textarea
            className="min-h-20 w-full rounded-md border bg-background px-3 py-2 text-sm"
            disabled={disabled}
            value={object.metadata.notes ?? ''}
            onChange={(event) => updateMetadata({ notes: event.target.value })}
          />
        </Field>
      </ShaftPropertyGroup>
    </div>
  );
}

function ShaftPropertyGroup({ children, title }: { children: React.ReactNode; title: string }) {
  return (
    <div className="space-y-3 rounded-md border border-dashed bg-muted/10 p-3">
      <h5 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h5>
      {children}
    </div>
  );
}
