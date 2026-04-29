import type {
  CreateDraftingDrawingInput,
  DraftingDimensionChainObject,
  DraftingDrawingSummary,
  DraftingLineObject,
  DraftingModel,
  DraftingObject,
  DraftingPoint,
  DraftingServiceRunObject,
  UpdateDraftingDrawingInput,
} from '@eng/shared';
import { createEmptyDraftingModel } from '@eng/shared';
import { resolveDraftingDimensionAnchoredObject } from '../anchors/drafting-anchor-resolution';
import { serializeDraftingModelJson } from '../export-utils';
import { addDraftingObject, createDraftingObject, replaceDraftingObject } from '../model-utils';
import { calculateDimensionChainTotal } from '../semantic-object-utils';

export const TEMPORARY_DRAFTING_QA_SANDBOX_TITLE_PREFIX = 'Temporary Drafting QA Sandbox';

export type DraftingConnectedEditSandboxIds = {
  lineId: string;
  lineDimensionId: string;
  serviceRunId: string;
  serviceDimensionId: string;
};

export type DraftingConnectedEditSandbox = {
  ids: DraftingConnectedEditSandboxIds;
  model: DraftingModel;
};

export function createTemporaryDraftingQaSandboxDrawingInput(
  date: Date = new Date(),
): CreateDraftingDrawingInput {
  return {
    kind: 'sketch',
    title: `${TEMPORARY_DRAFTING_QA_SANDBOX_TITLE_PREFIX} ${date.toISOString()}`,
  };
}

export function createTemporaryDraftingQaSandboxArchiveInput(): UpdateDraftingDrawingInput {
  return {
    status: 'archived',
  };
}

export function isTemporaryDraftingQaSandboxDrawing(
  drawing:
    | Pick<CreateDraftingDrawingInput, 'kind' | 'title'>
    | Pick<DraftingDrawingSummary, 'kind' | 'title'>,
) {
  return (
    drawing.kind === 'sketch' &&
    drawing.title.startsWith(TEMPORARY_DRAFTING_QA_SANDBOX_TITLE_PREFIX)
  );
}

export function createDraftingConnectedEditSandboxModel(
  drawingId: string,
): DraftingConnectedEditSandbox {
  let model = createEmptyDraftingModel(drawingId);
  const line = withObjectId(
    createDraftingObject('draft_line', { x: 0, y: 0 }, model, [
      { x: 0, y: 0 },
      { x: 4000, y: 0 },
    ]),
    'qa-line-1',
  ) as DraftingLineObject;
  model = addDraftingObject(model, line, {
    summary: 'Temporary QA line for associative dimension verification',
  });

  const lineDimension = withObjectId(
    createDraftingObject('dimension_chain', { x: 0, y: 0 }, model, [
      {
        x: 0,
        y: 0,
        snapRef: endpointAnchor(line.id, 0, { x: 0, y: 0 }),
      },
      {
        x: 4000,
        y: 0,
        snapRef: endpointAnchor(line.id, 1, { x: 4000, y: 0 }),
      },
      { x: 0, y: -900 },
    ]),
    'qa-line-dimension-1',
  ) as DraftingDimensionChainObject;
  model = addDraftingObject(model, lineDimension, {
    summary: 'Temporary QA dimension linked to line endpoints',
  });

  const serviceRun = withObjectId(
    createDraftingObject('service_run', { x: 0, y: 1800 }, model, [
      { x: 0, y: 1800 },
      { x: 1800, y: 2400 },
      { x: 3600, y: 2400 },
    ]),
    'qa-service-run-1',
  ) as DraftingServiceRunObject;
  serviceRun.parameters = {
    ...serviceRun.parameters,
    diameterMm: undefined,
    depthM: undefined,
    levelRl: undefined,
    status: 'unknown',
    authority: '',
  };
  model = addDraftingObject(model, serviceRun, {
    summary: 'Temporary QA service run for vertex anchor verification',
  });

  const serviceDimension = withObjectId(
    createDraftingObject('dimension_chain', { x: 0, y: 1800 }, model, [
      {
        x: 1800,
        y: 2400,
        snapRef: vertexAnchor(serviceRun.id, 1, { x: 1800, y: 2400 }),
      },
      {
        x: 3600,
        y: 2400,
        snapRef: vertexAnchor(serviceRun.id, 2, { x: 3600, y: 2400 }),
      },
      { x: 1800, y: 3100 },
    ]),
    'qa-service-dimension-1',
  ) as DraftingDimensionChainObject;
  model = addDraftingObject(model, serviceDimension, {
    summary: 'Temporary QA dimension linked to service run vertices',
  });

  return {
    ids: {
      lineId: line.id,
      lineDimensionId: lineDimension.id,
      serviceRunId: serviceRun.id,
      serviceDimensionId: serviceDimension.id,
    },
    model,
  };
}

