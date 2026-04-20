'use client';

import type { ReactNode } from 'react';
import {
  MULTI_PILE_MANUAL_STRUCTURAL_PROFILE_ID,
  MULTI_PILE_STRUCTURAL_EC_MODES,
  applyProjectConcretePresetToRow,
  applyProjectTendonPresetToRow,
  normalizeProjectConcreteClass,
  normalizeProjectCoverClass,
  normalizeProjectReinforcementGrade,
  normalizeProjectTendonGrade,
  projectConcretePresetProfiles,
  projectTendonPresetProfiles,
  resolveProjectConcreteClass,
  resolveProjectTendonGrade,
  type MultiPileProjectConcreteClass,
  type MultiPileProjectCoverDurabilityClass,
  type MultiPileProjectReinforcementGrade,
  type MultiPileProjectSpecifics,
  type MultiPileProjectTendonGrade,
} from '@eng/shared';
import { Plus, Trash2 } from 'lucide-react';
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
  createEmptyConcreteClass,
  createEmptyCoverClass,
  createEmptyReinforcementGrade,
  createEmptyTendonGrade,
  nullableNumberFromInput,
  nullableNumberToInput,
  summarizeProjectStructuralDefaults,
} from './project-specifics-utils';

type StructuralLibraryKey = keyof MultiPileProjectSpecifics['structuralDefaults'];
const CONCRETE_PRESET_OPTIONS = projectConcretePresetProfiles();
const TENDON_PRESET_OPTIONS = projectTendonPresetProfiles();

interface ProjectStructuralDefaultLibrariesEditorProps {
  value: MultiPileProjectSpecifics;
  onChange: (value: MultiPileProjectSpecifics) => void;
}

