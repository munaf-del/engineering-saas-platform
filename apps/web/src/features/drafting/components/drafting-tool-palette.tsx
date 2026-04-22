import * as React from 'react';
import type { DraftingModel } from '@eng/shared';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { formatDraftingTimestamp } from '../model-utils';
import type { DraftingTool } from '../tools/drafting-tool-types';

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
      <CardHeader>
        <CardTitle className="text-base">Tools</CardTitle>
        <CardDescription>
          Choose a tool, then author typed objects into the drawing model.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        <ToolButton active={activeTool === 'select'} onClick={() => onToolChange('select')}>
          Select / Move
        </ToolButton>
        <ToolButton active={activeTool === 'pan'} onClick={() => onToolChange('pan')}>
          Pan View
        </ToolButton>
        <Separator />
        <ToolButton active={activeTool === 'pile'} onClick={() => onToolChange('pile')}>
          Add Pile
        </ToolButton>
        <ToolButton
          active={activeTool === 'secant_pile_wall'}
          onClick={() => onToolChange('secant_pile_wall')}
        >
          Add Secant Pile Wall
        </ToolButton>
        <ToolButton
          active={activeTool === 'soldier_pile_wall'}
          onClick={() => onToolChange('soldier_pile_wall')}
        >
          Add Soldier Pile Wall
        </ToolButton>
        <ToolButton
          active={activeTool === 'anchor_tieback'}
          onClick={() => onToolChange('anchor_tieback')}
        >
          Add Anchor / Tieback
        </ToolButton>
        <ToolButton
          active={activeTool === 'capping_beam'}
          onClick={() => onToolChange('capping_beam')}
        >
          Add Capping Beam
        </ToolButton>
        <ToolButton active={activeTool === 'waler'} onClick={() => onToolChange('waler')}>
          Add Waler
        </ToolButton>
        <ToolButton
          active={activeTool === 'excavation_line'}
          onClick={() => onToolChange('excavation_line')}
        >
          Add Excavation Line
        </ToolButton>
        <ToolButton
          active={activeTool === 'monitoring_point'}
          onClick={() => onToolChange('monitoring_point')}
        >
          Add Monitoring Point
        </ToolButton>
        <ToolButton
          active={activeTool === 'leader_note'}
          onClick={() => onToolChange('leader_note')}
        >
          Add Leader Note
        </ToolButton>
        <ToolButton
          active={activeTool === 'dimension_chain'}
          onClick={() => onToolChange('dimension_chain')}
        >
          Add Dimension Chain
        </ToolButton>
        <ToolButton active={activeTool === 'callout'} onClick={() => onToolChange('callout')}>
          Add Callout
        </ToolButton>
        <ToolButton
          active={activeTool === 'section_marker'}
          onClick={() => onToolChange('section_marker')}
        >
          Add Section Marker
        </ToolButton>
        <ToolButton active={activeTool === 'borehole'} onClick={() => onToolChange('borehole')}>
          Add Borehole
        </ToolButton>
        <ToolButton
          active={activeTool === 'service_run'}
          onClick={() => onToolChange('service_run')}
        >
          Add Service Run
        </ToolButton>
        <ToolButton
          active={activeTool === 'service_crossing'}
          onClick={() => onToolChange('service_crossing')}
        >
          Add Service Crossing
        </ToolButton>

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
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <Button
      className="w-full justify-start"
      variant={active ? 'default' : 'outline'}
      onClick={onClick}
    >
      {children}
    </Button>
  );
}
