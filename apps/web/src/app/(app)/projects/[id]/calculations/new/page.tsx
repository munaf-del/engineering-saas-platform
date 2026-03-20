'use client';

import { use, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, AlertTriangle, Play, Copy } from 'lucide-react';
import { useProject } from '@/hooks/use-projects';
import { useCalculators, useCalculatorVersions } from '@/hooks/use-calculators';
import { useSubmitCalculation, useCalculation } from '@/hooks/use-calculations';
import { usePileGroups } from '@/hooks/use-pile-groups';
import { useLoadCombinationSets } from '@/hooks/use-load-combinations';
import { useProjectStandardAssignments, useCurrentEditions } from '@/hooks/use-standards';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { PageLoading } from '@/components/loading';
import { ApiError } from '@/lib/api-client';
import { toast } from 'sonner';
import type { CalculatorDefinition, CalculatorVersion, InputValue } from '@eng/shared';
import { CALC_TYPES } from '@eng/shared';

interface InputFieldDef {
  key: string;
  label: string;
  unit: string;
  defaultValue?: number;
}

function deriveInputFields(schema: Record<string, unknown> | undefined, defaults: Record<string, unknown> | undefined): InputFieldDef[] {
  if (!schema || typeof schema !== 'object') return [];
  const properties = (schema as Record<string, Record<string, unknown>>).properties ?? schema;
  return Object.entries(properties).map(([key, def]) => ({
    key,
    label: (def as Record<string, string>)?.label ?? (def as Record<string, string>)?.title ?? key,
    unit: (def as Record<string, string>)?.unit ?? '',
    defaultValue: (defaults as Record<string, Record<string, number>>)?.[key]?.value ??
      (def as Record<string, number>)?.default,
  }));
}