export function ProjectStructuralDefaultLibrariesEditor({
  value,
  onChange,
}: ProjectStructuralDefaultLibrariesEditorProps) {
  const summary = summarizeProjectStructuralDefaults(value);
  const { structuralDefaults } = value;

  function updateProjectSpecifics(
    updater: (current: MultiPileProjectSpecifics) => MultiPileProjectSpecifics,
  ) {
    onChange(updater(value));
  }

  function updateStructuralArray<K extends StructuralLibraryKey>(
    key: K,
    index: number,
    updater: (
      row: MultiPileProjectSpecifics['structuralDefaults'][K][number],
    ) => MultiPileProjectSpecifics['structuralDefaults'][K][number],
  ) {
    updateProjectSpecifics((current) => ({
      ...current,
      structuralDefaults: {
        ...current.structuralDefaults,
        [key]: current.structuralDefaults[key].map((row, rowIndex) =>
          rowIndex === index ? updater(row) : row,
        ),
      },
    }));
  }

  function updateConcreteClass(
    index: number,
    updater: (row: MultiPileProjectConcreteClass) => MultiPileProjectConcreteClass,
  ) {
    updateStructuralArray('concreteClasses', index, (current) =>
      normalizeProjectConcreteClass(updater(current), index),
    );
  }

  function updateReinforcementGrade(
    index: number,
    updater: (row: MultiPileProjectReinforcementGrade) => MultiPileProjectReinforcementGrade,
  ) {
    updateStructuralArray('reinforcementGrades', index, (current) =>
      normalizeProjectReinforcementGrade(updater(current), index),
    );
  }

  function updateTendonGrade(
    index: number,
    updater: (row: MultiPileProjectTendonGrade) => MultiPileProjectTendonGrade,
  ) {
    updateStructuralArray('tendonGrades', index, (current) =>
      normalizeProjectTendonGrade(updater(current), index),
    );
  }

  function setTendonPreset(index: number, nextProfileId: string) {
    updateTendonGrade(index, (current) => {
      if (current.standardProfileId === nextProfileId) {
        return current;
      }

      return {
        ...(applyProjectTendonPresetToRow(current, nextProfileId) as MultiPileProjectTendonGrade),
        id: current.id,
        active: current.active,
        overrideStandardValues: current.overrideStandardValues,
      };
    });
  }

  function setTendonOverride(index: number, checked: boolean) {
    updateTendonGrade(index, (current) => {
      if (!checked && current.standardProfileId !== MULTI_PILE_MANUAL_STRUCTURAL_PROFILE_ID) {
        return {
          ...(applyProjectTendonPresetToRow(
            current,
            current.standardProfileId,
          ) as MultiPileProjectTendonGrade),
          id: current.id,
          active: current.active,
          overrideStandardValues: false,
        };
      }

      return {
        ...current,
        overrideStandardValues: checked,
      };
    });
  }

  function updateCoverClass(
    index: number,
    updater: (row: MultiPileProjectCoverDurabilityClass) => MultiPileProjectCoverDurabilityClass,
  ) {
    updateStructuralArray('coverDurabilityClasses', index, (current) =>
      normalizeProjectCoverClass(updater(current), index),
    );
  }

  function setConcretePreset(index: number, nextProfileId: string) {
    updateConcreteClass(index, (current) => {
      if (current.standardProfileId === nextProfileId) {
        return current;
      }

      return {
        ...(applyProjectConcretePresetToRow(
          current,
          nextProfileId,
        ) as MultiPileProjectConcreteClass),
        id: current.id,
        active: current.active,
        overrideStandardValues: current.overrideStandardValues,
      };
    });
  }

  function setConcreteOverride(index: number, checked: boolean) {
    updateConcreteClass(index, (current) => {
      if (!checked && current.standardProfileId !== MULTI_PILE_MANUAL_STRUCTURAL_PROFILE_ID) {
        return {
          ...(applyProjectConcretePresetToRow(
            current,
            current.standardProfileId,
          ) as MultiPileProjectConcreteClass),
          id: current.id,
          active: current.active,
          overrideStandardValues: false,
        };
      }

      return {
        ...current,
        overrideStandardValues: checked,
      };
    });
  }

  function removeStructuralRow(key: StructuralLibraryKey, rowId: string) {
    updateProjectSpecifics((current) => ({
      ...current,
      structuralDefaults: {
        ...current.structuralDefaults,
        [key]: current.structuralDefaults[key].filter((row) => row.id !== rowId),
      },
    }));
  }

  function addConcreteClass() {
    updateProjectSpecifics((current) => ({
      ...current,
      structuralDefaults: {
        ...current.structuralDefaults,
        concreteClasses: [
          ...current.structuralDefaults.concreteClasses,
          createEmptyConcreteClass(),
        ],
      },
    }));
  }

  function addReinforcementGrade() {
    updateProjectSpecifics((current) => ({
      ...current,
      structuralDefaults: {
        ...current.structuralDefaults,
        reinforcementGrades: [
          ...current.structuralDefaults.reinforcementGrades,
          createEmptyReinforcementGrade(),
        ],
      },
    }));
  }

  function addTendonGrade() {
    updateProjectSpecifics((current) => ({
      ...current,
      structuralDefaults: {
        ...current.structuralDefaults,
        tendonGrades: [...current.structuralDefaults.tendonGrades, createEmptyTendonGrade()],
      },
    }));
  }

  function addCoverClass() {
    updateProjectSpecifics((current) => ({
      ...current,
      structuralDefaults: {
        ...current.structuralDefaults,
        coverDurabilityClasses: [
          ...current.structuralDefaults.coverDurabilityClasses,
          createEmptyCoverClass(),
        ],
      },
    }));
  }

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="space-y-1">
          <CardTitle className="text-base">Project Structural Default Libraries</CardTitle>
          <CardDescription>
            Maintain project-owned concrete, reinforcement, tendon, and cover / durability libraries
            here. Multi-Pile reads these as shared project context.
          </CardDescription>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">{summary.totalRows} rows</Badge>
          <Badge variant="outline">{summary.activeRows} active</Badge>
          <Badge variant="outline">{summary.configuredLibraries}/4 libraries configured</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <LibrarySection
          title="Concrete Classes"
          description="Project-wide concrete strength, modulus, density, shrinkage, and creep references."
          count={structuralDefaults.concreteClasses.length}
          actionLabel="Add Concrete Class"
          onAdd={addConcreteClass}
        >
          {structuralDefaults.concreteClasses.length === 0 ? (
            <EmptyState>No concrete classes added yet.</EmptyState>
          ) : (
            structuralDefaults.concreteClasses.map((row, index) => (
              <ConcreteClassEditorRow
                key={row.id}
                row={row}
                index={index}
                onRemove={() => removeStructuralRow('concreteClasses', row.id)}
                onUpdate={updateConcreteClass}
                onSetPreset={setConcretePreset}
                onSetOverride={setConcreteOverride}
              />
            ))
          )}
        </LibrarySection>

        <LibrarySection
          title="Reinforcement Grades"
          description="Project-wide reinforcing steel definitions."
          count={structuralDefaults.reinforcementGrades.length}
          actionLabel="Add Reinforcement Grade"
          onAdd={addReinforcementGrade}
        >
          {structuralDefaults.reinforcementGrades.length === 0 ? (
            <EmptyState>No reinforcement grades added yet.</EmptyState>
          ) : (
            structuralDefaults.reinforcementGrades.map((row, index) => (
              <ReinforcementGradeEditorRow
                key={row.id}
                row={row}
                index={index}
                onRemove={() => removeStructuralRow('reinforcementGrades', row.id)}
                onUpdate={updateReinforcementGrade}
              />
            ))
          )}
        </LibrarySection>

        <LibrarySection
          title="Tendon Grades"
          description="Project-wide tendon and prestressing reference properties."
          count={structuralDefaults.tendonGrades.length}
          actionLabel="Add Tendon Grade"
          onAdd={addTendonGrade}
        >
          {structuralDefaults.tendonGrades.length === 0 ? (
            <EmptyState>No tendon grades added yet.</EmptyState>
          ) : (
            structuralDefaults.tendonGrades.map((row, index) => (
              <TendonGradeEditorRow
                key={row.id}
                row={row}
                index={index}
                onRemove={() => removeStructuralRow('tendonGrades', row.id)}
                onUpdate={updateTendonGrade}
                onSetPreset={setTendonPreset}
                onSetOverride={setTendonOverride}
              />
            ))
          )}
        </LibrarySection>

        <LibrarySection
          title="Cover / Durability Classes"
          description="Project-wide nominal cover and durability assumptions."
          count={structuralDefaults.coverDurabilityClasses.length}
          actionLabel="Add Cover Class"
          onAdd={addCoverClass}
        >
          {structuralDefaults.coverDurabilityClasses.length === 0 ? (
            <EmptyState>No cover / durability classes added yet.</EmptyState>
          ) : (
            structuralDefaults.coverDurabilityClasses.map((row, index) => (
              <CoverDurabilityEditorRow
                key={row.id}
                row={row}
                index={index}
                onRemove={() => removeStructuralRow('coverDurabilityClasses', row.id)}
                onUpdate={updateCoverClass}
              />
            ))
          )}
        </LibrarySection>
      </CardContent>
    </Card>
  );
}

