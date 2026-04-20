'use client';

import type { ReactNode } from 'react';
import {
  MULTI_PILE_GEO_ARR_ITEMS,
  MULTI_PILE_PROJECT_GEO_UPLIFT_MODES,
  normalizeMultiPileGeoArrSettings,
  type MultiPileProjectGeotechnicalMaterial,
  type MultiPileProjectSpecifics,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import {
  createEmptyGeotechnicalMaterial,
  nullableNumberFromInput,
  nullableNumberToInput,
  resolveProjectGeotechnicalMaterialLabel,
  resolveProjectReferenceLabel,
  selectGeotechnicalReferences,
  summarizeProjectGeotechnical,
} from './project-specifics-utils';

interface ProjectGeotechnicalEditorProps {
  value: MultiPileProjectSpecifics;
  onChange: (value: MultiPileProjectSpecifics) => void;
}

export function ProjectGeotechnicalMaterialsEditor({
  value,
  onChange,
}: ProjectGeotechnicalEditorProps) {
  const summary = summarizeProjectGeotechnical(value);
  const geotechnicalReferences = selectGeotechnicalReferences(value);
  const { geotechnicalMaterials } = value;

  function updateProjectSpecifics(
    updater: (current: MultiPileProjectSpecifics) => MultiPileProjectSpecifics,
  ) {
    onChange(updater(value));
  }

  function updateMaterial(
    index: number,
    updater: (
      material: MultiPileProjectGeotechnicalMaterial,
    ) => MultiPileProjectGeotechnicalMaterial,
  ) {
    updateProjectSpecifics((current) => ({
      ...current,
      geotechnicalMaterials: {
        ...current.geotechnicalMaterials,
        materials: current.geotechnicalMaterials.materials.map((material, rowIndex) =>
          rowIndex === index ? updater(material) : material,
        ),
      },
    }));
  }

  function addMaterial() {
    updateProjectSpecifics((current) => ({
      ...current,
      geotechnicalMaterials: {
        ...current.geotechnicalMaterials,
        templateState: 'manual',
        materials: [
          ...current.geotechnicalMaterials.materials,
          {
            ...createEmptyGeotechnicalMaterial(),
            sourceReferenceId: current.geotechnicalMaterials.activeReferenceId,
          },
        ],
      },
    }));
    toast.success('Added project geotechnical material row to the current draft');
  }

  function removeMaterial(materialIndex: number) {
    updateProjectSpecifics((current) => {
      const nextMaterials = current.geotechnicalMaterials.materials.filter(
        (_material, rowIndex) => rowIndex !== materialIndex,
      );
      return {
        ...current,
        geotechnicalMaterials: {
          ...current.geotechnicalMaterials,
          templateState: nextMaterials.length > 0 ? 'manual' : 'empty',
          materials: nextMaterials,
        },
      };
    });
    toast.success('Removed project geotechnical material row from the current draft');
  }

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="space-y-1">
          <CardTitle className="text-base">Project Geotechnical Materials</CardTitle>
          <CardDescription>
            Editable project geotechnical materials linked to a selected geotechnical report for
            provenance.
          </CardDescription>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">{summary.totalMaterials} rows</Badge>
          <Badge variant="outline">{summary.activeMaterials} active</Badge>
          <Badge variant="outline">{summary.templateState}</Badge>
          <Button type="button" variant="outline" size="sm" onClick={addMaterial}>
            <Plus className="mr-2 h-4 w-4" />
            Add Material
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 rounded-lg border bg-muted/10 p-4 lg:grid-cols-[1.3fr_0.9fr]">
          <LabeledField label="Active Geotechnical Report">
            <Select
              value={geotechnicalMaterials.activeReferenceId || '__none__'}
              onValueChange={(nextValue) =>
                updateProjectSpecifics((current) => ({
                  ...current,
                  geotechnicalMaterials: {
                    ...current.geotechnicalMaterials,
                    activeReferenceId: nextValue === '__none__' ? '' : nextValue,
                  },
                }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="No active geotechnical report selected" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">No active geotechnical report selected</SelectItem>
                {geotechnicalReferences.map((reference) => (
                  <SelectItem key={reference.id} value={reference.id}>
                    {resolveProjectReferenceLabel(reference)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="mt-2 text-sm text-muted-foreground">
              The project geotechnical library stays editable project data. Select a report only
              when explicit provenance should be shown for the adopted material strengths.
            </p>
          </LabeledField>

          <div className="space-y-3 rounded-lg border bg-background p-4">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">
              Current Project GEO Context
            </div>
            <SummaryText label="Active report" value={summary.activeReferenceTitle} />
            <SummaryText label="Visible in project" value={`${summary.activeMaterials}`} />
            <SummaryText
              label="Material preview"
              value={summary.materialPreviewLabels.join(', ') || 'None yet'}
            />
          </div>
        </div>

        {!summary.hasGeotechnicalReferences ? (
          <div className="rounded-lg border border-dashed border-border/80 px-4 py-4 text-sm text-muted-foreground">
            No geotechnical report references have been added yet. You can still build the project
            geotechnical materials library now and link it later from Project References.
          </div>
        ) : null}

        {geotechnicalMaterials.materials.length === 0 ? (
          <EmptyState>
            No project geotechnical materials yet. Use Add Material to create a clean editable row.
          </EmptyState>
        ) : (
          <div className="space-y-4">
            {geotechnicalMaterials.materials.map((material, index) => (
              <div
                key={material.id ? `${material.id}-${index}` : `material-${index}`}
                className="rounded-xl border p-4"
              >
                {(() => {
                  const materialLabel = resolveProjectGeotechnicalMaterialLabel(material);
                  const visibleMaterialLabel =
                    materialLabel === 'Material row' ? `Material row ${index + 1}` : materialLabel;

                  return (
                    <>
                      <div className="flex flex-col gap-3 border-b pb-4 md:flex-row md:items-start md:justify-between">
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <div className="text-sm font-semibold">{visibleMaterialLabel}</div>
                            {material.includeInProject ? (
                              <Badge variant="success">In Project</Badge>
                            ) : (
                              <Badge variant="secondary">Excluded</Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {material.sourceDocument || 'Project geotechnical material'}
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeMaterial(index)}
                          aria-label={`Remove ${visibleMaterialLabel}`}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>

                      <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                        <LabeledField label="Material / Unit Code">
                          <Input
                            value={material.unitCode}
                            placeholder="e.g. 4b"
                            onChange={(event) =>
                              updateMaterial(index, (current) => ({
                                ...current,
                                unitCode: event.target.value,
                              }))
                            }
                          />
                        </LabeledField>
                        <LabeledField label="Material / Unit Name">
                          <Input
                            value={material.displayName}
                            placeholder="Material / geological unit"
                            onChange={(event) =>
                              updateMaterial(index, (current) => ({
                                ...current,
                                displayName: event.target.value,
                              }))
                            }
                          />
                        </LabeledField>
                        <LabeledField label="Source Reference">
                          <Select
                            value={material.sourceReferenceId || '__active__'}
                            onValueChange={(nextValue) =>
                              updateMaterial(index, (current) => ({
                                ...current,
                                sourceReferenceId: nextValue === '__active__' ? '' : nextValue,
                              }))
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Use active geotechnical report" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__active__">
                                Use active geotechnical report
                              </SelectItem>
                              {geotechnicalReferences.map((reference) => (
                                <SelectItem key={reference.id} value={reference.id}>
                                  {resolveProjectReferenceLabel(reference)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </LabeledField>
                        <ToggleField
                          label="Include in project"
                          checked={material.includeInProject}
                          onChange={(checked) =>
                            updateMaterial(index, (current) => ({
                              ...current,
                              includeInProject: checked,
                            }))
                          }
                        />
                      </div>

                      <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                        <LabeledField label="Source Document">
                          <Input
                            value={material.sourceDocument}
                            onChange={(event) =>
                              updateMaterial(index, (current) => ({
                                ...current,
                                sourceDocument: event.target.value,
                              }))
                            }
                          />
                        </LabeledField>
                        <LabeledField label="Source Project">
                          <Input
                            value={material.sourceProject}
                            onChange={(event) =>
                              updateMaterial(index, (current) => ({
                                ...current,
                                sourceProject: event.target.value,
                              }))
                            }
                          />
                        </LabeledField>
                        <LabeledField label="Source Site">
                          <Input
                            value={material.sourceSite}
                            onChange={(event) =>
                              updateMaterial(index, (current) => ({
                                ...current,
                                sourceSite: event.target.value,
                              }))
                            }
                          />
                        </LabeledField>
                        <LabeledField label="Source Section">
                          <Input
                            value={material.sourceSection}
                            onChange={(event) =>
                              updateMaterial(index, (current) => ({
                                ...current,
                                sourceSection: event.target.value,
                              }))
                            }
                          />
                        </LabeledField>
                        <LabeledField label="Source Table">
                          <Input
                            value={material.sourceTable}
                            onChange={(event) =>
                              updateMaterial(index, (current) => ({
                                ...current,
                                sourceTable: event.target.value,
                              }))
                            }
                          />
                        </LabeledField>
                      </div>

                      <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                        <NumberField
                          label="γ_b (kN/m3)"
                          value={material.gamma_b}
                          onChange={(nextValue) =>
                            updateMaterial(index, (current) => ({
                              ...current,
                              gamma_b: nextValue,
                            }))
                          }
                        />
                        <NumberField
                          label="φ' (deg)"
                          value={material.phi_prime}
                          onChange={(nextValue) =>
                            updateMaterial(index, (current) => ({
                              ...current,
                              phi_prime: nextValue,
                            }))
                          }
                        />
                        <NumberField
                          label="c' (kPa)"
                          value={material.c_prime}
                          onChange={(nextValue) =>
                            updateMaterial(index, (current) => ({
                              ...current,
                              c_prime: nextValue,
                            }))
                          }
                        />
                        <NumberField
                          label="c_u (kPa)"
                          value={material.cu}
                          onChange={(nextValue) =>
                            updateMaterial(index, (current) => ({
                              ...current,
                              cu: nextValue,
                            }))
                          }
                        />
                        <NumberField
                          label="E (MPa)"
                          value={material.E_MPa}
                          onChange={(nextValue) =>
                            updateMaterial(index, (current) => ({
                              ...current,
                              E_MPa: nextValue,
                            }))
                          }
                        />
                        <NumberField
                          label="ν"
                          value={material.nu}
                          onChange={(nextValue) =>
                            updateMaterial(index, (current) => ({
                              ...current,
                              nu: nextValue,
                            }))
                          }
                        />
                        <NumberField
                          label="K_a"
                          value={material.Ka}
                          onChange={(nextValue) =>
                            updateMaterial(index, (current) => ({
                              ...current,
                              Ka: nextValue,
                            }))
                          }
                        />
                        <NumberField
                          label="K_o"
                          value={material.Ko}
                          onChange={(nextValue) =>
                            updateMaterial(index, (current) => ({
                              ...current,
                              Ko: nextValue,
                            }))
                          }
                        />
                        <NumberField
                          label="K_p"
                          value={material.Kp}
                          onChange={(nextValue) =>
                            updateMaterial(index, (current) => ({
                              ...current,
                              Kp: nextValue,
                            }))
                          }
                        />
                        <NumberField
                          label="Wall Int. Active"
                          value={material.wallInterfaceActive}
                          onChange={(nextValue) =>
                            updateMaterial(index, (current) => ({
                              ...current,
                              wallInterfaceActive: nextValue,
                            }))
                          }
                        />
                        <NumberField
                          label="Wall Int. Passive"
                          value={material.wallInterfacePassive}
                          onChange={(nextValue) =>
                            updateMaterial(index, (current) => ({
                              ...current,
                              wallInterfacePassive: nextValue,
                            }))
                          }
                        />
                        <NumberField
                          label="f_m,s comp. (kPa)"
                          value={material.pile_fms_comp_kPa}
                          onChange={(nextValue) =>
                            updateMaterial(index, (current) => ({
                              ...current,
                              pile_fms_comp_kPa: nextValue,
                            }))
                          }
                        />
                        <NumberField
                          label="f_m,s tension (kPa)"
                          value={material.pile_fms_tension_kPa}
                          onChange={(nextValue) =>
                            updateMaterial(index, (current) => ({
                              ...current,
                              pile_fms_tension_kPa: nextValue,
                            }))
                          }
                        />
                        <NumberField
                          label="f_b ult. (kPa)"
                          value={material.pile_fb_ult_kPa}
                          onChange={(nextValue) =>
                            updateMaterial(index, (current) => ({
                              ...current,
                              pile_fb_ult_kPa: nextValue,
                            }))
                          }
                        />
                        <NumberField
                          label="f_m,s allow (kPa)"
                          value={material.pile_fms_allow_kPa}
                          onChange={(nextValue) =>
                            updateMaterial(index, (current) => ({
                              ...current,
                              pile_fms_allow_kPa: nextValue,
                            }))
                          }
                        />
                        <NumberField
                          label="f_b allow (kPa)"
                          value={material.pile_fb_allow_kPa}
                          onChange={(nextValue) =>
                            updateMaterial(index, (current) => ({
                              ...current,
                              pile_fb_allow_kPa: nextValue,
                            }))
                          }
                        />
                        <NumberField
                          label="CFA uplift tension factor"
                          value={material.cfaUpliftTensionFactor}
                          onChange={(nextValue) =>
                            updateMaterial(index, (current) => ({
                              ...current,
                              cfaUpliftTensionFactor: nextValue,
                            }))
                          }
                        />
                      </div>

                      <LabeledField label="Notes" className="mt-4">
                        <Textarea
                          value={material.notes}
                          placeholder="Adopted strength notes, report comments, provenance notes..."
                          onChange={(event) =>
                            updateMaterial(index, (current) => ({
                              ...current,
                              notes: event.target.value,
                            }))
                          }
                        />
                      </LabeledField>
                    </>
                  );
                })()}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function ProjectGeotechnicalBasisEditor({
  value,
  onChange,
}: ProjectGeotechnicalEditorProps) {
  const summary = summarizeProjectGeotechnical(value);
  const { geotechnicalBasis } = value;
  const arrAssessment = geotechnicalBasis.arrAssessment;

  function updateProjectSpecifics(
    updater: (current: MultiPileProjectSpecifics) => MultiPileProjectSpecifics,
  ) {
    onChange(updater(value));
  }

  function updateArrAssessment(
    updater: (
      current: MultiPileProjectSpecifics['geotechnicalBasis']['arrAssessment'],
    ) => MultiPileProjectSpecifics['geotechnicalBasis']['arrAssessment'],
  ) {
    updateProjectSpecifics((current) => ({
      ...current,
      geotechnicalBasis: {
        ...current.geotechnicalBasis,
        arrAssessment: normalizeMultiPileGeoArrSettings(
          updater(current.geotechnicalBasis.arrAssessment),
        ),
      },
    }));
  }

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="space-y-1">
          <CardTitle className="text-base">
            Project Geotechnical Basis / Global GEO Controls
          </CardTitle>
          <CardDescription>
            Project-level design notes and ARR / phi_g assessment inputs that explain groundwater
            assumptions, uplift logic, socket assumptions, founding commentary, and the adopted GEO
            reduction factors used downstream by Multi-Pile.
          </CardDescription>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">{summary.cfaUpliftSummary}</Badge>
          <Badge variant="outline">ARR {summary.arrValueSummary}</Badge>
          <Badge variant="outline">
            phi_g {summary.phiGLowSummary} / {summary.phiGHighSummary}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-2">
        <div className="space-y-4 rounded-xl border bg-muted/10 p-4 md:col-span-2">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div className="space-y-1">
              <div className="text-sm font-semibold">ARR / phi_g Project Assessment</div>
              <p className="text-sm text-muted-foreground">
                This is the project-owned AS 2159 Section 4.3 assessment. Multi-Pile reads these
                resolved LOW / HIGH phi_g values and only chooses the adopted phi_g from type-level
                redundancy.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                updateArrAssessment((current) => ({
                  ...current,
                  irrValues: current.irrValues.map(() => 3),
                }))
              }
            >
              Reset IRR = 3
            </Button>
          </div>

          <div className="overflow-x-auto rounded-lg border bg-background">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Category</TableHead>
                  <TableHead>Risk factor</TableHead>
                  <TableHead>wi</TableHead>
                  <TableHead>IRR 1</TableHead>
                  <TableHead>IRR 3</TableHead>
                  <TableHead>IRR 5</TableHead>
                  <TableHead>Your IRR</TableHead>
                  <TableHead>wi x IRR</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {MULTI_PILE_GEO_ARR_ITEMS.map((item, index) => {
                  const irr = arrAssessment.irrValues[index] ?? 3;
                  return (
                    <TableRow key={item.name}>
                      <TableCell>{item.category}</TableCell>
                      <TableCell className="min-w-[18rem]">{item.name}</TableCell>
                      <TableCell>{item.weighting}</TableCell>
                      <TableCell className="min-w-[16rem] text-xs text-muted-foreground">
                        {item.d1}
                      </TableCell>
                      <TableCell className="min-w-[16rem] text-xs text-muted-foreground">
                        {item.d3}
                      </TableCell>
                      <TableCell className="min-w-[16rem] text-xs text-muted-foreground">
                        {item.d5}
                      </TableCell>
                      <TableCell className="w-32">
                        <Select
                          value={String(irr)}
                          onValueChange={(nextValue) =>
                            updateArrAssessment((current) => ({
                              ...current,
                              irrValues: current.irrValues.map((value, valueIndex) =>
                                valueIndex === index ? Number(nextValue) : value,
                              ),
                            }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {[1, 2, 3, 4, 5].map((rating) => (
                              <SelectItem key={rating} value={String(rating)}>
                                {rating}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>{(item.weighting * irr).toFixed(2)}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          <div className="grid gap-4 lg:grid-cols-4">
            <MetricSummaryCard
              label="Total weighting"
              value={summaryFromNumber(arrAssessment.weightTotal)}
            />
            <MetricSummaryCard
              label="Total weighted score"
              value={summaryFromNumber(arrAssessment.weightedScore)}
            />
            <MetricSummaryCard
              label="ARR (weighted average)"
              value={summaryFromNumber(arrAssessment.arrValue)}
            />
            <MetricSummaryCard label="ARR range (Table 4.3.2(B))" value={arrAssessment.arrBand} />
          </div>

          <div className="grid gap-4 lg:grid-cols-4">
            <div className="rounded-lg border bg-background p-4">
              <div className="mb-2 text-sm font-medium">Test type (for phi_tf and K)</div>
              <Select
                value={arrAssessment.testType}
                onValueChange={(nextValue) =>
                  updateArrAssessment((current) => ({
                    ...current,
                    testType:
                      nextValue === 'STATIC' ||
                      nextValue === 'RAPID' ||
                      nextValue === 'DYN_PREF' ||
                      nextValue === 'DYN_OTHER' ||
                      nextValue === 'BIDIR'
                        ? nextValue
                        : 'NONE',
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE">No testing (typical)</SelectItem>
                  <SelectItem value="STATIC">Static load test</SelectItem>
                  <SelectItem value="RAPID">Rapid load test</SelectItem>
                  <SelectItem value="DYN_PREF">Dynamic (preformed piles)</SelectItem>
                  <SelectItem value="DYN_OTHER">Dynamic (other than preformed)</SelectItem>
                  <SelectItem value="BIDIR">Bi-directional load test</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="rounded-lg border bg-background p-4">
              <div className="mb-2 text-sm font-medium">p = % piles tested</div>
              <Input
                type="number"
                step="0.1"
                min="0"
                max="100"
                value={arrAssessment.testPilePercentage}
                onChange={(event) =>
                  updateArrAssessment((current) => ({
                    ...current,
                    testPilePercentage: Number(event.target.value),
                  }))
                }
              />
            </div>

            <MetricSummaryCard
              label="phi_tf / K"
              value={`${arrAssessment.phiTf == null ? 'phi_gb' : summaryFromNumber(arrAssessment.phiTf)} / ${summaryFromNumber(arrAssessment.testBenefitK)}`}
            />
            <MetricSummaryCard
              label="phi_g LOW / HIGH"
              value={`${summaryFromNumber(arrAssessment.phiGLow)} / ${summaryFromNumber(arrAssessment.phiGHigh)}`}
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <MetricSummaryCard
              label="phi_gb LOW / HIGH"
              value={`${summaryFromNumber(arrAssessment.phiGbLow)} / ${summaryFromNumber(arrAssessment.phiGbHigh)}`}
            />
            <div className="rounded-lg border bg-background p-4 text-sm text-muted-foreground">
              Multi-Pile pile types still own redundancy selection. LOW redundancy uses the LOW
              phi_g above and HIGH redundancy uses the HIGH phi_g above.
            </div>
          </div>
        </div>

        <LabeledField label="Groundwater Design Notes" className="md:col-span-2">
          <Textarea
            value={geotechnicalBasis.groundwaterDesignNotes}
            placeholder="Groundwater assumptions, variability, design levels, seepage commentary..."
            onChange={(event) =>
              updateProjectSpecifics((current) => ({
                ...current,
                geotechnicalBasis: {
                  ...current.geotechnicalBasis,
                  groundwaterDesignNotes: event.target.value,
                },
              }))
            }
          />
        </LabeledField>

        <LabeledField label="Default CFA Uplift Logic">
          <Select
            value={geotechnicalBasis.cfaUpliftMode}
            onValueChange={(nextValue) =>
              updateProjectSpecifics((current) => ({
                ...current,
                geotechnicalBasis: {
                  ...current.geotechnicalBasis,
                  cfaUpliftMode:
                    nextValue as MultiPileProjectSpecifics['geotechnicalBasis']['cfaUpliftMode'],
                },
              }))
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MULTI_PILE_PROJECT_GEO_UPLIFT_MODES.map((mode) => (
                <SelectItem key={mode} value={mode}>
                  {mode === 'manual-entry'
                    ? 'Manual per-material tension values'
                    : 'Ratio to compression'}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </LabeledField>

        <NumberField
          label="CFA Tension Ratio"
          value={geotechnicalBasis.cfaUpliftFactor}
          onChange={(nextValue) =>
            updateProjectSpecifics((current) => ({
              ...current,
              geotechnicalBasis: {
                ...current.geotechnicalBasis,
                cfaUpliftFactor: nextValue ?? 0,
              },
            }))
          }
        />

        <LabeledField label="Default Socket Design Assumptions" className="md:col-span-2">
          <Textarea
            value={geotechnicalBasis.defaultSocketAssumptions}
            placeholder="Socket design basis, minimum embedment philosophy, base-inclusion assumptions..."
            onChange={(event) =>
              updateProjectSpecifics((current) => ({
                ...current,
                geotechnicalBasis: {
                  ...current.geotechnicalBasis,
                  defaultSocketAssumptions: event.target.value,
                },
              }))
            }
          />
        </LabeledField>

        <LabeledField label="Project-Level Founding Notes">
          <Textarea
            value={geotechnicalBasis.foundingNotes}
            placeholder="Founding strata notes, refusal criteria, founding horizon commentary..."
            onChange={(event) =>
              updateProjectSpecifics((current) => ({
                ...current,
                geotechnicalBasis: {
                  ...current.geotechnicalBasis,
                  foundingNotes: event.target.value,
                },
              }))
            }
          />
        </LabeledField>

        <LabeledField label="Project-Level Geotechnical Commentary">
          <Textarea
            value={geotechnicalBasis.commentary}
            placeholder="Additional geotechnical commentary for reporting and design traceability..."
            onChange={(event) =>
              updateProjectSpecifics((current) => ({
                ...current,
                geotechnicalBasis: {
                  ...current.geotechnicalBasis,
                  commentary: event.target.value,
                },
              }))
            }
          />
        </LabeledField>
      </CardContent>
    </Card>
  );
}

function NumberField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number | null | undefined;
  onChange: (value: number | null) => void;
}) {
  return (
    <LabeledField label={label}>
      <Input
        type="number"
        step="any"
        value={nullableNumberToInput(value)}
        onChange={(event) => onChange(nullableNumberFromInput(event.target.value))}
      />
    </LabeledField>
  );
}

function SummaryText({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-sm font-medium">{value}</div>
    </div>
  );
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
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-3 pt-8 text-sm font-medium">
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

function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-border/80 px-4 py-8 text-sm text-muted-foreground">
      {children}
    </div>
  );
}

function MetricSummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-background p-4">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-2 text-sm font-medium">{value}</div>
    </div>
  );
}

function summaryFromNumber(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) {
    return '—';
  }
  return value.toFixed(3).replace(/0+$/, '').replace(/\.$/, '');
}
