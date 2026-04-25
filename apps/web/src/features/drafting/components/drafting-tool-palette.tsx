import * as React from 'react';
import type { DraftingModel } from '@eng/shared';
import {
  Anchor,
  Circle,
  Crosshair,
  Dot,
  Grip,
  Landmark,
  LocateFixed,
  MousePointer2,
  Move,
  PencilLine,
  Ruler,
  ScanLine,
  SplitSquareHorizontal,
  Tags,
  Waypoints,
  Workflow,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { formatDraftingTimestamp } from '../model-utils';
import type {
  DraftingPileSourceRecord,
  DraftingPileTypeSourceRecord,
  DraftingSpatialSourceRecord,
} from '../source-binding-utils';
import {
  formatPileInstanceSourceSummary,
  formatPileTypeSourceSummary,
  getPileTypeCompleteness,
} from '../source-binding-utils';
import type { DraftingTool } from '../tools/drafting-tool-types';

export type DraftingPileSourceMode = 'linked_pile' | 'pile_type' | 'manual_sketch';

const TOOL_GROUPS: Array<{
  title: string;
  tools: Array<{
    tool: DraftingTool;
    label: string;
    shortLabel: string;
    hint?: string;
    icon: React.ComponentType<{ className?: string }>;
  }>;
}> = [
  {
    title: 'Navigate',
    tools: [
      {
        tool: 'select',
        label: 'Select / Move',
        shortLabel: 'Select',
        hint: 'V',
        icon: MousePointer2,
      },
      { tool: 'pan', label: 'Pan', shortLabel: 'Pan', hint: 'Space', icon: Move },
    ],
  },
  {
    title: 'Shoring',
    tools: [
      { tool: 'pile', label: 'Pile', shortLabel: 'Pile', icon: Circle },
      { tool: 'secant_pile_wall', label: 'Secant pile wall', shortLabel: 'Secant', icon: Workflow },
      { tool: 'soldier_pile_wall', label: 'Soldier pile wall', shortLabel: 'Soldier', icon: Grip },
      { tool: 'anchor_tieback', label: 'Anchor / tieback', shortLabel: 'Anchor', icon: Anchor },
      {
        tool: 'capping_beam',
        label: 'Capping beam',
        shortLabel: 'Cap',
        icon: SplitSquareHorizontal,
      },
      { tool: 'waler', label: 'Waler', shortLabel: 'Waler', icon: ScanLine },
      { tool: 'excavation_line', label: 'Excavation line', shortLabel: 'Excav', icon: PencilLine },
    ],
  },
  {
    title: 'Survey / Monitoring',
    tools: [
      { tool: 'monitoring_point', label: 'Monitoring point', shortLabel: 'Mon', icon: LocateFixed },
      { tool: 'borehole', label: 'Borehole', shortLabel: 'BH', icon: Crosshair },
    ],
  },
  {
    title: 'Services',
    tools: [
      { tool: 'service_run', label: 'Service run', shortLabel: 'Run', icon: Waypoints },
      { tool: 'service_crossing', label: 'Service crossing', shortLabel: 'Xing', icon: Dot },
    ],
  },
  {
    title: 'Annotation',
    tools: [
      { tool: 'dimension_chain', label: 'Dimension chain', shortLabel: 'Dim', icon: Ruler },
      { tool: 'callout', label: 'Callout', shortLabel: 'Callout', icon: Tags },
      { tool: 'section_marker', label: 'Section marker', shortLabel: 'Sect', icon: Landmark },
      { tool: 'leader_note', label: 'Leader note', shortLabel: 'Note', icon: PencilLine },
    ],
  },
];

const NAVIGATE_GROUP = TOOL_GROUPS[0];
const AUTHORING_GROUPS = TOOL_GROUPS.slice(1);

export function DraftingToolPalette({
  activeTool,
  drawingUpdatedAt,
  model,
  onCancelLine,
  onFinishLine,
  onPlacePileSource,
  onPlaceSpatialSource,
  onPileSourceModeChange,
  onSelectPileTypeSource,
  onToolChange,
  pendingLinePointsCount,
  placedSourceIds = [],
  pileSourceManageHref,
  pileSourceMode = 'manual_sketch',
  pileSources = [],
  pileTypeSources = [],
  selectedPileTypeSourceId = null,
  spatialSources = [],
  sourceLoading = false,
}: {
  activeTool: DraftingTool;
  drawingUpdatedAt: string;
  model: DraftingModel;
  onCancelLine: () => void;
  onFinishLine: () => void;
  onPlacePileSource?: (source: DraftingPileSourceRecord) => void;
  onPlaceSpatialSource?: (source: DraftingSpatialSourceRecord) => void;
  onPileSourceModeChange?: (mode: DraftingPileSourceMode) => void;
  onSelectPileTypeSource?: (source: DraftingPileTypeSourceRecord | null) => void;
  onToolChange: (tool: DraftingTool) => void;
  pendingLinePointsCount: number;
  placedSourceIds?: string[];
  pileSourceManageHref?: string;
  pileSourceMode?: DraftingPileSourceMode;
  pileSources?: DraftingPileSourceRecord[];
  pileTypeSources?: DraftingPileTypeSourceRecord[];
  selectedPileTypeSourceId?: string | null;
  spatialSources?: DraftingSpatialSourceRecord[];
  sourceLoading?: boolean;
}) {
  const sourcePanel = getSourcePanel(activeTool, pileSources, spatialSources);

  return (
    <div
      className="rounded-md border bg-background px-2 py-2 shadow-sm"
      data-testid="drafting-compact-tool-toolbar"
    >
      <div
        className="flex min-h-9 flex-wrap items-center gap-2 border-b pb-1"
        data-testid="drafting-toolbar-view-row"
      >
        <div className="shrink-0 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Navigate
        </div>
        {NAVIGATE_GROUP?.tools.map((entry) => (
          <ToolButton
            key={entry.tool}
            active={activeTool === entry.tool}
            hint={entry.hint}
            icon={entry.icon}
            label={entry.label}
            onClick={() => onToolChange(entry.tool)}
          >
            {entry.shortLabel}
          </ToolButton>
        ))}
        <div className="ml-auto flex shrink-0 flex-wrap items-center justify-end gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span>{model.objects.length} objects</span>
          <span>Active {getToolShortLabel(activeTool)}</span>
          <span title={`Last saved ${formatDraftingTimestamp(drawingUpdatedAt)}`}>
            Saved {formatDraftingTimestamp(drawingUpdatedAt)}
          </span>
        </div>
      </div>

      <div
        className="grid gap-1.5 pt-1.5 lg:grid-cols-[minmax(21rem,2fr)_minmax(7.5rem,0.7fr)_minmax(7.5rem,0.7fr)_minmax(11rem,1fr)]"
        data-testid="drafting-toolbar-authoring-row"
      >
        {AUTHORING_GROUPS.map((group) => (
          <section
            aria-label={`${group.title} tools`}
            className="rounded-md border bg-muted/20 p-1"
            data-testid="drafting-tool-group-block"
            key={group.title}
          >
            <div className="mb-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              {group.title}
            </div>
            <div
              className={cn('grid gap-0.5', getAuthoringGroupGridClass(group.title))}
              data-testid="drafting-tool-group-grid"
            >
              {group.tools.map((entry) => (
                <ToolButton
                  key={entry.tool}
                  active={activeTool === entry.tool}
                  hint={entry.hint}
                  icon={entry.icon}
                  label={entry.label}
                  onClick={() => onToolChange(entry.tool)}
                  tile
                >
                  {entry.shortLabel}
                </ToolButton>
              ))}
            </div>
          </section>
        ))}
      </div>

      {sourcePanel ? (
        <SourceChoicePanel
          activeTool={activeTool}
          onPlacePileSource={onPlacePileSource}
          onPlaceSpatialSource={onPlaceSpatialSource}
          onPileSourceModeChange={onPileSourceModeChange}
          onSelectPileTypeSource={onSelectPileTypeSource}
          onToolChange={onToolChange}
          placedSourceIds={placedSourceIds}
          pileSourceManageHref={pileSourceManageHref}
          pileSourceMode={pileSourceMode}
          pileSources={sourcePanel.pileSources}
          pileTypeSources={pileTypeSources}
          selectedPileTypeSourceId={selectedPileTypeSourceId}
          spatialSources={sourcePanel.spatialSources}
          sourceLoading={sourceLoading}
          title={sourcePanel.title}
        />
      ) : null}

      {activeTool === 'excavation_line' ? (
        <div className="mt-2 flex flex-wrap items-center gap-2 border-t pt-2 text-xs text-muted-foreground">
          <span>
            {pendingLinePointsCount === 0
              ? 'Click in the canvas to start the excavation polyline.'
              : `${pendingLinePointsCount} point(s) captured for the current line.`}
          </span>
          <div className="ml-auto flex gap-2">
            <Button
              className="h-8"
              onClick={onFinishLine}
              disabled={pendingLinePointsCount < 2}
              size="sm"
            >
              Finish
            </Button>
            <Button
              className="h-8"
              variant="outline"
              onClick={onCancelLine}
              disabled={pendingLinePointsCount === 0}
              size="sm"
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function SourceChoicePanel({
  activeTool,
  onPlacePileSource,
  onPlaceSpatialSource,
  onPileSourceModeChange,
  onSelectPileTypeSource,
  onToolChange,
  placedSourceIds,
  pileSourceManageHref,
  pileSourceMode,
  pileSources,
  pileTypeSources,
  selectedPileTypeSourceId,
  spatialSources,
  sourceLoading,
  title,
}: {
  activeTool: DraftingTool;
  onPlacePileSource?: (source: DraftingPileSourceRecord) => void;
  onPlaceSpatialSource?: (source: DraftingSpatialSourceRecord) => void;
  onPileSourceModeChange?: (mode: DraftingPileSourceMode) => void;
  onSelectPileTypeSource?: (source: DraftingPileTypeSourceRecord | null) => void;
  onToolChange: (tool: DraftingTool) => void;
  placedSourceIds: string[];
  pileSourceManageHref?: string;
  pileSourceMode: DraftingPileSourceMode;
  pileSources: DraftingPileSourceRecord[];
  pileTypeSources: DraftingPileTypeSourceRecord[];
  selectedPileTypeSourceId: string | null;
  spatialSources: DraftingSpatialSourceRecord[];
  sourceLoading: boolean;
  title: string;
}) {
  const hasSources =
    activeTool === 'pile'
      ? pileSources.length > 0 || pileTypeSources.length > 0
      : spatialSources.length > 0;
  const hasPileInstances = pileSources.length > 0;
  const hasPileTypes = pileTypeSources.length > 0;

  return (
    <div
      className="mt-2 grid gap-2 rounded-md border bg-muted/15 p-2 text-xs sm:grid-cols-[10rem_1fr]"
      data-testid="drafting-source-choice-panel"
    >
      <div className="space-y-1">
        <div className="font-semibold text-foreground">{title}</div>
        <div className="flex flex-wrap gap-1.5">
          {activeTool === 'pile' ? (
            <>
              <SourceModeButton
                active={pileSourceMode === 'linked_pile'}
                onClick={() => onPileSourceModeChange?.('linked_pile')}
              >
                Place existing pile
              </SourceModeButton>
              <SourceModeButton
                active={pileSourceMode === 'pile_type'}
                onClick={() => onPileSourceModeChange?.('pile_type')}
              >
                Place from pile type
              </SourceModeButton>
              <SourceModeButton
                active={pileSourceMode === 'manual_sketch'}
                onClick={() => {
                  onSelectPileTypeSource?.(null);
                  onPileSourceModeChange?.('manual_sketch');
                  onToolChange(activeTool);
                }}
              >
                Manual sketch pile
              </SourceModeButton>
            </>
          ) : (
            <>
              <SourceModeButton active onClick={() => onToolChange(activeTool)}>
                From project data
              </SourceModeButton>
              <SourceModeButton onClick={() => onToolChange(activeTool)}>
                Manual object
              </SourceModeButton>
            </>
          )}
        </div>
      </div>

      <div className="min-w-0">
        {sourceLoading ? (
          <p className="text-muted-foreground">Loading project data sources...</p>
        ) : activeTool === 'pile' ? (
          <PileSourceChoices
            hasPileInstances={hasPileInstances}
            hasPileTypes={hasPileTypes}
            onPlacePileSource={onPlacePileSource}
            onSelectPileTypeSource={onSelectPileTypeSource}
            pileSourceMode={pileSourceMode}
            pileSources={pileSources}
            pileSourceManageHref={pileSourceManageHref}
            pileTypeSources={pileTypeSources}
            placedSourceIds={placedSourceIds}
            selectedPileTypeSourceId={selectedPileTypeSourceId}
          />
        ) : hasSources ? (
          <div className="flex flex-wrap gap-1.5">
            {spatialSources.map((source) => {
              const alreadyPlaced = placedSourceIds.includes(source.sourceId);
              return (
                <Button
                  aria-label={`Place spatial feature ${source.sourceLabel}`}
                  className="h-7 max-w-64 truncate px-2 text-[11px]"
                  data-testid="drafting-source-spatial-option"
                  disabled={!onPlaceSpatialSource}
                  key={source.sourceId}
                  onClick={() => onPlaceSpatialSource?.(source)}
                  title={`${source.sourceLabel} · ${source.objectType.replaceAll('_', ' ')}${alreadyPlaced ? ' · already in model' : ''}`}
                  type="button"
                  variant={alreadyPlaced ? 'secondary' : 'outline'}
                >
                  {source.sourceLabel}
                  {alreadyPlaced ? ' · placed' : ''}
                </Button>
              );
            })}
          </div>
        ) : (
          <p className="text-muted-foreground">
            No matching project spatial records found. Place a manual object or add source records
            in Spatial first.
          </p>
        )}
      </div>
    </div>
  );
}

function SourceModeButton({
  active = false,
  children,
  onClick,
}: {
  active?: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <Button
      aria-pressed={active}
      className="h-7 px-2 text-[11px]"
      type="button"
      variant={active ? 'secondary' : 'outline'}
      onClick={onClick}
    >
      {children}
    </Button>
  );
}

function PileSourceChoices({
  hasPileInstances,
  hasPileTypes,
  onPlacePileSource,
  onSelectPileTypeSource,
  pileSourceMode,
  pileSources,
  pileSourceManageHref,
  pileTypeSources,
  placedSourceIds,
  selectedPileTypeSourceId,
}: {
  hasPileInstances: boolean;
  hasPileTypes: boolean;
  onPlacePileSource?: (source: DraftingPileSourceRecord) => void;
  onSelectPileTypeSource?: (source: DraftingPileTypeSourceRecord | null) => void;
  pileSourceMode: DraftingPileSourceMode;
  pileSources: DraftingPileSourceRecord[];
  pileSourceManageHref?: string;
  pileTypeSources: DraftingPileTypeSourceRecord[];
  placedSourceIds: string[];
  selectedPileTypeSourceId: string | null;
}) {
  if (!hasPileInstances && hasPileTypes) {
    return (
      <div className="space-y-2">
        <p className="text-muted-foreground">
          Pile types found, but no placed pile instances yet. Select a pile type and place it on the
          model, or create pile instances in Foundations.
        </p>
        {pileSourceMode === 'pile_type' ? (
          <PileTypeSourceList
            onSelectPileTypeSource={onSelectPileTypeSource}
            pileSourceManageHref={pileSourceManageHref}
            pileTypeSources={pileTypeSources}
            selectedPileTypeSourceId={selectedPileTypeSourceId}
          />
        ) : null}
      </div>
    );
  }

  if (!hasPileInstances && !hasPileTypes) {
    return (
      <p className="text-muted-foreground">
        No pile types or pile instances found. Create pile types in Foundations/Calculators, or
        place an unlinked sketch pile.
      </p>
    );
  }

  if (pileSourceMode === 'linked_pile') {
    return (
      <div className="flex flex-wrap gap-1.5">
        {pileSources.map((source) => {
          const alreadyPlaced = placedSourceIds.includes(source.sourceId);
          return (
            <Button
              aria-label={
                alreadyPlaced
                  ? `Select placed object ${source.sourceLabel}`
                  : `Place existing pile ${source.sourceLabel}`
              }
              className="h-7 max-w-56 truncate px-2 text-[11px]"
              data-testid="drafting-source-pile-option"
              disabled={!onPlacePileSource}
              key={source.sourceId}
              onClick={() => onPlacePileSource?.(source)}
              title={`${formatPileInstanceSourceSummary(source)}${alreadyPlaced ? ' · already in model' : ''}`}
              type="button"
              variant={alreadyPlaced ? 'secondary' : 'outline'}
            >
              {alreadyPlaced
                ? `Select placed object · ${source.sourceLabel}`
                : formatPileInstanceSourceSummary(source)}
            </Button>
          );
        })}
      </div>
    );
  }

  if (pileSourceMode === 'pile_type') {
    return (
      <PileTypeSourceList
        onSelectPileTypeSource={onSelectPileTypeSource}
        pileSourceManageHref={pileSourceManageHref}
        pileTypeSources={pileTypeSources}
        selectedPileTypeSourceId={selectedPileTypeSourceId}
      />
    );
  }

  return <p className="text-muted-foreground">Click the model to place an unlinked sketch pile.</p>;
}

function PileTypeSourceList({
  onSelectPileTypeSource,
  pileSourceManageHref,
  pileTypeSources,
  selectedPileTypeSourceId,
}: {
  onSelectPileTypeSource?: (source: DraftingPileTypeSourceRecord | null) => void;
  pileSourceManageHref?: string;
  pileTypeSources: DraftingPileTypeSourceRecord[];
  selectedPileTypeSourceId: string | null;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {pileTypeSources.map((source) => {
        const selected = selectedPileTypeSourceId === source.sourceId;
        const completeness = getPileTypeCompleteness(source.pileType);
        return (
          <div className="flex items-center gap-1" key={source.sourceId}>
            <Button
              aria-label={`Use pile type ${source.sourceLabel}`}
              aria-pressed={selected}
              className="h-7 max-w-80 truncate px-2 text-[11px]"
              data-testid="drafting-source-pile-type-option"
              disabled={!onSelectPileTypeSource}
              onClick={() => onSelectPileTypeSource?.(source)}
              title={formatPileTypeSourceSummary(source)}
              type="button"
              variant={selected ? 'secondary' : 'outline'}
            >
              {formatPileTypeSourceSummary(source)}
            </Button>
            <span
              className={cn(
                'rounded-full border px-1.5 py-0.5 text-[10px] font-medium',
                completeness.status === 'complete'
                  ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                  : 'border-amber-300 bg-amber-50 text-amber-700',
              )}
            >
              {completeness.status === 'complete' ? 'Complete' : 'Incomplete'}
            </span>
          </div>
        );
      })}
      {pileSourceManageHref ? (
        <a
          className="h-7 rounded-md border px-2 py-1 text-[11px] font-medium hover:bg-accent"
          href={pileSourceManageHref}
        >
          Manage project pile types
        </a>
      ) : null}
      {selectedPileTypeSourceId ? (
        <span className="self-center text-[11px] text-muted-foreground">
          Click canvas to place selected pile type.
        </span>
      ) : null}
    </div>
  );
}

function ToolButton({
  active,
  children,
  hint,
  icon: Icon,
  label,
  onClick,
  tile = false,
}: {
  active: boolean;
  children: React.ReactNode;
  hint?: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
  tile?: boolean;
}) {
  return (
    <Button
      aria-label={label}
      aria-pressed={active}
      className={cn(
        'shrink-0 gap-1.5',
        tile ? 'h-7 min-w-0 justify-center px-1 text-[11px]' : 'h-8 px-2 text-xs',
      )}
      title={hint ? `${label} (${hint})` : label}
      variant={active ? 'default' : 'outline'}
      onClick={onClick}
    >
      <Icon className={cn('shrink-0', tile ? 'h-3 w-3' : 'h-3.5 w-3.5')} />
      <span>{children}</span>
      {hint ? <span className="text-[10px] opacity-70">{hint}</span> : null}
    </Button>
  );
}

function getAuthoringGroupGridClass(title: string) {
  if (title === 'Shoring') {
    return 'grid-cols-4';
  }

  return 'grid-cols-2';
}

function getToolShortLabel(tool: DraftingTool) {
  return (
    TOOL_GROUPS.flatMap((group) => group.tools).find((entry) => entry.tool === tool)?.shortLabel ??
    tool
  );
}

function getSourcePanel(
  activeTool: DraftingTool,
  pileSources: DraftingPileSourceRecord[],
  spatialSources: DraftingSpatialSourceRecord[],
) {
  if (activeTool === 'pile') {
    return {
      title: 'Pile source',
      pileSources,
      spatialSources: [] as DraftingSpatialSourceRecord[],
    };
  }

  if (activeTool === 'borehole') {
    return {
      title: 'Borehole source',
      pileSources: [] as DraftingPileSourceRecord[],
      spatialSources: spatialSources.filter((source) => source.objectType === 'borehole'),
    };
  }

  if (
    activeTool === 'monitoring_point' ||
    activeTool === 'service_run' ||
    activeTool === 'service_crossing'
  ) {
    return {
      title: 'Place from Spatial',
      pileSources: [] as DraftingPileSourceRecord[],
      spatialSources: spatialSources.filter((source) => source.objectType === activeTool),
    };
  }

  return null;
}