function ConcreteClassEditorRow({
  row,
  index,
  onRemove,
  onUpdate,
  onSetPreset,
  onSetOverride,
}: {
  row: MultiPileProjectConcreteClass;
  index: number;
  onRemove: () => void;
  onUpdate: (
    index: number,
    updater: (row: MultiPileProjectConcreteClass) => MultiPileProjectConcreteClass,
  ) => void;
  onSetPreset: (index: number, nextProfileId: string) => void;
  onSetOverride: (index: number, checked: boolean) => void;
}) {
  const resolved = resolveProjectConcreteClass(row);
  const concreteRow = resolved.row;
  const locked = resolved.presetLocked;
  const isManual = concreteRow.standardProfileId === MULTI_PILE_MANUAL_STRUCTURAL_PROFILE_ID;
  const displayNameLocked = !isManual && !concreteRow.overrideStandardValues;
  const ecValueLocked = locked || concreteRow.EcMode !== 'override';

  return (
    <LibraryRow
      title={concreteRow.displayName || concreteRow.id}
      subtitle={concreteRow.sourceStandard || 'Project concrete class'}
      onRemove={onRemove}
    >
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr),auto,auto]">
        <div className="space-y-4 rounded-lg border bg-muted/10 p-4">
          <LabeledField label="Display Name / Preset">
            <Select
              value={concreteRow.standardProfileId}
              onValueChange={(nextValue) => onSetPreset(index, nextValue)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CONCRETE_PRESET_OPTIONS.map((preset) => (
                  <SelectItem key={preset.id} value={preset.id}>
                    {preset.displayName}
                  </SelectItem>
                ))}
                <SelectItem value={MULTI_PILE_MANUAL_STRUCTURAL_PROFILE_ID}>
                  Custom / manual
                </SelectItem>
              </SelectContent>
            </Select>
          </LabeledField>

          <LabeledField label="Display Name">
            <Input
              value={concreteRow.displayName}
              placeholder="Concrete class label"
              readOnly={displayNameLocked}
              className={displayNameLocked ? 'bg-muted/40 text-muted-foreground' : undefined}
              onChange={(event) =>
                onUpdate(index, (current) => ({
                  ...current,
                  displayName: event.target.value,
                }))
              }
            />
          </LabeledField>

          <p className="text-xs text-muted-foreground">
            {resolveConcreteSourceModeText(resolved.sourceMode)}
          </p>
        </div>

        <BooleanField
          label="Override"
          checked={concreteRow.overrideStandardValues}
          onChange={(checked) => onSetOverride(index, checked)}
        />

        <BooleanField
          label="Active"
          checked={concreteRow.active}
          onChange={(checked) =>
            onUpdate(index, (current) => ({
              ...current,
              active: checked,
            }))
          }
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <SectionShell title="Source Reference">
          <div className="grid gap-4 md:grid-cols-2">
            <LabeledField label="Standard">
              <Input
                value={concreteRow.sourceStandard}
                placeholder="Standard"
                readOnly={locked}
                className={resolveReadOnlyClassName(locked)}
                onChange={(event) =>
                  onUpdate(index, (current) => ({
                    ...current,
                    sourceStandard: event.target.value,
                  }))
                }
              />
            </LabeledField>
            <LabeledField label="Section">
              <Input
                value={concreteRow.sourceSection}
                placeholder="Section"
                readOnly={locked}
                className={resolveReadOnlyClassName(locked)}
                onChange={(event) =>
                  onUpdate(index, (current) => ({
                    ...current,
                    sourceSection: event.target.value,
                  }))
                }
              />
            </LabeledField>
            <LabeledField label="Clause">
              <Input
                value={concreteRow.sourceClause}
                placeholder="Clause"
                readOnly={locked}
                className={resolveReadOnlyClassName(locked)}
                onChange={(event) =>
                  onUpdate(index, (current) => ({
                    ...current,
                    sourceClause: event.target.value,
                  }))
                }
              />
            </LabeledField>
            <LabeledField label="Table / figure">
              <Input
                value={concreteRow.sourceTable}
                placeholder="Table / figure"
                readOnly={locked}
                className={resolveReadOnlyClassName(locked)}
                onChange={(event) =>
                  onUpdate(index, (current) => ({
                    ...current,
                    sourceTable: event.target.value,
                  }))
                }
              />
            </LabeledField>
          </div>

          <LabeledField label="Pages / note">
            <Input
              value={concreteRow.sourcePagesNote}
              placeholder="Pages / note"
              readOnly={locked}
              className={resolveReadOnlyClassName(locked)}
              onChange={(event) =>
                onUpdate(index, (current) => ({
                  ...current,
                  sourcePagesNote: event.target.value,
                }))
              }
            />
          </LabeledField>
        </SectionShell>

        <SectionShell title="Strength Properties">
          <div className="grid gap-4 md:grid-cols-2">
            <NumberField
              label="f'c (MPa)"
              value={concreteRow.fc_MPa}
              step="1"
              readOnly={locked}
              className={resolveReadOnlyClassName(locked)}
              onChange={(nextValue) =>
                onUpdate(index, (current) => ({
                  ...current,
                  fc_MPa: nextValue,
                }))
              }
            />
            <NumberField
              label="f'c,cube (MPa)"
              value={concreteRow.fc_cube_MPa}
              step="1"
              readOnly={locked}
              className={resolveReadOnlyClassName(locked)}
              onChange={(nextValue) =>
                onUpdate(index, (current) => ({
                  ...current,
                  fc_cube_MPa: nextValue,
                }))
              }
            />
            <NumberField
              label="fcm (MPa)"
              value={concreteRow.fcm_MPa}
              step="1"
              readOnly={locked}
              className={resolveReadOnlyClassName(locked)}
              onChange={(nextValue) =>
                onUpdate(index, (current) => ({
                  ...current,
                  fcm_MPa: nextValue,
                }))
              }
            />
            <NumberField
              label="fcmi (MPa)"
              value={concreteRow.fcmi_MPa}
              step="1"
              readOnly={locked}
              className={resolveReadOnlyClassName(locked)}
              onChange={(nextValue) =>
                onUpdate(index, (current) => ({
                  ...current,
                  fcmi_MPa: nextValue,
                }))
              }
            />
            <NumberField
              label="fctf (MPa)"
              value={concreteRow.fctf_MPa}
              step="0.01"
              readOnly={locked}
              className={resolveReadOnlyClassName(locked)}
              onChange={(nextValue) =>
                onUpdate(index, (current) => ({
                  ...current,
                  fctf_MPa: nextValue,
                }))
              }
            />
            <NumberField
              label="fct (MPa)"
              value={concreteRow.fct_MPa}
              step="0.01"
              readOnly={locked}
              className={resolveReadOnlyClassName(locked)}
              onChange={(nextValue) =>
                onUpdate(index, (current) => ({
                  ...current,
                  fct_MPa: nextValue,
                }))
              }
            />
          </div>
        </SectionShell>

        <SectionShell title="Ec / Density / nu / alpha">
          <div className="grid gap-4">
            <LabeledField label="Ec">
              <Select
                value={concreteRow.EcMode}
                disabled={locked}
                onValueChange={(nextValue) =>
                  onUpdate(index, (current) => ({
                    ...current,
                    EcMode: nextValue as MultiPileProjectConcreteClass['EcMode'],
                  }))
                }
              >
                <SelectTrigger className={locked ? 'bg-muted/40 text-muted-foreground' : undefined}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MULTI_PILE_STRUCTURAL_EC_MODES.map((mode) => (
                    <SelectItem key={mode} value={mode}>
                      {mode === 'override' ? 'Ec override' : 'Ec auto'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </LabeledField>

            <NumberField
              label="Ec (MPa)"
              value={concreteRow.Ec_MPa}
              step="1"
              readOnly={ecValueLocked}
              className={resolveReadOnlyClassName(ecValueLocked)}
              onChange={(nextValue) =>
                onUpdate(index, (current) => ({
                  ...current,
                  Ec_MPa: nextValue,
                }))
              }
            />

            <div className="grid gap-4 md:grid-cols-3">
              <NumberField
                label="Density (kg/m3)"
                value={concreteRow.density_kgm3}
                step="1"
                readOnly={locked}
                className={resolveReadOnlyClassName(locked)}
                onChange={(nextValue) =>
                  onUpdate(index, (current) => ({
                    ...current,
                    density_kgm3: nextValue,
                  }))
                }
              />
              <NumberField
                label="Poisson's ratio"
                value={concreteRow.poissonsRatio}
                step="0.01"
                readOnly={locked}
                className={resolveReadOnlyClassName(locked)}
                onChange={(nextValue) =>
                  onUpdate(index, (current) => ({
                    ...current,
                    poissonsRatio: nextValue,
                  }))
                }
              />
              <NumberField
                label="Thermal expansion /degC"
                value={concreteRow.thermalExpansionPerDegC}
                step="0.000001"
                readOnly={locked}
                className={resolveReadOnlyClassName(locked)}
                onChange={(nextValue) =>
                  onUpdate(index, (current) => ({
                    ...current,
                    thermalExpansionPerDegC: nextValue,
                  }))
                }
              />
            </div>
          </div>
        </SectionShell>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <SectionShell title="Shrinkage References">
          <div className="grid gap-4">
            <LabeledField label="Shrinkage reference text">
              <Textarea
                value={concreteRow.shrinkageReferenceText}
                placeholder="Shrinkage reference text..."
                readOnly={locked}
                className={resolveReadOnlyClassName(locked, true)}
                onChange={(event) =>
                  onUpdate(index, (current) => ({
                    ...current,
                    shrinkageReferenceText: event.target.value,
                  }))
                }
              />
            </LabeledField>
            <LabeledField label="Shrinkage environment notes">
              <Textarea
                value={concreteRow.shrinkageEnvironmentNotes}
                placeholder="Shrinkage environment notes..."
                readOnly={locked}
                className={resolveReadOnlyClassName(locked, true)}
                onChange={(event) =>
                  onUpdate(index, (current) => ({
                    ...current,
                    shrinkageEnvironmentNotes: event.target.value,
                  }))
                }
              />
            </LabeledField>
          </div>
        </SectionShell>

        <SectionShell title="Creep References">
          <div className="grid gap-4">
            <LabeledField label="Creep reference text">
              <Textarea
                value={concreteRow.creepReferenceText}
                placeholder="Creep reference text..."
                readOnly={locked}
                className={resolveReadOnlyClassName(locked, true)}
                onChange={(event) =>
                  onUpdate(index, (current) => ({
                    ...current,
                    creepReferenceText: event.target.value,
                  }))
                }
              />
            </LabeledField>
            <LabeledField label="Creep environment notes">
              <Textarea
                value={concreteRow.creepEnvironmentNotes}
                placeholder="Creep environment notes..."
                readOnly={locked}
                className={resolveReadOnlyClassName(locked, true)}
                onChange={(event) =>
                  onUpdate(index, (current) => ({
                    ...current,
                    creepEnvironmentNotes: event.target.value,
                  }))
                }
              />
            </LabeledField>
          </div>
        </SectionShell>
      </div>

      <SectionShell title="Notes">
        <LabeledField label="Concrete class notes">
          <Textarea
            value={concreteRow.notes}
            placeholder="Concrete class notes..."
            readOnly={locked}
            className={resolveReadOnlyClassName(locked, true)}
            onChange={(event) =>
              onUpdate(index, (current) => ({
                ...current,
                notes: event.target.value,
              }))
            }
          />
        </LabeledField>
      </SectionShell>
    </LibraryRow>
  );
}

function ReinforcementGradeEditorRow({
  row,
  index,
  onRemove,
  onUpdate,
}: {
  row: MultiPileProjectReinforcementGrade;
  index: number;
  onRemove: () => void;
  onUpdate: (
    index: number,
    updater: (row: MultiPileProjectReinforcementGrade) => MultiPileProjectReinforcementGrade,
  ) => void;
}) {
  const reinforcementRow = normalizeProjectReinforcementGrade(row, index);

  return (
    <LibraryRow
      title={reinforcementRow.displayName || reinforcementRow.id}
      subtitle={reinforcementRow.sourceStandard || 'Project reinforcement grade'}
      onRemove={onRemove}
    >
      <div className="grid gap-4 xl:grid-cols-3">
        <SectionShell title="Display Name">
          <LabeledField label="Display Name">
            <Input
              value={reinforcementRow.displayName}
              placeholder="Reinforcement grade name"
              onChange={(event) =>
                onUpdate(index, (current) => ({
                  ...current,
                  displayName: event.target.value,
                }))
              }
            />
          </LabeledField>
        </SectionShell>

        <SectionShell title="Source Reference">
          <div className="grid gap-4 md:grid-cols-2">
            <LabeledField label="Standard">
              <Input
                value={reinforcementRow.sourceStandard}
                placeholder="Standard"
                onChange={(event) =>
                  onUpdate(index, (current) => ({
                    ...current,
                    sourceStandard: event.target.value,
                  }))
                }
              />
            </LabeledField>
            <LabeledField label="Section">
              <Input
                value={reinforcementRow.sourceSection}
                placeholder="Section"
                onChange={(event) =>
                  onUpdate(index, (current) => ({
                    ...current,
                    sourceSection: event.target.value,
                  }))
                }
              />
            </LabeledField>
            <LabeledField label="Clause">
              <Input
                value={reinforcementRow.sourceClause}
                placeholder="Clause"
                onChange={(event) =>
                  onUpdate(index, (current) => ({
                    ...current,
                    sourceClause: event.target.value,
                  }))
                }
              />
            </LabeledField>
            <LabeledField label="Table / figure">
              <Input
                value={reinforcementRow.sourceTable}
                placeholder="Table / figure"
                onChange={(event) =>
                  onUpdate(index, (current) => ({
                    ...current,
                    sourceTable: event.target.value,
                  }))
                }
              />
            </LabeledField>
          </div>

          <LabeledField label="Pages / note">
            <Input
              value={reinforcementRow.sourcePagesNote}
              placeholder="Pages / note"
              onChange={(event) =>
                onUpdate(index, (current) => ({
                  ...current,
                  sourcePagesNote: event.target.value,
                }))
              }
            />
          </LabeledField>
        </SectionShell>

        <SectionShell title="Grade Properties">
          <div className="grid gap-4 md:grid-cols-2">
            <LabeledField label="Designation / grade">
              <Input
                value={reinforcementRow.designationGrade}
                placeholder="Designation / grade"
                onChange={(event) =>
                  onUpdate(index, (current) => ({
                    ...current,
                    designationGrade: event.target.value,
                  }))
                }
              />
            </LabeledField>
            <NumberField
              label="fsy (MPa)"
              value={reinforcementRow.fsy_MPa}
              step="1"
              onChange={(nextValue) =>
                onUpdate(index, (current) => ({
                  ...current,
                  fsy_MPa: nextValue,
                }))
              }
            />
            <NumberField
              label="esu"
              value={reinforcementRow.esu}
              step="0.001"
              onChange={(nextValue) =>
                onUpdate(index, (current) => ({
                  ...current,
                  esu: nextValue,
                }))
              }
            />
            <LabeledField label="Ductility class">
              <Input
                value={reinforcementRow.ductilityClass}
                placeholder="Ductility class"
                onChange={(event) =>
                  onUpdate(index, (current) => ({
                    ...current,
                    ductilityClass: event.target.value,
                  }))
                }
              />
            </LabeledField>
          </div>
        </SectionShell>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <SectionShell title="Es / alpha">
          <div className="grid gap-4 md:grid-cols-2">
            <NumberField
              label="Es (MPa)"
              value={reinforcementRow.Es_MPa}
              step="1000"
              onChange={(nextValue) =>
                onUpdate(index, (current) => ({
                  ...current,
                  Es_MPa: nextValue,
                }))
              }
            />
            <NumberField
              label="Thermal expansion /degC"
              value={reinforcementRow.thermalExpansionPerDegC}
              step="0.000001"
              onChange={(nextValue) =>
                onUpdate(index, (current) => ({
                  ...current,
                  thermalExpansionPerDegC: nextValue,
                }))
              }
            />
          </div>
        </SectionShell>

        <SectionShell title="Stress-Strain Reference">
          <LabeledField label="Stress-strain reference text">
            <Textarea
              value={reinforcementRow.stressStrainReferenceText}
              placeholder="Stress-strain reference..."
              onChange={(event) =>
                onUpdate(index, (current) => ({
                  ...current,
                  stressStrainReferenceText: event.target.value,
                }))
              }
            />
          </LabeledField>
        </SectionShell>

        <SectionShell title="Notes">
          <div className="grid gap-4">
            <LabeledField label="Reinforcement notes">
              <Textarea
                value={reinforcementRow.notes}
                placeholder="Reinforcement notes..."
                onChange={(event) =>
                  onUpdate(index, (current) => ({
                    ...current,
                    notes: event.target.value,
                  }))
                }
              />
            </LabeledField>
            <BooleanField
              label="Active"
              checked={reinforcementRow.active}
              onChange={(checked) =>
                onUpdate(index, (current) => ({
                  ...current,
                  active: checked,
                }))
              }
            />
          </div>
        </SectionShell>
      </div>
    </LibraryRow>
  );
}

function TendonGradeEditorRow({
  row,
  index,
  onRemove,
  onUpdate,
  onSetPreset,
  onSetOverride,
}: {
  row: MultiPileProjectTendonGrade;
  index: number;
  onRemove: () => void;
  onUpdate: (
    index: number,
    updater: (row: MultiPileProjectTendonGrade) => MultiPileProjectTendonGrade,
  ) => void;
  onSetPreset: (index: number, nextProfileId: string) => void;
  onSetOverride: (index: number, checked: boolean) => void;
}) {
  const resolved = resolveProjectTendonGrade(row);
  const tendonRow = resolved.row;
  const locked = resolved.presetLocked;
  const isManual = tendonRow.standardProfileId === MULTI_PILE_MANUAL_STRUCTURAL_PROFILE_ID;
  const displayNameLocked = !isManual && !tendonRow.overrideStandardValues;

  return (
    <LibraryRow
      title={tendonRow.displayName || tendonRow.id}
      subtitle={tendonRow.sourceStandard || 'Project tendon grade'}
      onRemove={onRemove}
    >
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr),auto,auto]">
        <div className="space-y-4 rounded-lg border bg-muted/10 p-4">
          <LabeledField label="Display Name / Preset">
            <Select
              value={tendonRow.standardProfileId}
              onValueChange={(nextValue) => onSetPreset(index, nextValue)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TENDON_PRESET_OPTIONS.map((preset) => (
                  <SelectItem key={preset.id} value={preset.id}>
                    {preset.displayName}
                  </SelectItem>
                ))}
                <SelectItem value={MULTI_PILE_MANUAL_STRUCTURAL_PROFILE_ID}>
                  Custom / manual
                </SelectItem>
              </SelectContent>
            </Select>
          </LabeledField>

          <LabeledField label="Display Name">
            <Input
              value={tendonRow.displayName}
              placeholder="Tendon row label"
              readOnly={displayNameLocked}
              className={displayNameLocked ? 'bg-muted/40 text-muted-foreground' : undefined}
              onChange={(event) =>
                onUpdate(index, (current) => ({
                  ...current,
                  displayName: event.target.value,
                }))
              }
            />
          </LabeledField>

          <p className="text-xs text-muted-foreground">
            {resolveConcreteSourceModeText(resolved.sourceMode)}
          </p>
        </div>

        <BooleanField
          label="Override"
          checked={tendonRow.overrideStandardValues}
          onChange={(checked) => onSetOverride(index, checked)}
        />

        <BooleanField
          label="Active"
          checked={tendonRow.active}
          onChange={(checked) =>
            onUpdate(index, (current) => ({
              ...current,
              active: checked,
            }))
          }
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <SectionShell title="Source Reference">
          <div className="grid gap-4 md:grid-cols-2">
            <LabeledField label="Standard">
              <Input
                value={tendonRow.sourceStandard}
                placeholder="Standard"
                readOnly={locked}
                className={resolveReadOnlyClassName(locked)}
                onChange={(event) =>
                  onUpdate(index, (current) => ({
                    ...current,
                    sourceStandard: event.target.value,
                  }))
                }
              />
            </LabeledField>
            <LabeledField label="Section">
              <Input
                value={tendonRow.sourceSection}
                placeholder="Section"
                readOnly={locked}
                className={resolveReadOnlyClassName(locked)}
                onChange={(event) =>
                  onUpdate(index, (current) => ({
                    ...current,
                    sourceSection: event.target.value,
                  }))
                }
              />
            </LabeledField>
            <LabeledField label="Clause">
              <Input
                value={tendonRow.sourceClause}
                placeholder="Clause"
                readOnly={locked}
                className={resolveReadOnlyClassName(locked)}
                onChange={(event) =>
                  onUpdate(index, (current) => ({
                    ...current,
                    sourceClause: event.target.value,
                  }))
                }
              />
            </LabeledField>
            <LabeledField label="Table / figure">
              <Input
                value={tendonRow.sourceTable}
                placeholder="Table / figure"
                readOnly={locked}
                className={resolveReadOnlyClassName(locked)}
                onChange={(event) =>
                  onUpdate(index, (current) => ({
                    ...current,
                    sourceTable: event.target.value,
                  }))
                }
              />
            </LabeledField>
          </div>

          <LabeledField label="Pages / note">
            <Input
              value={tendonRow.sourcePagesNote}
              placeholder="Pages / note"
              readOnly={locked}
              className={resolveReadOnlyClassName(locked)}
              onChange={(event) =>
                onUpdate(index, (current) => ({
                  ...current,
                  sourcePagesNote: event.target.value,
                }))
              }
            />
          </LabeledField>
        </SectionShell>

        <SectionShell title="Tendon Properties">
          <div className="grid gap-4 md:grid-cols-2">
            <LabeledField label="Tendon type">
              <Input
                value={tendonRow.tendonType}
                placeholder="Tendon type"
                readOnly={locked}
                className={resolveReadOnlyClassName(locked)}
                onChange={(event) =>
                  onUpdate(index, (current) => ({
                    ...current,
                    tendonType: event.target.value,
                  }))
                }
              />
            </LabeledField>
            <NumberField
              label="Nominal diameter (mm)"
              value={tendonRow.nominalDiameter_mm}
              step="0.1"
              readOnly={locked}
              className={resolveReadOnlyClassName(locked)}
              onChange={(nextValue) =>
                onUpdate(index, (current) => ({
                  ...current,
                  nominalDiameter_mm: nextValue,
                }))
              }
            />
            <NumberField
              label="Area (mm2)"
              value={tendonRow.area_mm2}
              step="0.1"
              readOnly={locked}
              className={resolveReadOnlyClassName(locked)}
              onChange={(nextValue) =>
                onUpdate(index, (current) => ({
                  ...current,
                  area_mm2: nextValue,
                }))
              }
            />
          </div>
        </SectionShell>

        <SectionShell title="Strength / Modulus">
          <div className="grid gap-4 md:grid-cols-2">
            <NumberField
              label="fpb (kN)"
              value={tendonRow.fpb_kN}
              step="0.1"
              readOnly={locked}
              className={resolveReadOnlyClassName(locked)}
              onChange={(nextValue) =>
                onUpdate(index, (current) => ({
                  ...current,
                  fpb_kN: nextValue,
                }))
              }
            />
            <NumberField
              label="fpb (MPa)"
              value={tendonRow.fpb_MPa}
              step="1"
              readOnly={locked}
              className={resolveReadOnlyClassName(locked)}
              onChange={(nextValue) =>
                onUpdate(index, (current) => ({
                  ...current,
                  fpb_MPa: nextValue,
                }))
              }
            />
            <NumberField
              label="fpy (MPa)"
              value={tendonRow.fpy_MPa}
              step="1"
              readOnly={locked}
              className={resolveReadOnlyClassName(locked)}
              onChange={(nextValue) =>
                onUpdate(index, (current) => ({
                  ...current,
                  fpy_MPa: nextValue,
                }))
              }
            />
            <NumberField
              label="Ep (MPa)"
              value={tendonRow.Ep_MPa}
              step="1000"
              readOnly={locked}
              className={resolveReadOnlyClassName(locked)}
              onChange={(nextValue) =>
                onUpdate(index, (current) => ({
                  ...current,
                  Ep_MPa: nextValue,
                }))
              }
            />
          </div>
        </SectionShell>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <SectionShell title="Stress-Strain / Relaxation">
          <div className="grid gap-4">
            <LabeledField label="Stress-strain reference text">
              <Textarea
                value={tendonRow.stressStrainReferenceText}
                placeholder="Stress-strain reference..."
                readOnly={locked}
                className={resolveReadOnlyClassName(locked, true)}
                onChange={(event) =>
                  onUpdate(index, (current) => ({
                    ...current,
                    stressStrainReferenceText: event.target.value,
                  }))
                }
              />
            </LabeledField>
            <LabeledField label="Relaxation reference text">
              <Textarea
                value={tendonRow.relaxationReferenceText}
                placeholder="Relaxation reference..."
                readOnly={locked}
                className={resolveReadOnlyClassName(locked, true)}
                onChange={(event) =>
                  onUpdate(index, (current) => ({
                    ...current,
                    relaxationReferenceText: event.target.value,
                  }))
                }
              />
            </LabeledField>
          </div>
        </SectionShell>

        <SectionShell title="Notes">
          <LabeledField label="Tendon notes">
            <Textarea
              value={tendonRow.notes}
              placeholder="Tendon notes..."
              readOnly={locked}
              className={resolveReadOnlyClassName(locked, true)}
              onChange={(event) =>
                onUpdate(index, (current) => ({
                  ...current,
                  notes: event.target.value,
                }))
              }
            />
          </LabeledField>
        </SectionShell>
      </div>
    </LibraryRow>
  );
}