export function moveDraftingQaSandboxLineEndpoint(
  sandbox: DraftingConnectedEditSandbox,
  endpoint: DraftingPoint,
): DraftingConnectedEditSandbox {
  const nextObjects = sandbox.model.objects.map((object) => {
    if (object.id !== sandbox.ids.lineId || object.type !== 'draft_line') {
      return object;
    }

    return {
      ...object,
      geometry: {
        ...object.geometry,
        endPoint: endpoint,
      },
      updatedAt: new Date().toISOString(),
    };
  });

  return {
    ...sandbox,
    model: {
      ...sandbox.model,
      objects: nextObjects,
    },
  };
}

export function moveDraftingQaSandboxServiceVertex(
  sandbox: DraftingConnectedEditSandbox,
  vertexIndex: number,
  point: DraftingPoint,
): DraftingConnectedEditSandbox {
  const nextObjects = sandbox.model.objects.map((object) => {
    if (object.id !== sandbox.ids.serviceRunId || object.type !== 'service_run') {
      return object;
    }

    return {
      ...object,
      geometry: {
        ...object.geometry,
        path: object.geometry.path.map((existingPoint, index) =>
          index === vertexIndex ? point : existingPoint,
        ),
      },
      updatedAt: new Date().toISOString(),
    };
  });

  return {
    ...sandbox,
    model: {
      ...sandbox.model,
      objects: nextObjects,
    },
  };
}

export function getResolvedSandboxDimensionLength(
  sandbox: DraftingConnectedEditSandbox,
  dimensionId: string,
) {
  const dimension = sandbox.model.objects.find(
    (object): object is DraftingDimensionChainObject =>
      object.id === dimensionId && object.type === 'dimension_chain',
  );
  if (!dimension) {
    throw new Error(`Sandbox dimension ${dimensionId} was not found`);
  }

  return calculateDimensionChainTotal(
    resolveDraftingDimensionAnchoredObject(dimension, sandbox.model.objects).geometry.points,
  );
}

export function removeSandboxAnchorSource(
  sandbox: DraftingConnectedEditSandbox,
  sourceObjectId: string,
): DraftingConnectedEditSandbox {
  return {
    ...sandbox,
    model: {
      ...sandbox.model,
      objects: sandbox.model.objects.filter((object) => object.id !== sourceObjectId),
    },
  };
}

export function replaceSandboxObject(
  sandbox: DraftingConnectedEditSandbox,
  objectId: string,
  nextObject: DraftingObject,
): DraftingConnectedEditSandbox {
  return {
    ...sandbox,
    model: replaceDraftingObject(sandbox.model, objectId, nextObject),
  };
}

export function serializeDraftingQaSandboxExportJson(model: DraftingModel) {
  return serializeDraftingModelJson(model);
}

function endpointAnchor(sourceObjectId: string, anchorIndex: number, point: DraftingPoint) {
  return {
    sourceObjectId,
    anchorKind: 'endpoint' as const,
    anchorIndex,
    capturedCoordinate: point,
  };
}

function vertexAnchor(sourceObjectId: string, anchorIndex: number, point: DraftingPoint) {
  return {
    sourceObjectId,
    anchorKind: 'vertex' as const,
    anchorIndex,
    capturedCoordinate: point,
  };
}

function withObjectId(object: DraftingObject, id: string): DraftingObject {
  return {
    ...object,
    id,
  };
}
