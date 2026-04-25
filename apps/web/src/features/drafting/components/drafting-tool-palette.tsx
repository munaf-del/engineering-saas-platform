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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
    <Card className="h-fit">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Tools</CardTitle>
        <CardDescription>AS 1100-style engineering object tools.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {TOOL_GROUPS.map((group) => (
          <section key={group.title} className="space-y-1.5">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              {group.title}
            </div>
            <div className="grid grid-cols-2 gap-1.5">
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
            </div>
          </section>
        ))}

        {activeTool === 'excavation_line' ? (
          <>
            <Separator />
            <div className="rounded-md border bg-muted/30 p-3 text-sm text-muted-foreground">
              {pendingLinePointsCount === 0
                ? 'Click in the canvas to start the excavation polyline.'
                : `${pendingLinePointsCount} point(s) captured for the current line.`}
            </div>
            <Button className="w-full" onClick={onFinishLine} disabled={pendingLinePointsCount < 2}>
              Finish Line
            </Button>
            <Button
              className="w-full"
              variant="outline"
              onClick={onCancelLine}
              disabled={pendingLinePointsCount === 0}
            >
              Cancel Line
            </Button>
          </>
        ) : null}

        <Separator />
        <div className="space-y-1 text-sm text-muted-foreground">
          <p>{model.objects.length} object(s) in current model</p>
          <p>Last saved {formatDraftingTimestamp(drawingUpdatedAt)}</p>
        </div>
      </CardContent>
    </Card>
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
      aria-pressed={active}
      className="h-9 justify-start gap-1.5 px-2 text-xs"
      title={hint ? `${label} (${hint})` : label}
      variant={active ? 'default' : 'outline'}
      onClick={onClick}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" />
      {children}
      {hint ? <span className="ml-auto text-[10px] opacity-70">{hint}</span> : null}
    </Button>
  );
}