function CoverDurabilityEditorRow({
  row,
  index,
  onRemove,
  onUpdate,
}: {
  row: MultiPileProjectCoverDurabilityClass;
  index: number;
  onRemove: () => void;
  onUpdate: (
    index: number,
    updater: (row: MultiPileProjectCoverDurabilityClass) => MultiPileProjectCoverDurabilityClass,
  ) => void;
}) {
  const coverRow = normalizeProjectCoverClass(row, index);

  return (
    <LibraryRow
      title={coverRow.displayName || coverRow.id}
      subtitle={coverRow.sourceStandard || 'Project cover / durability class'}
      onRemove={onRemove}
    >
      <div className="grid gap-4 xl:grid-cols-3">
        <SectionShell title="Display Name">
          <LabeledField label="Display Name">
            <Input
              value={coverRow.displayName}
              placeholder="Cover / durability class"
              onChange={(event) =>
                onUpdate(index, (current) => ({
                  ...current,
                  displayName: event.target.value,
                }))
              }
            />
          </LabeledField>
        </SectionShell>

        <SectionShell title="Source Reference">
          <div className="grid gap-4 md:grid-cols-2">
            <LabeledField label="Standard">
              <Input
                value={coverRow.sourceStandard}
                placeholder="Standard"
                onChange={(event) =>
                  onUpdate(index, (current) => ({
                    ...current,
                    sourceStandard: event.target.value,
                  }))
                }
              />
            </LabeledField>
            <LabeledField label="Section">
              <Input
                value={coverRow.sourceSection}
                placeholder="Section"
                onChange={(event) =>
                  onUpdate(index, (current) => ({
                    ...current,
                    sourceSection: event.target.value,
                  }))
                }
              />
            </LabeledField>
            <LabeledField label="Clause">
              <Input
                value={coverRow.sourceClause}
                placeholder="Clause"
                onChange={(event) =>
                  onUpdate(index, (current) => ({
                    ...current,
                    sourceClause: event.target.value,
                  }))
                }
              />
            </LabeledField>
            <LabeledField label="Table / figure">
              <Input
                value={coverRow.sourceTable}
                placeholder="Table / figure"
                onChange={(event) =>
                  onUpdate(index, (current) => ({
                    ...current,
                    sourceTable: event.target.value,
                  }))
                }
              />
            </LabeledField>
          </div>

          <LabeledField label="Pages / note">
            <Input
              value={coverRow.sourcePagesNote}
              placeholder="Pages / note"
              onChange={(event) =>
                onUpdate(index, (current) => ({
                  ...current,
                  sourcePagesNote: event.target.value,
                }))
              }
            />
          </LabeledField>
        </SectionShell>

        <SectionShell title="Durability Basis">
          <div className="grid gap-4 md:grid-cols-2">
            <NumberField
              label="Design life (years)"
              value={coverRow.designLifeYears}
              step="1"
              onChange={(nextValue) =>
                onUpdate(index, (current) => ({
                  ...current,
                  designLifeYears: nextValue,
                }))
              }
            />
            <LabeledField label="Exposure class">
              <Input
                value={coverRow.exposureClass}
                placeholder="Exposure class"
                onChange={(event) =>
                  onUpdate(index, (current) => ({
                    ...current,
                    exposureClass: event.target.value,
                  }))
                }
              />
            </LabeledField>
            <LabeledField label="Min precast concrete strength (MPa)">
              <Input
                value={coverRow.minConcreteStrengthPrecast_MPa}
                placeholder="Min precast concrete strength (MPa)"
                onChange={(event) =>
                  onUpdate(index, (current) => ({
                    ...current,
                    minConcreteStrengthPrecast_MPa: event.target.value,
                  }))
                }
              />
            </LabeledField>
            <LabeledField label="Min cast-in-place concrete strength (MPa)">
              <Input
                value={coverRow.minConcreteStrengthCastInPlace_MPa}
                placeholder="Min cast-in-place concrete strength (MPa)"
                onChange={(event) =>
                  onUpdate(index, (current) => ({
                    ...current,
                    minConcreteStrengthCastInPlace_MPa: event.target.value,
                  }))
                }
              />
            </LabeledField>
          </div>
        </SectionShell>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <SectionShell title="Cover / Crack">
          <div className="grid gap-4 md:grid-cols-2">
            <NumberField
              label="Min precast cover (mm)"
              value={coverRow.minCoverPrecast_mm}
              step="1"
              onChange={(nextValue) =>
                onUpdate(index, (current) => ({
                  ...current,
                  minCoverPrecast_mm: nextValue,
                }))
              }
            />
            <NumberField
              label="Min cast-in-place cover (mm)"
              value={coverRow.minCoverCastInPlace_mm}
              step="1"
              onChange={(nextValue) =>
                onUpdate(index, (current) => ({
                  ...current,
                  minCoverCastInPlace_mm: nextValue,
                }))
              }
            />
            <NumberField
              label="Nominal cover (mm)"
              value={coverRow.nominalCover_mm}
              step="1"
              readOnly
              className={resolveReadOnlyClassName(true)}
              onChange={() => {}}
            />
            <NumberField
              label="Crack width limit (mm)"
              value={coverRow.crackWidthLimit_mm}
              step="0.01"
              onChange={(nextValue) =>
                onUpdate(index, (current) => ({
                  ...current,
                  crackWidthLimit_mm: nextValue,
                }))
              }
            />
          </div>
        </SectionShell>

        <SectionShell title="Aggressivity / Durability">
          <div className="grid gap-4">
            <LabeledField label="Aggressivity notes">
              <Textarea
                value={coverRow.aggressivityNotes}
                placeholder="Aggressivity notes..."
                onChange={(event) =>
                  onUpdate(index, (current) => ({
                    ...current,
                    aggressivityNotes: event.target.value,
                  }))
                }
              />
            </LabeledField>
            <LabeledField label="Durability notes">
              <Textarea
                value={coverRow.durabilityNotes}
                placeholder="Durability notes..."
                onChange={(event) =>
                  onUpdate(index, (current) => ({
                    ...current,
                    durabilityNotes: event.target.value,
                  }))
                }
              />
            </LabeledField>
          </div>
        </SectionShell>

        <SectionShell title="Notes">
          <div className="grid gap-4">
            <LabeledField label="General notes">
              <Textarea
                value={coverRow.notes}
                placeholder="General notes..."
                onChange={(event) =>
                  onUpdate(index, (current) => ({
                    ...current,
                    notes: event.target.value,
                  }))
                }
              />
            </LabeledField>
            <BooleanField
              label="Active"
              checked={coverRow.active}
              onChange={(checked) =>
                onUpdate(index, (current) => ({
                  ...current,
                  active: checked,
                }))
              }
            />
          </div>
        </SectionShell>
      </div>
    </LibraryRow>
  );
}

