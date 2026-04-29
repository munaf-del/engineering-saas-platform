import { describe, expect, it } from 'vitest';
import { DraftingModelSchema } from '@eng/shared';
import { resolveDraftingDimensionWitnessAnchors } from '../anchors/drafting-anchor-resolution';
import {
  TEMPORARY_DRAFTING_QA_SANDBOX_TITLE_PREFIX,
  createDraftingConnectedEditSandboxModel,
  createTemporaryDraftingQaSandboxArchiveInput,
  createTemporaryDraftingQaSandboxDrawingInput,
  getResolvedSandboxDimensionLength,
  isTemporaryDraftingQaSandboxDrawing,
  moveDraftingQaSandboxLineEndpoint,
  moveDraftingQaSandboxServiceVertex,
  removeSandboxAnchorSource,
  serializeDraftingQaSandboxExportJson,
} from './drafting-connected-edit-sandbox';

describe('drafting connected edit sandbox harness', () => {
  it('creates a sketch-kind temporary sandbox request and archive cleanup payload', () => {
    const input = createTemporaryDraftingQaSandboxDrawingInput(
      new Date('2026-04-27T10:00:00.000Z'),
    );

    expect(input).toEqual({
      kind: 'sketch',
      title: `${TEMPORARY_DRAFTING_QA_SANDBOX_TITLE_PREFIX} 2026-04-27T10:00:00.000Z`,
    });
    expect(isTemporaryDraftingQaSandboxDrawing(input)).toBe(true);
    expect(createTemporaryDraftingQaSandboxArchiveInput()).toEqual({ status: 'archived' });
  });

  it('builds a schema-valid isolated model without touching the project model canvas', () => {
    const sandbox = createDraftingConnectedEditSandboxModel('sandbox-drawing-1');
    const parsed = DraftingModelSchema.parse(sandbox.model);

    expect(parsed.drawingId).toBe('sandbox-drawing-1');
    expect(parsed.objects.map((object) => object.id)).toEqual([
      sandbox.ids.lineId,
      sandbox.ids.lineDimensionId,
      sandbox.ids.serviceRunId,
      sandbox.ids.serviceDimensionId,
    ]);
    expect(parsed.objects).toHaveLength(4);
  });

  it('updates a resolved line dimension when the source endpoint moves', () => {
    const sandbox = createDraftingConnectedEditSandboxModel('sandbox-drawing-1');
    const moved = moveDraftingQaSandboxLineEndpoint(sandbox, { x: 5200, y: 0 });

    expect(getResolvedSandboxDimensionLength(sandbox, sandbox.ids.lineDimensionId)).toBe(4000);
    expect(getResolvedSandboxDimensionLength(moved, moved.ids.lineDimensionId)).toBe(5200);
  });

  it('updates a resolved service-run dimension when a service vertex moves', () => {
    const sandbox = createDraftingConnectedEditSandboxModel('sandbox-drawing-1');
    const moved = moveDraftingQaSandboxServiceVertex(sandbox, 2, { x: 4600, y: 2400 });

    expect(getResolvedSandboxDimensionLength(sandbox, sandbox.ids.serviceDimensionId)).toBe(1800);
    expect(getResolvedSandboxDimensionLength(moved, moved.ids.serviceDimensionId)).toBe(2800);
  });

  it('keeps stale dimensions visible with missing anchor status when a source is unavailable', () => {
    const sandbox = createDraftingConnectedEditSandboxModel('sandbox-drawing-1');
    const missing = removeSandboxAnchorSource(sandbox, sandbox.ids.lineId);
    const dimension = missing.model.objects.find(
      (object) => object.id === sandbox.ids.lineDimensionId && object.type === 'dimension_chain',
    );
    if (!dimension || dimension.type !== 'dimension_chain') {
      throw new Error('Expected line dimension chain');
    }

    const anchors = resolveDraftingDimensionWitnessAnchors(dimension, missing.model.objects);

    expect(anchors.map((anchor) => anchor.status)).toEqual(['missing', 'missing']);
    expect(getResolvedSandboxDimensionLength(missing, missing.ids.lineDimensionId)).toBe(4000);
  });

  it('preserves anchor metadata through save/reload JSON serialization', () => {
    const sandbox = createDraftingConnectedEditSandboxModel('sandbox-drawing-1');
    const reloaded = DraftingModelSchema.parse(JSON.parse(JSON.stringify(sandbox.model)));
    const dimension = reloaded.objects.find(
      (object) => object.id === sandbox.ids.lineDimensionId && object.type === 'dimension_chain',
    );
    if (!dimension || dimension.type !== 'dimension_chain') {
      throw new Error('Expected line dimension chain');
    }

    expect(dimension.metadata.witnessAnchorRefs).toHaveLength(2);
    expect(dimension.metadata.witnessAnchorRefs?.[0]?.sourceObjectId).toBe(sandbox.ids.lineId);
    expect(
      getResolvedSandboxDimensionLength(
        { ...sandbox, model: reloaded },
        sandbox.ids.lineDimensionId,
      ),
    ).toBe(4000);
  });

  it('exports metadata-only JSON without obvious tokens, bytes, or blobs', () => {
    const sandbox = createDraftingConnectedEditSandboxModel('sandbox-drawing-1');
    const exported = serializeDraftingQaSandboxExportJson(sandbox.model);
    const exportedKeys = collectObjectKeys(JSON.parse(exported));

    expect(exported).toContain('"exportSchemaVersion": "drafting.model-export.v2"');
    expect(exported).toContain('"binaryPolicy"');
    expect(exported).toContain(sandbox.ids.lineDimensionId);
    expect(exportedKeys.join('\n')).not.toMatch(
      /token|secret|password|pdfBytes|imageBytes|documentBytes|pdfData|imageData/i,
    );
    expect(exported).not.toContain('blob:');
  });
});

function collectObjectKeys(value: unknown): string[] {
  if (!value || typeof value !== 'object') {
    return [];
  }
  if (Array.isArray(value)) {
    return value.flatMap((entry) => collectObjectKeys(entry));
  }
  return Object.entries(value).flatMap(([key, entry]) => [key, ...collectObjectKeys(entry)]);
}
