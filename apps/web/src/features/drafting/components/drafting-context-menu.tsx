import * as React from 'react';
import type { DraftingModel, DraftingObject } from '@eng/shared';
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
  onOpenProperties,
  onSetTool,
  onToggleHelperGrid,
  onToggleSnap,
  snapEnabled,
}: {
  contextMenu: DraftingContextMenuState | null;
  helperGridVisible: boolean;
  model: DraftingModel;
  onClose: () => void;
  onDeleteObject: (objectId: string) => void;
  onFitModel: () => void;
  onObjectUpdate: (objectId: string, updater: (object: DraftingObject) => DraftingObject) => void;
  onOpenProperties: () => void;
  onSetTool: (tool: DraftingTool) => void;
  onToggleHelperGrid: () => void;
  onToggleSnap: () => void;
  snapEnabled: boolean;
}) {
  if (!contextMenu) {
    return null;
  }

  const object =
    contextMenu.kind === 'object'
      ? model.objects.find((candidate) => candidate.id === contextMenu.objectId)
      : null;
  const editable = object ? canEditDraftingObject(model, object) : false;
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
          <ContextMenuButton
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
          <ContextMenuButton
            disabled={!editable && object.locked !== true}
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
          ) : null}
          {object.type === 'shaft' ? (
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
          ) : null}
          <ContextMenuButton
            disabled={!editable}
            onClick={() => run(() => onDeleteObject(object.id))}
          >
            Delete object
          </ContextMenuButton>
          {!editable ? (
            <p className="px-2 py-1 text-xs text-muted-foreground">
              Locked object or layer blocks editing actions.
            </p>
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