function SectionShell({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="space-y-4 rounded-lg border bg-muted/10 p-4">
      <div className="text-sm font-medium">{title}</div>
      {children}
    </div>
  );
}

function BooleanField({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex min-w-28 items-center justify-center gap-3 rounded-lg border bg-muted/10 px-4 py-3 text-sm font-medium">
      <input
        type="checkbox"
        className="h-4 w-4 rounded border border-input"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      {label}
    </label>
  );
}

function LibrarySection({
  title,
  description,
  count,
  actionLabel,
  onAdd,
  children,
}: {
  title: string;
  description: string;
  count: number;
  actionLabel: string;
  onAdd: () => void;
  children: ReactNode;
}) {
  return (
    <section className="space-y-4 rounded-xl border bg-muted/10 p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold">{title}</h3>
            <Badge variant="outline">{count} rows</Badge>
          </div>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={onAdd}>
          <Plus className="mr-2 h-4 w-4" />
          {actionLabel}
        </Button>
      </div>
      {children}
    </section>
  );
}

function LibraryRow({
  title,
  subtitle,
  onRemove,
  children,
}: {
  title: string;
  subtitle: string;
  onRemove: () => void;
  children: ReactNode;
}) {
  return (
    <div className="rounded-xl border bg-background p-4">
      <div className="flex flex-col gap-3 border-b pb-4 md:flex-row md:items-start md:justify-between">
        <div className="space-y-1">
          <div className="text-sm font-semibold">{title}</div>
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={onRemove}>
          <Trash2 className="mr-2 h-4 w-4" />
          Remove
        </Button>
      </div>
      <div className="mt-4 space-y-4">{children}</div>
    </div>
  );
}

