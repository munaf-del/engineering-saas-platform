'use client';

import {
  useRef,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react';
import type { TemplateObjectBase } from '../core/template-document';
import type { TemplateInteractionMode } from '../core/template-geometry';
import type { TemplatePageLayout } from '../core/template-page';
import { sortTemplateObjectsByOrder } from '../core/template-geometry';

type TemplateCanvasProps<TObject extends TemplateObjectBase> = {
  getObjectLabel?: (object: TObject) => string;
  objects: TObject[];
  onObjectGeometryChange?: (
    objectId: string,
    geometry: Pick<TObject, 'height' | 'width' | 'x' | 'y'>,
  ) => void;
  onResolveInteraction?: (args: {
    deltaX: number;
    deltaY: number;
    mode: TemplateInteractionMode;
    object: TObject;
  }) => Pick<TObject, 'height' | 'width' | 'x' | 'y'>;
  onSelectObject?: (objectId: string) => void;
  pageChrome?: ReactNode;
  pageLayout: TemplatePageLayout;
  renderObject: (object: TObject) => ReactNode;
  selectedObjectId?: string | null;
  selectionChromeVariant?: 'default' | 'subtle';
  showDesignerChrome?: boolean;
};

export function TemplateCanvas<TObject extends TemplateObjectBase>({
  getObjectLabel,
  objects,
  onObjectGeometryChange,
  onResolveInteraction,
  onSelectObject,
  pageChrome,
  pageLayout,
  renderObject,
  selectedObjectId,
  selectionChromeVariant = 'default',
  showDesignerChrome = false,
}: TemplateCanvasProps<TObject>) {
  const sheetRef = useRef<HTMLDivElement | null>(null);
  const visibleObjects = sortTemplateObjectsByOrder(objects.filter((object) => object.visible));

  function startObjectInteraction(
    event: ReactPointerEvent<HTMLDivElement>,
    object: TObject,
    mode: TemplateInteractionMode,
  ) {
    if (
      !showDesignerChrome ||
      !onObjectGeometryChange ||
      !onResolveInteraction ||
      object.locked ||
      event.button !== 0
    ) {
      return;
    }

    const sheetElement = sheetRef.current;
    if (!sheetElement) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    const startingRect = sheetElement.getBoundingClientRect();
    const mmPerPxX = pageLayout.widthMm / startingRect.width;
    const mmPerPxY = pageLayout.heightMm / startingRect.height;
    const startingGeometry = {
      height: object.height,
      width: object.width,
      x: object.x,
      y: object.y,
    };
    const startClientX = event.clientX;
    const startClientY = event.clientY;

    const handlePointerMove = (pointerEvent: PointerEvent) => {
      const deltaX = (pointerEvent.clientX - startClientX) * mmPerPxX;
      const deltaY = (pointerEvent.clientY - startClientY) * mmPerPxY;
      const nextGeometry = onResolveInteraction({
        deltaX,
        deltaY,
        mode,
        object: {
          ...object,
          ...startingGeometry,
        },
      });

      onObjectGeometryChange(object.id, nextGeometry);
    };

    const handlePointerUp = () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp, { once: true });
  }

  return (
    <div
      ref={sheetRef}
      className="template-canvas-surface relative mx-auto overflow-hidden bg-white text-slate-900 shadow-sm print:overflow-hidden print:shadow-none"
      data-template-orientation={pageLayout.orientation}
      data-template-paper-size={pageLayout.paperSize}
      style={
        {
          '--template-page-height-mm': pageLayout.heightMm,
          '--template-page-width-mm': pageLayout.widthMm,
          '--template-print-scale': (
            96 /
            25.4 /
            (pageLayout.widthPx / Math.max(pageLayout.widthMm, 1))
          ).toString(),
          height: `${pageLayout.heightPx}px`,
          width: `${pageLayout.widthPx}px`,
        } as CSSProperties
      }
    >
      <div className="absolute inset-0 bg-white" />
      {pageChrome}
      {visibleObjects.map((object) => {
        const objectLabel = getObjectLabel?.(object)?.trim() ?? '';
        const style = {
          height: `${object.height * (pageLayout.heightPx / pageLayout.heightMm)}px`,
          left: `${object.x * (pageLayout.widthPx / pageLayout.widthMm)}px`,
          top: `${object.y * (pageLayout.heightPx / pageLayout.heightMm)}px`,
          width: `${object.width * (pageLayout.widthPx / pageLayout.widthMm)}px`,
        };

        return (
          <div
            key={object.id}
            role={showDesignerChrome ? 'button' : undefined}
            tabIndex={showDesignerChrome ? 0 : undefined}
            onClick={(event) => {
              event.stopPropagation();
              onSelectObject?.(object.id);
            }}
            onPointerDown={(event) => {
              onSelectObject?.(object.id);
              startObjectInteraction(event, object, 'move');
            }}
            onKeyDown={(event) => {
              if (showDesignerChrome && (event.key === 'Enter' || event.key === ' ')) {
                event.preventDefault();
                onSelectObject?.(object.id);
              }
            }}
            className={
              showDesignerChrome
                ? `absolute overflow-hidden rounded-sm select-none ${
                    selectedObjectId === object.id
                      ? selectionChromeVariant === 'subtle'
                        ? 'ring-1 ring-sky-400/80'
                        : 'ring-2 ring-sky-500 ring-offset-2 ring-offset-slate-100'
                      : selectionChromeVariant === 'subtle'
                        ? 'hover:ring-1 hover:ring-sky-200/80'
                        : 'hover:ring-1 hover:ring-sky-300'
                  } ${object.locked ? 'cursor-default' : 'cursor-grab active:cursor-grabbing'}`
                : 'absolute overflow-hidden'
            }
            style={style}
          >
            {showDesignerChrome && objectLabel && selectedObjectId === object.id ? (
              <div className="pointer-events-none absolute left-1 top-1 z-20 rounded bg-white/95 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-600 shadow-sm">
                {objectLabel}
              </div>
            ) : null}
            {showDesignerChrome && selectedObjectId === object.id ? (
              <TemplateObjectSelectionChrome
                isLocked={object.locked}
                onHandlePointerDown={(handle) => (pointerEvent) => {
                  onSelectObject?.(object.id);
                  startObjectInteraction(pointerEvent, object, handle);
                }}
                variant={selectionChromeVariant}
              />
            ) : null}
            {renderObject(object)}
          </div>
        );
      })}
    </div>
  );
}

