import type {
  GenericTemplateDocument,
  GenericTemplateObject,
} from '../core/generic-template-document';
import type {
  SharedSheetBlockContent,
  SharedSheetDefinition,
  SharedSheetDetailsBlockContent,
  SharedSheetImageBlockContent,
  SharedSheetMapFrameContent,
  SharedSheetRenderModel,
  SharedSheetTextBlockContent,
  SharedSheetTitleBlockContent,
} from '../core/shared-sheet-schema';

type BuildGenericTemplateSpatialSheetRenderModelArgs = {
  detailsBlockRows?: SharedSheetDetailsBlockContent['rows'];
  generatedAtLabel?: string;
  mapFrameSavedViewLabel?: string | null;
  mapImageDataUrl: string;
  mapImageHeight: number;
  mapImageWidth: number;
  notesBody?: string;
  preparedBy?: string;
  projectAddress?: string | null;
  projectCode?: string | null;
  projectName: string;
  revision?: string;
  scaleLabel?: string;
  sheetNumber?: string;
  sheetTitle: string;
  subtitle?: string;
  template: GenericTemplateDocument;
  checkedBy?: string;
};

export function buildGenericTemplateSharedSheetRenderModel(
  template: GenericTemplateDocument,
): SharedSheetRenderModel {
  const definition = adaptGenericTemplateToSharedDefinition(template);
  const contentByBlockId = Object.fromEntries(
    definition.objects.map((block) => [
      block.id,
      buildGenericBlockContent(block.id, template.objects),
    ]),
  ) as Record<string, SharedSheetBlockContent | undefined>;

  return {
    contentByBlockId,
    definition,
  };
}

export function buildGenericTemplateSpatialSheetRenderModel(
  args: BuildGenericTemplateSpatialSheetRenderModelArgs,
): SharedSheetRenderModel {
  const definition = adaptGenericTemplateToSharedDefinition(args.template);
  const contentByBlockId = Object.fromEntries(
    definition.objects.map((block) => {
      const baseContent = buildGenericBlockContent(block.id, args.template.objects);

      if (block.type === 'titleBlock') {
        const titleBlockContent = baseContent?.type === 'titleBlock' ? baseContent : undefined;

        return [
          block.id,
          {
            // Root Sheet Templates stay generic reusable paper/layouts.
            // Project Spatial View, Project Spatial Sheet, and Report Annexure metadata bind
            // into the rendered instance here rather than redefining the template identity.
            ...titleBlockContent,
            checkedBy: args.checkedBy ?? titleBlockContent?.checkedBy,
            generatedAtLabel: args.generatedAtLabel ?? titleBlockContent?.generatedAtLabel,
            preparedBy: args.preparedBy ?? titleBlockContent?.preparedBy,
            projectAddress: args.projectAddress ?? titleBlockContent?.projectAddress,
            projectCode: args.projectCode ?? titleBlockContent?.projectCode,
            projectName: args.projectName || titleBlockContent?.projectName,
            revision: args.revision ?? titleBlockContent?.revision,
            scaleLabel: args.scaleLabel ?? titleBlockContent?.scaleLabel,
            sheetNumber: args.sheetNumber ?? titleBlockContent?.sheetNumber,
            sheetTitle: args.sheetTitle || titleBlockContent?.sheetTitle,
            subtitle: args.subtitle ?? titleBlockContent?.subtitle,
            type: 'titleBlock',
          } satisfies SharedSheetTitleBlockContent,
        ];
      }

      if (block.type === 'detailsBlock') {
        const detailsContent = baseContent?.type === 'detailsBlock' ? baseContent : undefined;

        return [
          block.id,
          {
            rows: args.detailsBlockRows ?? detailsContent?.rows ?? block.rows ?? [],
            title: detailsContent?.title ?? block.title,
            type: 'detailsBlock',
          } satisfies SharedSheetDetailsBlockContent,
        ];
      }

      if (block.type === 'mapFrame') {
        return [
          block.id,
          {
            fitMode: block.fitMode,
            imageDataUrl: args.mapImageDataUrl,
            imageHeight: args.mapImageHeight,
            imageWidth: args.mapImageWidth,
            sourceLabel: args.mapFrameSavedViewLabel ?? null,
            type: 'mapFrame',
          } satisfies SharedSheetMapFrameContent,
        ];
      }

      if (block.type === 'textBlock') {
        const textContent = baseContent?.type === 'textBlock' ? baseContent : undefined;
        const shouldUseSpatialNotes =
          typeof args.notesBody === 'string' &&
          args.notesBody.trim().length > 0 &&
          isSpatialNotesTextBlock(block, definition.objects);

        return [
          block.id,
          {
            body:
              shouldUseSpatialNotes && args.notesBody
                ? args.notesBody
                : (textContent?.body ?? block.body),
            subtitle: textContent?.subtitle ?? block.subtitle,
            title: textContent?.title ?? block.title,
            type: 'textBlock',
          } satisfies SharedSheetTextBlockContent,
        ];
      }

      return [block.id, baseContent];
    }),
  ) as Record<string, SharedSheetBlockContent | undefined>;

  return {
    contentByBlockId,
    definition,
  };
}

