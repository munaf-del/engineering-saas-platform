'use client';

import {
  adoptedPhiForRedundancy,
  MULTI_PILE_STANDARD_PILE_DIAMETERS_MM,
  type MultiPileProjectSpecifics,
  type MultiPileState,
} from '@eng/shared';
import { Plus, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
  selectProjectGeotechnicalMaterials,
} from '@/features/projects/project-specifics-utils';
import {
  defaultGeoTypeSettings,
  nullableNumberFromInput,
  nullableNumberToInput,
  numberFromInput,
  normalizePileTypeDefinition,
  renamePileTypeIdAcrossState,
  summarizePileTypeUltimateRange,
  syncGeoTypeSettingsWithPileTypes,
  type MultiPileDraftUpdater,
} from './utils';

interface LoadEngineBasisTabProps {
  draft: MultiPileState;
  projectSpecifics: MultiPileProjectSpecifics;
  updateDraft: MultiPileDraftUpdater;
  addPileType: () => void;
  removePileType: (pileTypeId: string) => void;
}

export function LoadEngineBasisTab({
  draft,
  projectSpecifics,
  updateDraft,
  addPileType,
  removePileType,
}: LoadEngineBasisTabProps) {
  const allProjectMaterials = projectSpecifics.geotechnicalMaterials.materials;
  const projectArrAssessment = projectSpecifics.geotechnicalBasis.arrAssessment;
  const projectMaterialById = new Map(
    allProjectMaterials.map((material) => [material.id, material]),
  );
  const activeProjectMaterials = selectProjectGeotechnicalMaterials(projectSpecifics);

  function updatePileTypes(
    updater: (pileTypes: MultiPileState['pileTypes']) => MultiPileState['pileTypes'],
  ) {
    updateDraft((current) => {
      const nextRawPileTypes = updater(current.pileTypes);
      const seenIds = new Set<string>();
      const renamePairs: Array<{ oldId: string; newId: string }> = [];
      const pileTypes = nextRawPileTypes.map((row, index) => {
        const previousId = current.pileTypes[index]?.id ?? row.id ?? `BP${index + 1}`;
        const normalized = normalizePileTypeDefinition(row, {
          fallbackId: index === 0 ? 'BP1' : `BP${index + 1}`,
          order: index,
        });
        let candidateId = normalized.id;
        let suffix = 2;
        while (seenIds.has(candidateId)) {
          candidateId = `${normalized.id}_${suffix++}`;
        }
        seenIds.add(candidateId);
        const nextRow =
          candidateId === normalized.id
            ? normalized
            : {
                ...normalized,
                id: candidateId,
                displayName:
                  normalized.displayName === previousId || normalized.displayName === normalized.id
                    ? candidateId
                    : normalized.displayName,
              };
        if (previousId && previousId !== nextRow.id) {
          renamePairs.push({ oldId: previousId, newId: nextRow.id });
        }
        return nextRow;
      });

      let nextState: MultiPileState = {
        ...current,
        pileTypes,
      };

      renamePairs.forEach(({ oldId, newId }) => {
        nextState = renamePileTypeIdAcrossState(nextState, oldId, newId);
      });

      return {
        ...nextState,
        pileTypes,
        geoTypeSettings: syncGeoTypeSettingsWithPileTypes(nextState.geoTypeSettings, pileTypes),
      };
    });
  }

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

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="text-base">Pile Types</CardTitle>
            <CardDescription>
              Set type IDs, diameters, e_oop values, and authored axial envelope ranges used as a
              pile-type assignment aid. GEO and STRUCT verification still stay in their existing
              workflows.
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={addPileType}>
            <Plus className="mr-2 h-4 w-4" />
            Add Pile Type
          </Button>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table className="min-w-[2600px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Type ID</TableHead>
                  <TableHead>Display Name</TableHead>
                  <TableHead className="w-56">Description</TableHead>
                  <TableHead className="w-44">Pile system / type</TableHead>
                  <TableHead className="w-36">Concrete grade</TableHead>
                  <TableHead className="w-36">Socket length (m)</TableHead>
                  <TableHead className="w-44">Founding stratum</TableHead>
                  <TableHead className="w-56">Founding note</TableHead>
                  <TableHead className="w-28">Active</TableHead>
                  <TableHead className="w-36">Source status</TableHead>
                  <TableHead className="w-40">Standard Size (mm)</TableHead>
                  <TableHead className="w-28">Use Custom</TableHead>
                  <TableHead className="w-40">Custom Size (mm)</TableHead>
                  <TableHead className="w-40">Design compression (kN)</TableHead>
                  <TableHead className="w-40">Design tension (kN)</TableHead>
                  <TableHead className="w-40">Design lateral (kN)</TableHead>
                  <TableHead className="w-56">Durability / exposure note</TableHead>
                  <TableHead className="w-56">Construction note</TableHead>
                  <TableHead className="w-56">Notes</TableHead>
                  <TableHead className="w-32">D (m)</TableHead>
                  <TableHead className="w-32">e_oop (m)</TableHead>
                  <TableHead className="w-40">Compression range min (kN)</TableHead>
                  <TableHead className="w-40">Compression range max (kN)</TableHead>
                  <TableHead className="w-40">Tension / uplift range min (kN)</TableHead>
                  <TableHead className="w-40">Tension / uplift range max (kN)</TableHead>
                  <TableHead className="w-40">Range status</TableHead>
                  <TableHead className="w-16" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {draft.pileTypes.map((pileType, index) => {
                  const rangeSummary = summarizePileTypeUltimateRange(pileType);

                  return (
                    <TableRow key={pileType.id}>
                      <TableCell>
                        <Input
                          className="font-mono text-xs"
                          value={pileType.id}
                          onChange={(event) =>
                            updatePileTypes((currentPileTypes) =>
                              currentPileTypes.map((row, rowIndex) =>
                                rowIndex === index ? { ...row, id: event.target.value } : row,
                              ),
                            )
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={pileType.displayName}
                          onChange={(event) =>
                            updatePileTypes((currentPileTypes) =>
                              currentPileTypes.map((row, rowIndex) =>
                                rowIndex === index
                                  ? { ...row, displayName: event.target.value }
                                  : row,
                              ),
                            )
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={pileType.description ?? ''}
                          onChange={(event) =>
                            updatePileTypes((currentPileTypes) =>
                              currentPileTypes.map((row, rowIndex) =>
                                rowIndex === index
                                  ? { ...row, description: event.target.value }
                                  : row,
                              ),
                            )
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          placeholder="bored pile, CFA..."
                          value={pileType.pileSystem ?? ''}
                          onChange={(event) =>
                            updatePileTypes((currentPileTypes) =>
                              currentPileTypes.map((row, rowIndex) =>
                                rowIndex === index
                                  ? { ...row, pileSystem: event.target.value }
                                  : row,
                              ),
                            )
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          placeholder="C40"
                          value={pileType.concreteGrade ?? ''}
                          onChange={(event) =>
                            updatePileTypes((currentPileTypes) =>
                              currentPileTypes.map((row, rowIndex) =>
                                rowIndex === index
                                  ? { ...row, concreteGrade: event.target.value }
                                  : row,
                              ),
                            )
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          step="0.1"
                          min="0"
                          value={nullableNumberToInput(pileType.socketLengthM ?? null)}
                          placeholder="Open"
                          onChange={(event) =>
                            updatePileTypes((currentPileTypes) =>
                              currentPileTypes.map((row, rowIndex) =>
                                rowIndex === index
                                  ? {
                                      ...row,
                                      socketLengthM: nullableNumberFromInput(event.target.value),
                                    }
                                  : row,
                              ),
                            )
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={pileType.foundingStratum ?? ''}
                          onChange={(event) =>
                            updatePileTypes((currentPileTypes) =>
                              currentPileTypes.map((row, rowIndex) =>
                                rowIndex === index
                                  ? { ...row, foundingStratum: event.target.value }
                                  : row,
                              ),
                            )
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={pileType.foundingNote ?? ''}
                          onChange={(event) =>
                            updatePileTypes((currentPileTypes) =>
                              currentPileTypes.map((row, rowIndex) =>
                                rowIndex === index
                                  ? { ...row, foundingNote: event.target.value }
                                  : row,
                              ),
                            )
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border border-input"
                          checked={pileType.active}
                          onChange={(event) =>
                            updatePileTypes((currentPileTypes) =>
                              currentPileTypes.map((row, rowIndex) =>
                                rowIndex === index ? { ...row, active: event.target.checked } : row,
                              ),
                            )
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <Select
                          value={pileType.status ?? 'draft'}
                          onValueChange={(value) =>
                            updatePileTypes((currentPileTypes) =>
                              currentPileTypes.map((row, rowIndex) =>
                                rowIndex === index
                                  ? {
                                      ...row,
                                      status:
                                        value === 'active' || value === 'superseded'
                                          ? value
                                          : 'draft',
                                    }
                                  : row,
                              ),
                            )
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="draft">Draft</SelectItem>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="superseded">Superseded</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={pileType.sizePreset}
                          onValueChange={(value) =>
                            updatePileTypes((currentPileTypes) =>
                              currentPileTypes.map((row, rowIndex) =>
                                rowIndex === index ? { ...row, sizePreset: value } : row,
                              ),
                            )
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {MULTI_PILE_STANDARD_PILE_DIAMETERS_MM.map((diameterMm) => (
                              <SelectItem key={diameterMm} value={String(diameterMm)}>
                                {diameterMm}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border border-input"
                          checked={pileType.useCustom}
                          onChange={(event) =>
                            updatePileTypes((currentPileTypes) =>
                              currentPileTypes.map((row, rowIndex) =>
                                rowIndex === index
                                  ? { ...row, useCustom: event.target.checked }
                                  : row,
                              ),
                            )
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          step="1"
                          min="50"
                          disabled={!pileType.useCustom}
                          value={pileType.customMm}
                          onChange={(event) =>
                            updatePileTypes((currentPileTypes) =>
                              currentPileTypes.map((row, rowIndex) =>
                                rowIndex === index
                                  ? {
                                      ...row,
                                      customMm: Math.max(
                                        50,
                                        Math.round(
                                          numberFromInput(event.target.value, row.customMm),
                                        ),
                                      ),
                                    }
                                  : row,
                              ),
                            )
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          step="1"
                          min="0"
                          value={nullableNumberToInput(pileType.designCompressionKn ?? null)}
                          placeholder="Open"
                          onChange={(event) =>
                            updatePileTypes((currentPileTypes) =>
                              currentPileTypes.map((row, rowIndex) =>
                                rowIndex === index
                                  ? {
                                      ...row,
                                      designCompressionKn: nullableNumberFromInput(
                                        event.target.value,
                                      ),
                                    }
                                  : row,
                              ),
                            )
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          step="1"
                          min="0"
                          value={nullableNumberToInput(pileType.designTensionKn ?? null)}
                          placeholder="Open"
                          onChange={(event) =>
                            updatePileTypes((currentPileTypes) =>
                              currentPileTypes.map((row, rowIndex) =>
                                rowIndex === index
                                  ? {
                                      ...row,
                                      designTensionKn: nullableNumberFromInput(event.target.value),
                                    }
                                  : row,
                              ),
                            )
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          step="1"
                          min="0"
                          value={nullableNumberToInput(pileType.designLateralKn ?? null)}
                          placeholder="Open"
                          onChange={(event) =>
                            updatePileTypes((currentPileTypes) =>
                              currentPileTypes.map((row, rowIndex) =>
                                rowIndex === index
                                  ? {
                                      ...row,
                                      designLateralKn: nullableNumberFromInput(event.target.value),
                                    }
                                  : row,
                              ),
                            )
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={pileType.durabilityExposureNote ?? ''}
                          onChange={(event) =>
                            updatePileTypes((currentPileTypes) =>
                              currentPileTypes.map((row, rowIndex) =>
                                rowIndex === index
                                  ? { ...row, durabilityExposureNote: event.target.value }
                                  : row,
                              ),
                            )
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={pileType.constructionNote ?? ''}
                          onChange={(event) =>
                            updatePileTypes((currentPileTypes) =>
                              currentPileTypes.map((row, rowIndex) =>
                                rowIndex === index
                                  ? { ...row, constructionNote: event.target.value }
                                  : row,
                              ),
                            )
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={pileType.notes ?? ''}
                          onChange={(event) =>
                            updatePileTypes((currentPileTypes) =>
                              currentPileTypes.map((row, rowIndex) =>
                                rowIndex === index ? { ...row, notes: event.target.value } : row,
                              ),
                            )
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <Input value={(pileType.Dmm / 1000).toFixed(3)} readOnly />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          step="0.001"
                          min="0"
                          value={pileType.eoop}
                          onChange={(event) =>
                            updatePileTypes((currentPileTypes) =>
                              currentPileTypes.map((row, rowIndex) =>
                                rowIndex === index
                                  ? {
                                      ...row,
                                      eoop: Math.max(0, numberFromInput(event.target.value)),
                                    }
                                  : row,
                              ),
                            )
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          step="1"
                          min="0"
                          value={nullableNumberToInput(pileType.compressionUltimateMin)}
                          placeholder="Open"
                          onChange={(event) =>
                            updatePileTypes((currentPileTypes) =>
                              currentPileTypes.map((row, rowIndex) =>
                                rowIndex === index
                                  ? {
                                      ...row,
                                      compressionUltimateMin: nullableNumberFromInput(
                                        event.target.value,
                                      ),
                                    }
                                  : row,
                              ),
                            )
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          step="1"
                          min="0"
                          value={nullableNumberToInput(pileType.compressionUltimateMax)}
                          placeholder="Open"
                          onChange={(event) =>
                            updatePileTypes((currentPileTypes) =>
                              currentPileTypes.map((row, rowIndex) =>
                                rowIndex === index
                                  ? {
                                      ...row,
                                      compressionUltimateMax: nullableNumberFromInput(
                                        event.target.value,
                                      ),
                                    }
                                  : row,
                              ),
                            )
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          step="1"
                          min="0"
                          value={nullableNumberToInput(pileType.tensionUltimateMin)}
                          placeholder="Open"
                          onChange={(event) =>
                            updatePileTypes((currentPileTypes) =>
                              currentPileTypes.map((row, rowIndex) =>
                                rowIndex === index
                                  ? {
                                      ...row,
                                      tensionUltimateMin: nullableNumberFromInput(
                                        event.target.value,
                                      ),
                                    }
                                  : row,
                              ),
                            )
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          step="1"
                          min="0"
                          value={nullableNumberToInput(pileType.tensionUltimateMax)}
                          placeholder="Open"
                          onChange={(event) =>
                            updatePileTypes((currentPileTypes) =>
                              currentPileTypes.map((row, rowIndex) =>
                                rowIndex === index
                                  ? {
                                      ...row,
                                      tensionUltimateMax: nullableNumberFromInput(
                                        event.target.value,
                                      ),
                                    }
                                  : row,
                              ),
                            )
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <Badge
                            variant={
                              rangeSummary.participatesInAutoMatching ? 'success' : 'outline'
                            }
                          >
                            {rangeSummary.label}
                          </Badge>
                          <div className="text-xs text-muted-foreground">{rangeSummary.detail}</div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          disabled={draft.pileTypes.length <= 1}
                          onClick={() => removePileType(pileType.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div className="space-y-1">
            <CardTitle className="text-base">Pile Type Geotechnical Mapping</CardTitle>
            <CardDescription>
              Layer thicknesses and founding / socket material selectors stay type-owned here, but
              the available material rows now come directly from the project-owned geotechnical
              materials library.
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">
              {activeProjectMaterials.length} active project materials
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {activeProjectMaterials.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border/80 px-4 py-8 text-sm text-muted-foreground">
              No project geotechnical materials have been recorded yet. The selectors below will
              stay empty until project-owned material rows are added on the Project page.
            </div>
          ) : null}

          {draft.pileTypes.map((pileType) => {
            const settings = draft.geoTypeSettings[pileType.id] ?? defaultGeoTypeSettings(pileType);
            const adoptedPhi = adoptedPhiForRedundancy(projectArrAssessment, settings.redundancy);
            const linkedJointCount = draft.joints.filter(
              (joint) => joint.pileTypeId === pileType.id,
            ).length;
            const lsModeLabel =
              settings.LsMode === 'manual'
                ? 'Manual override'
                : settings.LsMode === 'auto'
                  ? 'Auto-solved'
                  : 'Pending';
            const layerRows = [
              {
                key: 's1MaterialId' as const,
                heightKey: 's1H' as const,
                label: 'Layer 1',
                height: settings.s1H,
                materialId: settings.s1MaterialId,
              },
              {
                key: 's2MaterialId' as const,
                heightKey: 's2H' as const,
                label: 'Layer 2',
                height: settings.s2H,
                materialId: settings.s2MaterialId,
              },
              {
                key: 's3MaterialId' as const,
                heightKey: 's3H' as const,
                label: 'Layer 3',
                height: settings.s3H,
                materialId: settings.s3MaterialId,
              },
            ];
            const foundingMaterial = settings.foundingMaterialId
              ? (projectMaterialById.get(settings.foundingMaterialId) ?? null)
              : null;

            return (
              <div key={pileType.id} className="rounded-xl border p-4">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-4">
                  <div>
                    <div className="text-sm font-semibold">{pileType.displayName}</div>
                    <p className="text-sm text-muted-foreground">
                      {pileType.nominalDiameterMm} mm nominal diameter
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline">{pileType.id}</Badge>
                    <Badge variant="outline">{linkedJointCount} linked joints</Badge>
                  </div>
                </div>

                <div className="mt-4 grid gap-4 xl:grid-cols-4">
                  <div className="rounded-lg border bg-muted/10 p-4">
                    <div className="mb-2 text-sm font-medium">Redundancy / adopted phi_g</div>
                    <Select
                      value={settings.redundancy}
                      onValueChange={(nextValue) =>
                        updateGeoTypeSettings(pileType.id, (current) => ({
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
                    <div className="mt-3 text-sm text-muted-foreground">
                      Adopted phi_g from project ARR assessment: {adoptedPhi.toFixed(3)}
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      Project LOW / HIGH phi_g = {projectArrAssessment.phiGLow.toFixed(3)} /{' '}
                      {projectArrAssessment.phiGHigh.toFixed(3)}
                    </div>
                  </div>

                  <div className="rounded-lg border bg-muted/10 p-4">
                    <div className="mb-2 text-sm font-medium">Shaft reduction factors</div>
                    <div className="grid gap-3 md:grid-cols-2">
                      <div>
                        <div className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">
                          Compression
                        </div>
                        <Input
                          type="number"
                          step="0.05"
                          value={settings.shaftRedComp}
                          onChange={(event) =>
                            updateGeoTypeSettings(pileType.id, (current) => ({
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
                          value={settings.shaftRedTen}
                          onChange={(event) =>
                            updateGeoTypeSettings(pileType.id, (current) => ({
                              ...current,
                              shaftRedTen: Math.max(0, numberFromInput(event.target.value)),
                            }))
                          }
                        />
                      </div>
                    </div>
                  </div>

                  <div className="rounded-lg border bg-muted/10 p-4">
                    <div className="mb-2 text-sm font-medium">Negative friction / downdrag</div>
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border border-input"
                        checked={settings.useNnf}
                        onChange={(event) =>
                          updateGeoTypeSettings(pileType.id, (current) => ({
                            ...current,
                            useNnf: event.target.checked,
                          }))
                        }
                      />
                      Include Nnf in compression demand
                    </label>
                    <div className="mt-3">
                      <div className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">
                        Nnf (kN)
                      </div>
                      <Input
                        type="number"
                        step="1"
                        value={settings.Nnf}
                        disabled={!settings.useNnf}
                        onChange={(event) =>
                          updateGeoTypeSettings(pileType.id, (current) => ({
                            ...current,
                            Nnf: Math.max(0, numberFromInput(event.target.value)),
                          }))
                        }
                      />
                    </div>
                  </div>

                  <div className="rounded-lg border bg-muted/10 p-4">
                    <div className="mb-2 text-sm font-medium">Base resistance / socket state</div>
                    <div>
                      <div className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">
                        Include base resistance
                      </div>
                      <Select
                        value={settings.useBase}
                        onValueChange={(nextValue) =>
                          updateGeoTypeSettings(pileType.id, (current) => ({
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
                    <div className="mt-3 text-sm text-muted-foreground">Ls mode: {lsModeLabel}</div>
                    <div className="text-sm text-muted-foreground">
                      Ls solved {settings.LsSolved > 0 ? settings.LsSolved.toFixed(2) : '—'} m
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Ls adopted {settings.LsAdopted > 0 ? settings.LsAdopted.toFixed(2) : '—'} m
                    </div>
                  </div>
                </div>

                <div className="mt-4 space-y-3">
                  {layerRows.map((layer) => {
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

                    return (
                      <div
                        key={layer.key}
                        className="grid gap-4 rounded-lg border bg-muted/10 p-4 lg:grid-cols-[0.8fr_1.2fr_1.8fr]"
                      >
                        <div>
                          <div className="mb-2 text-sm font-medium">{layer.label} H</div>
                          <Input
                            type="number"
                            step="0.01"
                            value={layer.height}
                            onChange={(event) =>
                              updateGeoTypeSettings(pileType.id, (current) => ({
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
                              updateGeoTypeSettings(pileType.id, (current) => ({
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
                          <div>{selectedLabel}</div>
                          {selectedMaterial ? (
                            <div>
                              f_m,s comp. {selectedMaterial.pile_fms_comp_kPa ?? 'n/a'} kPa
                              {' · '}
                              f_m,s tension {selectedMaterial.pile_fms_tension_kPa ?? 'n/a'} kPa
                            </div>
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
                </div>

                <div className="mt-4 grid gap-4 rounded-lg border bg-muted/10 p-4 lg:grid-cols-[1.4fr_1.8fr]">
                  <div>
                    <div className="mb-2 text-sm font-medium">Founding / socket material</div>
                    <Select
                      value={settings.foundingMaterialId || '__none__'}
                      onValueChange={(nextValue) =>
                        updateGeoTypeSettings(pileType.id, (current) => ({
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
                        {settings.foundingMaterialId && !foundingMaterial ? (
                          <SelectItem value={settings.foundingMaterialId}>
                            Missing material ({settings.foundingMaterialId})
                          </SelectItem>
                        ) : null}
                        {selectProjectGeotechnicalMaterials(projectSpecifics, {
                          selectedId: settings.foundingMaterialId,
                        }).map((material) => (
                          <SelectItem key={material.id} value={material.id}>
                            {resolveProjectGeotechnicalMaterialLabel(material)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1 text-sm text-muted-foreground">
                    <div>
                      {foundingMaterial
                        ? resolveProjectGeotechnicalMaterialLabel(foundingMaterial)
                        : settings.foundingMaterialId
                          ? `Missing material (${settings.foundingMaterialId})`
                          : 'No founding / socket material selected'}
                    </div>
                    {foundingMaterial ? (
                      <div>
                        f_m,s comp. {foundingMaterial.pile_fms_comp_kPa ?? 'n/a'} kPa
                        {' · '}
                        f_b ult. {foundingMaterial.pile_fb_ult_kPa ?? 'n/a'} kPa
                      </div>
                    ) : settings.foundingMaterialId ? (
                      <div className="text-destructive">
                        Saved founding / socket selection could not be resolved from the
                        project-owned geotechnical materials.
                      </div>
                    ) : (
                      <div>No founding / socket material selected for this pile type.</div>
                    )}
                  </div>
                </div>

                <div className="mt-4 grid gap-4 rounded-lg border bg-muted/10 p-4 xl:grid-cols-4">
                  <div>
                    <label className="flex items-center gap-2 text-sm font-medium">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border border-input"
                        checked={settings.useLsMinOverride}
                        onChange={(event) =>
                          updateGeoTypeSettings(pileType.id, (current) => ({
                            ...current,
                            useLsMinOverride: event.target.checked,
                          }))
                        }
                      />
                      Override minimum socket length
                    </label>
                    <Input
                      className="mt-3"
                      type="number"
                      step="0.05"
                      value={settings.LsMinOverride}
                      disabled={!settings.useLsMinOverride}
                      onChange={(event) =>
                        updateGeoTypeSettings(pileType.id, (current) => ({
                          ...current,
                          LsMinOverride: Math.max(0, numberFromInput(event.target.value)),
                        }))
                      }
                    />
                  </div>

                  <div>
                    <label className="flex items-center gap-2 text-sm font-medium">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border border-input"
                        checked={settings.socketOverrideEnabled}
                        onChange={(event) =>
                          updateGeoTypeSettings(pileType.id, (current) => ({
                            ...current,
                            socketOverrideEnabled: event.target.checked,
                            LsMode:
                              event.target.checked && current.LsManual > 0 ? 'manual' : 'pending',
                            LsAdopted:
                              event.target.checked && current.LsManual > 0 ? current.LsManual : 0,
                            Ls: event.target.checked && current.LsManual > 0 ? current.LsManual : 0,
                          }))
                        }
                      />
                      Manual adopted socket override
                    </label>
                    <Input
                      className="mt-3"
                      type="number"
                      step="0.05"
                      value={settings.LsManual}
                      disabled={!settings.socketOverrideEnabled}
                      onChange={(event) =>
                        updateGeoTypeSettings(pileType.id, (current) => {
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
                  </div>

                  <div className="rounded-lg border bg-background p-3">
                    <div className="text-xs uppercase tracking-wide text-muted-foreground">
                      Solved socket length
                    </div>
                    <div className="mt-2 text-lg font-semibold">
                      {settings.LsSolved > 0 ? settings.LsSolved.toFixed(2) : '—'}
                    </div>
                    <div className="text-sm text-muted-foreground">m</div>
                  </div>

                  <div className="rounded-lg border bg-background p-3">
                    <div className="text-xs uppercase tracking-wide text-muted-foreground">
                      Adopted socket length
                    </div>
                    <div className="mt-2 text-lg font-semibold">
                      {settings.LsAdopted > 0 ? settings.LsAdopted.toFixed(2) : '—'}
                    </div>
                    <div className="text-sm text-muted-foreground">{lsModeLabel}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