function TemplateObjectSelectionChrome({
  isLocked,
  onHandlePointerDown,
  variant,
}: {
  isLocked: boolean;
  onHandlePointerDown: (
    handle: Exclude<TemplateInteractionMode, 'move'>,
  ) => (event: ReactPointerEvent<HTMLDivElement>) => void;
  variant: 'default' | 'subtle';
}) {
  return (
    <>
      <div
        className={`pointer-events-none absolute inset-0 z-20 ${
          variant === 'subtle' ? 'border border-sky-300/90' : 'border border-sky-400'
        }`}
      />
      {isLocked ? (
        <div className="pointer-events-none absolute bottom-1 right-1 z-20 rounded bg-amber-100/95 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-amber-800 shadow-sm">
          Locked
        </div>
      ) : (
        <>
          <ResizeHandle
            className="-left-1.5 -top-1.5 cursor-nwse-resize"
            onPointerDown={onHandlePointerDown('nw')}
            variant={variant}
          />
          <ResizeHandle
            className="-right-1.5 -top-1.5 cursor-nesw-resize"
            onPointerDown={onHandlePointerDown('ne')}
            variant={variant}
          />
          <ResizeHandle
            className="-bottom-1.5 -left-1.5 cursor-nesw-resize"
            onPointerDown={onHandlePointerDown('sw')}
            variant={variant}
          />
          <ResizeHandle
            className="-bottom-1.5 -right-1.5 cursor-nwse-resize"
            onPointerDown={onHandlePointerDown('se')}
            variant={variant}
          />
        </>
      )}
    </>
  );
}

function ResizeHandle({
  className,
  onPointerDown,
  variant,
}: {
  className: string;
  onPointerDown: (event: ReactPointerEvent<HTMLDivElement>) => void;
  variant: 'default' | 'subtle';
}) {
  return (
    <div
      onPointerDown={onPointerDown}
      className={`absolute z-30 rounded-sm bg-white ${
        variant === 'subtle'
          ? 'h-2.5 w-2.5 border border-sky-400/90'
          : 'h-3 w-3 border border-sky-500 shadow-sm'
      } ${className}`}
    />
  );
}
