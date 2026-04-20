'use client';

import { Plus, Trash2 } from 'lucide-react';
import type { ProjectLoadCase, ProjectLoadCombination, ProjectLoadDefinition } from '@eng/shared';
import { MULTI_PILE_PATTERN_TYPES } from '@eng/shared';
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
import { nextId, numberFromInput } from '@/features/multi-pile/utils';

type ProjectLoadEditorSection = 'settings' | 'load-cases' | 'load-combinations';

interface ProjectLoadDefinitionEditorProps {
  value: ProjectLoadDefinition;
  onChange: (value: ProjectLoadDefinition) => void;
  sections?: ProjectLoadEditorSection[];
}

const DEFAULT_SECTIONS: ProjectLoadEditorSection[] = [
  'settings',
  'load-cases',
  'load-combinations',
];

export function ProjectLoadDefinitionEditor({
  value,
  onChange,
  sections = DEFAULT_SECTIONS,
}: ProjectLoadDefinitionEditorProps) {
  const visibleSections = new Set(sections);
  const builtInCombinations = value.loadCombinations.filter((row) => row.source === 'built-in');
  const customCombinations = value.loadCombinations.filter((row) => row.source === 'custom');

  function updateDefinition(updater: (current: ProjectLoadDefinition) => ProjectLoadDefinition) {
    onChange(updater(value));
  }

  function updateLoadCase(
    loadCaseId: string,
    updater: (current: ProjectLoadCase) => ProjectLoadCase,
  ) {
    updateDefinition((current) => ({
      ...current,
      loadCases: current.loadCases.map((loadCase) =>
        loadCase.id === loadCaseId ? updater(loadCase) : loadCase,
      ),
    }));
  }

  function addLoadCase() {
    updateDefinition((current) => ({
      ...current,
      loadCases: [
        ...current.loadCases,
        {
          id: nextId('LC'),
          name: `Load Case ${current.loadCases.length + 1}`,
          type: 'Other',
          reversible: false,
          enabled: true,
          order: current.loadCases.length,
        },
      ],
    }));
  }

  function removeLoadCase(loadCaseId: string) {
    if (value.loadCases.length <= 1) return;

    updateDefinition((current) => ({
      ...current,
      loadCases: current.loadCases
        .filter((loadCase) => loadCase.id !== loadCaseId)
        .map((loadCase, index) => ({ ...loadCase, order: index })),
      loadCombinations: current.loadCombinations.map((row) =>
        row.source === 'custom'
          ? {
              ...row,
              factors: row.factors?.filter((factor) => factor.loadCaseId !== loadCaseId) ?? [],
              expressionSummary: summarizeProjectLoadCombination({
                ...row,
                factors: row.factors?.filter((factor) => factor.loadCaseId !== loadCaseId) ?? [],
              }),
            }
          : row,
      ),
    }));
  }

  function addCustomCombination() {
    updateDefinition((current) => ({
      ...current,
      loadCombinations: [
        ...current.loadCombinations,
        {
          id: nextId('LCOMB'),
          name: `Custom ${
            current.loadCombinations.filter((row) => row.source === 'custom').length + 1
          }`,
          source: 'custom',
          kind: 'linear',
          enabled: true,
          includeInEnvelope: true,
          family: 'custom',
          reversibleAware: false,
          factors: [],
          expressionSummary: '',
          order: current.loadCombinations.length,
        },
      ],
    }));
  }

  function removeCustomCombination(combinationId: string) {
    updateDefinition((current) => ({
      ...current,
      loadCombinations: current.loadCombinations
        .filter((row) => row.id !== combinationId)
        .map((row, index) => ({ ...row, order: index })),
    }));
  }

  function updateCombinationFactor(combinationId: string, loadCaseId: string, factor: number) {
    updateDefinition((current) => ({
      ...current,
      loadCombinations: current.loadCombinations.map((row) => {
        if (row.id !== combinationId || row.source !== 'custom') {
          return row;
        }

        const filteredFactors = (row.factors ?? []).filter(
          (term) => term.loadCaseId !== loadCaseId,
        );
        const nextFactors =
          Math.abs(factor) > 1e-9 ? [...filteredFactors, { loadCaseId, factor }] : filteredFactors;

        return {
          ...row,
          factors: nextFactors,
          expressionSummary: summarizeProjectLoadCombination({
            ...row,
            factors: nextFactors,
          } as ProjectLoadCombination),
        };
      }),
    }));
  }

  return (
    <div className="space-y-6">
      {visibleSections.has('settings') && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Project Load Settings</CardTitle>
            <CardDescription>
              Project-level factors that drive the built-in load combinations and minimum permanent
              case.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-4">
            <LabeledNumberInput
              label="alpha"
              value={value.combinationSettings.alpha}
              onChange={(nextValue) =>
                updateDefinition((current) => ({
                  ...current,
                  combinationSettings: { ...current.combinationSettings, alpha: nextValue },
                }))
              }
            />
            <LabeledNumberInput
              label="psiC"
              value={value.combinationSettings.psiC}
              onChange={(nextValue) =>
                updateDefinition((current) => ({
                  ...current,
                  combinationSettings: { ...current.combinationSettings, psiC: nextValue },
                }))
              }
            />
            <LabeledNumberInput
              label="psiE"
              value={value.combinationSettings.psiE}
              onChange={(nextValue) =>
                updateDefinition((current) => ({
                  ...current,
                  combinationSettings: { ...current.combinationSettings, psiE: nextValue },
                }))
              }
            />
            <LabeledNumberInput
              label="psiL"
              value={value.combinationSettings.psiL}
              onChange={(nextValue) =>
                updateDefinition((current) => ({
                  ...current,
                  combinationSettings: { ...current.combinationSettings, psiL: nextValue },
                }))
              }
            />
            <LabeledNumberInput
              label="Groundwater Factor"
              value={value.combinationSettings.groundwaterFactor}
              onChange={(nextValue) =>
                updateDefinition((current) => ({
                  ...current,
                  combinationSettings: {
                    ...current.combinationSettings,
                    groundwaterFactor: nextValue,
                  },
                }))
              }
            />
            <LabeledNumberInput
              label="Min Permanent Factor"
              value={value.combinationSettings.minPermanentFactor}
              onChange={(nextValue) =>
                updateDefinition((current) => ({
                  ...current,
                  combinationSettings: {
                    ...current.combinationSettings,
                    minPermanentFactor: nextValue,
                  },
                }))
              }
            />
            <div className="flex items-end md:col-span-2">
              <label className="flex items-center gap-3 text-sm font-medium">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border border-input"
                  checked={value.combinationSettings.reduceMinimumPermanentWithPointNine}
                  onChange={(event) =>
                    updateDefinition((current) => ({
                      ...current,
                      combinationSettings: {
                        ...current.combinationSettings,
                        reduceMinimumPermanentWithPointNine: event.target.checked,
                      },
                    }))
                  }
                />
                Apply 0.9 reduction to min permanent factor
              </label>
            </div>
          </CardContent>
        </Card>
      )}

      {visibleSections.has('load-cases') && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="text-base">Load Cases</CardTitle>
              <CardDescription>
                Shared project-level load cases reused by Multi-Pile and future calculators.
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={addLoadCase}>
              <Plus className="mr-2 h-4 w-4" />
              Add Load Case
            </Button>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Reversible</TableHead>
                  <TableHead>Enabled</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {value.loadCases.map((loadCase) => (
                  <TableRow key={loadCase.id}>
                    <TableCell className="font-mono text-xs">{loadCase.id}</TableCell>
                    <TableCell>
                      <Input
                        value={loadCase.name}
                        onChange={(event) =>
                          updateLoadCase(loadCase.id, (current) => ({
                            ...current,
                            name: event.target.value,
                          }))
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <Select
                        value={loadCase.type}
                        onValueChange={(nextValue) =>
                          updateLoadCase(loadCase.id, (current) => ({
                            ...current,
                            type: nextValue as ProjectLoadCase['type'],
                          }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {MULTI_PILE_PATTERN_TYPES.map((loadType) => (
                            <SelectItem key={loadType} value={loadType}>
                              {loadType}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border border-input"
                        checked={loadCase.reversible}
                        onChange={(event) =>
                          updateLoadCase(loadCase.id, (current) => ({
                            ...current,
                            reversible: event.target.checked,
                          }))
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border border-input"
                        checked={loadCase.enabled}
                        onChange={(event) =>
                          updateLoadCase(loadCase.id, (current) => ({
                            ...current,
                            enabled: event.target.checked,
                          }))
                        }
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        disabled={value.loadCases.length <= 1}
                        onClick={() => removeLoadCase(loadCase.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {visibleSections.has('load-combinations') && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Built-In Load Combinations</CardTitle>
              <CardDescription>
                Built-in rows are preserved and recalculated from the current project settings when
                you save.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead>Expression</TableHead>
                    <TableHead>Enabled</TableHead>
                    <TableHead>Envelope</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {builtInCombinations.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="font-medium">{row.name}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {row.reference ?? row.builtinKey}
                      </TableCell>
                      <TableCell className="text-xs">
                        {row.expressionSummary || row.builtinKey}
                      </TableCell>
                      <TableCell>
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border border-input"
                          checked={row.enabled}
                          onChange={(event) =>
                            updateDefinition((current) => ({
                              ...current,
                              loadCombinations: current.loadCombinations.map((candidate) =>
                                candidate.id === row.id
                                  ? { ...candidate, enabled: event.target.checked }
                                  : candidate,
                              ),
                            }))
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border border-input"
                          checked={row.includeInEnvelope}
                          onChange={(event) =>
                            updateDefinition((current) => ({
                              ...current,
                              loadCombinations: current.loadCombinations.map((candidate) =>
                                candidate.id === row.id
                                  ? { ...candidate, includeInEnvelope: event.target.checked }
                                  : candidate,
                              ),
                            }))
                          }
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle className="text-base">Custom Load Combinations</CardTitle>
                <CardDescription>
                  Project-owned custom rows are reusable across calculators and feed the same
                  envelope runs.
                </CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={addCustomCombination}>
                <Plus className="mr-2 h-4 w-4" />
                Add Custom Combination
              </Button>
            </CardHeader>
            <CardContent>
              {customCombinations.length === 0 ? (
                <p className="text-sm text-muted-foreground">No custom combinations yet.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Enabled</TableHead>
                      <TableHead>Envelope</TableHead>
                      {value.loadCases.map((loadCase) => (
                        <TableHead key={loadCase.id}>{loadCase.name}</TableHead>
                      ))}
                      <TableHead>Expression</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {customCombinations.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell className="min-w-52">
                          <Input
                            value={row.name}
                            onChange={(event) =>
                              updateDefinition((current) => ({
                                ...current,
                                loadCombinations: current.loadCombinations.map((candidate) =>
                                  candidate.id === row.id
                                    ? { ...candidate, name: event.target.value }
                                    : candidate,
                                ),
                              }))
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <input
                            type="checkbox"
                            className="h-4 w-4 rounded border border-input"
                            checked={row.enabled}
                            onChange={(event) =>
                              updateDefinition((current) => ({
                                ...current,
                                loadCombinations: current.loadCombinations.map((candidate) =>
                                  candidate.id === row.id
                                    ? { ...candidate, enabled: event.target.checked }
                                    : candidate,
                                ),
                              }))
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <input
                            type="checkbox"
                            className="h-4 w-4 rounded border border-input"
                            checked={row.includeInEnvelope}
                            onChange={(event) =>
                              updateDefinition((current) => ({
                                ...current,
                                loadCombinations: current.loadCombinations.map((candidate) =>
                                  candidate.id === row.id
                                    ? { ...candidate, includeInEnvelope: event.target.checked }
                                    : candidate,
                                ),
                              }))
                            }
                          />
                        </TableCell>
                        {value.loadCases.map((loadCase) => (
                          <TableCell key={`${row.id}::${loadCase.id}`} className="min-w-28">
                            <Input
                              type="number"
                              step="any"
                              value={findProjectLoadFactor(row, loadCase.id)}
                              onChange={(event) =>
                                updateCombinationFactor(
                                  row.id,
                                  loadCase.id,
                                  numberFromInput(event.target.value),
                                )
                              }
                            />
                          </TableCell>
                        ))}
                        <TableCell className="min-w-56 text-xs">
                          {summarizeProjectLoadCombination(row)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeCustomCombination(row.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function findProjectLoadFactor(row: ProjectLoadCombination, loadCaseId: string) {
  return row.factors?.find((term) => term.loadCaseId === loadCaseId)?.factor ?? 0;
}

function summarizeProjectLoadCombination(row: ProjectLoadCombination) {
  if (!row.factors?.length) {
    return row.name;
  }

  return row.factors
    .slice()
    .sort((left, right) => left.loadCaseId.localeCompare(right.loadCaseId))
    .map((term) => `${formatFactor(term.factor)}${term.loadCaseId}`)
    .join(' + ');
}

function formatFactor(value: number) {
  if (Math.abs(value - Math.round(value)) < 1e-9) {
    return `${Math.round(value)}x`;
  }
  return `${value.toFixed(3).replace(/0+$/, '').replace(/\.$/, '')}x`;
}

function LabeledNumberInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="space-y-2">
      <span className="text-sm font-medium">{label}</span>
      <Input
        type="number"
        step="any"
        value={value}
        onChange={(event) => onChange(numberFromInput(event.target.value, value))}
      />
    </label>
  );
}
