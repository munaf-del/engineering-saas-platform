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
import { Separator } from '@/components/ui/separator';
import { formatDraftingTimestamp } from '../model-utils';
import type { DraftingTool } from '../tools/drafting-tool-types';

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

export function DraftingToolPalette({
  activeTool,
  drawingUpdatedAt,
  model,
  onCancelLine,
  onFinishLine,
  onToolChange,
  pendingLinePointsCount,
}: {
  activeTool: DraftingTool;
  drawingUpdatedAt: string;
  model: DraftingModel;
  onCancelLine: () => void;
  onFinishLine: () => void;
  onToolChange: (tool: DraftingTool) => void;
  pendingLinePointsCount: number;
}) {
  return (
    <div
      className="rounded-md border bg-background px-2 py-2 shadow-sm"
      data-testid="drafting-compact-tool-toolbar"
    >
      <div className="flex min-h-11 items-center gap-2 overflow-x-auto pb-1">
        <div className="mr-1 shrink-0 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Tools
        </div>
        {TOOL_GROUPS.map((group, index) => (
          <React.Fragment key={group.title}>
            {index > 0 ? <Separator className="h-8" orientation="vertical" /> : null}
            <section
              aria-label={`${group.title} tools`}
              className="flex shrink-0 items-center gap-1"
            >
              <span className="sr-only">{group.title}</span>
              {group.tools.map((entry) => (
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
            </section>
          </React.Fragment>
        ))}
        <Separator className="h-8" orientation="vertical" />
        <div className="ml-auto flex shrink-0 items-center gap-3 text-xs text-muted-foreground">
          <span>{model.objects.length} objects</span>
          <span title={`Last saved ${formatDraftingTimestamp(drawingUpdatedAt)}`}>
            Saved {formatDraftingTimestamp(drawingUpdatedAt)}
          </span>
        </div>
      </div>

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

function ToolButton({
  active,
  children,
  hint,
  icon: Icon,
  label,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  hint?: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
}) {
  return (
    <Button
      aria-label={label}
      aria-pressed={active}
      className="h-8 shrink-0 gap-1.5 px-2 text-xs"
      title={hint ? `${label} (${hint})` : label}
      variant={active ? 'default' : 'outline'}
      onClick={onClick}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" />
      <span>{children}</span>
      {hint ? <span className="text-[10px] opacity-70">{hint}</span> : null}
    </Button>
  );
}
