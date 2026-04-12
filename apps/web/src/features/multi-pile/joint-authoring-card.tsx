'use client';

import {
  MULTI_PILE_UNASSIGNED_PILE_TYPE_ID,
  type MultiPileEnvelopeRunSummary,
  type MultiPilePileTypeDefinition,
  type MultiPileState,
} from '@eng/shared';
import { Plus, Trash2 } from 'lucide-react';
import { Badge, type BadgeProps } from '@/components/ui/badge';
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
  deriveJointEnvelopeExtremes,
  deriveMultiPileEnvelopeSnapshotStatus,
  evaluatePileTypeRangeMatch,
  findSuggestedPileTypeForEnvelopeExtremes,
  formatNumber,
  normalizeJointDefinition,
  pileTypeSelectLabel,
  renameJointIdAcrossState,
  type MultiPileDraftUpdater,
  type MultiPileEnvelopeSnapshotState,
  type MultiPileJointEnvelopeExtremes,
  type MultiPilePileTypeRangeMatchStatus,
} from './utils';

interface JointAuthoringCardProps {
  draft: MultiPileState;
  latestRun: MultiPileEnvelopeRunSummary | null | undefined;
  updateDraft: MultiPileDraftUpdater;
  addJoint: () => void;
  removeJoint: (jointId: string) => void;
}

interface JointPreview {
  extremes: MultiPileJointEnvelopeExtremes | null;
  suggestedPileType: MultiPilePileTypeDefinition | null;
  effectivePileTypeId: string;
  rangeMatchStatus: MultiPilePileTypeRangeMatchStatus;
}

