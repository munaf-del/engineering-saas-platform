'use client';

import type { ReactNode } from 'react';
import {
  MULTI_PILE_PROJECT_REFERENCE_DOCUMENT_TYPES,
  type MultiPileProjectReference,
  type MultiPileProjectSpecifics,
} from '@eng/shared';
import { ArrowDown, ArrowUp, Plus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  createEmptyProjectReference,
  resolveProjectReferenceLabel,
  summarizeProjectReferences,
} from './project-specifics-utils';

interface ProjectReferencesEditorProps {
  value: MultiPileProjectSpecifics;
  onChange: (value: MultiPileProjectSpecifics) => void;
}

export function ProjectReferencesEditor({ value, onChange }: ProjectReferencesEditorProps) {
  const summary = summarizeProjectReferences(value);

  function updateProjectSpecifics(
    updater: (current: MultiPileProjectSpecifics) => MultiPileProjectSpecifics,
  ) {
    onChange(updater(value));
  }

  function commitReferences(
    updater: (references: MultiPileProjectReference[]) => MultiPileProjectReference[],
  ) {
    updateProjectSpecifics((current) =>
      syncProjectReferenceState(current, updater(current.references)),
    );
  }

  function updateReference(
    index: number,
    updater: (reference: MultiPileProjectReference) => MultiPileProjectReference,
  ) {
    commitReferences((references) =>
      references.map((reference, rowIndex) =>
        rowIndex === index ? updater(reference) : reference,
      ),
    );
  }

  function setPrimary(
    index: number,
    field: 'primaryGeotechnical' | 'primaryStructuralReference',
    checked: boolean,
  ) {
    commitReferences((references) =>
      references.map((reference, rowIndex) => {
        if (field === 'primaryGeotechnical') {
          if (rowIndex !== index) {
            return checked ? { ...reference, primaryGeotechnical: false } : reference;
          }
          return {
            ...reference,
            primaryGeotechnical:
              checked && reference.active && reference.documentType === 'Geotechnical Report',
          };
        }

        if (rowIndex !== index) {
          return checked ? { ...reference, primaryStructuralReference: false } : reference;
        }
        return {
          ...reference,
          primaryStructuralReference:
            checked && reference.active && reference.documentType === 'Structural Drawing',
        };
      }),
    );
  }

  function moveReference(index: number, direction: -1 | 1) {
    commitReferences((references) => {
      const targetIndex = index + direction;
      if (targetIndex < 0 || targetIndex >= references.length) {
        return references;
      }
      const next = [...references];
      const currentReference = next[index];
      const targetReference = next[targetIndex];
      if (!currentReference || !targetReference) {
        return references;
      }
      next[index] = targetReference;
      next[targetIndex] = currentReference;
      return next;
    });
  }

  function addReference() {
    commitReferences((references) => [...references, createEmptyProjectReference()]);
  }

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="space-y-1">
          <CardTitle className="text-base">Project References</CardTitle>
          <CardDescription>
            Record report provenance once at the project level. Multi-Pile reads these rows as
            shared context.
          </CardDescription>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">{summary.totalReferences} active</Badge>
          <Badge variant="outline">{summary.includedInReportCount} in report</Badge>
          {summary.inactiveReferences > 0 ? (
            <Badge variant="secondary">{summary.inactiveReferences} inactive</Badge>
          ) : null}
          <Button type="button" variant="outline" size="sm" onClick={addReference}>
            <Plus className="mr-2 h-4 w-4" />
            Add Reference
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {value.references.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border/80 px-4 py-8 text-sm text-muted-foreground">
            No project references yet. Add the governing geotechnical and structural documents here,
            then reuse them from Multi-Pile.
          </div>
        ) : (
          value.references.map((reference, index) => {
            const label = resolveProjectReferenceLabel(reference);
            return (
              <div
                key={reference.id}
                className={`rounded-xl border p-4 ${
                  reference.active ? 'bg-background' : 'bg-muted/15 opacity-80'
                }`}
              >
                <div className="flex flex-col gap-3 border-b pb-4 md:flex-row md:items-start md:justify-between">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="text-sm font-semibold">{label}</div>
                      <Badge variant="outline">{reference.documentType}</Badge>
                      {!reference.active ? <Badge variant="secondary">Inactive</Badge> : null}
                      {reference.primaryGeotechnical ? (
                        <Badge variant="success">Primary Geotechnical</Badge>
                      ) : null}
                      {reference.primaryStructuralReference ? (
                        <Badge variant="success">Primary Structural</Badge>
                      ) : null}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {reference.documentNumber || 'No document number / filename yet'}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => moveReference(index, -1)}
                      disabled={index === 0}
                      aria-label={`Move ${label} up`}
                    >
                      <ArrowUp className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => moveReference(index, 1)}
                      disabled={index === value.references.length - 1}
                      aria-label={`Move ${label} down`}
                    >
                      <ArrowDown className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  <LabeledField label="Reference ID">
                    <Input
                      value={reference.referenceId}
                      placeholder="e.g. GEO-01"
                      onChange={(event) =>
                        updateReference(index, (current) => ({
                          ...current,
                          referenceId: event.target.value,
                        }))
                      }
                    />
                  </LabeledField>
                  <LabeledField label="Title">
                    <Input
                      value={reference.title}
                      placeholder="Document title"
                      onChange={(event) =>
                        updateReference(index, (current) => ({
                          ...current,
                          title: event.target.value,
                        }))
                      }
                    />
                  </LabeledField>
                  <LabeledField label="Document Type">
                    <Select
                      value={reference.documentType}
                      onValueChange={(nextValue) =>
                        updateReference(index, (current) => ({
                          ...current,
                          documentType: nextValue as MultiPileProjectReference['documentType'],
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {MULTI_PILE_PROJECT_REFERENCE_DOCUMENT_TYPES.map((documentType) => (
                          <SelectItem key={documentType} value={documentType}>
                            {documentType}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </LabeledField>
                  <LabeledField label="Document Number / Filename">
                    <Input
                      value={reference.documentNumber}
                      placeholder="e.g. 221715.00.R.007 or GI_Report.pdf"
                      onChange={(event) =>
                        updateReference(index, (current) => ({
                          ...current,
                          documentNumber: event.target.value,
                        }))
                      }
                    />
                  </LabeledField>
                  <LabeledField label="Revision">
                    <Input
                      value={reference.revision}
                      placeholder="e.g. Rev A"
                      onChange={(event) =>
                        updateReference(index, (current) => ({
                          ...current,
                          revision: event.target.value,
                        }))
                      }
                    />
                  </LabeledField>
                  <LabeledField label="Issue Date">
                    <Input
                      type="date"
                      value={reference.issueDate}
                      onChange={(event) =>
                        updateReference(index, (current) => ({
                          ...current,
                          issueDate: event.target.value,
                        }))
                      }
                    />
                  </LabeledField>
                  <LabeledField
                    label="Author / Organisation"
                    className="md:col-span-2 xl:col-span-3"
                  >
                    <Input
                      value={reference.authorOrganisation}
                      placeholder="Author or issuing organisation"
                      onChange={(event) =>
                        updateReference(index, (current) => ({
                          ...current,
                          authorOrganisation: event.target.value,
                        }))
                      }
                    />
                  </LabeledField>
                  <LabeledField label="Notes" className="md:col-span-2 xl:col-span-3">
                    <Textarea
                      value={reference.notes}
                      placeholder="Context, scope, affected package, or assumptions"
                      onChange={(event) =>
                        updateReference(index, (current) => ({
                          ...current,
                          notes: event.target.value,
                        }))
                      }
                    />
                  </LabeledField>
                </div>

                <div className="mt-4 grid gap-3 rounded-lg border bg-muted/10 p-4 md:grid-cols-2 xl:grid-cols-4">
                  <ToggleField
                    label="Include in report"
                    checked={reference.includeInReport}
                    onChange={(checked) =>
                      updateReference(index, (current) => ({
                        ...current,
                        includeInReport: checked,
                      }))
                    }
                  />
                  <ToggleField
                    label="Primary geotechnical reference"
                    checked={reference.primaryGeotechnical}
                    disabled={!reference.active || reference.documentType !== 'Geotechnical Report'}
                    onChange={(checked) => setPrimary(index, 'primaryGeotechnical', checked)}
                  />
                  <ToggleField
                    label="Primary structural reference"
                    checked={reference.primaryStructuralReference}
                    disabled={!reference.active || reference.documentType !== 'Structural Drawing'}
                    onChange={(checked) => setPrimary(index, 'primaryStructuralReference', checked)}
                  />
                  <ToggleField
                    label="Active"
                    checked={reference.active}
                    onChange={(checked) =>
                      updateReference(index, (current) => ({
                        ...current,
                        active: checked,
                      }))
                    }
                  />
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}

function syncProjectReferenceState(
  current: MultiPileProjectSpecifics,
  references: MultiPileProjectReference[],
): MultiPileProjectSpecifics {
  const nextReferences = enforceReferenceRules(references);
  const validGeotechnicalReferenceIds = new Set(
    nextReferences
      .filter((reference) => reference.active && reference.documentType === 'Geotechnical Report')
      .map((reference) => reference.id),
  );
  const primaryGeotechnicalReferenceId =
    nextReferences.find((reference) => reference.primaryGeotechnical)?.id ?? '';
  const requestedReferenceId =
    current.geotechnicalMaterials.activeReferenceId &&
    validGeotechnicalReferenceIds.has(current.geotechnicalMaterials.activeReferenceId)
      ? current.geotechnicalMaterials.activeReferenceId
      : primaryGeotechnicalReferenceId;

  return {
    ...current,
    references: nextReferences,
    geotechnicalMaterials: {
      ...current.geotechnicalMaterials,
      activeReferenceId: requestedReferenceId,
      materials: current.geotechnicalMaterials.materials.map((material) => ({
        ...material,
        sourceReferenceId: validGeotechnicalReferenceIds.has(material.sourceReferenceId)
          ? material.sourceReferenceId
          : requestedReferenceId,
      })),
    },
  };
}

function enforceReferenceRules(references: MultiPileProjectReference[]) {
  let primaryGeotechnicalAssigned = false;
  let primaryStructuralAssigned = false;

  return references.map((reference) => {
    const primaryGeotechnical =
      reference.active &&
      reference.documentType === 'Geotechnical Report' &&
      reference.primaryGeotechnical &&
      !primaryGeotechnicalAssigned;
    const primaryStructuralReference =
      reference.active &&
      reference.documentType === 'Structural Drawing' &&
      reference.primaryStructuralReference &&
      !primaryStructuralAssigned;

    if (primaryGeotechnical) {
      primaryGeotechnicalAssigned = true;
    }
    if (primaryStructuralReference) {
      primaryStructuralAssigned = true;
    }

    return {
      ...reference,
      primaryGeotechnical,
      primaryStructuralReference,
    };
  });
}

function LabeledField({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={className}>
      <Label className="mb-2 block">{label}</Label>
      {children}
    </div>
  );
}

function ToggleField({
  label,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-3 text-sm font-medium">
      <input
        type="checkbox"
        className="h-4 w-4 rounded border border-input"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
      />
      {label}
    </label>
  );
}