function SourceFields({
  active,
  sourceStandard,
  sourceSection,
  sourceClause,
  sourceTable,
  sourcePagesNote,
  notes,
  onChange,
}: {
  active: boolean;
  sourceStandard: string;
  sourceSection: string;
  sourceClause: string;
  sourceTable: string;
  sourcePagesNote: string;
  notes: string;
  onChange: (
    field:
      | 'sourceStandard'
      | 'sourceSection'
      | 'sourceClause'
      | 'sourceTable'
      | 'sourcePagesNote'
      | 'notes'
      | 'active',
    nextValue: string | boolean,
  ) => void;
}) {
  return (
    <div className="space-y-4 rounded-lg border bg-muted/10 p-4">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <LabeledField label="Source Standard">
          <Input
            value={sourceStandard}
            placeholder="e.g. AS 3600:2018"
            onChange={(event) => onChange('sourceStandard', event.target.value)}
          />
        </LabeledField>
        <LabeledField label="Source Section">
          <Input
            value={sourceSection}
            placeholder="Optional"
            onChange={(event) => onChange('sourceSection', event.target.value)}
          />
        </LabeledField>
        <LabeledField label="Source Clause">
          <Input
            value={sourceClause}
            placeholder="Optional"
            onChange={(event) => onChange('sourceClause', event.target.value)}
          />
        </LabeledField>
        <LabeledField label="Source Table">
          <Input
            value={sourceTable}
            placeholder="Optional"
            onChange={(event) => onChange('sourceTable', event.target.value)}
          />
        </LabeledField>
        <LabeledField label="Source Pages / Note">
          <Input
            value={sourcePagesNote}
            placeholder="Optional"
            onChange={(event) => onChange('sourcePagesNote', event.target.value)}
          />
        </LabeledField>
      </div>
      <div className="grid gap-4 md:grid-cols-[auto,1fr]">
        <label className="flex items-center gap-3 text-sm font-medium">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border border-input"
            checked={active}
            onChange={(event) => onChange('active', event.target.checked)}
          />
          Active
        </label>
        <LabeledField label="Notes">
          <Textarea
            value={notes}
            placeholder="Any project-specific interpretation or usage note"
            onChange={(event) => onChange('notes', event.target.value)}
          />
        </LabeledField>
      </div>
    </div>
  );
}