export function JointAuthoringCard({
  draft,
  latestRun,
  updateDraft,
  addJoint,
  removeJoint,
}: JointAuthoringCardProps) {
  const envelopeStatus = deriveMultiPileEnvelopeSnapshotStatus(draft, latestRun);
  const pileTypeById = new Map(draft.pileTypes.map((pileType) => [pileType.id, pileType]));
  const jointPreviews = new Map<string, JointPreview>(
    draft.joints.map((joint) => {
      const extremes = deriveJointEnvelopeExtremes(latestRun, joint.id);
      const suggestedPileType = findSuggestedPileTypeForEnvelopeExtremes(draft.pileTypes, extremes);
      const effectivePileTypeId =
        joint.assignmentMode === 'auto'
        && envelopeStatus.state === 'ready'
        && suggestedPileType
          ? suggestedPileType.id
          : joint.pileTypeId;
      const effectivePileType = pileTypeById.get(effectivePileTypeId) ?? null;

      return [
        joint.id,
        {
          extremes,
          suggestedPileType,
          effectivePileTypeId,
          rangeMatchStatus: evaluatePileTypeRangeMatch(
            effectivePileType,
            extremes,
            envelopeStatus.state,
          ),
        },
      ] as const;
    }),
  );
  const eligibleAutoJointIds = draft.joints
    .filter(
      (joint) =>
        joint.active
        && envelopeStatus.state === 'ready'
        && Boolean(jointPreviews.get(joint.id)?.suggestedPileType),
    )
    .map((joint) => joint.id);
  const manualOverrideCount = draft.joints.filter((joint) => joint.assignmentMode === 'manual').length;

  function updateJoints(
    updater: (joints: MultiPileState['joints']) => MultiPileState['joints'],
  ) {
    updateDraft((current) => {
      const nextRawJoints = updater(current.joints);
      const seenIds = new Set<string>();
      const renamePairs: Array<{ oldId: string; newId: string }> = [];
      const pileTypeIds = current.pileTypes.map((pileType) => pileType.id);
      const defaultPileTypeId = current.pileTypes[0]?.id ?? 'BP1';
      const joints = nextRawJoints.map((row, index) => {
        const previousId = current.joints[index]?.id ?? row.id ?? `J${index + 1}`;
        const normalized = normalizeJointDefinition(row, {
          fallbackId: index === 0 ? 'J1' : `J${index + 1}`,
          order: index,
          defaultPileTypeId,
          pileTypeIds,
        });
        let candidateId = normalized.id;
        let suffix = 2;
        while (seenIds.has(candidateId)) {
          candidateId = `${normalized.id}_${suffix++}`;
        }
        seenIds.add(candidateId);
        const nextRow = candidateId === normalized.id ? normalized : { ...normalized, id: candidateId };
        if (previousId && previousId !== nextRow.id) {
          renamePairs.push({ oldId: previousId, newId: nextRow.id });
        }
        return nextRow;
      });

      let nextState: MultiPileState = {
        ...current,
        joints,
      };

      renamePairs.forEach(({ oldId, newId }) => {
        nextState = renameJointIdAcrossState(nextState, oldId, newId);
      });

      return {
        ...nextState,
        joints,
      };
    });
  }

  function updateJointAt(
    index: number,
    updater: (joint: MultiPileState['joints'][number]) => MultiPileState['joints'][number],
  ) {
    updateJoints((currentJoints) =>
      currentJoints.map((row, rowIndex) => (rowIndex === index ? updater(row) : row)),
    );
  }

  function resetJointToAuto(index: number, jointId: string) {
    const suggestedPileTypeId = jointPreviews.get(jointId)?.suggestedPileType?.id ?? null;
    updateJointAt(index, (joint) => ({
      ...joint,
      assignmentMode: 'auto',
      pileTypeId: suggestedPileTypeId ?? joint.pileTypeId,
    }));
  }

  function autoAssignEligibleActiveJoints() {
    const eligibleJointIdSet = new Set(eligibleAutoJointIds);
    updateJoints((currentJoints) =>
      currentJoints.map((joint) => {
        if (!eligibleJointIdSet.has(joint.id)) {
          return joint;
        }

        const suggestedPileTypeId = jointPreviews.get(joint.id)?.suggestedPileType?.id;
        if (!suggestedPileTypeId) {
          return joint;
        }

        return {
          ...joint,
          assignmentMode: 'auto',
          pileTypeId: suggestedPileTypeId,
        };
      }),
    );
  }

  function resetManualOverridesToAuto() {
    updateJoints((currentJoints) =>
      currentJoints.map((joint) => {
        if (joint.assignmentMode !== 'manual') {
          return joint;
        }

        const suggestedPileTypeId = jointPreviews.get(joint.id)?.suggestedPileType?.id;
        return {
          ...joint,
          assignmentMode: 'auto',
          pileTypeId: suggestedPileTypeId ?? joint.pileTypeId,
        };
      }),
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
        <div className="space-y-1">
          <CardTitle className="text-base">Joints</CardTitle>
          <CardDescription>
            Envelope-derived compression and uplift values are shown here as a pile-type assignment
            aid only. They do not replace full GEO or STRUCT verification.
          </CardDescription>
          <div className="flex flex-wrap gap-2">
            <Badge variant={envelopeStateVariant(envelopeStatus.state)}>
              {envelopeStateLabel(envelopeStatus.state)}
            </Badge>
            <Badge variant="outline">{envelopeStatus.detail}</Badge>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={autoAssignEligibleActiveJoints}
            disabled={envelopeStatus.state !== 'ready' || eligibleAutoJointIds.length === 0}
          >
            Auto-assign eligible active joints
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={resetManualOverridesToAuto}
            disabled={manualOverrideCount === 0}
          >
            Reset manual overrides to auto
          </Button>
          <Button variant="outline" size="sm" onClick={addJoint}>
            <Plus className="mr-2 h-4 w-4" />
            Add Joint
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table className="min-w-[1900px]">
            <TableHeader>
              <TableRow>
                <TableHead>Joint ID</TableHead>
                <TableHead>Label</TableHead>
                <TableHead>X</TableHead>
                <TableHead>Y</TableHead>
                <TableHead>Z</TableHead>
                <TableHead className="w-28">Supports</TableHead>
                <TableHead className="w-36">Max compression (kN)</TableHead>
                <TableHead className="w-40">Max tension / uplift (kN)</TableHead>
                <TableHead className="w-44">Suggested pile type</TableHead>
                <TableHead className="w-56">Pile Type</TableHead>
                <TableHead className="w-56">Status</TableHead>
                <TableHead>Active</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {draft.joints.map((joint, index) => {
                const preview = jointPreviews.get(joint.id);
                const effectivePileTypeId =
                  preview?.effectivePileTypeId || joint.pileTypeId || MULTI_PILE_UNASSIGNED_PILE_TYPE_ID;
                const effectivePileType = pileTypeById.get(effectivePileTypeId) ?? null;
                const suggestedPileTypeLabel = preview?.suggestedPileType
                  ? pileTypeSelectLabel(preview.suggestedPileType)
                  : suggestionFallbackLabel(preview?.extremes ?? null, envelopeStatus.state);

                return (
                  <TableRow key={joint.id}>
                    <TableCell>
                      <Input
                        className="font-mono text-xs"
                        value={joint.id}
                        onChange={(event) =>
                          updateJointAt(index, (row) => ({ ...row, id: event.target.value }))
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={joint.jointDisplayName ?? joint.displayName ?? ''}
                        onChange={(event) =>
                          updateJointAt(index, (row) => ({
                            ...row,
                            displayName: event.target.value,
                            jointDisplayName: event.target.value,
                          }))
                        }
                        placeholder={joint.id}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        step="any"
                        value={joint.x}
                        onChange={(event) =>
                          updateJointAt(index, (row) => ({
                            ...row,
                            x: Number(event.target.value || 0),
                          }))
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        step="any"
                        value={joint.y}
                        onChange={(event) =>
                          updateJointAt(index, (row) => ({
                            ...row,
                            y: Number(event.target.value || 0),
                          }))
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        step="any"
                        value={joint.z}
                        onChange={(event) =>
                          updateJointAt(index, (row) => ({
                            ...row,
                            z: Number(event.target.value || 0),
                          }))
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        step="1"
                        min="1"
                        value={joint.supportCount}
                        onChange={(event) =>
                          updateJointAt(index, (row) => {
                            const supportCount = Math.max(1, Math.round(Number(event.target.value || 1)));
                            return {
                              ...row,
                              supportCount,
                              noOfSupports: supportCount,
                            };
                          })
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <div className="font-mono text-sm">
                        {preview?.extremes ? formatNumber(preview.extremes.maxCompression) : '-'}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {envelopeMetricNote(preview?.extremes ?? null, envelopeStatus.state)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-mono text-sm">
                        {preview?.extremes ? formatNumber(preview.extremes.maxTension) : '-'}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {envelopeMetricNote(preview?.extremes ?? null, envelopeStatus.state)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm font-medium">{suggestedPileTypeLabel}</div>
                      <div className="text-xs text-muted-foreground">
                        {preview?.suggestedPileType
                          ? suggestionDetail(envelopeStatus.state)
                          : suggestionFallbackDetail(preview?.extremes ?? null, envelopeStatus.state)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={effectivePileTypeId || MULTI_PILE_UNASSIGNED_PILE_TYPE_ID}
                        onValueChange={(value) =>
                          updateJointAt(index, (row) => ({
                            ...row,
                            pileTypeId: value,
                            assignmentMode: 'manual',
                          }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={MULTI_PILE_UNASSIGNED_PILE_TYPE_ID}>
                            {MULTI_PILE_UNASSIGNED_PILE_TYPE_ID} — Needs assignment
                          </SelectItem>
                          {draft.pileTypes.map((pileType) => (
                            <SelectItem key={pileType.id} value={pileType.id}>
                              {pileTypeSelectLabel(pileType)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <Badge variant={joint.assignmentMode === 'auto' ? 'success' : 'outline'}>
                          {joint.assignmentMode === 'auto' ? 'Auto-selected' : 'Manual override'}
                        </Badge>
                        {joint.assignmentMode === 'manual' ? (
                          <Button variant="ghost" size="sm" onClick={() => resetJointToAuto(index, joint.id)}>
                            Reset to auto
                          </Button>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            {preview?.suggestedPileType && envelopeStatus.state === 'ready'
                              ? `Using ${pileTypeSelectLabel(preview.suggestedPileType)}`
                              : 'Auto mode waits for a current suggestion'}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-2">
                        <Badge variant={rangeMatchVariant(preview?.rangeMatchStatus ?? 'no-envelope-data')}>
                          {rangeMatchLabel(preview?.rangeMatchStatus ?? 'no-envelope-data')}
                        </Badge>
                        {effectivePileType ? (
                          <Badge variant="outline">{pileTypeSelectLabel(effectivePileType)}</Badge>
                        ) : null}
                      </div>
                      <div className="mt-2 text-xs text-muted-foreground">
                        {rangeMatchDetail(preview?.rangeMatchStatus ?? 'no-envelope-data')}
                      </div>
                    </TableCell>
                    <TableCell>
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border border-input"
                        checked={joint.active}
                        onChange={(event) =>
                          updateJointAt(index, (row) => ({ ...row, active: event.target.checked }))
                        }
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        disabled={draft.joints.length <= 1}
                        onClick={() => removeJoint(joint.id)}
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
  );
}

function envelopeStateLabel(state: MultiPileEnvelopeSnapshotState) {
  if (state === 'ready') return 'Envelope ready';
  if (state === 'stale') return 'Envelope stale';
  if (state === 'failed') return 'Envelope unavailable';
  return 'Envelope not run';
}

function envelopeStateVariant(state: MultiPileEnvelopeSnapshotState): BadgeProps['variant'] {
  if (state === 'ready') return 'success';
  if (state === 'stale') return 'warning';
  if (state === 'failed') return 'destructive';
  return 'outline';
}

function envelopeMetricNote(
  extremes: MultiPileJointEnvelopeExtremes | null,
  state: MultiPileEnvelopeSnapshotState,
) {
  if (!extremes) {
    return state === 'stale' ? 'Stale or missing snapshot' : 'No envelope data';
  }
  return state === 'stale' ? 'From stale envelope snapshot' : 'From stored envelope snapshot';
}

function suggestionFallbackLabel(
  extremes: MultiPileJointEnvelopeExtremes | null,
  state: MultiPileEnvelopeSnapshotState,
) {
  if (!extremes) {
    return state === 'stale' ? 'Stale envelope data' : 'No envelope data';
  }
  return 'No matching type';
}

function suggestionDetail(state: MultiPileEnvelopeSnapshotState) {
  return state === 'stale'
    ? 'Suggested from a stale axial envelope snapshot.'
    : 'Suggested from axial envelope range.';
}

function suggestionFallbackDetail(
  extremes: MultiPileJointEnvelopeExtremes | null,
  state: MultiPileEnvelopeSnapshotState,
) {
  if (!extremes) {
    return state === 'stale'
      ? 'Run the envelope again before trusting the suggestion.'
      : 'Run the envelope to populate a current suggestion.';
  }
  return 'No active pile type range matches both compression and uplift.';
}

function rangeMatchLabel(status: MultiPilePileTypeRangeMatchStatus) {
  if (status === 'match') return 'Match';
  if (status === 'outside-range') return 'Outside range';
  if (status === 'no-range-data') return 'No range data';
  if (status === 'stale-envelope') return 'Envelope stale';
  if (status === 'missing-type') return 'Missing type';
  return 'No envelope data';
}

function rangeMatchDetail(status: MultiPilePileTypeRangeMatchStatus) {
  if (status === 'match') {
    return 'Current assigned pile type sits inside the authored axial range.';
  }
  if (status === 'outside-range') {
    return 'Current assigned pile type sits outside the authored pile-type range.';
  }
  if (status === 'no-range-data') {
    return 'Current assigned pile type is missing enough authored range data to auto-match.';
  }
  if (status === 'stale-envelope') {
    return 'Envelope demands are from a stale snapshot, so the range check is advisory only.';
  }
  if (status === 'missing-type') {
    return 'The currently assigned pile type no longer exists in this workspace.';
  }
  return 'Run the envelope to compare assigned pile types against the stored axial extremes.';
}

function rangeMatchVariant(status: MultiPilePileTypeRangeMatchStatus): BadgeProps['variant'] {
  if (status === 'match') return 'success';
  if (status === 'outside-range' || status === 'missing-type') return 'destructive';
  if (status === 'stale-envelope') return 'warning';
  return 'outline';
}