function isSpatialNotesTextBlock(
  block: SharedSheetDefinition['objects'][number],
  objects: SharedSheetDefinition['objects'],
) {
  if (block.type !== 'textBlock') {
    return false;
  }

  const normalizedLabel = `${block.name} ${block.title ?? ''}`.toLowerCase();
  if (
    normalizedLabel.includes('note') ||
    normalizedLabel.includes('context') ||
    normalizedLabel.includes('summary') ||
    normalizedLabel.includes('annexure') ||
    normalizedLabel.includes('spatial')
  ) {
    return true;
  }

  return objects.filter((object) => object.type === 'textBlock').length === 1;
}

export function adaptGenericTemplateToSharedDefinition(
  template: GenericTemplateDocument,
): SharedSheetDefinition {
  return {
    chromeStyle: template.chromeStyle,
    createdAt: template.createdAt,
    id: template.id,
    kind: 'shared_sheet',
    name: template.name,
    objects: template.objects.map((object) => adaptGenericTemplateBlock(object, template.presetId)),
    orientation: template.orientation,
    paperSize: template.paperSize,
    presetId: template.presetId,
    source: 'generic_template_adapter',
    updatedAt: template.updatedAt,
  };
}

function adaptGenericTemplateBlock(
  object: GenericTemplateObject,
  presetId: GenericTemplateDocument['presetId'],
): SharedSheetDefinition['objects'][number] {
  const common = {
    height: object.height,
    id: object.id,
    lineStyle: object.lineStyle,
    locked: object.locked,
    name: object.name,
    order: object.order,
    visible: object.visible,
    width: object.width,
    x: object.x,
    y: object.y,
  } satisfies Pick<
    SharedSheetDefinition['objects'][number],
    'height' | 'id' | 'lineStyle' | 'locked' | 'name' | 'order' | 'visible' | 'width' | 'x' | 'y'
  >;

  switch (object.type) {
    case 'titleBlock':
      return {
        ...common,
        binding: {
          description: 'Document/report metadata bound into the title block.',
          required: false,
          slot: 'titleBlock',
        },
        typography: object.typography,
        type: 'titleBlock',
        variant: presetId === 'as1100_inspired' ? 'as1100_drawing' : 'generic',
      };
    case 'detailsBlock':
      return {
        ...common,
        binding: {
          description: 'Key/value metadata rows for the sheet instance.',
          required: false,
          slot: 'detailsBlock',
        },
        title: object.title,
        type: 'detailsBlock',
        variant: 'generic',
      };
    case 'textBlock':
      return {
        ...common,
        binding: {
          description: 'Narrative text bound into the sheet instance.',
          required: false,
          slot: 'textBlock',
        },
        title: object.title,
        type: 'textBlock',
        variant: 'generic',
      };
    case 'imageFrame':
      return {
        ...common,
        binding: {
          description: 'Optional image or diagram content for the sheet instance.',
          required: false,
          slot: 'imageBlock',
        },
        fitMode: object.fitMode,
        title: object.title,
        type: 'imageBlock',
        variant: 'generic',
      };
    case 'mapFrame':
      return {
        ...common,
        binding: {
          description: 'Project Spatial View content bound into the printable map frame.',
          required: false,
          slot: 'mapFrame',
        },
        fitMode: object.mapFitMode,
        type: 'mapFrame',
        variant: 'spatial_map',
      };
  }
}

function buildGenericBlockContent(
  blockId: string,
  objects: GenericTemplateObject[],
): SharedSheetBlockContent | undefined {
  const object = objects.find((candidate) => candidate.id === blockId);
  if (!object) {
    return undefined;
  }

  switch (object.type) {
    case 'titleBlock':
      return {
        checkedBy: object.checkedBy,
        generatedAtLabel: object.generatedAtLabel,
        paperLabel: undefined,
        preparedBy: object.preparedBy,
        projectAddress: object.projectAddress,
        projectCode: object.projectCode,
        projectName: object.projectName,
        revision: object.revision,
        scaleLabel: object.scaleLabel,
        sheetNumber: object.sheetNumber,
        sheetTitle: object.title,
        subtitle: object.subtitle,
        type: 'titleBlock',
      } satisfies SharedSheetTitleBlockContent;
    case 'detailsBlock':
      return {
        rows: object.rows ?? [],
        title: object.title,
        type: 'detailsBlock',
      };
    case 'textBlock':
      return {
        body: object.body,
        subtitle: object.subtitle,
        title: object.title,
        type: 'textBlock',
      };
    case 'imageFrame':
      return {
        caption: object.caption,
        fitMode: object.fitMode,
        imageUrl: object.imageUrl,
        title: object.title,
        type: 'imageBlock',
      } satisfies SharedSheetImageBlockContent;
    case 'mapFrame':
      return {
        fitMode: object.mapFitMode,
        sourceLabel: null,
        type: 'mapFrame',
      } satisfies SharedSheetMapFrameContent;
  }
}