function resolveConcreteSourceModeText(sourceMode: 'preset-driven' | 'preset-override' | 'manual') {
  if (sourceMode === 'preset-driven') {
    return 'Preset-driven row. Preset-backed values are locked until Override is enabled.';
  }
  if (sourceMode === 'preset-override') {
    return 'Preset applied first, then project-specific edits may be made.';
  }
  return 'Manual row. Enter project-specific values directly.';
}

function resolveReadOnlyClassName(readOnly: boolean, isTextarea = false) {
  if (!readOnly) {
    return undefined;
  }
  return isTextarea
    ? 'min-h-24 bg-muted/40 text-muted-foreground'
    : 'bg-muted/40 text-muted-foreground';
}

function NumberField({
  label,
  value,
  placeholder,
  step,
  readOnly,
  disabled,
  className,
  onChange,
}: {
  label: string;
  value: number | null;
  placeholder?: string;
  step?: string;
  readOnly?: boolean;
  disabled?: boolean;
  className?: string;
  onChange: (nextValue: number | null) => void;
}) {
  return (
    <LabeledField label={label}>
      <Input
        type="number"
        step={step ?? 'any'}
        value={nullableNumberToInput(value)}
        placeholder={placeholder}
        readOnly={readOnly}
        disabled={disabled}
        className={className}
        onChange={(event) => onChange(nullableNumberFromInput(event.target.value))}
      />
    </LabeledField>
  );
}

function LabeledField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-border/80 bg-background px-4 py-6 text-sm text-muted-foreground">
      {children}
    </div>
  );
}
