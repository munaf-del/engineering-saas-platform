import * as React from 'react';
import type { DraftingModel, DraftingObject, DraftingWorkspace } from '@eng/shared';
import { Button } from '@/components/ui/button';
import { canEditDraftingObject } from '../model-utils';
import type { DraftingTool } from '../tools/drafting-tool-types';

export type DraftingContextMenuState =
  | {
      kind: 'object';
      objectId: string;
      x: number;
      y: number;
    }
  | {
      kind: 'canvas';
      x: number;
      y: number;
    };

export function DraftingContextMenu({
  contextMenu,
  helperGridVisible,
  model,
  onClose,
  onDeleteObject,
  onFitModel,
  onObjectUpdate,
  onObjectWorkspaceChange,
  onOpenProperties,
  onSetTool,
  onToggleHelperGrid,
  onToggleSnap,
  readOnly = false,
  snapEnabled,
  workspaces = [],
}: {
  contextMenu: DraftingContextMenuState | null;
  helperGridVisible: boolean;
  model: DraftingModel;
  onClose: () => void;
  onDeleteObject: (objectId: string) => void;
  onFitModel: () => void;
  onObjectUpdate: (objectId: string, updater: (object: DraftingObject) => DraftingObject) => void;
  onObjectWorkspaceChange?: (objectId: string, workspaceId: string | undefined) => void;
  onOpenProperties: () => void;
  onSetTool: (tool: DraftingTool) => void;
  onToggleHelperGrid: () => void;
  onToggleSnap: () => void;
  readOnly?: boolean;
  snapEnabled: boolean;
  workspaces?: DraftingWorkspace[];
}) {
  if (!contextMenu) {
    return null;
  }

  const object =
    contextMenu.kind === 'object'
      ? model.objects.find((candidate) => candidate.id === contextMenu.objectId)
      : null;
  const objectEditable = object ? canEditDraftingObject(model, object) : false;
  const editable = objectEditable && !readOnly;
  const blockedReason = readOnly
    ? 'Read-only view blocks editing actions.'
    : object && !objectEditable
      ? 'Locked object or layer blocks editing actions.'
      : null;
  const viewportWidth = typeof window === 'undefined' ? 1024 : window.innerWidth;
  const viewportHeight = typeof window === 'undefined' ? 768 : window.innerHeight;
  const style = {
    left: Math.min(contextMenu.x, viewportWidth - 260),
    top: Math.min(contextMenu.y, viewportHeight - 360),
  };

  function run(action: () => void) {
    action();
    onClose();
  }

  return (
    <div
      aria-label={object ? 'Drafting object context menu' : 'Drafting canvas context menu'}
      className="fixed z-[70] w-60 rounded-md border bg-background p-1 text-sm shadow-xl"
      data-drafting-context-menu="true"
      data-testid={object ? 'drafting-object-context-menu' : 'drafting-canvas-context-menu'}
      role="menu"
      style={style}
    >
      {object ? (
        <>
          <ContextMenuButton onClick={() => run(onOpenProperties)}>
            Open properties
          </ContextMenuButton>
          {isTextBearingDraftingObject(object) ? (
            <ContextMenuButton onClick={() => run(onOpenProperties)}>
              Edit text style
            </ContextMenuButton>
          ) : null}
          <ContextMenuButton
            disabled={readOnly}
            onClick={() =>
              run(() =>
                onObjectUpdate(object.id, (current) => ({
                  ...current,
                  locked: !current.locked,
                  updatedAt: new Date().toISOString(),
                })),
              )
            }
          >
            {object.locked ? 'Unlock object' : 'Lock object'}
          </ContextMenuButton>
          {workspaces.length > 0 && onObjectWorkspaceChange ? (
            <div className="px-2 py-1.5" role="none">
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                Move to workspace
              </label>
              <select
                className="h-8 w-full rounded-md border bg-background px-2 text-xs"
                data-testid="drafting-context-move-workspace"
                disabled={!editable}
                value={object.workspaceId ?? 'workspace-all'}
                onChange={(event) =>
                  run(() =>
                    onObjectWorkspaceChange(
                      object.id,
                      event.target.value === 'workspace-all' ? undefined : event.target.value,
                    ),
                  )
                }
              >
                {workspaces.map((workspace) => (
                  <option key={workspace.id} value={workspace.id}>
                    {workspace.name}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
          <ContextMenuButton
            disabled={!editable}
            onClick={() =>
              run(() =>
                onObjectUpdate(object.id, (current) => ({
                  ...current,
                  visible: current.visible === false,
                  updatedAt: new Date().toISOString(),
                })),
              )
            }
          >
            {object.visible === false ? 'Show object' : 'Hide object'}
          </ContextMenuButton>
          {object.type === 'project_grid_line' ? (
            <>
              <ContextMenuButton onClick={() => run(onOpenProperties)}>
                Edit grid label
              </ContextMenuButton>
              <ContextMenuButton
                disabled={!editable}
                onClick={() =>
                  run(() =>
                    onObjectUpdate(object.id, (current) =>
                      current.type === 'project_grid_line'
                        ? {
                            ...current,
                            metadata: {
                              ...current.metadata,
                              bubblePlacement:
                                current.metadata.bubblePlacement === 'none' ? 'both' : 'none',
                            },
                            updatedAt: new Date().toISOString(),
                          }
                        : current,
                    ),
                  )
                }
              >
                Toggle grid bubbles
              </ContextMenuButton>
            </>
          ) : null}
          {object.type === 'shaft' ? (
            <>
              <ContextMenuButton onClick={() => run(onOpenProperties)}>
                Edit shaft properties
              </ContextMenuButton>
              <ContextMenuButton
                disabled={!editable}
                onClick={() =>
                  run(() =>
                    onObjectUpdate(object.id, (current) =>
                      current.type === 'shaft'
                        ? {
                            ...current,
                            parameters: {
                              ...current.parameters,
                              constructionType:
                                current.parameters.constructionType === 'secant_piles'
                                  ? 'contiguous_piles'
                                  : 'secant_piles',
                            },
                            updatedAt: new Date().toISOString(),
                          }
                        : current,
                    ),
                  )
                }
              >
                Toggle shaft pile type
              </ContextMenuButton>
            </>
          ) : null}
          <ContextMenuButton
            disabled={!editable}
            onClick={() => run(() => onDeleteObject(object.id))}
          >
            Delete object
          </ContextMenuButton>
          {blockedReason ? (
            <p className="px-2 py-1 text-xs text-muted-foreground">{blockedReason}</p>
          ) : null}
        </>
      ) : (
        <>
          <ContextMenuButton onClick={() => run(() => onSetTool('select'))}>
            Select tool
          </ContextMenuButton>
          <ContextMenuButton onClick={() => run(() => onSetTool('pan'))}>
            Pan tool
          </ContextMenuButton>
          <ContextMenuButton onClick={() => run(() => onSetTool('project_grid_line'))}>
            Start grid line
          </ContextMenuButton>
          <ContextMenuButton onClick={() => run(() => onSetTool('leader_note'))}>
            Add note
          </ContextMenuButton>
          <ContextMenuButton onClick={() => run(onToggleHelperGrid)}>
            Helper grid {helperGridVisible ? 'off' : 'on'}
          </ContextMenuButton>
          <ContextMenuButton onClick={() => run(onToggleSnap)}>
            Snap {snapEnabled ? 'off' : 'on'}
          </ContextMenuButton>
          <ContextMenuButton onClick={() => run(onFitModel)}>Fit model</ContextMenuButton>
        </>
      )}
    </div>
  );
}

function isTextBearingDraftingObject(object: DraftingObject) {
  return [
    'leader_note',
    'callout',
    'section_marker',
    'dimension_chain',
    'project_grid',
    'project_grid_line',
    'shaft',
    'pile',
    'secant_pile_wall',
    'soldier_pile_wall',
    'capping_beam',
    'waler',
    'excavation_line',
    'monitoring_point',
    'borehole',
    'service_run',
    'service_crossing',
    'structural_joint',
  ].includes(object.type);
}

function ContextMenuButton({
  children,
  disabled,
  onClick,
}: {
  children: React.ReactNode;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <Button
      className="h-8 w-full justify-start px-2 text-left"
      disabled={disabled}
      role="menuitem"
      type="button"
      variant="ghost"
      onClick={onClick}
    >
      {children}
    </Button>
  );
}
