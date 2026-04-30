import * as React from 'react';
import type { DraftingModel } from '@eng/shared';
import {
  Anchor,
  Circle,
  Crosshair,
  Dot,
  Grip,
  Grid3X3,
  Landmark,
  LineChart,
  LocateFixed,
  MousePointer2,
  Move,
  PencilLine,
  Pentagon,
  Radius,
  RectangleHorizontal,
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
      { tool: 'shaft', label: 'Shaft', shortLabel: 'Shaft', icon: Radius },
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
    title: 'Geometry',
    tools: [
      { tool: 'draft_line', label: 'Line', shortLabel: 'Line', icon: LineChart },
      { tool: 'draft_polyline', label: 'Polyline', shortLabel: 'Pline', icon: Waypoints },
      {
        tool: 'draft_rectangle',
        label: 'Rectangle',
        shortLabel: 'Rect',
        icon: RectangleHorizontal,
      },
      { tool: 'draft_circle', label: 'Circle', shortLabel: 'Circle', icon: Radius },
      { tool: 'draft_polygon', label: 'Polygon', shortLabel: 'Poly', icon: Pentagon },
      { tool: 'structural_joint', label: 'Joint / node', shortLabel: 'Joint', icon: Crosshair },
    ],
  },
  {
    title: 'Reference',
    tools: [
      {
        tool: 'project_grid_line',
        label: 'Project grid line',
        shortLabel: 'Grid Line',
        icon: Grid3X3,
      },
      {
        tool: 'project_grid',
        label: 'Grid set estimate',
        shortLabel: 'Grid Set',
        icon: Grid3X3,
      },
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
  onAddProjectGrid,
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
  onAddProjectGrid?: () => void;
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
        <div className="shrink-0">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Navigate
          </div>
          <div className="text-[11px] text-muted-foreground">Select, pan, then author.</div>
        </div>
        {NAVIGATE_GROUP?.tools.map((entry) => (
          <ToolButton
            key={entry.tool}
            active={activeTool === entry.tool}
            hint={entry.hint}
            icon={entry.icon}
            label={entry.label}
            onClick={() => onToolChange(entry.tool)}
            tool={entry.tool}
          >
            {entry.shortLabel}
          </ToolButton>
        ))}
        <div className="ml-auto flex shrink-0 flex-wrap items-center justify-end gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span
            className="rounded-sm border bg-muted/25 px-2 py-0.5 text-[11px] font-medium text-foreground"
            data-testid="drafting-tool-palette-mode"
          >
            Manual + source-aware tools
          </span>
          <span>{model.objects.length} objects</span>
          <span>Active {getDraftingToolShortLabel(activeTool)}</span>
          <span title={`Last saved ${formatDraftingTimestamp(drawingUpdatedAt)}`}>
            Saved {formatDraftingTimestamp(drawingUpdatedAt)}
          </span>
        </div>
      </div>

      <div
        className="grid gap-1.5 pt-1.5 lg:grid-cols-[minmax(21rem,2fr)_minmax(7.5rem,0.7fr)_minmax(7.5rem,0.7fr)_minmax(13rem,1fr)_minmax(11rem,1fr)]"
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
                  tool={entry.tool}
                  tile
                >
                  {entry.shortLabel}
                </ToolButton>
              ))}
            </div>
          </section>
        ))}
      </div>

      {activeTool === 'select' || activeTool === 'pan' ? (
        <div
          className="mt-2 rounded-md border bg-muted/15 px-3 py-2 text-xs text-muted-foreground"
          data-testid="drafting-tool-source-readiness-note"
        >
          <span className="font-medium text-foreground">Drafting tools ready.</span> Select a tool
          to place drafting objects. Source-linked tools preserve project provenance where
          available.
        </div>
      ) : sourcePanel ? (
        <SourceChoicePanel
          activeTool={activeTool}
          onPlacePileSource={onPlacePileSource}
          onPlaceSpatialSource={onPlaceSpatialSource}
          onPileSourceModeChange={onPileSourceModeChange}
          onSelectPileTypeSource={onSelectPileTypeSource}
          onToolChange={onToolChange}
          model={model}
          placedSourceIds={placedSourceIds}
          pileSourceManageHref={pileSourceManageHref}
          pileSourceMode={pileSourceMode}
          pileSources={sourcePanel.pileSources}
          pileTypeSources={pileTypeSources}
          selectedPileTypeSourceId={selectedPileTypeSourceId}
          sourceManagerSpatialSources={spatialSources}
          spatialSources={sourcePanel.spatialSources}
          sourceLoading={sourceLoading}
          title={sourcePanel.title}
        />
      ) : activeTool === 'project_grid' || activeTool === 'project_grid_line' ? (
        <ProjectGridChoicePanel onAddProjectGrid={onAddProjectGrid} />
      ) : null}

      {isPathAuthoringTool(activeTool) ? (
        <div className="mt-2 flex flex-wrap items-center gap-2 border-t pt-2 text-xs text-muted-foreground">
          <span>
            {pendingLinePointsCount === 0
              ? getAuthoringHint(activeTool)
              : `${pendingLinePointsCount} point(s) captured for the current path.`}
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
  model,
  placedSourceIds,
  pileSourceManageHref,
  pileSourceMode,
  pileSources,
  pileTypeSources,
  selectedPileTypeSourceId,
  sourceManagerSpatialSources,
  spatialSources,
  sourceLoading,
  title,
}: {
  activeTool: DraftingTool;
  model: DraftingModel;
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
  sourceManagerSpatialSources: DraftingSpatialSourceRecord[];
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
  const [sourceManagerOpen, setSourceManagerOpen] = React.useState(false);
  const sourceUsageCounts = React.useMemo(() => buildSourceUsageCounts(model), [model]);

  return (
    <div
      className="mt-2 grid gap-2 rounded-md border bg-muted/15 p-2 text-xs lg:grid-cols-[12rem_1fr]"
      data-testid="drafting-source-choice-panel"
    >
      <div className="space-y-1">
        <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          Active Tool Source Picker
        </div>
        <div className="font-semibold text-foreground">{title}</div>
        <div className="flex flex-wrap gap-1.5">
          {activeTool === 'pile' ? (
            <>
              <SourceModeButton
                active={pileSourceMode === 'linked_pile'}
                onClick={() => onPileSourceModeChange?.('linked_pile')}
              >
                Existing placed pile
              </SourceModeButton>
              <SourceModeButton
                active={pileSourceMode === 'pile_type'}
                onClick={() => onPileSourceModeChange?.('pile_type')}
              >
                Pile type library
              </SourceModeButton>
              <SourceModeButton
                active={pileSourceMode === 'manual_sketch'}
                onClick={() => {
                  onSelectPileTypeSource?.(null);
                  onPileSourceModeChange?.('manual_sketch');
                  onToolChange(activeTool);
                }}
              >
                Sketch pile (unlinked)
              </SourceModeButton>
            </>
          ) : (
            <>
              <SourceModeButton active onClick={() => onToolChange(activeTool)}>
                {getLinkedSourceModeLabel(activeTool)}
              </SourceModeButton>
              <SourceModeButton onClick={() => onToolChange(activeTool)}>
                {getSketchSourceModeLabel(activeTool)}
              </SourceModeButton>
            </>
          )}
        </div>
      </div>

      <div className="min-w-0 space-y-2">
        {sourceLoading ? (
          <p className="text-muted-foreground">Loading project data sources...</p>
        ) : activeTool === 'pile' ? (
          <PileSourceChoices
            hasPileInstances={hasPileInstances}
            hasPileTypes={hasPileTypes}
            onPlacePileSource={onPlacePileSource}
            onSelectPileTypeSource={onSelectPileTypeSource}
            onPileSourceModeChange={onPileSourceModeChange}
            pileSourceMode={pileSourceMode}
            pileSources={pileSources}
            pileSourceManageHref={pileSourceManageHref}
            pileTypeSources={pileTypeSources}
            placedSourceIds={placedSourceIds}
            selectedPileTypeSourceId={selectedPileTypeSourceId}
            sourceUsageCounts={sourceUsageCounts}
          />
        ) : hasSources ? (
          <SpatialSourceChoices
            activeTool={activeTool}
            onPlaceSpatialSource={onPlaceSpatialSource}
            sourceUsageCounts={sourceUsageCounts}
            spatialSources={spatialSources}
          />
        ) : (
          <SpatialSourceEmpty activeTool={activeTool} />
        )}
        <div className="border-t pt-2">
          <Button
            aria-expanded={sourceManagerOpen}
            className="h-7 px-2 text-[11px]"
            onClick={() => setSourceManagerOpen((open) => !open)}
            type="button"
            variant="ghost"
          >
            {sourceManagerOpen ? 'Hide Project Sources overview' : 'Show Project Sources overview'}
          </Button>
          {sourceManagerOpen ? (
            <DraftingSourceManager
              activeTool={activeTool}
              model={model}
              onPlacePileSource={onPlacePileSource}
              onPlaceSpatialSource={onPlaceSpatialSource}
              onPileSourceModeChange={onPileSourceModeChange}
              onSelectPileTypeSource={onSelectPileTypeSource}
              pileSourceManageHref={pileSourceManageHref}
              pileSources={pileSources}
              pileTypeSources={pileTypeSources}
              placedSourceIds={placedSourceIds}
              selectedPileTypeSourceId={selectedPileTypeSourceId}
              spatialSources={sourceManagerSpatialSources}
            />
          ) : null}
        </div>
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

function DraftingSourceManager({
  activeTool,
  model,
  onPlacePileSource,
  onPlaceSpatialSource,
  onPileSourceModeChange,
  onSelectPileTypeSource,
  pileSourceManageHref,
  pileSources,
  pileTypeSources,
  placedSourceIds,
  selectedPileTypeSourceId,
  spatialSources,
}: {
  activeTool: DraftingTool;
  model: DraftingModel;
  onPlacePileSource?: (source: DraftingPileSourceRecord) => void;
  onPlaceSpatialSource?: (source: DraftingSpatialSourceRecord) => void;
  onPileSourceModeChange?: (mode: DraftingPileSourceMode) => void;
  onSelectPileTypeSource?: (source: DraftingPileTypeSourceRecord | null) => void;
  pileSourceManageHref?: string;
  pileSources: DraftingPileSourceRecord[];
  pileTypeSources: DraftingPileTypeSourceRecord[];
  placedSourceIds: string[];
  selectedPileTypeSourceId: string | null;
  spatialSources: DraftingSpatialSourceRecord[];
}) {
  const sourceUsageCounts = React.useMemo(() => buildSourceUsageCounts(model), [model]);
  const boreholes = spatialSources.filter((source) => source.objectType === 'borehole');
  const monitoringPoints = spatialSources.filter(
    (source) => source.objectType === 'monitoring_point',
  );
  const services = spatialSources.filter(
    (source) => source.objectType === 'service_run' || source.objectType === 'service_crossing',
  );

  return (
    <div className="rounded-md border bg-background p-2" data-testid="drafting-source-manager">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Project Sources overview
          </div>
          <p className="text-[11px] text-muted-foreground">
            Collapsed overview of all available source libraries; active tool choices stay above.
          </p>
        </div>
        {pileSourceManageHref ? (
          <a
            className="h-7 rounded-md border px-2 py-1 text-[11px] font-medium hover:bg-accent"
            href={pileSourceManageHref}
          >
            Manage project pile types
          </a>
        ) : null}
      </div>
      <div className="grid gap-2 xl:grid-cols-3">
        <SourceManagerGroup title="Foundation pile types">
          {pileTypeSources.length > 0 ? (
            pileTypeSources.map((source) => (
              <PileTypeSourceCard
                key={source.sourceId}
                onSelectPileTypeSource={onSelectPileTypeSource}
                selected={selectedPileTypeSourceId === source.sourceId}
                source={source}
                usageCount={sourceUsageCounts.get(source.sourceId) ?? 0}
              />
            ))
          ) : (
            <SourceManagerEmpty>
              No project pile type library found. Create pile types in Foundations.
            </SourceManagerEmpty>
          )}
        </SourceManagerGroup>

        <SourceManagerGroup title="Existing placed piles / joints">
          {pileSources.length > 0 ? (
            pileSources.map((source) => (
              <PlacedPileSourceCard
                alreadyPlaced={placedSourceIds.includes(source.sourceId)}
                key={source.sourceId}
                onPlacePileSource={onPlacePileSource}
                source={source}
                usageCount={sourceUsageCounts.get(source.sourceId) ?? 0}
              />
            ))
          ) : (
            <SourceManagerEmpty>No placed pile instances or joints found yet.</SourceManagerEmpty>
          )}
        </SourceManagerGroup>

        <SourceManagerGroup title="Manual sketch objects">
          <div className="rounded-md border border-dashed px-2 py-1.5">
            <div className="font-medium">Sketch pile (unlinked)</div>
            <p className="text-[11px] text-muted-foreground">
              Temporary drafting-only pile. Not linked to calculator, geotech, or project source
              data.
            </p>
            <Button
              className="mt-1 h-7 px-2 text-[11px]"
              onClick={() => {
                onSelectPileTypeSource?.(null);
                onPileSourceModeChange?.('manual_sketch');
              }}
              type="button"
              variant={activeTool === 'pile' ? 'outline' : 'ghost'}
            >
              Use sketch pile
            </Button>
          </div>
        </SourceManagerGroup>

        <SourceManagerGroup title="Boreholes">
          {boreholes.length > 0 ? (
            boreholes.map((source) => (
              <SpatialSourceCard
                key={source.sourceId}
                onPlaceSpatialSource={onPlaceSpatialSource}
                source={source}
                usageCount={sourceUsageCounts.get(source.sourceId) ?? 0}
              />
            ))
          ) : (
            <SourceManagerEmpty>No linked boreholes found.</SourceManagerEmpty>
          )}
        </SourceManagerGroup>

        <SourceManagerGroup title="Monitoring points">
          {monitoringPoints.length > 0 ? (
            monitoringPoints.map((source) => (
              <SpatialSourceCard
                key={source.sourceId}
                onPlaceSpatialSource={onPlaceSpatialSource}
                source={source}
                usageCount={sourceUsageCounts.get(source.sourceId) ?? 0}
              />
            ))
          ) : (
            <SourceManagerEmpty>No linked monitoring points found.</SourceManagerEmpty>
          )}
        </SourceManagerGroup>

        <SourceManagerGroup title="Services / Utilities">
          {services.length > 0 ? (
            services.map((source) => (
              <SpatialSourceCard
                key={source.sourceId}
                onPlaceSpatialSource={onPlaceSpatialSource}
                source={source}
                usageCount={sourceUsageCounts.get(source.sourceId) ?? 0}
              />
            ))
          ) : (
            <SourceManagerEmpty>No project service/utility sources yet.</SourceManagerEmpty>
          )}
        </SourceManagerGroup>
      </div>
    </div>
  );
}

function SourceManagerGroup({ children, title }: { children: React.ReactNode; title: string }) {
  return (
    <section className="min-w-0 space-y-1" aria-label={title}>
      <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </div>
      <div className="space-y-1">{children}</div>
    </section>
  );
}

function SourceManagerEmpty({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-md border border-dashed px-2 py-1.5 text-[11px] text-muted-foreground">
      {children}
    </p>
  );
}

function PileTypeSourceCard({
  onSelectPileTypeSource,
  selected,
  source,
  usageCount,
}: {
  onSelectPileTypeSource?: (source: DraftingPileTypeSourceRecord | null) => void;
  selected: boolean;
  source: DraftingPileTypeSourceRecord;
  usageCount: number;
}) {
  const completeness = getPileTypeCompleteness(source.pileType);

  return (
    <div className="rounded-md border px-2 py-1.5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate font-medium">{source.sourceLabel}</div>
          <div className="truncate text-[11px] text-muted-foreground">
            {formatPileTypeSourceSummary(source)}
          </div>
        </div>
        <CompletenessBadge status={completeness.status} />
      </div>
      <div className="mt-1 flex flex-wrap items-center gap-1.5">
        <span className="text-[11px] text-muted-foreground">{usageCount} drafting object(s)</span>
        <Button
          aria-label={`Place linked object from pile type ${source.sourceLabel}`}
          aria-pressed={selected}
          className="h-7 px-2 text-[11px]"
          disabled={!onSelectPileTypeSource}
          onClick={() => onSelectPileTypeSource?.(source)}
          type="button"
          variant={selected ? 'secondary' : 'outline'}
        >
          Place linked object
        </Button>
      </div>
    </div>
  );
}

function PlacedPileSourceCard({
  alreadyPlaced,
  onPlacePileSource,
  source,
  usageCount,
}: {
  alreadyPlaced: boolean;
  onPlacePileSource?: (source: DraftingPileSourceRecord) => void;
  source: DraftingPileSourceRecord;
  usageCount: number;
}) {
  return (
    <div className="rounded-md border px-2 py-1.5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate font-medium">{source.sourceLabel}</div>
          <div className="truncate text-[11px] text-muted-foreground">
            {formatPileInstanceSourceSummary(source)}
          </div>
        </div>
        <span className="rounded-full border bg-muted px-1.5 py-0.5 text-[10px] font-medium">
          {alreadyPlaced ? 'Linked' : 'Unlinked'}
        </span>
      </div>
      <div className="mt-1 flex flex-wrap items-center gap-1.5">
        <span className="text-[11px] text-muted-foreground">{usageCount} drafting object(s)</span>
        <Button
          aria-label={
            alreadyPlaced
              ? `Select existing object for ${source.sourceLabel}`
              : `Place linked object for ${source.sourceLabel}`
          }
          className="h-7 px-2 text-[11px]"
          disabled={!onPlacePileSource}
          onClick={() => onPlacePileSource?.(source)}
          type="button"
          variant={alreadyPlaced ? 'secondary' : 'outline'}
        >
          {alreadyPlaced ? 'Select existing object' : 'Place linked object'}
        </Button>
      </div>
    </div>
  );
}

function SpatialSourceCard({
  onPlaceSpatialSource,
  source,
  usageCount,
}: {
  onPlaceSpatialSource?: (source: DraftingSpatialSourceRecord) => void;
  source: DraftingSpatialSourceRecord;
  usageCount: number;
}) {
  const alreadyPlaced = usageCount > 0;

  return (
    <div className="rounded-md border px-2 py-1.5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate font-medium">{source.sourceLabel}</div>
          <div className="truncate text-[11px] text-muted-foreground">
            {getSpatialSourceLabel(source)}
          </div>
        </div>
        <span className="rounded-full border bg-muted px-1.5 py-0.5 text-[10px] font-medium">
          {alreadyPlaced ? 'Linked' : 'Unlinked'}
        </span>
      </div>
      <div className="mt-1 flex flex-wrap items-center gap-1.5">
        <span className="text-[11px] text-muted-foreground">{usageCount} drafting object(s)</span>
        <Button
          aria-label={
            alreadyPlaced
              ? `Select existing object for ${source.sourceLabel}`
              : `Place linked spatial feature ${source.sourceLabel}`
          }
          className="h-7 px-2 text-[11px]"
          disabled={!onPlaceSpatialSource}
          onClick={() => onPlaceSpatialSource?.(source)}
          type="button"
          variant={alreadyPlaced ? 'secondary' : 'outline'}
        >
          {alreadyPlaced ? 'Select existing object' : 'Place linked object'}
        </Button>
      </div>
    </div>
  );
}

function PileSourceChoices({
  hasPileInstances,
  hasPileTypes,
  onPlacePileSource,
  onPileSourceModeChange,
  onSelectPileTypeSource,
  pileSourceMode,
  pileSources,
  pileSourceManageHref,
  pileTypeSources,
  placedSourceIds,
  selectedPileTypeSourceId,
  sourceUsageCounts,
}: {
  hasPileInstances: boolean;
  hasPileTypes: boolean;
  onPlacePileSource?: (source: DraftingPileSourceRecord) => void;
  onPileSourceModeChange?: (mode: DraftingPileSourceMode) => void;
  onSelectPileTypeSource?: (source: DraftingPileTypeSourceRecord | null) => void;
  pileSourceMode: DraftingPileSourceMode;
  pileSources: DraftingPileSourceRecord[];
  pileSourceManageHref?: string;
  pileTypeSources: DraftingPileTypeSourceRecord[];
  placedSourceIds: string[];
  selectedPileTypeSourceId: string | null;
  sourceUsageCounts: Map<string, number>;
}) {
  if (!hasPileInstances && !hasPileTypes) {
    return (
      <div className="space-y-2">
        <p className="text-muted-foreground">
          No pile types or pile instances found. Create pile types in Foundations/Calculators, or
          place an unlinked sketch pile.
        </p>
        <PileSketchChoice
          onSelectPileTypeSource={onSelectPileTypeSource}
          onPileSourceModeChange={onPileSourceModeChange}
        />
      </div>
    );
  }

  return (
    <div className="grid gap-2 xl:grid-cols-[1.4fr_1fr_0.8fr]">
      <section
        className="space-y-1 rounded-md border bg-background p-2"
        aria-label="Pile type library"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Pile type library
            </div>
            <p className="text-[11px] text-muted-foreground">
              Place a new Drafting pile using a project pile type such as BP1/BP2/BP3/BP4.
            </p>
          </div>
          {pileSourceManageHref ? (
            <a
              className="h-7 rounded-md border px-2 py-1 text-[11px] font-medium hover:bg-accent"
              href={pileSourceManageHref}
            >
              Manage pile types
            </a>
          ) : null}
        </div>
        {hasPileTypes ? (
          <>
            {!hasPileInstances ? (
              <p className="text-[11px] text-muted-foreground">
                Pile types found, but no placed pile instances yet. Select a pile type and place it
                on the model, or create pile instances in Foundations.
              </p>
            ) : null}
            <PileTypeSourceList
              onSelectPileTypeSource={onSelectPileTypeSource}
              pileSourceManageHref={undefined}
              pileTypeSources={pileTypeSources}
              selectedPileTypeSourceId={selectedPileTypeSourceId}
              sourceUsageCounts={sourceUsageCounts}
            />
          </>
        ) : (
          <SourceManagerEmpty>
            No project pile type library found. Create pile types in Foundations.
          </SourceManagerEmpty>
        )}
      </section>

      <section
        className="space-y-1 rounded-md border bg-background p-2"
        aria-label="Existing placed piles / joints"
      >
        <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          Existing placed piles / joints
        </div>
        <p className="text-[11px] text-muted-foreground">
          Use a real placed pile/joint from the Foundations model. Coordinates come from the source.
        </p>
        {hasPileInstances ? (
          <div className="space-y-1">
            {pileSources.map((source) => {
              const alreadyPlaced = placedSourceIds.includes(source.sourceId);
              return (
                <Button
                  aria-label={
                    alreadyPlaced
                      ? `Select placed drafting object ${source.sourceLabel}`
                      : `Place linked pile/joint ${source.sourceLabel}`
                  }
                  className="h-auto min-h-8 w-full justify-start whitespace-normal px-2 py-1 text-left text-[11px]"
                  data-testid="drafting-source-pile-option"
                  disabled={!onPlacePileSource}
                  key={source.sourceId}
                  onClick={() => onPlacePileSource?.(source)}
                  title={`${formatPileInstanceSourceSummary(source)}${alreadyPlaced ? ' · already in model' : ''}`}
                  type="button"
                  variant={alreadyPlaced ? 'secondary' : 'outline'}
                >
                  <span className="min-w-0">
                    <span className="block font-medium">
                      {alreadyPlaced
                        ? `Select placed drafting object · ${source.sourceLabel}`
                        : `Place linked pile/joint · ${source.sourceLabel}`}
                    </span>
                    <span className="block text-muted-foreground">
                      {formatPileInstanceSourceSummary(source)} ·{' '}
                      {sourceUsageCounts.get(source.sourceId) ?? 0} drafting object(s)
                    </span>
                  </span>
                </Button>
              );
            })}
          </div>
        ) : (
          <SourceManagerEmpty>No placed pile instances or joints found yet.</SourceManagerEmpty>
        )}
      </section>

      <PileSketchChoice
        active={pileSourceMode === 'manual_sketch'}
        onSelectPileTypeSource={onSelectPileTypeSource}
        onPileSourceModeChange={onPileSourceModeChange}
      />
    </div>
  );
}

function PileSketchChoice({
  active = false,
  onPileSourceModeChange,
  onSelectPileTypeSource,
}: {
  active?: boolean;
  onPileSourceModeChange?: (mode: DraftingPileSourceMode) => void;
  onSelectPileTypeSource?: (source: DraftingPileTypeSourceRecord | null) => void;
}) {
  return (
    <section
      className="space-y-1 rounded-md border border-dashed bg-background p-2"
      aria-label="Sketch pile (unlinked)"
    >
      <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        Sketch pile (unlinked)
      </div>
      <p className="text-[11px] text-muted-foreground">
        Drafting-only pile. Not linked to Foundations, Geotech, Spatial, or calculations.
      </p>
      <Button
        aria-pressed={active}
        className="h-7 px-2 text-[11px]"
        onClick={() => {
          onSelectPileTypeSource?.(null);
          onPileSourceModeChange?.('manual_sketch');
        }}
        type="button"
        variant={active ? 'secondary' : 'outline'}
      >
        Use sketch pile
      </Button>
    </section>
  );
}

function PileTypeSourceList({
  onSelectPileTypeSource,
  pileSourceManageHref,
  pileTypeSources,
  selectedPileTypeSourceId,
  sourceUsageCounts = new Map<string, number>(),
}: {
  onSelectPileTypeSource?: (source: DraftingPileTypeSourceRecord | null) => void;
  pileSourceManageHref?: string;
  pileTypeSources: DraftingPileTypeSourceRecord[];
  selectedPileTypeSourceId: string | null;
  sourceUsageCounts?: Map<string, number>;
}) {
  return (
    <div className="grid gap-1.5 sm:grid-cols-2">
      {pileTypeSources.map((source) => {
        const selected = selectedPileTypeSourceId === source.sourceId;
        const completeness = getPileTypeCompleteness(source.pileType);
        const usageCount = sourceUsageCounts.get(source.sourceId) ?? 0;
        return (
          <div className="rounded-md border px-2 py-1.5" key={source.sourceId}>
            <div className="mb-1 flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="truncate font-medium">{source.sourceLabel}</div>
                <div className="truncate text-[11px] text-muted-foreground">
                  {formatPileTypeSourceSummary(source)}
                </div>
              </div>
              <CompletenessBadge status={completeness.status} />
            </div>
            <Button
              aria-label={`Place linked pile from pile type ${source.sourceLabel}`}
              aria-pressed={selected}
              className="h-7 px-2 text-[11px]"
              data-testid="drafting-source-pile-type-option"
              disabled={!onSelectPileTypeSource}
              onClick={() => onSelectPileTypeSource?.(source)}
              title={formatPileTypeSourceSummary(source)}
              type="button"
              variant={selected ? 'secondary' : 'outline'}
            >
              Place linked pile
            </Button>
            <span className="ml-2 text-[11px] text-muted-foreground">
              {usageCount} drafting object(s)
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
          Place a new Drafting pile using this project pile type. The pile remains linked to that
          type for engineering properties, but its position is placed on the model canvas.
        </span>
      ) : null}
    </div>
  );
}

function SpatialSourceChoices({
  activeTool,
  onPlaceSpatialSource,
  sourceUsageCounts,
  spatialSources,
}: {
  activeTool: DraftingTool;
  onPlaceSpatialSource?: (source: DraftingSpatialSourceRecord) => void;
  sourceUsageCounts: Map<string, number>;
  spatialSources: DraftingSpatialSourceRecord[];
}) {
  return (
    <div className="grid gap-2 lg:grid-cols-[1.4fr_0.7fr]">
      <section
        className="space-y-1 rounded-md border bg-background p-2"
        aria-label={getLinkedSourceSectionLabel(activeTool)}
      >
        <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          {getLinkedSourceSectionLabel(activeTool)}
        </div>
        <p className="text-[11px] text-muted-foreground">{getLinkedSourceHelp(activeTool)}</p>
        <div className="grid gap-1 sm:grid-cols-2">
          {spatialSources.map((source) => {
            const usageCount = sourceUsageCounts.get(source.sourceId) ?? 0;
            const alreadyPlaced = usageCount > 0;
            return (
              <Button
                aria-label={
                  alreadyPlaced
                    ? `Select placed drafting object ${source.sourceLabel}`
                    : `${getPlaceLinkedActionLabel(activeTool)} ${source.sourceLabel}`
                }
                className="h-auto min-h-8 justify-start whitespace-normal px-2 py-1 text-left text-[11px]"
                data-testid="drafting-source-spatial-option"
                disabled={!onPlaceSpatialSource}
                key={source.sourceId}
                onClick={() => onPlaceSpatialSource?.(source)}
                title={`${source.sourceLabel} · ${source.objectType.replaceAll('_', ' ')}${alreadyPlaced ? ' · already in model' : ''}`}
                type="button"
                variant={alreadyPlaced ? 'secondary' : 'outline'}
              >
                <span className="min-w-0">
                  <span className="block font-medium">
                    {alreadyPlaced
                      ? `Select placed drafting object · ${source.sourceLabel}`
                      : `${getPlaceLinkedActionLabel(activeTool)} · ${source.sourceLabel}`}
                  </span>
                  <span className="block text-muted-foreground">
                    {formatSpatialSourceSummary(source)} · {usageCount} drafting object(s)
                  </span>
                </span>
              </Button>
            );
          })}
        </div>
      </section>
      <SpatialSketchChoice activeTool={activeTool} />
    </div>
  );
}

function SpatialSourceEmpty({ activeTool }: { activeTool: DraftingTool }) {
  return (
    <div className="grid gap-2 lg:grid-cols-[1.4fr_0.7fr]">
      <section
        className="space-y-1 rounded-md border bg-background p-2"
        aria-label={getLinkedSourceSectionLabel(activeTool)}
      >
        <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          {getLinkedSourceSectionLabel(activeTool)}
        </div>
        <p className="text-[11px] text-muted-foreground">{getNoLinkedSourceMessage(activeTool)}</p>
      </section>
      <SpatialSketchChoice activeTool={activeTool} />
    </div>
  );
}

function SpatialSketchChoice({ activeTool }: { activeTool: DraftingTool }) {
  return (
    <section
      className="space-y-1 rounded-md border border-dashed bg-background p-2"
      aria-label={getSketchSourceSectionLabel(activeTool)}
    >
      <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {getSketchSourceSectionLabel(activeTool)}
      </div>
      <p className="text-[11px] text-muted-foreground">{getSketchSourceHelp(activeTool)}</p>
    </section>
  );
}

function CompletenessBadge({
  status,
}: {
  status: ReturnType<typeof getPileTypeCompleteness>['status'];
}) {
  return (
    <span
      className={cn(
        'shrink-0 rounded-full border px-1.5 py-0.5 text-[10px] font-medium',
        status === 'complete'
          ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
          : status === 'partial'
            ? 'border-sky-300 bg-sky-50 text-sky-700'
            : 'border-amber-300 bg-amber-50 text-amber-700',
      )}
    >
      {formatCompletenessLabel(status)}
    </span>
  );
}

function formatCompletenessLabel(status: ReturnType<typeof getPileTypeCompleteness>['status']) {
  switch (status) {
    case 'complete':
      return 'Complete';
    case 'partial':
      return 'Partial';
    case 'diameter_only':
      return 'Diameter only';
    case 'missing_key_fields':
      return 'Missing key fields';
  }
}

function buildSourceUsageCounts(model: DraftingModel) {
  const counts = new Map<string, number>();
  for (const object of model.objects) {
    const sourceId = object.sourceRef?.sourceId;
    if (sourceId) {
      counts.set(sourceId, (counts.get(sourceId) ?? 0) + 1);
    }
  }
  return counts;
}

function getSpatialSourceLabel(source: DraftingSpatialSourceRecord) {
  switch (source.objectType) {
    case 'borehole':
      return 'Linked borehole';
    case 'monitoring_point':
      return 'Linked monitoring point';
    case 'service_run':
      return 'Project service source';
    case 'service_crossing':
      return 'Project crossing source';
  }
}

function ToolButton({
  active,
  children,
  hint,
  icon: Icon,
  label,
  onClick,
  tile = false,
  tool,
}: {
  active: boolean;
  children: React.ReactNode;
  hint?: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
  tile?: boolean;
  tool: DraftingTool;
}) {
  return (
    <Button
      aria-label={label}
      aria-pressed={active}
      className={cn(
        'shrink-0 gap-1.5',
        tile ? 'h-7 min-w-0 justify-center px-1 text-[11px]' : 'h-8 px-2 text-xs',
      )}
      data-testid={getToolButtonTestId(tool)}
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

function ProjectGridChoicePanel({ onAddProjectGrid }: { onAddProjectGrid?: () => void }) {
  return (
    <div
      className="mt-2 flex flex-wrap items-center justify-between gap-3 rounded-md border bg-muted/15 p-2 text-xs"
      data-testid="drafting-project-grid-tool-panel"
    >
      <div className="min-w-0">
        <div className="font-semibold text-foreground">Project grid references</div>
        <p className="text-muted-foreground">
          Place a precise two-point grid line, or create a grid set estimate as independent
          grid-line objects. Edit each label, endpoint, bubble, and line role separately.
        </p>
        <p className="mt-1 text-[11px] text-muted-foreground">
          AS1100-informed modular grid style; requires project verification.
        </p>
      </div>
      <Button
        className="h-8 shrink-0"
        data-testid="drafting-project-grid-add"
        disabled={!onAddProjectGrid}
        onClick={onAddProjectGrid}
        size="sm"
        type="button"
      >
        Add Grid Set Estimate
      </Button>
    </div>
  );
}

function getToolButtonTestId(tool: DraftingTool) {
  if (tool === 'project_grid_line') {
    return 'drafting-project-grid-line-tool';
  }
  if (tool === 'project_grid') {
    return 'drafting-project-grid-tool';
  }
  if (tool === 'shaft') {
    return 'drafting-shaft-tool';
  }
  return undefined;
}

export function getDraftingToolShortLabel(tool: DraftingTool) {
  return (
    TOOL_GROUPS.flatMap((group) => group.tools).find((entry) => entry.tool === tool)?.shortLabel ??
    tool
  );
}

function isPathAuthoringTool(tool: DraftingTool) {
  return (
    tool === 'excavation_line' ||
    tool === 'capping_beam' ||
    tool === 'waler' ||
    tool === 'service_run' ||
    tool === 'secant_pile_wall' ||
    tool === 'soldier_pile_wall' ||
    tool === 'draft_polyline' ||
    tool === 'draft_polygon'
  );
}

function getAuthoringHint(tool: DraftingTool) {
  if (tool === 'service_run') {
    return 'Click service vertices, then Finish to create the service run path.';
  }
  if (tool === 'capping_beam' || tool === 'waler') {
    return 'Click path points, then Finish to create the beam or waler baseline.';
  }
  if (tool === 'secant_pile_wall') {
    return 'Click baseline start and end points to create the secant pile wall.';
  }
  if (tool === 'soldier_pile_wall') {
    return 'Click baseline start and end points to create the soldier pile wall.';
  }
  if (tool === 'draft_polyline' || tool === 'draft_polygon') {
    return 'Click vertices, then Finish to create the drafting geometry.';
  }
  return 'Click in the canvas to start the excavation polyline.';
}

function getLinkedSourceModeLabel(tool: DraftingTool) {
  if (tool === 'borehole') {
    return 'Linked boreholes';
  }
  if (tool === 'monitoring_point') {
    return 'Linked monitoring points';
  }
  if (tool === 'service_run' || tool === 'service_crossing') {
    return tool === 'service_run' ? 'Existing project service runs' : 'Existing project crossings';
  }
  return 'Linked project data';
}

function getSketchSourceModeLabel(tool: DraftingTool) {
  if (tool === 'borehole') {
    return 'Sketch borehole (unlinked)';
  }
  if (tool === 'monitoring_point') {
    return 'Sketch monitoring point (unlinked)';
  }
  if (tool === 'service_run' || tool === 'service_crossing') {
    return tool === 'service_run' ? 'Sketch service run (unlinked)' : 'Sketch crossing (unlinked)';
  }
  return 'Sketch object';
}

function getLinkedSourceSectionLabel(tool: DraftingTool) {
  if (tool === 'borehole') {
    return 'Linked boreholes';
  }
  if (tool === 'monitoring_point') {
    return 'Linked monitoring points';
  }
  if (tool === 'service_run' || tool === 'service_crossing') {
    return tool === 'service_run' ? 'Existing project service runs' : 'Existing project crossings';
  }
  return 'Linked project sources';
}

function getPlaceLinkedActionLabel(tool: DraftingTool) {
  if (tool === 'borehole') {
    return 'Place linked borehole';
  }
  if (tool === 'monitoring_point') {
    return 'Place linked monitoring point';
  }
  if (tool === 'service_run' || tool === 'service_crossing') {
    return tool === 'service_run' ? 'Place linked service run' : 'Place linked crossing';
  }
  return 'Place linked object';
}

function getLinkedSourceHelp(tool: DraftingTool) {
  if (tool === 'borehole') {
    return 'Use a project borehole from Geotech or Spatial source data.';
  }
  if (tool === 'monitoring_point') {
    return 'Use a project monitoring point from Monitoring or Spatial source data.';
  }
  if (tool === 'service_run' || tool === 'service_crossing') {
    return tool === 'service_run'
      ? 'Use explicit project service run source records from Spatial.'
      : 'Use explicit project service crossing source records from Spatial.';
  }
  return 'Use project source data where available.';
}

function getSketchSourceSectionLabel(tool: DraftingTool) {
  return getSketchSourceModeLabel(tool);
}

function getSketchSourceHelp(tool: DraftingTool) {
  if (tool === 'borehole') {
    return 'Drafting-only borehole. Not linked to Geotech, Spatial, Monitoring, or calculations.';
  }
  if (tool === 'monitoring_point') {
    return 'Drafting-only monitoring point. Not linked to Monitoring, Spatial, or project source data.';
  }
  if (tool === 'service_run' || tool === 'service_crossing') {
    return tool === 'service_run'
      ? 'Drafting-only service run. Not linked to Spatial or project source data.'
      : 'Drafting-only crossing. Not linked to Spatial or project source data.';
  }
  return 'Drafting-only object. Not linked to project engineering data.';
}

function getNoLinkedSourceMessage(tool: DraftingTool) {
  if (tool === 'service_run' || tool === 'service_crossing') {
    return 'No project service/utility sources yet.';
  }
  return 'No matching linked project sources found for this tool.';
}

function formatSpatialSourceSummary(source: DraftingSpatialSourceRecord) {
  const geometryType = source.feature.geometryType.replaceAll('_', ' ');
  const status = source.feature.status ? ` · ${source.feature.status}` : '';
  return `${getSpatialSourceLabel(source)} · ${geometryType}${status}`;
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
      title:
        activeTool === 'monitoring_point'
          ? 'Monitoring source'
          : activeTool === 'service_run'
            ? 'Service run source'
            : 'Service crossing source',
      pileSources: [] as DraftingPileSourceRecord[],
      spatialSources: spatialSources.filter((source) => source.objectType === activeTool),
    };
  }

  return null;
}
