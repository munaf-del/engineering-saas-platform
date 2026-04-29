'use client';

import { useMemo } from 'react';
import { SharedSheetRenderer } from '@/features/templates/components/shared-sheet-renderer';
import { buildLegacySpatialSharedSheetRenderModel } from '@/features/templates/adapters/legacy-spatial-sheet-render-model';
import { buildGenericTemplateSpatialSheetRenderModel } from '@/features/templates/adapters/generic-template-render-model';
import type { GenericTemplateDocument } from '@/features/templates/core/generic-template-document';
import type { SharedSheetDetailsBlockContent } from '@/features/templates/core/shared-sheet-schema';
import type { ProjectSpatialLegendFeatureEntry } from './project-spatial-legend';
import {
  resolveProjectSpatialSheetObjectInteraction,
  type ProjectSpatialSheetObject,
} from './project-spatial-sheet-layout';
import type {
  ProjectSpatialPaperSize,
  ProjectSpatialSheetMode,
  ProjectSpatialSheetOrientation,
} from './project-spatial-sheet-config';
import type { ProjectSpatialMapScaleBar } from './project-spatial-map';

export type ProjectSpatialSheetProps = {
  activeBasemapLabel: string;
  checkedBy?: string;
  detailsBlockRows?: SharedSheetDetailsBlockContent['rows'];
  generatedAtLabel: string;
  geologyQueryLocation: [number, number] | null;
  layoutMode?: ProjectSpatialSheetMode;
  legendEntries: ProjectSpatialLegendFeatureEntry[];
  mapFrameSavedViewLabel?: string | null;
  mapImageDataUrl: string;
  mapImageHeight: number;
  mapImageWidth: number;
  notes: string;
  notesBody?: string;
  objects?: ProjectSpatialSheetObject[];
  onObjectGeometryChange?: (
    objectId: string,
    geometry: Pick<ProjectSpatialSheetObject, 'height' | 'width' | 'x' | 'y'>,
  ) => void;
  onSelectObject?: (objectId: string) => void;
  orientation: ProjectSpatialSheetOrientation;
  paperSize: ProjectSpatialPaperSize;
  preparedBy?: string;
  projectAddress: string | null;
  projectCode: string;
  projectName: string;
  revision?: string;
  rootSheetTemplate?: GenericTemplateDocument | null;
  scaleBar: ProjectSpatialMapScaleBar;
  selectedObjectId?: string | null;
  sheetNumber?: string;
  sheetTitle: string;
  showDesignerChrome?: boolean;
  showGeologyOverlay: boolean;
  subtitle?: string;
};

export function ProjectSpatialSheet({
  activeBasemapLabel,
  checkedBy,
  detailsBlockRows,
  generatedAtLabel,
  geologyQueryLocation,
  layoutMode,
  legendEntries,
  mapFrameSavedViewLabel,
  mapImageDataUrl,
  mapImageHeight,
  mapImageWidth,
  notes,
  notesBody,
  objects,
  onObjectGeometryChange,
  onSelectObject,
  orientation,
  paperSize,
  preparedBy,
  projectAddress,
  projectCode,
  projectName,
  revision,
  rootSheetTemplate = null,
  scaleBar,
  selectedObjectId,
  sheetNumber,
  sheetTitle,
  showDesignerChrome = false,
  showGeologyOverlay,
  subtitle,
}: ProjectSpatialSheetProps) {
  const templateSource = useMemo(
    () => ({
      id: 'project-spatial-live-sheet',
      mode: layoutMode ?? 'as1100_inspired',
      name: sheetTitle,
      objects: objects ?? [],
      orientation,
      paperSize,
    }),
    [layoutMode, objects, orientation, paperSize, sheetTitle],
  );
  const legacyObjectsById = useMemo(
    () => new Map((objects ?? []).map((object) => [object.id, object])),
    [objects],
  );
  const renderModel = useMemo(
    () =>
      rootSheetTemplate
        ? buildGenericTemplateSpatialSheetRenderModel({
            checkedBy,
            detailsBlockRows,
            generatedAtLabel,
            mapFrameSavedViewLabel,
            mapImageDataUrl,
            mapImageHeight,
            mapImageWidth,
            notesBody: notesBody ?? notes,
            preparedBy,
            projectAddress,
            projectCode,
            projectName,
            revision,
            scaleLabel: scaleBar.label,
            sheetNumber,
            sheetTitle,
            subtitle,
            template: rootSheetTemplate,
          })
        : buildLegacySpatialSharedSheetRenderModel({
            activeBasemapLabel,
            checkedBy,
            generatedAtLabel,
            geologyQueryLocation,
            legendEntries,
            mapFrameSavedViewLabel,
            mapImageDataUrl,
            mapImageHeight,
            mapImageWidth,
            notes,
            preparedBy,
            projectAddress,
            projectCode,
            projectName,
            revision,
            scaleBar,
            sheetNumber,
            sheetTitle,
            showGeologyOverlay,
            subtitle,
            template: templateSource,
          }),
    [
      activeBasemapLabel,
      checkedBy,
      detailsBlockRows,
      generatedAtLabel,
      geologyQueryLocation,
      legendEntries,
      mapFrameSavedViewLabel,
      mapImageDataUrl,
      mapImageHeight,
      mapImageWidth,
      notes,
      notesBody,
      preparedBy,
      projectAddress,
      projectCode,
      projectName,
      revision,
      rootSheetTemplate,
      scaleBar,
      sheetNumber,
      sheetTitle,
      showGeologyOverlay,
      subtitle,
      templateSource,
    ],
  );

  return (
    <SharedSheetRenderer
      model={renderModel}
      onBlockGeometryChange={onObjectGeometryChange}
      onResolveInteraction={({ block, deltaX, deltaY, mode }) => {
        if (rootSheetTemplate) {
          return {
            height: block.height,
            width: block.width,
            x: block.x,
            y: block.y,
          };
        }

        const legacyObject = legacyObjectsById.get(block.id);
        if (!legacyObject) {
          return {
            height: block.height,
            width: block.width,
            x: block.x,
            y: block.y,
          };
        }

        return resolveProjectSpatialSheetObjectInteraction({
          deltaX,
          deltaY,
          mode,
          object: legacyObject,
          orientation,
          paperSize,
        });
      }}
      onSelectBlock={onSelectObject}
      previewMode={!showDesignerChrome}
      selectedBlockId={rootSheetTemplate ? null : selectedObjectId}
      showDesignerChrome={showDesignerChrome}
    />
  );
}