export default function NewCalculationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const cloneFromId = searchParams.get('cloneFrom');

  const { data: project, isLoading: projectLoading } = useProject(projectId);
  const { data: calculators, isLoading: calcsLoading } = useCalculators();
  const { data: assignments } = useProjectStandardAssignments(projectId);
  const { data: editions } = useCurrentEditions();
  const { data: pileGroups } = usePileGroups(projectId);
  const { data: loadCombSets } = useLoadCombinationSets(projectId);
  const { data: cloneSource } = useCalculation(projectId, cloneFromId ?? '');
  const submitCalc = useSubmitCalculation(projectId);

  const [selectedCalcType, setSelectedCalcType] = useState<string>('');
  const [selectedCalculatorId, setSelectedCalculatorId] = useState<string>('');
  const [selectedVersionId, setSelectedVersionId] = useState<string>('');
  const [selectedPileGroupId, setSelectedPileGroupId] = useState<string>('');
  const [selectedLoadCombSetId, setSelectedLoadCombSetId] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [inputValues, setInputValues] = useState<Record<string, { value: string; unit: string; label: string }>>({});
  const [includeSteps, setIncludeSteps] = useState(true);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string>('');
  const [isCloned, setIsCloned] = useState(false);

  const matchingCalculator = useMemo(
    () => calculators?.find((c: CalculatorDefinition) => c.id === selectedCalculatorId),
    [calculators, selectedCalculatorId],
  );

  const { data: versions } = useCalculatorVersions(selectedCalculatorId);

  const selectedVersion = useMemo(
    () => versions?.find((v: CalculatorVersion) => v.id === selectedVersionId),
    [versions, selectedVersionId],
  );

  const inputFields = useMemo(
    () => deriveInputFields(selectedVersion?.inputSchema, selectedVersion?.defaultInputs),
    [selectedVersion],
  );

  const assignedEditions = useMemo(() => {
    if (!assignments || !editions) return [];
    return assignments.map((a) => {
      const ed = editions.find((e) => e.id === a.standardEditionId);
      return ed ? { code: ed.code, edition: ed.edition, amendment: ed.amendment, rulePackId: ed.rulePackId } : null;
    }).filter(Boolean) as { code: string; edition: string; amendment?: string; rulePackId?: string }[];
  }, [assignments, editions]);

  const hasRulePacks = assignedEditions.some((e) => e.rulePackId);

  const prefillFromClone = useCallback(() => {
    if (!cloneSource?.requestSnapshot || isCloned) return;
    const req = cloneSource.requestSnapshot;
    setSelectedCalcType(req.calcType);
    if (req.inputs) {
      const prefilled: Record<string, { value: string; unit: string; label: string }> = {};
      for (const [key, iv] of Object.entries(req.inputs)) {
        prefilled[key] = { value: String(iv.value), unit: iv.unit, label: iv.label };
      }
      setInputValues(prefilled);
    }
    if (cloneSource.notes) setNotes(cloneSource.notes);
    if (cloneSource.calculatorVersionId) setSelectedVersionId(cloneSource.calculatorVersionId);
    setIsCloned(true);
  }, [cloneSource, isCloned]);

  useEffect(() => {
    if (cloneFromId && cloneSource) prefillFromClone();
  }, [cloneFromId, cloneSource, prefillFromClone]);

  useEffect(() => {
    if (selectedCalcType && calculators) {
      const match = calculators.find((c: CalculatorDefinition) => c.calcType === selectedCalcType);
      if (match && match.id !== selectedCalculatorId) {
        setSelectedCalculatorId(match.id);
      }
    }
  }, [selectedCalcType, calculators, selectedCalculatorId]);

  useEffect(() => {
    if (versions?.length && !selectedVersionId) {
      const active = versions.find((v: CalculatorVersion) => v.status === 'active') ?? versions[0];
      if (active) setSelectedVersionId(active.id);
    }
  }, [versions, selectedVersionId]);

  useEffect(() => {
    if (inputFields.length && Object.keys(inputValues).length === 0 && !isCloned) {
      const defaults: Record<string, { value: string; unit: string; label: string }> = {};
      for (const f of inputFields) {
        defaults[f.key] = { value: f.defaultValue !== undefined ? String(f.defaultValue) : '', unit: f.unit, label: f.label };
      }
      setInputValues(defaults);
    }
  }, [inputFields, inputValues, isCloned]);

  function updateInput(key: string, field: 'value' | 'unit' | 'label', val: string) {
    setInputValues((prev) => {
      const existing = prev[key] ?? { value: '', unit: '', label: key };
      return { ...prev, [key]: { ...existing, [field]: val } };
    });
    if (validationErrors[key]) {
      setValidationErrors((prev) => { const next = { ...prev }; delete next[key]; return next; });
    }
  }

  function validate(): boolean {
    const errors: Record<string, string> = {};
    if (!selectedCalcType) errors._calcType = 'Select a calculation type';
    for (const f of inputFields) {
      const iv = inputValues[f.key];
      if (!iv || iv.value === '') {
        errors[f.key] = 'Required';
      } else if (isNaN(Number(iv.value))) {
        errors[f.key] = 'Must be a number';
      }
    }
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError('');
    if (!validate()) return;

    const inputs: Record<string, InputValue> = {};
    for (const [key, iv] of Object.entries(inputValues)) {
      inputs[key] = { value: Number(iv.value), unit: iv.unit, label: iv.label };
    }

    const standardsRefs = assignedEditions.map((e) => ({
      code: e.code,
      edition: e.edition,
      ...(e.amendment ? { amendment: e.amendment } : {}),
    }));

    const rulePackEdition = assignedEditions.find((e) => e.rulePackId);
    const rulePack = rulePackEdition
      ? { id: rulePackEdition.rulePackId!, standardCode: rulePackEdition.code, version: rulePackEdition.edition, rules: {} }
      : { id: 'none', standardCode: '', version: '', rules: {} };

    const payload: Record<string, unknown> = {
      calcType: selectedCalcType,
      inputs,
      loadCombinations: [],
      rulePack,
      standardsRefs,
      options: { includeIntermediateSteps: includeSteps },
    };

    if (selectedVersionId) payload.calculatorVersionId = selectedVersionId;
    if (selectedPileGroupId) payload.elementId = selectedPileGroupId;
    if (notes) payload.notes = notes;

    try {
      const result = await submitCalc.mutateAsync(payload);
      toast.success('Calculation submitted');
      router.push(`/projects/${projectId}/calculations/${result.id}`);
    } catch (err) {
      if (err instanceof ApiError) {
        const body = err.body as Record<string, unknown> | null;
        const msg = (body?.message as string) ?? (body?.error as string) ?? err.statusText;
        setSubmitError(msg);
      } else {
        setSubmitError('Submission failed. Please try again.');
      }
    }
  }

  if (projectLoading || calcsLoading) return <PageLoading />;

  return (
    <>
      <div className="mb-4">
        <Link href={`/projects/${projectId}/calculations`} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3.5 w-3.5" /> Calculation History
        </Link>
      </div>

      <PageHeader
        title="New Calculation"
        description={`${project?.code ?? ''} — Submit a calculation run`}
        badges={isCloned ? <Badge variant="secondary"><Copy className="mr-1 h-3 w-3" />Cloned from previous run</Badge> : undefined}
      />

      {!hasRulePacks && (
        <Alert variant="warning" className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Missing Approved Rule Packs</AlertTitle>
          <AlertDescription>
            No approved rule packs are loaded for the assigned standards. The calculation may fail or produce
            limited results. Import rule packs via standards administration first.
          </AlertDescription>
        </Alert>
      )}

      {assignedEditions.length === 0 && (
        <Alert variant="warning" className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>No Standards Assigned</AlertTitle>
          <AlertDescription>
            This project has no standard editions assigned. Assign standards on the{' '}
            <Link href={`/projects/${projectId}/standards`} className="underline">project standards page</Link>{' '}
            before submitting calculations.
          </AlertDescription>
        </Alert>
      )}

      {submitError && (
        <Alert variant="destructive" className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Submission Failed</AlertTitle>
          <AlertDescription>{submitError}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="max-w-3xl space-y-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Calculation Type & Calculator</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Calculation Type *</Label>
                <Select value={selectedCalcType} onValueChange={setSelectedCalcType}>
                  <SelectTrigger className={validationErrors._calcType ? 'border-red-500' : ''}>
                    <SelectValue placeholder="Select type…" />
                  </SelectTrigger>
                  <SelectContent>
                    {CALC_TYPES.map((ct) => (
                      <SelectItem key={ct} value={ct}>{ct.replace(/_/g, ' ')}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {validationErrors._calcType && <p className="text-xs text-red-600">{validationErrors._calcType}</p>}
              </div>

              <div className="space-y-2">
                <Label>Calculator Version</Label>
                <Select value={selectedVersionId} onValueChange={setSelectedVersionId} disabled={!versions?.length}>
                  <SelectTrigger>
                    <SelectValue placeholder={versions?.length ? 'Select version…' : 'No versions available'} />
                  </SelectTrigger>
                  <SelectContent>
                    {versions?.map((v: CalculatorVersion) => (
                      <SelectItem key={v.id} value={v.id}>
                        v{v.version} {v.status === 'active' ? '(active)' : `(${v.status})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {matchingCalculator && (
                  <p className="text-xs text-muted-foreground">{matchingCalculator.name} — {matchingCalculator.code}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Context</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Pile Group</Label>
                <Select value={selectedPileGroupId} onValueChange={setSelectedPileGroupId}>
                  <SelectTrigger>
                    <SelectValue placeholder="None (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">None</SelectItem>
                    {pileGroups?.map((pg) => (
                      <SelectItem key={pg.id} value={pg.id}>{pg.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Load Combination Set</Label>
                <Select value={selectedLoadCombSetId} onValueChange={setSelectedLoadCombSetId}>
                  <SelectTrigger>
                    <SelectValue placeholder="None (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">None</SelectItem>
                    {loadCombSets?.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {assignedEditions.length > 0 && (
              <div className="space-y-2">
                <Label>Standards Context</Label>
                <div className="flex flex-wrap gap-1.5">
                  {assignedEditions.map((e) => (
                    <Badge key={`${e.code}-${e.edition}`} variant="outline" className="font-mono text-xs">
                      {e.code} ({e.edition}){e.rulePackId ? '' : ' — no rule pack'}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Input Parameters
              {isCloned && <Badge variant="secondary" className="ml-2 text-xs">Pre-filled from clone</Badge>}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {inputFields.length > 0 ? (
              <div className="space-y-3">
                {inputFields.map((f) => (
                  <div key={f.key} className="grid grid-cols-12 items-end gap-2">
                    <div className="col-span-4 space-y-1">
                      <Label className="text-xs">{f.label || f.key}</Label>
                    </div>
                    <div className="col-span-5">
                      <Input
                        type="number"
                        step="any"
                        value={inputValues[f.key]?.value ?? ''}
                        onChange={(e) => updateInput(f.key, 'value', e.target.value)}
                        placeholder="0"
                        className={validationErrors[f.key] ? 'border-red-500' : ''}
                      />
                      {validationErrors[f.key] && <p className="text-xs text-red-600">{validationErrors[f.key]}</p>}
                    </div>
                    <div className="col-span-3">
                      <Input
                        value={inputValues[f.key]?.unit ?? f.unit}
                        onChange={(e) => updateInput(f.key, 'unit', e.target.value)}
                        placeholder="unit"
                        className="text-sm text-muted-foreground"
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : selectedCalcType ? (
              <p className="text-sm text-muted-foreground">
                No input schema available for this calculator version. The calculation engine will use defaults.
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">Select a calculation type to see available inputs.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Options</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional notes for this calculation run…"
                rows={2}
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="include-steps"
                checked={includeSteps}
                onChange={(e) => setIncludeSteps(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300"
              />
              <Label htmlFor="include-steps" className="text-sm font-normal">Include intermediate calculation steps</Label>
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center gap-3">
          <Button type="submit" disabled={submitCalc.isPending} className="min-w-[160px]">
            {submitCalc.isPending ? (
              'Submitting…'
            ) : (
              <><Play className="mr-2 h-4 w-4" /> Run Calculation</>
            )}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
        </div>
      </form>
    </>
  );
}
