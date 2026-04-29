import { expect, test, type Locator, type Page } from '@playwright/test';
import type {
  DraftingAnchorTiebackObject,
  DraftingBoreholeObject,
  DraftingCalloutObject,
  DraftingCappingBeamObject,
  DraftingCircleObject,
  DraftingDimensionChainObject,
  DraftingDrawing,
  DraftingExcavationLineObject,
  DraftingLineObject,
  DraftingLeaderNoteObject,
  DraftingMonitoringPointObject,
  DraftingPileObject,
  DraftingPolygonObject,
  DraftingPolylineObject,
  DraftingRectangleObject,
  DraftingSectionMarkerObject,
  DraftingSecantPileWallObject,
  DraftingServiceCrossingObject,
  DraftingServiceRunObject,
  DraftingSoldierPileWallObject,
  DraftingStructuralJointObject,
  DraftingWalerObject,
  Project,
} from '@eng/shared';
import { calculateDimensionChainTotal } from '../src/features/drafting/semantic-object-utils';
import { resolveDraftingDimensionAnchoredObject } from '../src/features/drafting/anchors/drafting-anchor-resolution';
import {
  createDraftingConnectedEditSandboxModel,
  createTemporaryDraftingQaSandboxArchiveInput,
  createTemporaryDraftingQaSandboxDrawingInput,
  serializeDraftingQaSandboxExportJson,
} from '../src/features/drafting/qa/drafting-connected-edit-sandbox';
import { apiRequest, getAuthToken, signInWithSeedUser } from './helpers';

const PROJECT_CODE_PREFIX = 'DQA';
const PROJECT_NAME = 'Drafting Connected Edit QA';
const QA_LINE_ID = 'qa-line-1';
const QA_LINE_DIMENSION_ID = 'qa-line-dimension-1';

test.describe('Drafting connected-edit pointer QA', () => {
  test('authors rectangle and circle primitives with cancel-safe command lifecycle', async ({
    page,
  }) => {
    const { email, password } = await signInWithSeedUser(page);
    const token = await getAuthToken(email, password);
    const project = await createQaProject(token);
    const projectModel = await createDraftingDrawing(token, project.id, {
      kind: 'model',
      title: 'Project Model',
    });
    const sandboxDrawing = await createDraftingDrawing(
      token,
      project.id,
      createTemporaryDraftingQaSandboxDrawingInput(new Date('2026-04-27T00:00:00.000Z')),
    );
    let sandboxArchived = false;

    try {
      await page.goto(`/projects/${project.id}/drafting/${sandboxDrawing.id}`);
      await expect(page.getByTestId('drafting-canvas-stage')).toBeVisible();
      await expect(page.locator('[data-drafting-object-id]')).toHaveCount(0);

      const canvas = page.getByTestId('drafting-canvas-svg');
      await canvas.scrollIntoViewIfNeeded();

      await startPrimitivePreview({
        canvas,
        page,
        previewTestId: 'drafting-command-preview-rectangle',
        start: { xRatio: 0.34, yRatio: 0.55 },
        end: { xRatio: 0.48, yRatio: 0.66 },
        toolLabel: 'Rectangle',
      });
      await page.keyboard.press('Escape');
      await expect(page.getByTestId('drafting-command-preview-rectangle')).toHaveCount(0);
      await expect(page.locator('[data-drafting-object-id]')).toHaveCount(0);

      await authorTwoPointPrimitive({
        canvas,
        page,
        previewTestId: 'drafting-command-preview-rectangle',
        start: { xRatio: 0.34, yRatio: 0.55 },
        end: { xRatio: 0.5, yRatio: 0.68 },
        toolLabel: 'Rectangle',
      });
      await expect(page.locator('[data-drafting-object-id]')).toHaveCount(1);

      await startPrimitivePreview({
        canvas,
        page,
        previewTestId: 'drafting-command-preview-circle',
        start: { xRatio: 0.62, yRatio: 0.58 },
        end: { xRatio: 0.7, yRatio: 0.58 },
        toolLabel: 'Circle',
      });
      await page.getByRole('button', { exact: true, name: 'Select / Move' }).click();
      await expect(page.getByTestId('drafting-command-preview-circle')).toHaveCount(0);
      await expect(page.locator('[data-drafting-object-id]')).toHaveCount(1);

      await authorTwoPointPrimitive({
        canvas,
        page,
        previewTestId: 'drafting-command-preview-circle',
        start: { xRatio: 0.64, yRatio: 0.6 },
        end: { xRatio: 0.72, yRatio: 0.6 },
        toolLabel: 'Circle',
      });
      await expect(page.locator('[data-drafting-object-id]')).toHaveCount(2);

      await page.getByRole('button', { name: 'Save' }).click();
      await expect(page.getByText('Saved').first()).toBeVisible();

      await page.reload();
      await expect(page.getByTestId('drafting-canvas-stage')).toBeVisible();
      await expect(page.locator('[data-drafting-object-id]')).toHaveCount(2);

      const reloadedDrawing = await apiRequest<DraftingDrawing>(
        token,
        `/projects/${project.id}/drafting/drawings/${sandboxDrawing.id}`,
      );
      const authoredRectangle = reloadedDrawing.model.objects.find(
        (object): object is DraftingRectangleObject => object.type === 'draft_rectangle',
      );
      const authoredCircle = reloadedDrawing.model.objects.find(
        (object): object is DraftingCircleObject => object.type === 'draft_circle',
      );
      expect(authoredRectangle).toBeDefined();
      expect(authoredCircle).toBeDefined();
      expect(authoredRectangle!.geometry.cornerA).not.toEqual(authoredRectangle!.geometry.cornerB);
      expect(authoredCircle!.geometry.radiusMm).toBeGreaterThan(0);

      const downloadPromise = page.waitForEvent('download');
      await page.getByRole('button', { name: 'Export JSON' }).click();
      const download = await downloadPromise;
      const downloadPath = await download.path();
      expect(downloadPath).toBeTruthy();
      const exportedJson = await readDownloadedText(downloadPath!);
      expect(exportedJson).toContain(authoredRectangle!.id);
      expect(exportedJson).toContain(authoredCircle!.id);
      expectExportIsMetadataOnly(exportedJson);

      await archiveDraftingSandbox(token, project.id, sandboxDrawing.id);
      sandboxArchived = true;

      await page.goto(`/projects/${project.id}/drafting`);
      await expect(page.getByText(sandboxDrawing.title)).toBeHidden();

      const untouchedProjectModel = await apiRequest<DraftingDrawing>(
        token,
        `/projects/${project.id}/drafting/drawings/${projectModel.id}`,
      );
      expect(untouchedProjectModel.model.objects).toHaveLength(0);
    } finally {
      if (!sandboxArchived) {
        await archiveDraftingSandbox(token, project.id, sandboxDrawing.id).catch(() => undefined);
      }
    }
  });

  test('authors a line from a blank temporary sketch through live canvas pointer input', async ({
    page,
  }) => {
    const { email, password } = await signInWithSeedUser(page);
    const token = await getAuthToken(email, password);
    const project = await createQaProject(token);
    const projectModel = await createDraftingDrawing(token, project.id, {
      kind: 'model',
      title: 'Project Model',
    });
    const sandboxDrawing = await createDraftingDrawing(
      token,
      project.id,
      createTemporaryDraftingQaSandboxDrawingInput(new Date('2026-04-27T00:00:00.000Z')),
    );
    let sandboxArchived = false;

    try {
      await page.goto(`/projects/${project.id}/drafting/${sandboxDrawing.id}`);
      await expect(page.getByTestId('drafting-canvas-stage')).toBeVisible();
      await expect(page.locator('[data-drafting-object-id]')).toHaveCount(0);

      await page.getByRole('button', { exact: true, name: 'Line' }).click();
      await expect(page.getByText('Active Line')).toBeVisible();

      const canvas = page.getByTestId('drafting-canvas-svg');
      await canvas.scrollIntoViewIfNeeded();
      const start = await pointInLocator(canvas, { xRatio: 0.42, yRatio: 0.32 });
      const end = await pointInLocator(canvas, { xRatio: 0.58, yRatio: 0.32 });

      await page.mouse.move(start.x, start.y);
      await page.mouse.click(start.x, start.y);
      await page.mouse.move(end.x, end.y, { steps: 6 });
      await expect(page.getByTestId('drafting-command-preview-line')).toHaveAttribute(
        'points',
        /.+ .+/,
      );
      await page.mouse.click(end.x, end.y);

      await expect(page.locator('[data-drafting-object-id]')).toHaveCount(1);
      const authoredLineId = await page
        .locator('[data-drafting-object-id]')
        .getAttribute('data-drafting-object-id');
      expect(authoredLineId).toBeTruthy();

      await page.getByRole('button', { name: 'Save' }).click();
      await expect(page.getByText('Saved').first()).toBeVisible();

      await page.reload();
      await expect(page.getByTestId('drafting-canvas-stage')).toBeVisible();
      await expect(page.locator('[data-drafting-object-id]')).toHaveCount(1);
      await expect(page.getByTestId(`drafting-object-${authoredLineId}`)).toHaveCount(1);

      const reloadedDrawing = await apiRequest<DraftingDrawing>(
        token,
        `/projects/${project.id}/drafting/drawings/${sandboxDrawing.id}`,
      );
      const authoredLine = reloadedDrawing.model.objects.find(
        (object): object is DraftingLineObject =>
          object.id === authoredLineId && object.type === 'draft_line',
      );
      expect(authoredLine).toBeDefined();
      expect(authoredLine!.geometry.startPoint).not.toEqual(authoredLine!.geometry.endPoint);

      const downloadPromise = page.waitForEvent('download');
      await page.getByRole('button', { name: 'Export JSON' }).click();
      const download = await downloadPromise;
      const downloadPath = await download.path();
      expect(downloadPath).toBeTruthy();
      const exportedJson = await readDownloadedText(downloadPath!);
      expect(exportedJson).toContain(authoredLineId!);
      expectExportIsMetadataOnly(exportedJson);

      await archiveDraftingSandbox(token, project.id, sandboxDrawing.id);
      sandboxArchived = true;

      await page.goto(`/projects/${project.id}/drafting`);
      await expect(page.getByText(sandboxDrawing.title)).toBeHidden();

      const untouchedProjectModel = await apiRequest<DraftingDrawing>(
        token,
        `/projects/${project.id}/drafting/drawings/${projectModel.id}`,
      );
      expect(untouchedProjectModel.model.objects).toHaveLength(0);
    } finally {
      if (!sandboxArchived) {
        await archiveDraftingSandbox(token, project.id, sandboxDrawing.id).catch(() => undefined);
      }
    }
  });

  test('authors an open polyline from a blank temporary sketch through live canvas pointer input', async ({
    page,
  }) => {
    const { email, password } = await signInWithSeedUser(page);
    const token = await getAuthToken(email, password);
    const project = await createQaProject(token);
    const projectModel = await createDraftingDrawing(token, project.id, {
      kind: 'model',
      title: 'Project Model',
    });
    const sandboxDrawing = await createDraftingDrawing(
      token,
      project.id,
      createTemporaryDraftingQaSandboxDrawingInput(new Date('2026-04-27T00:00:00.000Z')),
    );
    let sandboxArchived = false;

    try {
      await page.goto(`/projects/${project.id}/drafting/${sandboxDrawing.id}`);
      await expect(page.getByTestId('drafting-canvas-stage')).toBeVisible();
      await expect(page.locator('[data-drafting-object-id]')).toHaveCount(0);

      const canvas = page.getByTestId('drafting-canvas-svg');
      await canvas.scrollIntoViewIfNeeded();

      await startPolylinePreview({
        canvas,
        page,
        start: { xRatio: 0.34, yRatio: 0.38 },
        next: { xRatio: 0.42, yRatio: 0.42 },
      });
      await page.keyboard.press('Escape');
      await expect(page.getByTestId('drafting-command-preview-polyline')).toHaveCount(0);
      await expect(page.locator('[data-drafting-object-id]')).toHaveCount(0);

      await startPolylinePreview({
        canvas,
        page,
        start: { xRatio: 0.36, yRatio: 0.48 },
        next: { xRatio: 0.45, yRatio: 0.52 },
      });
      await page.getByRole('button', { exact: true, name: 'Select / Move' }).click();
      await expect(page.getByTestId('drafting-command-preview-polyline')).toHaveCount(0);
      await expect(page.locator('[data-drafting-object-id]')).toHaveCount(0);

      const ratios = [
        { xRatio: 0.38, yRatio: 0.6 },
        { xRatio: 0.48, yRatio: 0.54 },
        { xRatio: 0.58, yRatio: 0.62 },
      ];
      await page.getByRole('button', { exact: true, name: 'Polyline' }).click();
      await expect(page.getByRole('button', { exact: true, name: 'Polyline' })).toHaveAttribute(
        'aria-pressed',
        'true',
      );
      await canvas.scrollIntoViewIfNeeded();
      const points = await Promise.all(ratios.map((ratio) => pointInLocator(canvas, ratio)));
      await page.mouse.move(points[0]!.x, points[0]!.y);
      await page.mouse.click(points[0]!.x, points[0]!.y);
      await page.mouse.move(points[1]!.x, points[1]!.y, { steps: 6 });
      await expect(page.getByTestId('drafting-command-preview-polyline')).toHaveAttribute(
        'points',
        /.+ .+/,
      );
      await page.mouse.click(points[1]!.x, points[1]!.y);
      await page.mouse.move(points[2]!.x, points[2]!.y, { steps: 6 });
      await expect(page.getByTestId('drafting-command-preview-polyline')).toHaveAttribute(
        'points',
        /.+ .+ .+/,
      );
      await page.mouse.click(points[2]!.x, points[2]!.y);
      await page.keyboard.press('Enter');

      await expect(page.getByTestId('drafting-command-preview-polyline')).toHaveCount(0);
      await expect(page.locator('[data-drafting-object-id]')).toHaveCount(1);
      const authoredPolylineId = await page
        .locator('[data-drafting-object-id]')
        .getAttribute('data-drafting-object-id');
      expect(authoredPolylineId).toBeTruthy();

      await page.getByRole('button', { name: 'Save' }).click();
      await expect(page.getByText('Saved').first()).toBeVisible();

      await page.reload();
      await expect(page.getByTestId('drafting-canvas-stage')).toBeVisible();
      await expect(page.locator('[data-drafting-object-id]')).toHaveCount(1);
      await expect(page.getByTestId(`drafting-object-${authoredPolylineId}`)).toHaveCount(1);

      const reloadedDrawing = await apiRequest<DraftingDrawing>(
        token,
        `/projects/${project.id}/drafting/drawings/${sandboxDrawing.id}`,
      );
      const authoredPolyline = reloadedDrawing.model.objects.find(
        (object): object is DraftingPolylineObject =>
          object.id === authoredPolylineId && object.type === 'draft_polyline',
      );
      expect(authoredPolyline).toBeDefined();
      expect(authoredPolyline!.geometry.points).toHaveLength(3);

      const downloadPromise = page.waitForEvent('download');
      await page.getByRole('button', { name: 'Export JSON' }).click();
      const download = await downloadPromise;
      const downloadPath = await download.path();
      expect(downloadPath).toBeTruthy();
      const exportedJson = await readDownloadedText(downloadPath!);
      const exported = JSON.parse(exportedJson) as { model: DraftingDrawing['model'] };
      const exportedPolyline = exported.model.objects.find(
        (object): object is DraftingPolylineObject =>
          object.id === authoredPolylineId && object.type === 'draft_polyline',
      );
      expect(exportedPolyline).toBeDefined();
      expect(exportedPolyline!.geometry.points).toHaveLength(3);
      expectExportIsMetadataOnly(exportedJson);

      await archiveDraftingSandbox(token, project.id, sandboxDrawing.id);
      sandboxArchived = true;

      await page.goto(`/projects/${project.id}/drafting`);
      await expect(page.getByText(sandboxDrawing.title)).toBeHidden();

      const untouchedProjectModel = await apiRequest<DraftingDrawing>(
        token,
        `/projects/${project.id}/drafting/drawings/${projectModel.id}`,
      );
      expect(untouchedProjectModel.model.objects).toHaveLength(0);
    } finally {
      if (!sandboxArchived) {
        await archiveDraftingSandbox(token, project.id, sandboxDrawing.id).catch(() => undefined);
      }
    }
  });

  test('authors a polygon through the shared command path and preserves the two-point downgrade', async ({
    page,
  }) => {
    const { email, password } = await signInWithSeedUser(page);
    const token = await getAuthToken(email, password);
    const project = await createQaProject(token);
    const projectModel = await createDraftingDrawing(token, project.id, {
      kind: 'model',
      title: 'Project Model',
    });
    const sandboxDrawing = await createDraftingDrawing(
      token,
      project.id,
      createTemporaryDraftingQaSandboxDrawingInput(new Date('2026-04-27T00:00:00.000Z')),
    );
    let sandboxArchived = false;

    try {
      await page.goto(`/projects/${project.id}/drafting/${sandboxDrawing.id}`);
      await expect(page.getByTestId('drafting-canvas-stage')).toBeVisible();
      await expect(page.locator('[data-drafting-object-id]')).toHaveCount(0);

      const canvas = page.getByTestId('drafting-canvas-svg');
      await canvas.scrollIntoViewIfNeeded();

      await startPathPreview({
        canvas,
        next: { xRatio: 0.42, yRatio: 0.42 },
        page,
        previewTestId: 'drafting-command-preview-polygon',
        start: { xRatio: 0.34, yRatio: 0.38 },
        toolLabel: 'Polygon',
      });
      await page.keyboard.press('Escape');
      await expect(page.getByTestId('drafting-command-preview-polygon')).toHaveCount(0);
      await expect(page.locator('[data-drafting-object-id]')).toHaveCount(0);

      await startPathPreview({
        canvas,
        next: { xRatio: 0.45, yRatio: 0.52 },
        page,
        previewTestId: 'drafting-command-preview-polygon',
        start: { xRatio: 0.36, yRatio: 0.48 },
        toolLabel: 'Polygon',
      });
      await page.getByRole('button', { exact: true, name: 'Select / Move' }).click();
      await expect(page.getByTestId('drafting-command-preview-polygon')).toHaveCount(0);
      await expect(page.locator('[data-drafting-object-id]')).toHaveCount(0);

      const downgradeRatios = [
        { xRatio: 0.38, yRatio: 0.58 },
        { xRatio: 0.48, yRatio: 0.6 },
      ];
      const downgradePreview = await startPathPreview({
        canvas,
        next: downgradeRatios[1]!,
        page,
        previewTestId: 'drafting-command-preview-polygon',
        start: downgradeRatios[0]!,
        toolLabel: 'Polygon',
      });
      await expect(page.getByTestId('drafting-command-preview-polygon')).toHaveAttribute(
        'points',
        /.+ .+/,
      );
      await page.mouse.click(downgradePreview.nextPoint.x, downgradePreview.nextPoint.y);
      await page.keyboard.press('Enter');

      await expect(page.getByTestId('drafting-command-preview-polygon')).toHaveCount(0);
      await expect(page.locator('[data-drafting-object-id]')).toHaveCount(1);

      const polygonRatios = [
        { xRatio: 0.56, yRatio: 0.56 },
        { xRatio: 0.66, yRatio: 0.56 },
        { xRatio: 0.62, yRatio: 0.68 },
      ];
      const polygonPreview = await startPathPreview({
        canvas,
        next: polygonRatios[1]!,
        page,
        previewTestId: 'drafting-command-preview-polygon',
        start: polygonRatios[0]!,
        toolLabel: 'Polygon',
      });
      await expect(page.getByTestId('drafting-command-preview-polygon')).toHaveAttribute(
        'points',
        /.+ .+/,
      );
      await page.mouse.click(polygonPreview.nextPoint.x, polygonPreview.nextPoint.y);
      await expect(page.getByText('2 point(s) captured for the current path.')).toBeVisible();
      const thirdPolygonPoint = await pointInLocator(canvas, polygonRatios[2]!);
      await page.mouse.move(thirdPolygonPoint.x, thirdPolygonPoint.y, { steps: 6 });
      await expect(page.getByTestId('drafting-command-preview-polygon')).toHaveAttribute(
        'points',
        /.+ .+ .+/,
      );
      await page.mouse.click(thirdPolygonPoint.x, thirdPolygonPoint.y);
      await page.keyboard.press('Enter');

      await expect(page.getByTestId('drafting-command-preview-polygon')).toHaveCount(0);
      await expect(page.locator('[data-drafting-object-id]')).toHaveCount(2);

      await page.getByRole('button', { name: 'Save' }).click();
      await expect(page.getByText('Saved').first()).toBeVisible();

      await page.reload();
      await expect(page.getByTestId('drafting-canvas-stage')).toBeVisible();
      await expect(page.locator('[data-drafting-object-id]')).toHaveCount(2);

      const reloadedDrawing = await apiRequest<DraftingDrawing>(
        token,
        `/projects/${project.id}/drafting/drawings/${sandboxDrawing.id}`,
      );
      const downgradedPolyline = reloadedDrawing.model.objects.find(
        (object): object is DraftingPolylineObject => object.type === 'draft_polyline',
      );
      const authoredPolygon = reloadedDrawing.model.objects.find(
        (object): object is DraftingPolygonObject => object.type === 'draft_polygon',
      );
      expect(downgradedPolyline).toBeDefined();
      expect(authoredPolygon).toBeDefined();
      expect(downgradedPolyline!.geometry.points).toHaveLength(2);
      expect(authoredPolygon!.geometry.points).toHaveLength(3);

      const downloadPromise = page.waitForEvent('download');
      await page.getByRole('button', { name: 'Export JSON' }).click();
      const download = await downloadPromise;
      const downloadPath = await download.path();
      expect(downloadPath).toBeTruthy();
      const exportedJson = await readDownloadedText(downloadPath!);
      const exported = JSON.parse(exportedJson) as { model: DraftingDrawing['model'] };
      const exportedPolyline = exported.model.objects.find(
        (object): object is DraftingPolylineObject =>
          object.id === downgradedPolyline!.id && object.type === 'draft_polyline',
      );
      const exportedPolygon = exported.model.objects.find(
        (object): object is DraftingPolygonObject =>
          object.id === authoredPolygon!.id && object.type === 'draft_polygon',
      );
      expect(exportedPolyline).toBeDefined();
      expect(exportedPolygon).toBeDefined();
      expect(exportedPolyline!.geometry.points).toHaveLength(2);
      expect(exportedPolygon!.geometry.points).toHaveLength(3);
      expectExportIsMetadataOnly(exportedJson);

      await archiveDraftingSandbox(token, project.id, sandboxDrawing.id);
      sandboxArchived = true;

      await page.goto(`/projects/${project.id}/drafting`);
      await expect(page.getByText(sandboxDrawing.title)).toBeHidden();

      const untouchedProjectModel = await apiRequest<DraftingDrawing>(
        token,
        `/projects/${project.id}/drafting/drawings/${projectModel.id}`,
      );
      expect(untouchedProjectModel.model.objects).toHaveLength(0);
    } finally {
      if (!sandboxArchived) {
        await archiveDraftingSandbox(token, project.id, sandboxDrawing.id).catch(() => undefined);
      }
    }
  });

  test('authors a section marker through the shared two-point command path', async ({ page }) => {
    const { email, password } = await signInWithSeedUser(page);
    const token = await getAuthToken(email, password);
    const project = await createQaProject(token);
    const projectModel = await createDraftingDrawing(token, project.id, {
      kind: 'model',
      title: 'Project Model',
    });
    const sandboxDrawing = await createDraftingDrawing(
      token,
      project.id,
      createTemporaryDraftingQaSandboxDrawingInput(new Date('2026-04-27T00:00:00.000Z')),
    );
    let sandboxArchived = false;

    try {
      await page.goto(`/projects/${project.id}/drafting/${sandboxDrawing.id}`);
      await expect(page.getByTestId('drafting-canvas-stage')).toBeVisible();
      await expect(page.locator('[data-drafting-object-id]')).toHaveCount(0);

      const canvas = page.getByTestId('drafting-canvas-svg');
      await canvas.scrollIntoViewIfNeeded();

      await startPrimitivePreview({
        canvas,
        page,
        previewTestId: 'drafting-command-preview-section-marker',
        start: { xRatio: 0.34, yRatio: 0.36 },
        end: { xRatio: 0.48, yRatio: 0.4 },
        toolLabel: 'Section marker',
      });
      await page.keyboard.press('Escape');
      await expect(page.getByTestId('drafting-command-preview-section-marker')).toHaveCount(0);
      await expect(page.locator('[data-drafting-object-id]')).toHaveCount(0);

      await startPrimitivePreview({
        canvas,
        page,
        previewTestId: 'drafting-command-preview-section-marker',
        start: { xRatio: 0.36, yRatio: 0.46 },
        end: { xRatio: 0.5, yRatio: 0.48 },
        toolLabel: 'Section marker',
      });
      await page.getByRole('button', { exact: true, name: 'Select / Move' }).click();
      await expect(page.getByTestId('drafting-command-preview-section-marker')).toHaveCount(0);
      await expect(page.locator('[data-drafting-object-id]')).toHaveCount(0);

      await authorTwoPointPrimitive({
        canvas,
        page,
        previewTestId: 'drafting-command-preview-section-marker',
        start: { xRatio: 0.38, yRatio: 0.58 },
        end: { xRatio: 0.58, yRatio: 0.58 },
        toolLabel: 'Section marker',
      });
      await expect(page.locator('[data-drafting-object-id]')).toHaveCount(1);
      const authoredSectionMarkerId = await page
        .locator('[data-drafting-object-id]')
        .getAttribute('data-drafting-object-id');
      expect(authoredSectionMarkerId).toBeTruthy();

      await page.getByRole('button', { name: 'Save' }).click();
      await expect(page.getByText('Saved').first()).toBeVisible();

      await page.reload();
      await expect(page.getByTestId('drafting-canvas-stage')).toBeVisible();
      await expect(page.locator('[data-drafting-object-id]')).toHaveCount(1);
      await expect(page.getByTestId(`drafting-object-${authoredSectionMarkerId}`)).toHaveCount(1);

      const reloadedDrawing = await apiRequest<DraftingDrawing>(
        token,
        `/projects/${project.id}/drafting/drawings/${sandboxDrawing.id}`,
      );
      const authoredSectionMarker = reloadedDrawing.model.objects.find(
        (object): object is DraftingSectionMarkerObject =>
          object.id === authoredSectionMarkerId && object.type === 'section_marker',
      );
      expect(authoredSectionMarker).toBeDefined();
      expect(authoredSectionMarker!.geometry.startPoint).not.toEqual(
        authoredSectionMarker!.geometry.endPoint,
      );
      expect(authoredSectionMarker!.parameters.sectionId).toBeTruthy();

      const downloadPromise = page.waitForEvent('download');
      await page.getByRole('button', { name: 'Export JSON' }).click();
      const download = await downloadPromise;
      const downloadPath = await download.path();
      expect(downloadPath).toBeTruthy();
      const exportedJson = await readDownloadedText(downloadPath!);
      const exported = JSON.parse(exportedJson) as { model: DraftingDrawing['model'] };
      const exportedSectionMarker = exported.model.objects.find(
        (object): object is DraftingSectionMarkerObject =>
          object.id === authoredSectionMarkerId && object.type === 'section_marker',
      );
      expect(exportedSectionMarker).toBeDefined();
      expect(exportedSectionMarker!.geometry.startPoint).not.toEqual(
        exportedSectionMarker!.geometry.endPoint,
      );
      expectExportIsMetadataOnly(exportedJson);

      await archiveDraftingSandbox(token, project.id, sandboxDrawing.id);
      sandboxArchived = true;

      await page.goto(`/projects/${project.id}/drafting`);
      await expect(page.getByText(sandboxDrawing.title)).toBeHidden();

      const untouchedProjectModel = await apiRequest<DraftingDrawing>(
        token,
        `/projects/${project.id}/drafting/drawings/${projectModel.id}`,
      );
      expect(untouchedProjectModel.model.objects).toHaveLength(0);
    } finally {
      if (!sandboxArchived) {
        await archiveDraftingSandbox(token, project.id, sandboxDrawing.id).catch(() => undefined);
      }
    }
  });

  test('authors a leader note through the shared one-point command path', async ({ page }) => {
    const { email, password } = await signInWithSeedUser(page);
    const token = await getAuthToken(email, password);
    const project = await createQaProject(token);
    const projectModel = await createDraftingDrawing(token, project.id, {
      kind: 'model',
      title: 'Project Model',
    });
    const sandboxDrawing = await createDraftingDrawing(
      token,
      project.id,
      createTemporaryDraftingQaSandboxDrawingInput(new Date('2026-04-27T00:00:00.000Z')),
    );
    let sandboxArchived = false;

    try {
      await page.goto(`/projects/${project.id}/drafting/${sandboxDrawing.id}`);
      await expect(page.getByTestId('drafting-canvas-stage')).toBeVisible();
      await expect(page.locator('[data-drafting-object-id]')).toHaveCount(0);

      const canvas = page.getByTestId('drafting-canvas-svg');
      await canvas.scrollIntoViewIfNeeded();
      const previewPoint = await pointInLocator(canvas, { xRatio: 0.42, yRatio: 0.46 });

      const toolButton = page.getByRole('button', { exact: true, name: 'Leader note' });
      await toolButton.click();
      await expect(toolButton).toHaveAttribute('aria-pressed', 'true');
      await page.mouse.move(previewPoint.x, previewPoint.y, { steps: 4 });
      await page.keyboard.press('Escape');
      await expect(page.getByTestId('drafting-command-preview-leader-note')).toHaveCount(0);
      await expect(page.locator('[data-drafting-object-id]')).toHaveCount(0);

      await toolButton.click();
      await page.mouse.move(previewPoint.x, previewPoint.y, { steps: 4 });
      await page.getByRole('button', { exact: true, name: 'Select / Move' }).click();
      await expect(page.getByTestId('drafting-command-preview-leader-note')).toHaveCount(0);
      await expect(page.locator('[data-drafting-object-id]')).toHaveCount(0);

      await toolButton.click();
      await expect(toolButton).toHaveAttribute('aria-pressed', 'true');
      const anchorRatio = { xRatio: 0.46, yRatio: 0.58 };
      const anchorPoint = await pointInLocator(canvas, anchorRatio);
      await page.mouse.move(anchorPoint.x, anchorPoint.y, { steps: 4 });
      await clickInLocator(canvas, anchorRatio);
      await expect(page.getByTestId('drafting-command-preview-leader-note')).toHaveCount(0);
      await expect(page.locator('[data-drafting-object-id]')).toHaveCount(1);
      const authoredLeaderNoteId = await page
        .locator('[data-drafting-object-id]')
        .getAttribute('data-drafting-object-id');
      expect(authoredLeaderNoteId).toBeTruthy();

      await page.getByRole('button', { name: 'Save' }).click();
      await expect(page.getByText('Saved').first()).toBeVisible();

      await page.reload();
      await expect(page.getByTestId('drafting-canvas-stage')).toBeVisible();
      await expect(page.locator('[data-drafting-object-id]')).toHaveCount(1);
      await expect(page.getByTestId(`drafting-object-${authoredLeaderNoteId}`)).toHaveCount(1);

      const reloadedDrawing = await apiRequest<DraftingDrawing>(
        token,
        `/projects/${project.id}/drafting/drawings/${sandboxDrawing.id}`,
      );
      const authoredLeaderNote = reloadedDrawing.model.objects.find(
        (object): object is DraftingLeaderNoteObject =>
          object.id === authoredLeaderNoteId && object.type === 'leader_note',
      );
      expect(authoredLeaderNote).toBeDefined();
      expect(authoredLeaderNote!.geometry.anchor).not.toEqual(
        authoredLeaderNote!.geometry.textPoint,
      );
      expect(authoredLeaderNote!.metadata.text).toMatch(/^Draft note \d+$/);

      const downloadPromise = page.waitForEvent('download');
      await page.getByRole('button', { name: 'Export JSON' }).click();
      const download = await downloadPromise;
      const downloadPath = await download.path();
      expect(downloadPath).toBeTruthy();
      const exportedJson = await readDownloadedText(downloadPath!);
      const exported = JSON.parse(exportedJson) as { model: DraftingDrawing['model'] };
      const exportedLeaderNote = exported.model.objects.find(
        (object): object is DraftingLeaderNoteObject =>
          object.id === authoredLeaderNoteId && object.type === 'leader_note',
      );
      expect(exportedLeaderNote).toBeDefined();
      expect(exportedLeaderNote!.geometry.anchor).not.toEqual(
        exportedLeaderNote!.geometry.textPoint,
      );
      expect(exportedLeaderNote!.metadata.text).toBe(authoredLeaderNote!.metadata.text);
      expectExportIsMetadataOnly(exportedJson);

      await archiveDraftingSandbox(token, project.id, sandboxDrawing.id);
      sandboxArchived = true;

      await page.goto(`/projects/${project.id}/drafting`);
      await expect(page.getByText(sandboxDrawing.title)).toBeHidden();

      const untouchedProjectModel = await apiRequest<DraftingDrawing>(
        token,
        `/projects/${project.id}/drafting/drawings/${projectModel.id}`,
      );
      expect(untouchedProjectModel.model.objects).toHaveLength(0);
    } finally {
      if (!sandboxArchived) {
        await archiveDraftingSandbox(token, project.id, sandboxDrawing.id).catch(() => undefined);
      }
    }
  });

  test('authors a callout through the shared one-point command path', async ({ page }) => {
    const { email, password } = await signInWithSeedUser(page);
    const token = await getAuthToken(email, password);
    const project = await createQaProject(token);
    const projectModel = await createDraftingDrawing(token, project.id, {
      kind: 'model',
      title: 'Project Model',
    });
    const sandboxDrawing = await createDraftingDrawing(
      token,
      project.id,
      createTemporaryDraftingQaSandboxDrawingInput(new Date('2026-04-27T00:00:00.000Z')),
    );
    let sandboxArchived = false;

    try {
      await page.goto(`/projects/${project.id}/drafting/${sandboxDrawing.id}`);
      await expect(page.getByTestId('drafting-canvas-stage')).toBeVisible();
      await expect(page.locator('[data-drafting-object-id]')).toHaveCount(0);

      const canvas = page.getByTestId('drafting-canvas-svg');
      await canvas.scrollIntoViewIfNeeded();
      const previewPoint = await pointInLocator(canvas, { xRatio: 0.42, yRatio: 0.46 });

      const toolButton = page.getByRole('button', { exact: true, name: 'Callout' });
      await toolButton.click();
      await expect(toolButton).toHaveAttribute('aria-pressed', 'true');
      await page.mouse.move(previewPoint.x, previewPoint.y, { steps: 4 });
      await page.keyboard.press('Escape');
      await expect(page.getByTestId('drafting-command-preview-callout')).toHaveCount(0);
      await expect(page.locator('[data-drafting-object-id]')).toHaveCount(0);

      await toolButton.click();
      await page.mouse.move(previewPoint.x, previewPoint.y, { steps: 4 });
      await page.getByRole('button', { exact: true, name: 'Select / Move' }).click();
      await expect(page.getByTestId('drafting-command-preview-callout')).toHaveCount(0);
      await expect(page.locator('[data-drafting-object-id]')).toHaveCount(0);

      await toolButton.click();
      await expect(toolButton).toHaveAttribute('aria-pressed', 'true');
      const anchorRatio = { xRatio: 0.46, yRatio: 0.58 };
      const anchorPoint = await pointInLocator(canvas, anchorRatio);
      await page.mouse.move(anchorPoint.x, anchorPoint.y, { steps: 4 });
      await clickInLocator(canvas, anchorRatio);
      await expect(page.getByTestId('drafting-command-preview-callout')).toHaveCount(0);
      await expect(page.locator('[data-drafting-object-id]')).toHaveCount(1);
      const authoredCalloutId = await page
        .locator('[data-drafting-object-id]')
        .getAttribute('data-drafting-object-id');
      expect(authoredCalloutId).toBeTruthy();

      await page.getByRole('button', { name: 'Save' }).click();
      await expect(page.getByText('Saved').first()).toBeVisible();

      await page.reload();
      await expect(page.getByTestId('drafting-canvas-stage')).toBeVisible();
      await expect(page.locator('[data-drafting-object-id]')).toHaveCount(1);
      await expect(page.getByTestId(`drafting-object-${authoredCalloutId}`)).toHaveCount(1);

      const reloadedDrawing = await apiRequest<DraftingDrawing>(
        token,
        `/projects/${project.id}/drafting/drawings/${sandboxDrawing.id}`,
      );
      const authoredCallout = reloadedDrawing.model.objects.find(
        (object): object is DraftingCalloutObject =>
          object.id === authoredCalloutId && object.type === 'callout',
      );
      expect(authoredCallout).toBeDefined();
      expect(authoredCallout!.geometry.anchorPoint).not.toEqual(
        authoredCallout!.geometry.labelPoint,
      );
      expect(authoredCallout!.parameters.calloutId).toMatch(/^CO\d+$/);
      expect(authoredCallout!.parameters.title).toMatch(/^Callout \d+$/);
      expect(authoredCallout!.parameters.body).toBe('Coordination note');
      expect(authoredCallout!.parameters.leaderStyle).toBe('dogleg');
      expect(authoredCallout!.parameters.arrowStyle).toBe('filled');

      const downloadPromise = page.waitForEvent('download');
      await page.getByRole('button', { name: 'Export JSON' }).click();
      const download = await downloadPromise;
      const downloadPath = await download.path();
      expect(downloadPath).toBeTruthy();
      const exportedJson = await readDownloadedText(downloadPath!);
      const exported = JSON.parse(exportedJson) as { model: DraftingDrawing['model'] };
      const exportedCallout = exported.model.objects.find(
        (object): object is DraftingCalloutObject =>
          object.id === authoredCalloutId && object.type === 'callout',
      );
      expect(exportedCallout).toBeDefined();
      expect(exportedCallout!.geometry.anchorPoint).not.toEqual(
        exportedCallout!.geometry.labelPoint,
      );
      expect(exportedCallout!.parameters.calloutId).toBe(authoredCallout!.parameters.calloutId);
      expect(exportedCallout!.parameters.title).toBe(authoredCallout!.parameters.title);
      expect(exportedCallout!.parameters.body).toBe('Coordination note');
      expectExportIsMetadataOnly(exportedJson);

      await page.goto(`/projects/${project.id}/drafting/${sandboxDrawing.id}/schedules/preview`);
      await expect(page.getByText(authoredCallout!.parameters.calloutId)).toBeVisible();
      await expect(page.getByText('Coordination note')).toBeVisible();

      await archiveDraftingSandbox(token, project.id, sandboxDrawing.id);
      sandboxArchived = true;

      await page.goto(`/projects/${project.id}/drafting`);
      await expect(page.getByText(sandboxDrawing.title)).toBeHidden();

      const untouchedProjectModel = await apiRequest<DraftingDrawing>(
        token,
        `/projects/${project.id}/drafting/drawings/${projectModel.id}`,
      );
      expect(untouchedProjectModel.model.objects).toHaveLength(0);
    } finally {
      if (!sandboxArchived) {
        await archiveDraftingSandbox(token, project.id, sandboxDrawing.id).catch(() => undefined);
      }
    }
  });

  test('authors a manual monitoring point through the shared source-placement command path', async ({
    page,
  }) => {
    const { email, password } = await signInWithSeedUser(page);
    const token = await getAuthToken(email, password);
    const project = await createQaProject(token);
    const projectModel = await createDraftingDrawing(token, project.id, {
      kind: 'model',
      title: 'Project Model',
    });
    const sandboxDrawing = await createDraftingDrawing(
      token,
      project.id,
      createTemporaryDraftingQaSandboxDrawingInput(new Date('2026-04-27T00:00:00.000Z')),
    );
    let sandboxArchived = false;

    try {
      await page.goto(`/projects/${project.id}/drafting/${sandboxDrawing.id}`);
      await expect(page.getByTestId('drafting-canvas-stage')).toBeVisible();
      await expect(page.locator('[data-drafting-object-id]')).toHaveCount(0);

      const canvas = page.getByTestId('drafting-canvas-svg');
      await canvas.scrollIntoViewIfNeeded();
      const previewPoint = await pointInLocator(canvas, { xRatio: 0.42, yRatio: 0.46 });

      const toolButton = page.getByRole('button', { exact: true, name: 'Monitoring point' });
      await toolButton.click();
      await expect(toolButton).toHaveAttribute('aria-pressed', 'true');
      await page.mouse.move(previewPoint.x, previewPoint.y, { steps: 4 });
      await page.keyboard.press('Escape');
      await expect(page.getByTestId('drafting-command-preview-monitoring-point')).toHaveCount(0);
      await expect(page.locator('[data-drafting-object-id]')).toHaveCount(0);

      await toolButton.click();
      await page.mouse.move(previewPoint.x, previewPoint.y, { steps: 4 });
      await page.getByRole('button', { exact: true, name: 'Select / Move' }).click();
      await expect(page.getByTestId('drafting-command-preview-monitoring-point')).toHaveCount(0);
      await expect(page.locator('[data-drafting-object-id]')).toHaveCount(0);

      await toolButton.click();
      await expect(toolButton).toHaveAttribute('aria-pressed', 'true');
      const placementRatio = { xRatio: 0.48, yRatio: 0.56 };
      const placementPoint = await pointInLocator(canvas, placementRatio);
      await page.mouse.move(placementPoint.x, placementPoint.y, { steps: 4 });
      await clickInLocator(canvas, placementRatio);
      await expect(page.getByTestId('drafting-command-preview-monitoring-point')).toHaveCount(0);
      await expect(page.locator('[data-drafting-object-id]')).toHaveCount(1);
      const authoredMonitoringPointId = await page
        .locator('[data-drafting-object-id]')
        .getAttribute('data-drafting-object-id');
      expect(authoredMonitoringPointId).toBeTruthy();

      await page.getByRole('button', { name: 'Save' }).click();
      await expect(page.getByText('Saved').first()).toBeVisible();

      await page.reload();
      await expect(page.getByTestId('drafting-canvas-stage')).toBeVisible();
      await expect(page.locator('[data-drafting-object-id]')).toHaveCount(1);
      await expect(page.getByTestId(`drafting-object-${authoredMonitoringPointId}`)).toHaveCount(1);

      const reloadedDrawing = await apiRequest<DraftingDrawing>(
        token,
        `/projects/${project.id}/drafting/drawings/${sandboxDrawing.id}`,
      );
      const authoredMonitoringPoint = reloadedDrawing.model.objects.find(
        (object): object is DraftingMonitoringPointObject =>
          object.id === authoredMonitoringPointId && object.type === 'monitoring_point',
      );
      expect(authoredMonitoringPoint).toBeDefined();
      expect(authoredMonitoringPoint!.geometry.point).toEqual(
        expect.objectContaining({
          x: expect.any(Number),
          y: expect.any(Number),
        }),
      );
      expect(authoredMonitoringPoint!.metadata.pointId).toMatch(/^MP\d+$/);
      expect(authoredMonitoringPoint!.metadata.monitoringType).toBe('vibration');
      expect(authoredMonitoringPoint!.sourceRef).toMatchObject({
        sourceType: 'manual',
        status: 'manual',
      });
      expect(authoredMonitoringPoint!.sourceRef?.sourceId).toBeUndefined();

      const downloadPromise = page.waitForEvent('download');
      await page.getByRole('button', { name: 'Export JSON' }).click();
      const download = await downloadPromise;
      const downloadPath = await download.path();
      expect(downloadPath).toBeTruthy();
      const exportedJson = await readDownloadedText(downloadPath!);
      const exported = JSON.parse(exportedJson) as { model: DraftingDrawing['model'] };
      const exportedMonitoringPoint = exported.model.objects.find(
        (object): object is DraftingMonitoringPointObject =>
          object.id === authoredMonitoringPointId && object.type === 'monitoring_point',
      );
      expect(exportedMonitoringPoint).toBeDefined();
      expect(exportedMonitoringPoint!.geometry.point).toEqual(
        expect.objectContaining({
          x: expect.any(Number),
          y: expect.any(Number),
        }),
      );
      expect(exportedMonitoringPoint!.metadata.pointId).toBe(
        authoredMonitoringPoint!.metadata.pointId,
      );
      expect(exportedMonitoringPoint!.sourceRef).toMatchObject({
        sourceType: 'manual',
        status: 'manual',
      });
      expectExportIsMetadataOnly(exportedJson);

      await page.goto(`/projects/${project.id}/drafting/${sandboxDrawing.id}/schedules/preview`);
      await expect(page.getByText(authoredMonitoringPoint!.metadata.pointId)).toBeVisible();
      await expect(page.getByText('vibration')).toBeVisible();

      await archiveDraftingSandbox(token, project.id, sandboxDrawing.id);
      sandboxArchived = true;

      await page.goto(`/projects/${project.id}/drafting`);
      await expect(page.getByText(sandboxDrawing.title)).toBeHidden();

      const untouchedProjectModel = await apiRequest<DraftingDrawing>(
        token,
        `/projects/${project.id}/drafting/drawings/${projectModel.id}`,
      );
      expect(untouchedProjectModel.model.objects).toHaveLength(0);
    } finally {
      if (!sandboxArchived) {
        await archiveDraftingSandbox(token, project.id, sandboxDrawing.id).catch(() => undefined);
      }
    }
  });

  test('authors a manual structural joint through the shared source-placement command path', async ({
    page,
  }) => {
    const { email, password } = await signInWithSeedUser(page);
    const token = await getAuthToken(email, password);
    const project = await createQaProject(token);
    const projectModel = await createDraftingDrawing(token, project.id, {
      kind: 'model',
      title: 'Project Model',
    });
    const sandboxDrawing = await createDraftingDrawing(
      token,
      project.id,
      createTemporaryDraftingQaSandboxDrawingInput(new Date('2026-04-27T00:00:00.000Z')),
    );
    let sandboxArchived = false;

    try {
      await page.goto(`/projects/${project.id}/drafting/${sandboxDrawing.id}`);
      await expect(page.getByTestId('drafting-canvas-stage')).toBeVisible();
      await expect(page.locator('[data-drafting-object-id]')).toHaveCount(0);

      const canvas = page.getByTestId('drafting-canvas-svg');
      await canvas.scrollIntoViewIfNeeded();
      const previewPoint = await pointInLocator(canvas, { xRatio: 0.42, yRatio: 0.46 });

      const toolButton = page.getByRole('button', { exact: true, name: 'Joint / node' });
      await toolButton.click();
      await expect(toolButton).toHaveAttribute('aria-pressed', 'true');
      await page.mouse.move(previewPoint.x, previewPoint.y, { steps: 4 });
      await page.keyboard.press('Escape');
      await expect(page.getByTestId('drafting-command-preview-structural-joint')).toHaveCount(0);
      await expect(page.locator('[data-drafting-object-id]')).toHaveCount(0);

      await toolButton.click();
      await page.mouse.move(previewPoint.x, previewPoint.y, { steps: 4 });
      await page.getByRole('button', { exact: true, name: 'Select / Move' }).click();
      await expect(page.getByTestId('drafting-command-preview-structural-joint')).toHaveCount(0);
      await expect(page.locator('[data-drafting-object-id]')).toHaveCount(0);

      await toolButton.click();
      await expect(toolButton).toHaveAttribute('aria-pressed', 'true');
      const placementRatio = { xRatio: 0.48, yRatio: 0.56 };
      const placementPoint = await pointInLocator(canvas, placementRatio);
      await page.mouse.move(placementPoint.x, placementPoint.y, { steps: 4 });
      await clickInLocator(canvas, placementRatio);
      await expect(page.getByTestId('drafting-command-preview-structural-joint')).toHaveCount(0);
      await expect(page.locator('[data-drafting-object-id]')).toHaveCount(1);
      const authoredStructuralJointId = await page
        .locator('[data-drafting-object-id]')
        .getAttribute('data-drafting-object-id');
      expect(authoredStructuralJointId).toBeTruthy();

      await page.getByRole('button', { name: 'Save' }).click();
      await expect(page.getByText('Saved').first()).toBeVisible();

      await page.reload();
      await expect(page.getByTestId('drafting-canvas-stage')).toBeVisible();
      await expect(page.locator('[data-drafting-object-id]')).toHaveCount(1);
      await expect(page.getByTestId(`drafting-object-${authoredStructuralJointId}`)).toHaveCount(1);

      const reloadedDrawing = await apiRequest<DraftingDrawing>(
        token,
        `/projects/${project.id}/drafting/drawings/${sandboxDrawing.id}`,
      );
      const authoredStructuralJoint = reloadedDrawing.model.objects.find(
        (object): object is DraftingStructuralJointObject =>
          object.id === authoredStructuralJointId && object.type === 'structural_joint',
      );
      expect(authoredStructuralJoint).toBeDefined();
      expect(authoredStructuralJoint!.geometry.point).toEqual(
        expect.objectContaining({
          x: expect.any(Number),
          y: expect.any(Number),
        }),
      );
      expect(authoredStructuralJoint!.parameters.jointId).toMatch(/^J-NEW-\d{3}$/);
      expect(authoredStructuralJoint!.parameters.label).toBe(
        authoredStructuralJoint!.parameters.jointId,
      );
      expect(authoredStructuralJoint!.parameters.loadEnabled).toBe(false);
      expect(authoredStructuralJoint!.sourceRef).toMatchObject({
        sourceType: 'manual',
        status: 'manual',
      });
      expect(authoredStructuralJoint!.sourceRef?.sourceId).toBeUndefined();

      const downloadPromise = page.waitForEvent('download');
      await page.getByRole('button', { name: 'Export JSON' }).click();
      const download = await downloadPromise;
      const downloadPath = await download.path();
      expect(downloadPath).toBeTruthy();
      const exportedJson = await readDownloadedText(downloadPath!);
      const exported = JSON.parse(exportedJson) as { model: DraftingDrawing['model'] };
      const exportedStructuralJoint = exported.model.objects.find(
        (object): object is DraftingStructuralJointObject =>
          object.id === authoredStructuralJointId && object.type === 'structural_joint',
      );
      expect(exportedStructuralJoint).toBeDefined();
      expect(exportedStructuralJoint!.geometry.point).toEqual(
        expect.objectContaining({
          x: expect.any(Number),
          y: expect.any(Number),
        }),
      );
      expect(exportedStructuralJoint!.parameters.jointId).toBe(
        authoredStructuralJoint!.parameters.jointId,
      );
      expect(exportedStructuralJoint!.sourceRef).toMatchObject({
        sourceType: 'manual',
        status: 'manual',
      });
      expectExportIsMetadataOnly(exportedJson);

      await archiveDraftingSandbox(token, project.id, sandboxDrawing.id);
      sandboxArchived = true;

      await page.goto(`/projects/${project.id}/drafting`);
      await expect(page.getByText(sandboxDrawing.title)).toBeHidden();

      const untouchedProjectModel = await apiRequest<DraftingDrawing>(
        token,
        `/projects/${project.id}/drafting/drawings/${projectModel.id}`,
      );
      expect(untouchedProjectModel.model.objects).toHaveLength(0);
    } finally {
      if (!sandboxArchived) {
        await archiveDraftingSandbox(token, project.id, sandboxDrawing.id).catch(() => undefined);
      }
    }
  });

  test('authors a manual service crossing through the shared source-placement command path', async ({
    page,
  }) => {
    const { email, password } = await signInWithSeedUser(page);
    const token = await getAuthToken(email, password);
    const project = await createQaProject(token);
    const projectModel = await createDraftingDrawing(token, project.id, {
      kind: 'model',
      title: 'Project Model',
    });
    const sandboxDrawing = await createDraftingDrawing(
      token,
      project.id,
      createTemporaryDraftingQaSandboxDrawingInput(new Date('2026-04-27T00:00:00.000Z')),
    );
    let sandboxArchived = false;

    try {
      await page.goto(`/projects/${project.id}/drafting/${sandboxDrawing.id}`);
      await expect(page.getByTestId('drafting-canvas-stage')).toBeVisible();
      await expect(page.locator('[data-drafting-object-id]')).toHaveCount(0);

      const canvas = page.getByTestId('drafting-canvas-svg');
      await canvas.scrollIntoViewIfNeeded();
      const previewPoint = await pointInLocator(canvas, { xRatio: 0.42, yRatio: 0.46 });

      const toolButton = page.getByRole('button', { exact: true, name: 'Service crossing' });
      await toolButton.click();
      await expect(toolButton).toHaveAttribute('aria-pressed', 'true');
      await page.mouse.move(previewPoint.x, previewPoint.y, { steps: 4 });
      await page.keyboard.press('Escape');
      await expect(page.getByTestId('drafting-command-preview-service-crossing')).toHaveCount(0);
      await expect(page.locator('[data-drafting-object-id]')).toHaveCount(0);

      await toolButton.click();
      await page.mouse.move(previewPoint.x, previewPoint.y, { steps: 4 });
      await page.getByRole('button', { exact: true, name: 'Select / Move' }).click();
      await expect(page.getByTestId('drafting-command-preview-service-crossing')).toHaveCount(0);
      await expect(page.locator('[data-drafting-object-id]')).toHaveCount(0);

      await toolButton.click();
      await expect(toolButton).toHaveAttribute('aria-pressed', 'true');
      const placementRatio = { xRatio: 0.48, yRatio: 0.56 };
      const placementPoint = await pointInLocator(canvas, placementRatio);
      await page.mouse.move(placementPoint.x, placementPoint.y, { steps: 4 });
      await clickInLocator(canvas, placementRatio);
      await expect(page.getByTestId('drafting-command-preview-service-crossing')).toHaveCount(0);
      await expect(page.locator('[data-drafting-object-id]')).toHaveCount(1);
      const authoredServiceCrossingId = await page
        .locator('[data-drafting-object-id]')
        .getAttribute('data-drafting-object-id');
      expect(authoredServiceCrossingId).toBeTruthy();

      await page.getByRole('button', { name: 'Save' }).click();
      await expect(page.getByText('Saved').first()).toBeVisible();

      await page.reload();
      await expect(page.getByTestId('drafting-canvas-stage')).toBeVisible();
      await expect(page.locator('[data-drafting-object-id]')).toHaveCount(1);
      await expect(page.getByTestId(`drafting-object-${authoredServiceCrossingId}`)).toHaveCount(1);

      const reloadedDrawing = await apiRequest<DraftingDrawing>(
        token,
        `/projects/${project.id}/drafting/drawings/${sandboxDrawing.id}`,
      );
      const authoredServiceCrossing = reloadedDrawing.model.objects.find(
        (object): object is DraftingServiceCrossingObject =>
          object.id === authoredServiceCrossingId && object.type === 'service_crossing',
      );
      expect(authoredServiceCrossing).toBeDefined();
      expect(authoredServiceCrossing!.geometry.crossingPoint).toEqual(
        expect.objectContaining({
          x: expect.any(Number),
          y: expect.any(Number),
        }),
      );
      expect(authoredServiceCrossing!.parameters.crossingId).toMatch(/^SC\d+$/);
      expect(authoredServiceCrossing!.parameters.serviceType).toBe('unknown');
      expect(authoredServiceCrossing!.parameters.conflictType).toBe('unknown');
      expect(authoredServiceCrossing!.parameters.clearanceMm).toBe(0);
      expect(authoredServiceCrossing!.parameters.riskStatus).toBe('open');
      expect(authoredServiceCrossing!.metadata).toMatchObject({
        linkedObjectId: '',
        linkedServiceRunId: '',
        notes: '',
      });
      expect(authoredServiceCrossing!.sourceRef).toMatchObject({
        sourceType: 'manual',
        status: 'manual',
      });
      expect(authoredServiceCrossing!.sourceRef?.sourceId).toBeUndefined();

      const downloadPromise = page.waitForEvent('download');
      await page.getByRole('button', { name: 'Export JSON' }).click();
      const download = await downloadPromise;
      const downloadPath = await download.path();
      expect(downloadPath).toBeTruthy();
      const exportedJson = await readDownloadedText(downloadPath!);
      const exported = JSON.parse(exportedJson) as { model: DraftingDrawing['model'] };
      const exportedServiceCrossing = exported.model.objects.find(
        (object): object is DraftingServiceCrossingObject =>
          object.id === authoredServiceCrossingId && object.type === 'service_crossing',
      );
      expect(exportedServiceCrossing).toBeDefined();
      expect(exportedServiceCrossing!.geometry.crossingPoint).toEqual(
        expect.objectContaining({
          x: expect.any(Number),
          y: expect.any(Number),
        }),
      );
      expect(exportedServiceCrossing!.parameters.crossingId).toBe(
        authoredServiceCrossing!.parameters.crossingId,
      );
      expect(exportedServiceCrossing!.parameters.serviceType).toBe('unknown');
      expect(exportedServiceCrossing!.sourceRef).toMatchObject({
        sourceType: 'manual',
        status: 'manual',
      });
      expectExportIsMetadataOnly(exportedJson);

      await page.goto(`/projects/${project.id}/drafting/${sandboxDrawing.id}/schedules/preview`);
      await expect(page.getByText(authoredServiceCrossing!.parameters.crossingId)).toBeVisible();
      await expect(page.getByText('service crossing')).toBeVisible();
      await expect(page.getByText('sketch / unlinked')).toBeVisible();

      await archiveDraftingSandbox(token, project.id, sandboxDrawing.id);
      sandboxArchived = true;

      await page.goto(`/projects/${project.id}/drafting`);
      await expect(page.getByText(sandboxDrawing.title)).toBeHidden();

      const untouchedProjectModel = await apiRequest<DraftingDrawing>(
        token,
        `/projects/${project.id}/drafting/drawings/${projectModel.id}`,
      );
      expect(untouchedProjectModel.model.objects).toHaveLength(0);
    } finally {
      if (!sandboxArchived) {
        await archiveDraftingSandbox(token, project.id, sandboxDrawing.id).catch(() => undefined);
      }
    }
  });

  test('authors a manual borehole through the shared source-placement command path', async ({
    page,
  }) => {
    const { email, password } = await signInWithSeedUser(page);
    const token = await getAuthToken(email, password);
    const project = await createQaProject(token);
    const projectModel = await createDraftingDrawing(token, project.id, {
      kind: 'model',
      title: 'Project Model',
    });
    const sandboxDrawing = await createDraftingDrawing(
      token,
      project.id,
      createTemporaryDraftingQaSandboxDrawingInput(new Date('2026-04-27T00:00:00.000Z')),
    );
    let sandboxArchived = false;

    try {
      await page.goto(`/projects/${project.id}/drafting/${sandboxDrawing.id}`);
      await expect(page.getByTestId('drafting-canvas-stage')).toBeVisible();
      await expect(page.locator('[data-drafting-object-id]')).toHaveCount(0);

      const canvas = page.getByTestId('drafting-canvas-svg');
      await canvas.scrollIntoViewIfNeeded();
      const previewPoint = await pointInLocator(canvas, { xRatio: 0.42, yRatio: 0.46 });

      const toolButton = page.getByRole('button', { exact: true, name: 'Borehole' });
      await toolButton.click();
      await expect(toolButton).toHaveAttribute('aria-pressed', 'true');
      await page.mouse.move(previewPoint.x, previewPoint.y, { steps: 4 });
      await page.keyboard.press('Escape');
      await expect(page.getByTestId('drafting-command-preview-borehole')).toHaveCount(0);
      await expect(page.locator('[data-drafting-object-id]')).toHaveCount(0);

      await toolButton.click();
      await page.mouse.move(previewPoint.x, previewPoint.y, { steps: 4 });
      await page.getByRole('button', { exact: true, name: 'Select / Move' }).click();
      await expect(page.getByTestId('drafting-command-preview-borehole')).toHaveCount(0);
      await expect(page.locator('[data-drafting-object-id]')).toHaveCount(0);

      await toolButton.click();
      await expect(toolButton).toHaveAttribute('aria-pressed', 'true');
      const placementRatio = { xRatio: 0.48, yRatio: 0.56 };
      const placementPoint = await pointInLocator(canvas, placementRatio);
      await page.mouse.move(placementPoint.x, placementPoint.y, { steps: 4 });
      await clickInLocator(canvas, placementRatio);
      await expect(page.getByTestId('drafting-command-preview-borehole')).toHaveCount(0);
      await expect(page.locator('[data-drafting-object-id]')).toHaveCount(1);
      const authoredBoreholeId = await page
        .locator('[data-drafting-object-id]')
        .getAttribute('data-drafting-object-id');
      expect(authoredBoreholeId).toBeTruthy();

      await page.getByRole('button', { name: 'Save' }).click();
      await expect(page.getByText('Saved').first()).toBeVisible();

      await page.reload();
      await expect(page.getByTestId('drafting-canvas-stage')).toBeVisible();
      await expect(page.locator('[data-drafting-object-id]')).toHaveCount(1);
      await expect(page.getByTestId(`drafting-object-${authoredBoreholeId}`)).toHaveCount(1);

      const reloadedDrawing = await apiRequest<DraftingDrawing>(
        token,
        `/projects/${project.id}/drafting/drawings/${sandboxDrawing.id}`,
      );
      const authoredBorehole = reloadedDrawing.model.objects.find(
        (object): object is DraftingBoreholeObject =>
          object.id === authoredBoreholeId && object.type === 'borehole',
      );
      expect(authoredBorehole).toBeDefined();
      expect(authoredBorehole!.geometry.point).toEqual(
        expect.objectContaining({
          x: expect.any(Number),
          y: expect.any(Number),
        }),
      );
      expect(authoredBorehole!.parameters.boreholeId).toMatch(/^BH\d+$/);
      expect(authoredBorehole!.parameters.label).toMatch(/^BH-\d{2}$/);
      expect(authoredBorehole!.parameters.groundLevelRl).toBeUndefined();
      expect(authoredBorehole!.parameters.terminationLevelRl).toBeUndefined();
      expect(authoredBorehole!.parameters.boreholeType).toBe('');
      expect(authoredBorehole!.metadata).toMatchObject({
        linkedGeotechEntityId: '',
        notes: '',
        sourceReference: '',
      });
      expect(authoredBorehole!.sourceRef).toMatchObject({
        sourceType: 'manual',
        status: 'manual',
      });
      expect(authoredBorehole!.sourceRef?.sourceId).toBeUndefined();

      const downloadPromise = page.waitForEvent('download');
      await page.getByRole('button', { name: 'Export JSON' }).click();
      const download = await downloadPromise;
      const downloadPath = await download.path();
      expect(downloadPath).toBeTruthy();
      const exportedJson = await readDownloadedText(downloadPath!);
      const exported = JSON.parse(exportedJson) as { model: DraftingDrawing['model'] };
      const exportedBorehole = exported.model.objects.find(
        (object): object is DraftingBoreholeObject =>
          object.id === authoredBoreholeId && object.type === 'borehole',
      );
      expect(exportedBorehole).toBeDefined();
      expect(exportedBorehole!.geometry.point).toEqual(
        expect.objectContaining({
          x: expect.any(Number),
          y: expect.any(Number),
        }),
      );
      expect(exportedBorehole!.parameters.boreholeId).toBe(authoredBorehole!.parameters.boreholeId);
      expect(exportedBorehole!.parameters.groundLevelRl).toBeUndefined();
      expect(exportedBorehole!.parameters.terminationLevelRl).toBeUndefined();
      expect(exportedBorehole!.sourceRef).toMatchObject({
        sourceType: 'manual',
        status: 'manual',
      });
      expectExportIsMetadataOnly(exportedJson);

      await page.goto(`/projects/${project.id}/drafting/${sandboxDrawing.id}/schedules/preview`);
      await expect(page.getByText(authoredBorehole!.parameters.boreholeId)).toBeVisible();
      await expect(page.getByText(authoredBorehole!.parameters.label)).toBeVisible();
      await expect(page.getByText('manual')).toBeVisible();

      await archiveDraftingSandbox(token, project.id, sandboxDrawing.id);
      sandboxArchived = true;

      await page.goto(`/projects/${project.id}/drafting`);
      await expect(page.getByText(sandboxDrawing.title)).toBeHidden();

      const untouchedProjectModel = await apiRequest<DraftingDrawing>(
        token,
        `/projects/${project.id}/drafting/drawings/${projectModel.id}`,
      );
      expect(untouchedProjectModel.model.objects).toHaveLength(0);
    } finally {
      if (!sandboxArchived) {
        await archiveDraftingSandbox(token, project.id, sandboxDrawing.id).catch(() => undefined);
      }
    }
  });

  test('authors a manual pile through the shared source-placement command path', async ({
    page,
  }) => {
    const { email, password } = await signInWithSeedUser(page);
    const token = await getAuthToken(email, password);
    const project = await createQaProject(token);
    const projectModel = await createDraftingDrawing(token, project.id, {
      kind: 'model',
      title: 'Project Model',
    });
    const sandboxDrawing = await createDraftingDrawing(
      token,
      project.id,
      createTemporaryDraftingQaSandboxDrawingInput(new Date('2026-04-27T00:00:00.000Z')),
    );
    let sandboxArchived = false;

    try {
      await page.goto(`/projects/${project.id}/drafting/${sandboxDrawing.id}`);
      await expect(page.getByTestId('drafting-canvas-stage')).toBeVisible();
      await expect(page.locator('[data-drafting-object-id]')).toHaveCount(0);

      const canvas = page.getByTestId('drafting-canvas-svg');
      await canvas.scrollIntoViewIfNeeded();
      const previewPoint = await pointInLocator(canvas, { xRatio: 0.42, yRatio: 0.46 });

      const toolButton = page.getByRole('button', { exact: true, name: 'Pile' });
      await toolButton.click();
      await page.getByRole('button', { exact: true, name: 'Use sketch pile' }).click();
      await expect(toolButton).toHaveAttribute('aria-pressed', 'true');
      await page.mouse.move(previewPoint.x, previewPoint.y, { steps: 4 });
      await page.keyboard.press('Escape');
      await expect(page.getByTestId('drafting-command-preview-pile')).toHaveCount(0);
      await expect(page.locator('[data-drafting-object-id]')).toHaveCount(0);

      await toolButton.click();
      await page.getByRole('button', { exact: true, name: 'Use sketch pile' }).click();
      await page.mouse.move(previewPoint.x, previewPoint.y, { steps: 4 });
      await page.getByRole('button', { exact: true, name: 'Select / Move' }).click();
      await expect(page.getByTestId('drafting-command-preview-pile')).toHaveCount(0);
      await expect(page.locator('[data-drafting-object-id]')).toHaveCount(0);

      await toolButton.click();
      await page.getByRole('button', { exact: true, name: 'Use sketch pile' }).click();
      await expect(toolButton).toHaveAttribute('aria-pressed', 'true');
      const placementRatio = { xRatio: 0.48, yRatio: 0.56 };
      const placementPoint = await pointInLocator(canvas, placementRatio);
      await page.mouse.move(placementPoint.x, placementPoint.y, { steps: 4 });
      await clickInLocator(canvas, placementRatio);
      await expect(page.getByTestId('drafting-command-preview-pile')).toHaveCount(0);
      await expect(page.locator('[data-drafting-object-id]')).toHaveCount(1);
      const authoredPileId = await page
        .locator('[data-drafting-object-id]')
        .getAttribute('data-drafting-object-id');
      expect(authoredPileId).toBeTruthy();

      await page.getByRole('button', { name: 'Save' }).click();
      await expect(page.getByText('Saved').first()).toBeVisible();

      await page.reload();
      await expect(page.getByTestId('drafting-canvas-stage')).toBeVisible();
      await expect(page.locator('[data-drafting-object-id]')).toHaveCount(1);
      await expect(page.getByTestId(`drafting-object-${authoredPileId}`)).toHaveCount(1);

      const reloadedDrawing = await apiRequest<DraftingDrawing>(
        token,
        `/projects/${project.id}/drafting/drawings/${sandboxDrawing.id}`,
      );
      const authoredPile = reloadedDrawing.model.objects.find(
        (object): object is DraftingPileObject =>
          object.id === authoredPileId && object.type === 'pile',
      );
      expect(authoredPile).toBeDefined();
      expect(authoredPile!.geometry.centre).toEqual(
        expect.objectContaining({
          x: expect.any(Number),
          y: expect.any(Number),
        }),
      );
      expect(authoredPile!.geometry.diameterMm).toBe(600);
      expect(authoredPile!.metadata.pileId).toMatch(/^P\d+$/);
      expect(authoredPile!.metadata.pileType).toBe('bored');
      expect(authoredPile!.metadata.material).toBe('reinforced_concrete');
      expect(authoredPile!.metadata.pileTypeCode).toBeUndefined();
      expect(authoredPile!.metadata.sourceCompleteness).toBeUndefined();
      expect(authoredPile!.metadata.designCompressionKn).toBeUndefined();
      expect(authoredPile!.metadata.designTensionKn).toBeUndefined();
      expect(authoredPile!.metadata.designLateralKn).toBeUndefined();
      expect(authoredPile!.metadata.cutOffLevel).toBeUndefined();
      expect(authoredPile!.metadata.toeLevel).toBeUndefined();
      expect(authoredPile!.sourceRef).toMatchObject({
        sourceType: 'manual',
        status: 'manual',
      });
      expect(authoredPile!.sourceRef?.sourceId).toBeUndefined();

      const downloadPromise = page.waitForEvent('download');
      await page.getByRole('button', { name: 'Export JSON' }).click();
      const download = await downloadPromise;
      const downloadPath = await download.path();
      expect(downloadPath).toBeTruthy();
      const exportedJson = await readDownloadedText(downloadPath!);
      const exported = JSON.parse(exportedJson) as { model: DraftingDrawing['model'] };
      const exportedPile = exported.model.objects.find(
        (object): object is DraftingPileObject =>
          object.id === authoredPileId && object.type === 'pile',
      );
      expect(exportedPile).toBeDefined();
      expect(exportedPile!.geometry.centre).toEqual(
        expect.objectContaining({
          x: expect.any(Number),
          y: expect.any(Number),
        }),
      );
      expect(exportedPile!.metadata.pileId).toBe(authoredPile!.metadata.pileId);
      expect(exportedPile!.metadata.designCompressionKn).toBeUndefined();
      expect(exportedPile!.metadata.designTensionKn).toBeUndefined();
      expect(exportedPile!.metadata.designLateralKn).toBeUndefined();
      expect(exportedPile!.metadata.cutOffLevel).toBeUndefined();
      expect(exportedPile!.metadata.toeLevel).toBeUndefined();
      expect(exportedPile!.sourceRef).toMatchObject({
        sourceType: 'manual',
        status: 'manual',
      });
      expectExportIsMetadataOnly(exportedJson);

      await page.goto(`/projects/${project.id}/drafting/${sandboxDrawing.id}/schedules/preview`);
      await expect(page.getByText(authoredPile!.metadata.pileId).first()).toBeVisible();
      await expect(page.getByText('manual sketch')).toBeVisible();

      await archiveDraftingSandbox(token, project.id, sandboxDrawing.id);
      sandboxArchived = true;

      await page.goto(`/projects/${project.id}/drafting`);
      await expect(page.getByText(sandboxDrawing.title)).toBeHidden();

      const untouchedProjectModel = await apiRequest<DraftingDrawing>(
        token,
        `/projects/${project.id}/drafting/drawings/${projectModel.id}`,
      );
      expect(untouchedProjectModel.model.objects).toHaveLength(0);
    } finally {
      if (!sandboxArchived) {
        await archiveDraftingSandbox(token, project.id, sandboxDrawing.id).catch(() => undefined);
      }
    }
  });

  test('authors a manual anchor tieback through the shared two-point command path', async ({
    page,
  }) => {
    const { email, password } = await signInWithSeedUser(page);
    const token = await getAuthToken(email, password);
    const project = await createQaProject(token);
    const projectModel = await createDraftingDrawing(token, project.id, {
      kind: 'model',
      title: 'Project Model',
    });
    const sandboxDrawing = await createDraftingDrawing(
      token,
      project.id,
      createTemporaryDraftingQaSandboxDrawingInput(new Date('2026-04-27T00:00:00.000Z')),
    );
    let sandboxArchived = false;

    try {
      await page.goto(`/projects/${project.id}/drafting/${sandboxDrawing.id}`);
      await expect(page.getByTestId('drafting-canvas-stage')).toBeVisible();
      await expect(page.locator('[data-drafting-object-id]')).toHaveCount(0);

      const canvas = page.getByTestId('drafting-canvas-svg');
      await canvas.scrollIntoViewIfNeeded();
      const headRatio = { xRatio: 0.42, yRatio: 0.58 };
      const tailRatio = { xRatio: 0.56, yRatio: 0.5 };
      const previewTailPoint = await pointInLocator(canvas, tailRatio);
      const toolButton = page.getByRole('button', { exact: true, name: 'Anchor / tieback' });

      await toolButton.click();
      await expect(toolButton).toHaveAttribute('aria-pressed', 'true');
      await clickInLocator(canvas, headRatio);
      await page.mouse.move(previewTailPoint.x, previewTailPoint.y, { steps: 4 });
      await expect(page.getByTestId('drafting-command-preview-anchor-tieback')).toHaveCount(1);
      await page.keyboard.press('Escape');
      await expect(page.getByTestId('drafting-command-preview-anchor-tieback')).toHaveCount(0);
      await expect(page.locator('[data-drafting-object-id]')).toHaveCount(0);

      await toolButton.click();
      await clickInLocator(canvas, headRatio);
      await page.mouse.move(previewTailPoint.x, previewTailPoint.y, { steps: 4 });
      await expect(page.getByTestId('drafting-command-preview-anchor-tieback')).toHaveCount(1);
      await page.getByRole('button', { exact: true, name: 'Select / Move' }).click();
      await expect(page.getByTestId('drafting-command-preview-anchor-tieback')).toHaveCount(0);
      await expect(page.locator('[data-drafting-object-id]')).toHaveCount(0);

      await toolButton.click();
      await expect(toolButton).toHaveAttribute('aria-pressed', 'true');
      const headPoint = await pointInLocator(canvas, headRatio);
      const tailPoint = await pointInLocator(canvas, tailRatio);
      await page.mouse.move(headPoint.x, headPoint.y);
      await clickInLocator(canvas, headRatio);
      await page.mouse.move(tailPoint.x, tailPoint.y, { steps: 6 });
      await expect(page.getByTestId('drafting-command-preview-anchor-tieback')).toHaveCount(1);
      await clickInLocator(canvas, tailRatio);
      await expect(page.getByTestId('drafting-command-preview-anchor-tieback')).toHaveCount(0);
      await expect(page.locator('[data-drafting-object-id]')).toHaveCount(1);
      const authoredAnchorId = await page
        .locator('[data-drafting-object-id]')
        .getAttribute('data-drafting-object-id');
      expect(authoredAnchorId).toBeTruthy();

      await page.getByRole('button', { name: 'Save' }).click();
      await expect(page.getByText('Saved').first()).toBeVisible();

      await page.reload();
      await expect(page.getByTestId('drafting-canvas-stage')).toBeVisible();
      await expect(page.locator('[data-drafting-object-id]')).toHaveCount(1);
      await expect(page.getByTestId(`drafting-object-${authoredAnchorId}`)).toHaveCount(1);

      const reloadedDrawing = await apiRequest<DraftingDrawing>(
        token,
        `/projects/${project.id}/drafting/drawings/${sandboxDrawing.id}`,
      );
      const authoredAnchor = reloadedDrawing.model.objects.find(
        (object): object is DraftingAnchorTiebackObject =>
          object.id === authoredAnchorId && object.type === 'anchor_tieback',
      );
      expect(authoredAnchor).toBeDefined();
      expect(authoredAnchor!.geometry.headPoint).toEqual(
        expect.objectContaining({
          x: expect.any(Number),
          y: expect.any(Number),
        }),
      );
      expect(authoredAnchor!.geometry.tailPoint).toEqual(
        expect.objectContaining({
          x: expect.any(Number),
          y: expect.any(Number),
        }),
      );
      expect(authoredAnchor!.geometry.headPoint).not.toEqual(authoredAnchor!.geometry.tailPoint);
      expect(authoredAnchor!.parameters.anchorId).toMatch(/^A\d+$/);
      expect(authoredAnchor!.parameters.planLengthMm).toBeGreaterThan(0);
      expect(Number.isFinite(authoredAnchor!.parameters.angleDeg)).toBe(true);
      expect(authoredAnchor!.metadata).toMatchObject({
        associatedWallId: '',
        installationStage: 'Stage 1',
        notes: '',
      });
      expect(authoredAnchor!.sourceRef).toBeUndefined();
      expect(authoredAnchor).not.toHaveProperty('capacity');
      expect(authoredAnchor!.parameters).not.toHaveProperty('capacity');
      expect(authoredAnchor!.parameters).not.toHaveProperty('inclinationDeg');

      const downloadPromise = page.waitForEvent('download');
      await page.getByRole('button', { name: 'Export JSON' }).click();
      const download = await downloadPromise;
      const downloadPath = await download.path();
      expect(downloadPath).toBeTruthy();
      const exportedJson = await readDownloadedText(downloadPath!);
      const exported = JSON.parse(exportedJson) as { model: DraftingDrawing['model'] };
      const exportedAnchor = exported.model.objects.find(
        (object): object is DraftingAnchorTiebackObject =>
          object.id === authoredAnchorId && object.type === 'anchor_tieback',
      );
      expect(exportedAnchor).toBeDefined();
      expect(exportedAnchor!.geometry.headPoint).toEqual(
        expect.objectContaining({
          x: expect.any(Number),
          y: expect.any(Number),
        }),
      );
      expect(exportedAnchor!.geometry.tailPoint).toEqual(
        expect.objectContaining({
          x: expect.any(Number),
          y: expect.any(Number),
        }),
      );
      expect(exportedAnchor!.parameters.anchorId).toBe(authoredAnchor!.parameters.anchorId);
      expect(exportedAnchor!.parameters.planLengthMm).toBe(authoredAnchor!.parameters.planLengthMm);
      expect(exportedAnchor!.parameters.angleDeg).toBe(authoredAnchor!.parameters.angleDeg);
      expect(exportedAnchor!.sourceRef).toBeUndefined();
      expect(exportedAnchor!.parameters).not.toHaveProperty('capacity');
      expect(exportedAnchor!.parameters).not.toHaveProperty('inclinationDeg');
      expectExportIsMetadataOnly(exportedJson);

      await page.goto(`/projects/${project.id}/drafting/${sandboxDrawing.id}/schedules/preview`);
      await expect(page.getByText(authoredAnchor!.parameters.anchorId).first()).toBeVisible();

      await archiveDraftingSandbox(token, project.id, sandboxDrawing.id);
      sandboxArchived = true;

      await page.goto(`/projects/${project.id}/drafting`);
      await expect(page.getByText(sandboxDrawing.title)).toBeHidden();

      const untouchedProjectModel = await apiRequest<DraftingDrawing>(
        token,
        `/projects/${project.id}/drafting/drawings/${projectModel.id}`,
      );
      expect(untouchedProjectModel.model.objects).toHaveLength(0);
    } finally {
      if (!sandboxArchived) {
        await archiveDraftingSandbox(token, project.id, sandboxDrawing.id).catch(() => undefined);
      }
    }
  });

  test('authors a manual excavation line through the shared path command boundary', async ({
    page,
  }) => {
    const { email, password } = await signInWithSeedUser(page);
    const token = await getAuthToken(email, password);
    const project = await createQaProject(token);
    const projectModel = await createDraftingDrawing(token, project.id, {
      kind: 'model',
      title: 'Project Model',
    });
    const sandboxDrawing = await createDraftingDrawing(
      token,
      project.id,
      createTemporaryDraftingQaSandboxDrawingInput(new Date('2026-04-27T00:00:00.000Z')),
    );
    let sandboxArchived = false;

    try {
      await page.goto(`/projects/${project.id}/drafting/${sandboxDrawing.id}`);
      await expect(page.getByTestId('drafting-canvas-stage')).toBeVisible();
      await expect(page.locator('[data-drafting-object-id]')).toHaveCount(0);

      const canvas = page.getByTestId('drafting-canvas-svg');
      await canvas.scrollIntoViewIfNeeded();

      await startPathPreview({
        canvas,
        next: { xRatio: 0.43, yRatio: 0.46 },
        page,
        previewTestId: 'drafting-command-preview-excavation-line',
        start: { xRatio: 0.34, yRatio: 0.5 },
        toolLabel: 'Excavation line',
      });
      await page.keyboard.press('Escape');
      await expect(page.getByTestId('drafting-command-preview-excavation-line')).toHaveCount(0);
      await expect(page.locator('[data-drafting-object-id]')).toHaveCount(0);

      await startPathPreview({
        canvas,
        next: { xRatio: 0.46, yRatio: 0.52 },
        page,
        previewTestId: 'drafting-command-preview-excavation-line',
        start: { xRatio: 0.36, yRatio: 0.58 },
        toolLabel: 'Excavation line',
      });
      await page.getByRole('button', { exact: true, name: 'Select / Move' }).click();
      await expect(page.getByTestId('drafting-command-preview-excavation-line')).toHaveCount(0);
      await expect(page.locator('[data-drafting-object-id]')).toHaveCount(0);

      const ratios = [
        { xRatio: 0.38, yRatio: 0.62 },
        { xRatio: 0.5, yRatio: 0.56 },
        { xRatio: 0.62, yRatio: 0.64 },
      ];
      const toolButton = page.getByRole('button', { exact: true, name: 'Excavation line' });
      await toolButton.click();
      await expect(toolButton).toHaveAttribute('aria-pressed', 'true');
      await canvas.scrollIntoViewIfNeeded();
      const points = await Promise.all(ratios.map((ratio) => pointInLocator(canvas, ratio)));

      await page.mouse.move(points[0]!.x, points[0]!.y);
      await page.mouse.click(points[0]!.x, points[0]!.y);
      await expect(page.getByText('1 point(s) captured for the current path.')).toBeVisible();
      await page.mouse.move(points[1]!.x, points[1]!.y, { steps: 6 });
      await expect(page.getByTestId('drafting-command-preview-excavation-line')).toHaveAttribute(
        'points',
        /.+ .+/,
      );
      await page.mouse.click(points[1]!.x, points[1]!.y);
      await page.mouse.move(points[2]!.x, points[2]!.y, { steps: 6 });
      await expect(page.getByTestId('drafting-command-preview-excavation-line')).toHaveAttribute(
        'points',
        /.+ .+ .+/,
      );
      await page.mouse.click(points[2]!.x, points[2]!.y);
      await page.keyboard.press('Enter');

      await expect(page.getByTestId('drafting-command-preview-excavation-line')).toHaveCount(0);
      await expect(page.locator('[data-drafting-object-id]')).toHaveCount(1);
      const authoredExcavationLineId = await page
        .locator('[data-drafting-object-id]')
        .getAttribute('data-drafting-object-id');
      expect(authoredExcavationLineId).toBeTruthy();

      await page.getByRole('button', { name: 'Save' }).click();
      await expect(page.getByText('Saved').first()).toBeVisible();

      await page.reload();
      await expect(page.getByTestId('drafting-canvas-stage')).toBeVisible();
      await expect(page.locator('[data-drafting-object-id]')).toHaveCount(1);
      await expect(page.getByTestId(`drafting-object-${authoredExcavationLineId}`)).toHaveCount(1);

      const reloadedDrawing = await apiRequest<DraftingDrawing>(
        token,
        `/projects/${project.id}/drafting/drawings/${sandboxDrawing.id}`,
      );
      const authoredExcavationLine = reloadedDrawing.model.objects.find(
        (object): object is DraftingExcavationLineObject =>
          object.id === authoredExcavationLineId && object.type === 'excavation_line',
      );
      expect(authoredExcavationLine).toBeDefined();
      expect(authoredExcavationLine!.geometry.points).toHaveLength(3);
      expect(authoredExcavationLine!.geometry.closed).toBe(false);
      expect(authoredExcavationLine!.metadata.excavationId).toMatch(/^EX\d+$/);
      expect(authoredExcavationLine!.metadata.stage).toBe('Stage 1');
      expect(authoredExcavationLine!.sourceRef).toBeUndefined();
      expect(authoredExcavationLine!.metadata).not.toHaveProperty('designLevel');
      expect(authoredExcavationLine).not.toHaveProperty('volume');

      const downloadPromise = page.waitForEvent('download');
      await page.getByRole('button', { name: 'Export JSON' }).click();
      const download = await downloadPromise;
      const downloadPath = await download.path();
      expect(downloadPath).toBeTruthy();
      const exportedJson = await readDownloadedText(downloadPath!);
      const exported = JSON.parse(exportedJson) as { model: DraftingDrawing['model'] };
      const exportedExcavationLine = exported.model.objects.find(
        (object): object is DraftingExcavationLineObject =>
          object.id === authoredExcavationLineId && object.type === 'excavation_line',
      );
      expect(exportedExcavationLine).toBeDefined();
      expect(exportedExcavationLine!.geometry.points).toHaveLength(3);
      expect(exportedExcavationLine!.geometry.closed).toBe(false);
      expect(exportedExcavationLine!.metadata.excavationId).toBe(
        authoredExcavationLine!.metadata.excavationId,
      );
      expect(exportedExcavationLine!.metadata.stage).toBe('Stage 1');
      expect(exportedExcavationLine!.sourceRef).toBeUndefined();
      expect(exportedExcavationLine!.metadata).not.toHaveProperty('designLevel');
      expectExportIsMetadataOnly(exportedJson);

      await archiveDraftingSandbox(token, project.id, sandboxDrawing.id);
      sandboxArchived = true;

      await page.goto(`/projects/${project.id}/drafting`);
      await expect(page.getByText(sandboxDrawing.title)).toBeHidden();

      const untouchedProjectModel = await apiRequest<DraftingDrawing>(
        token,
        `/projects/${project.id}/drafting/drawings/${projectModel.id}`,
      );
      expect(untouchedProjectModel.model.objects).toHaveLength(0);
    } finally {
      if (!sandboxArchived) {
        await archiveDraftingSandbox(token, project.id, sandboxDrawing.id).catch(() => undefined);
      }
    }
  });

  test('authors a manual capping beam through the shared path command boundary', async ({
    page,
  }) => {
    const { email, password } = await signInWithSeedUser(page);
    const token = await getAuthToken(email, password);
    const project = await createQaProject(token);
    const projectModel = await createDraftingDrawing(token, project.id, {
      kind: 'model',
      title: 'Project Model',
    });
    const sandboxDrawing = await createDraftingDrawing(
      token,
      project.id,
      createTemporaryDraftingQaSandboxDrawingInput(new Date('2026-04-27T00:00:00.000Z')),
    );
    let sandboxArchived = false;

    try {
      await page.goto(`/projects/${project.id}/drafting/${sandboxDrawing.id}`);
      await expect(page.getByTestId('drafting-canvas-stage')).toBeVisible();
      await expect(page.locator('[data-drafting-object-id]')).toHaveCount(0);

      const canvas = page.getByTestId('drafting-canvas-svg');
      await canvas.scrollIntoViewIfNeeded();

      await startPathPreview({
        canvas,
        next: { xRatio: 0.43, yRatio: 0.44 },
        page,
        previewTestId: 'drafting-command-preview-capping-beam',
        start: { xRatio: 0.34, yRatio: 0.48 },
        toolLabel: 'Capping beam',
      });
      await page.keyboard.press('Escape');
      await expect(page.getByTestId('drafting-command-preview-capping-beam')).toHaveCount(0);
      await expect(page.locator('[data-drafting-object-id]')).toHaveCount(0);

      await startPathPreview({
        canvas,
        next: { xRatio: 0.46, yRatio: 0.5 },
        page,
        previewTestId: 'drafting-command-preview-capping-beam',
        start: { xRatio: 0.36, yRatio: 0.56 },
        toolLabel: 'Capping beam',
      });
      await page.getByRole('button', { exact: true, name: 'Select / Move' }).click();
      await expect(page.getByTestId('drafting-command-preview-capping-beam')).toHaveCount(0);
      await expect(page.locator('[data-drafting-object-id]')).toHaveCount(0);

      const ratios = [
        { xRatio: 0.38, yRatio: 0.62 },
        { xRatio: 0.5, yRatio: 0.56 },
        { xRatio: 0.62, yRatio: 0.6 },
      ];
      const toolButton = page.getByRole('button', { exact: true, name: 'Capping beam' });
      await toolButton.click();
      await expect(toolButton).toHaveAttribute('aria-pressed', 'true');
      await canvas.scrollIntoViewIfNeeded();
      const points = await Promise.all(ratios.map((ratio) => pointInLocator(canvas, ratio)));

      await page.mouse.move(points[0]!.x, points[0]!.y);
      await page.mouse.click(points[0]!.x, points[0]!.y);
      await expect(page.getByText('1 point(s) captured for the current path.')).toBeVisible();
      await page.mouse.move(points[1]!.x, points[1]!.y, { steps: 6 });
      await expect(page.getByTestId('drafting-command-preview-capping-beam')).toHaveAttribute(
        'points',
        /.+ .+/,
      );
      await page.mouse.click(points[1]!.x, points[1]!.y);
      await page.mouse.move(points[2]!.x, points[2]!.y, { steps: 6 });
      await expect(page.getByTestId('drafting-command-preview-capping-beam')).toHaveAttribute(
        'points',
        /.+ .+ .+/,
      );
      await page.mouse.click(points[2]!.x, points[2]!.y);
      await page.keyboard.press('Enter');

      await expect(page.getByTestId('drafting-command-preview-capping-beam')).toHaveCount(0);
      await expect(page.locator('[data-drafting-object-id]')).toHaveCount(1);
      const authoredCappingBeamId = await page
        .locator('[data-drafting-object-id]')
        .getAttribute('data-drafting-object-id');
      expect(authoredCappingBeamId).toBeTruthy();

      await page.getByRole('button', { name: 'Save' }).click();
      await expect(page.getByText('Saved').first()).toBeVisible();

      await page.reload();
      await expect(page.getByTestId('drafting-canvas-stage')).toBeVisible();
      await expect(page.locator('[data-drafting-object-id]')).toHaveCount(1);
      await expect(page.getByTestId(`drafting-object-${authoredCappingBeamId}`)).toHaveCount(1);

      const reloadedDrawing = await apiRequest<DraftingDrawing>(
        token,
        `/projects/${project.id}/drafting/drawings/${sandboxDrawing.id}`,
      );
      const authoredCappingBeam = reloadedDrawing.model.objects.find(
        (object): object is DraftingCappingBeamObject =>
          object.id === authoredCappingBeamId && object.type === 'capping_beam',
      );
      expect(authoredCappingBeam).toBeDefined();
      expect(authoredCappingBeam!.geometry.points).toHaveLength(3);
      expect(authoredCappingBeam!.parameters.beamId).toMatch(/^CB\d+$/);
      expect(authoredCappingBeam!.parameters.widthMm).toBe(900);
      expect(authoredCappingBeam!.parameters.depthMm).toBe(1200);
      expect(authoredCappingBeam!.parameters.levelRl).toBe(12);
      expect(authoredCappingBeam!.parameters.concreteGrade).toBe('40 MPa');
      expect(authoredCappingBeam!.metadata.associatedWallId).toBe('');
      expect(authoredCappingBeam!.metadata.notes).toBe('');
      expect(authoredCappingBeam!.sourceRef).toBeUndefined();
      expect(authoredCappingBeam).not.toHaveProperty('designLoad');
      expect(authoredCappingBeam).not.toHaveProperty('capacity');
      expect(authoredCappingBeam).not.toHaveProperty('reinforcement');

      const downloadPromise = page.waitForEvent('download');
      await page.getByRole('button', { name: 'Export JSON' }).click();
      const download = await downloadPromise;
      const downloadPath = await download.path();
      expect(downloadPath).toBeTruthy();
      const exportedJson = await readDownloadedText(downloadPath!);
      const exported = JSON.parse(exportedJson) as { model: DraftingDrawing['model'] };
      const exportedCappingBeam = exported.model.objects.find(
        (object): object is DraftingCappingBeamObject =>
          object.id === authoredCappingBeamId && object.type === 'capping_beam',
      );
      expect(exportedCappingBeam).toBeDefined();
      expect(exportedCappingBeam!.geometry.points).toHaveLength(3);
      expect(exportedCappingBeam!.parameters.beamId).toBe(authoredCappingBeam!.parameters.beamId);
      expect(exportedCappingBeam!.parameters.widthMm).toBe(900);
      expect(exportedCappingBeam!.parameters.depthMm).toBe(1200);
      expect(exportedCappingBeam!.parameters.levelRl).toBe(12);
      expect(exportedCappingBeam!.parameters.concreteGrade).toBe('40 MPa');
      expect(exportedCappingBeam!.sourceRef).toBeUndefined();
      expect(exportedCappingBeam).not.toHaveProperty('designLoad');
      expect(exportedCappingBeam).not.toHaveProperty('capacity');
      expectExportIsMetadataOnly(exportedJson);

      await archiveDraftingSandbox(token, project.id, sandboxDrawing.id);
      sandboxArchived = true;

      await page.goto(`/projects/${project.id}/drafting`);
      await expect(page.getByText(sandboxDrawing.title)).toBeHidden();

      const untouchedProjectModel = await apiRequest<DraftingDrawing>(
        token,
        `/projects/${project.id}/drafting/drawings/${projectModel.id}`,
      );
      expect(untouchedProjectModel.model.objects).toHaveLength(0);
    } finally {
      if (!sandboxArchived) {
        await archiveDraftingSandbox(token, project.id, sandboxDrawing.id).catch(() => undefined);
      }
    }
  });

  test('authors a manual waler through the shared path command boundary', async ({ page }) => {
    const { email, password } = await signInWithSeedUser(page);
    const token = await getAuthToken(email, password);
    const project = await createQaProject(token);
    const projectModel = await createDraftingDrawing(token, project.id, {
      kind: 'model',
      title: 'Project Model',
    });
    const sandboxDrawing = await createDraftingDrawing(
      token,
      project.id,
      createTemporaryDraftingQaSandboxDrawingInput(new Date('2026-04-27T00:00:00.000Z')),
    );
    let sandboxArchived = false;

    try {
      await page.goto(`/projects/${project.id}/drafting/${sandboxDrawing.id}`);
      await expect(page.getByTestId('drafting-canvas-stage')).toBeVisible();
      await expect(page.locator('[data-drafting-object-id]')).toHaveCount(0);

      const canvas = page.getByTestId('drafting-canvas-svg');
      await canvas.scrollIntoViewIfNeeded();

      await startPathPreview({
        canvas,
        next: { xRatio: 0.43, yRatio: 0.44 },
        page,
        previewTestId: 'drafting-command-preview-waler',
        start: { xRatio: 0.34, yRatio: 0.48 },
        toolLabel: 'Waler',
      });
      await page.keyboard.press('Escape');
      await expect(page.getByTestId('drafting-command-preview-waler')).toHaveCount(0);
      await expect(page.locator('[data-drafting-object-id]')).toHaveCount(0);

      await startPathPreview({
        canvas,
        next: { xRatio: 0.46, yRatio: 0.5 },
        page,
        previewTestId: 'drafting-command-preview-waler',
        start: { xRatio: 0.36, yRatio: 0.56 },
        toolLabel: 'Waler',
      });
      await page.getByRole('button', { exact: true, name: 'Select / Move' }).click();
      await expect(page.getByTestId('drafting-command-preview-waler')).toHaveCount(0);
      await expect(page.locator('[data-drafting-object-id]')).toHaveCount(0);

      const ratios = [
        { xRatio: 0.38, yRatio: 0.62 },
        { xRatio: 0.5, yRatio: 0.56 },
        { xRatio: 0.62, yRatio: 0.6 },
      ];
      const toolButton = page.getByRole('button', { exact: true, name: 'Waler' });
      await toolButton.click();
      await expect(toolButton).toHaveAttribute('aria-pressed', 'true');
      await canvas.scrollIntoViewIfNeeded();
      const points = await Promise.all(ratios.map((ratio) => pointInLocator(canvas, ratio)));

      await page.mouse.move(points[0]!.x, points[0]!.y);
      await page.mouse.click(points[0]!.x, points[0]!.y);
      await expect(page.getByText('1 point(s) captured for the current path.')).toBeVisible();
      await page.mouse.move(points[1]!.x, points[1]!.y, { steps: 6 });
      await expect(page.getByTestId('drafting-command-preview-waler')).toHaveAttribute(
        'points',
        /.+ .+/,
      );
      await page.mouse.click(points[1]!.x, points[1]!.y);
      await page.mouse.move(points[2]!.x, points[2]!.y, { steps: 6 });
      await expect(page.getByTestId('drafting-command-preview-waler')).toHaveAttribute(
        'points',
        /.+ .+ .+/,
      );
      await page.mouse.click(points[2]!.x, points[2]!.y);
      await page.keyboard.press('Enter');

      await expect(page.getByTestId('drafting-command-preview-waler')).toHaveCount(0);
      await expect(page.locator('[data-drafting-object-id]')).toHaveCount(1);
      const authoredWalerId = await page
        .locator('[data-drafting-object-id]')
        .getAttribute('data-drafting-object-id');
      expect(authoredWalerId).toBeTruthy();

      await page.getByRole('button', { name: 'Save' }).click();
      await expect(page.getByText('Saved').first()).toBeVisible();

      await page.reload();
      await expect(page.getByTestId('drafting-canvas-stage')).toBeVisible();
      await expect(page.locator('[data-drafting-object-id]')).toHaveCount(1);
      await expect(page.getByTestId(`drafting-object-${authoredWalerId}`)).toHaveCount(1);

      const reloadedDrawing = await apiRequest<DraftingDrawing>(
        token,
        `/projects/${project.id}/drafting/drawings/${sandboxDrawing.id}`,
      );
      const authoredWaler = reloadedDrawing.model.objects.find(
        (object): object is DraftingWalerObject =>
          object.id === authoredWalerId && object.type === 'waler',
      );
      expect(authoredWaler).toBeDefined();
      expect(authoredWaler!.geometry.points).toHaveLength(3);
      expect(authoredWaler!.parameters.walerId).toMatch(/^W\d+$/);
      expect(authoredWaler!.parameters.sectionLabel).toBe('2UC360');
      expect(authoredWaler!.parameters.levelRl).toBe(10.5);
      expect(authoredWaler!.parameters.connectionNotes).toBe('');
      expect(authoredWaler!.metadata.associatedWallId).toBe('');
      expect(authoredWaler!.metadata.notes).toBe('');
      expect(authoredWaler!.sourceRef).toBeUndefined();
      expect(authoredWaler).not.toHaveProperty('designLoad');
      expect(authoredWaler).not.toHaveProperty('capacity');
      expect(authoredWaler).not.toHaveProperty('reinforcement');

      const downloadPromise = page.waitForEvent('download');
      await page.getByRole('button', { name: 'Export JSON' }).click();
      const download = await downloadPromise;
      const downloadPath = await download.path();
      expect(downloadPath).toBeTruthy();
      const exportedJson = await readDownloadedText(downloadPath!);
      const exported = JSON.parse(exportedJson) as { model: DraftingDrawing['model'] };
      const exportedWaler = exported.model.objects.find(
        (object): object is DraftingWalerObject =>
          object.id === authoredWalerId && object.type === 'waler',
      );
      expect(exportedWaler).toBeDefined();
      expect(exportedWaler!.geometry.points).toHaveLength(3);
      expect(exportedWaler!.parameters.walerId).toBe(authoredWaler!.parameters.walerId);
      expect(exportedWaler!.parameters.sectionLabel).toBe('2UC360');
      expect(exportedWaler!.parameters.levelRl).toBe(10.5);
      expect(exportedWaler!.parameters.connectionNotes).toBe('');
      expect(exportedWaler!.sourceRef).toBeUndefined();
      expect(exportedWaler).not.toHaveProperty('designLoad');
      expect(exportedWaler).not.toHaveProperty('capacity');
      expectExportIsMetadataOnly(exportedJson);

      await archiveDraftingSandbox(token, project.id, sandboxDrawing.id);
      sandboxArchived = true;

      await page.goto(`/projects/${project.id}/drafting`);
      await expect(page.getByText(sandboxDrawing.title)).toBeHidden();

      const untouchedProjectModel = await apiRequest<DraftingDrawing>(
        token,
        `/projects/${project.id}/drafting/drawings/${projectModel.id}`,
      );
      expect(untouchedProjectModel.model.objects).toHaveLength(0);
    } finally {
      if (!sandboxArchived) {
        await archiveDraftingSandbox(token, project.id, sandboxDrawing.id).catch(() => undefined);
      }
    }
  });

  test('authors a manual service run through the shared service-run boundary', async ({ page }) => {
    const { email, password } = await signInWithSeedUser(page);
    const token = await getAuthToken(email, password);
    const project = await createQaProject(token);
    const projectModel = await createDraftingDrawing(token, project.id, {
      kind: 'model',
      title: 'Project Model',
    });
    const sandboxDrawing = await createDraftingDrawing(
      token,
      project.id,
      createTemporaryDraftingQaSandboxDrawingInput(new Date('2026-04-27T00:00:00.000Z')),
    );
    let sandboxArchived = false;

    try {
      await page.goto(`/projects/${project.id}/drafting/${sandboxDrawing.id}`);
      await expect(page.getByTestId('drafting-canvas-stage')).toBeVisible();
      await expect(page.locator('[data-drafting-object-id]')).toHaveCount(0);

      const canvas = page.getByTestId('drafting-canvas-svg');
      await canvas.scrollIntoViewIfNeeded();

      await startPathPreview({
        canvas,
        next: { xRatio: 0.43, yRatio: 0.44 },
        page,
        previewTestId: 'drafting-command-preview-service-run',
        start: { xRatio: 0.34, yRatio: 0.48 },
        toolLabel: 'Service run',
      });
      await page.keyboard.press('Escape');
      await expect(page.getByTestId('drafting-command-preview-service-run')).toHaveCount(0);
      await expect(page.locator('[data-drafting-object-id]')).toHaveCount(0);

      await startPathPreview({
        canvas,
        next: { xRatio: 0.46, yRatio: 0.5 },
        page,
        previewTestId: 'drafting-command-preview-service-run',
        start: { xRatio: 0.36, yRatio: 0.56 },
        toolLabel: 'Service run',
      });
      await page.getByRole('button', { exact: true, name: 'Select / Move' }).click();
      await expect(page.getByTestId('drafting-command-preview-service-run')).toHaveCount(0);
      await expect(page.locator('[data-drafting-object-id]')).toHaveCount(0);

      const ratios = [
        { xRatio: 0.38, yRatio: 0.62 },
        { xRatio: 0.5, yRatio: 0.56 },
        { xRatio: 0.62, yRatio: 0.6 },
      ];
      const toolButton = page.getByRole('button', { exact: true, name: 'Service run' });
      await toolButton.click();
      await expect(toolButton).toHaveAttribute('aria-pressed', 'true');
      await canvas.scrollIntoViewIfNeeded();
      const points = await Promise.all(ratios.map((ratio) => pointInLocator(canvas, ratio)));

      await page.mouse.move(points[0]!.x, points[0]!.y);
      await page.mouse.click(points[0]!.x, points[0]!.y);
      await expect(page.getByText('1 point(s) captured for the current path.')).toBeVisible();
      await page.mouse.move(points[1]!.x, points[1]!.y, { steps: 6 });
      await expect(page.getByTestId('drafting-command-preview-service-run')).toHaveAttribute(
        'points',
        /.+ .+/,
      );
      await page.mouse.click(points[1]!.x, points[1]!.y);
      await page.mouse.move(points[2]!.x, points[2]!.y, { steps: 6 });
      await expect(page.getByTestId('drafting-command-preview-service-run')).toHaveAttribute(
        'points',
        /.+ .+ .+/,
      );
      await page.mouse.click(points[2]!.x, points[2]!.y);
      await page.keyboard.press('Enter');

      await expect(page.getByTestId('drafting-command-preview-service-run')).toHaveCount(0);
      await expect(page.locator('[data-drafting-object-id]')).toHaveCount(1);
      const authoredServiceRunId = await page
        .locator('[data-drafting-object-id]')
        .getAttribute('data-drafting-object-id');
      expect(authoredServiceRunId).toBeTruthy();

      await page.getByRole('button', { name: 'Save' }).click();
      await expect(page.getByText('Saved').first()).toBeVisible();

      await page.reload();
      await expect(page.getByTestId('drafting-canvas-stage')).toBeVisible();
      await expect(page.locator('[data-drafting-object-id]')).toHaveCount(1);
      await expect(page.getByTestId(`drafting-object-${authoredServiceRunId}`)).toHaveCount(1);

      const reloadedDrawing = await apiRequest<DraftingDrawing>(
        token,
        `/projects/${project.id}/drafting/drawings/${sandboxDrawing.id}`,
      );
      const authoredServiceRun = reloadedDrawing.model.objects.find(
        (object): object is DraftingServiceRunObject =>
          object.id === authoredServiceRunId && object.type === 'service_run',
      );
      expect(authoredServiceRun).toBeDefined();
      expect(authoredServiceRun!.geometry.path).toHaveLength(3);
      expect(authoredServiceRun!.parameters.serviceId).toMatch(/^SR\d+$/);
      expect(authoredServiceRun!.parameters.serviceType).toBe('unknown');
      expect(authoredServiceRun!.parameters.status).toBe('existing');
      expect(authoredServiceRun!.parameters.diameterMm).toBe(0);
      expect(authoredServiceRun!.parameters.depthM).toBe(0);
      expect(authoredServiceRun!.parameters.levelRl).toBe(0);
      expect(authoredServiceRun!.parameters.authority).toBe('');
      expect(authoredServiceRun!.metadata.sourceReference).toBe('');
      expect(authoredServiceRun!.metadata.surveyConfidence).toBe('');
      expect(authoredServiceRun!.metadata.notes).toBe('');
      expect(authoredServiceRun!.sourceRef).toMatchObject({
        sourceType: 'manual',
        status: 'manual',
      });
      expect(authoredServiceRun!.parameters).not.toHaveProperty('clearanceMm');
      expect(authoredServiceRun!.parameters).not.toHaveProperty('riskStatus');
      expect(authoredServiceRun).not.toHaveProperty('strata');
      expect(authoredServiceRun).not.toHaveProperty('surface');

      const downloadPromise = page.waitForEvent('download');
      await page.getByRole('button', { name: 'Export JSON' }).click();
      const download = await downloadPromise;
      const downloadPath = await download.path();
      expect(downloadPath).toBeTruthy();
      const exportedJson = await readDownloadedText(downloadPath!);
      const exported = JSON.parse(exportedJson) as { model: DraftingDrawing['model'] };
      const exportedServiceRun = exported.model.objects.find(
        (object): object is DraftingServiceRunObject =>
          object.id === authoredServiceRunId && object.type === 'service_run',
      );
      expect(exportedServiceRun).toBeDefined();
      expect(exportedServiceRun!.geometry.path).toHaveLength(3);
      expect(exportedServiceRun!.parameters.serviceId).toBe(
        authoredServiceRun!.parameters.serviceId,
      );
      expect(exportedServiceRun!.parameters.serviceType).toBe('unknown');
      expect(exportedServiceRun!.parameters.status).toBe('existing');
      expect(exportedServiceRun!.parameters.depthM).toBe(0);
      expect(exportedServiceRun!.parameters.levelRl).toBe(0);
      expect(exportedServiceRun!.sourceRef).toMatchObject({
        sourceType: 'manual',
        status: 'manual',
      });
      expect(exportedServiceRun!.parameters).not.toHaveProperty('clearanceMm');
      expect(exportedServiceRun!.parameters).not.toHaveProperty('riskStatus');
      expectExportIsMetadataOnly(exportedJson);

      await archiveDraftingSandbox(token, project.id, sandboxDrawing.id);
      sandboxArchived = true;

      await page.goto(`/projects/${project.id}/drafting`);
      await expect(page.getByText(sandboxDrawing.title)).toBeHidden();

      const untouchedProjectModel = await apiRequest<DraftingDrawing>(
        token,
        `/projects/${project.id}/drafting/drawings/${projectModel.id}`,
      );
      expect(untouchedProjectModel.model.objects).toHaveLength(0);
    } finally {
      if (!sandboxArchived) {
        await archiveDraftingSandbox(token, project.id, sandboxDrawing.id).catch(() => undefined);
      }
    }
  });

  test('authors a manual secant pile wall through the generated-wall baseline boundary', async ({
    page,
  }) => {
    const { email, password } = await signInWithSeedUser(page);
    const token = await getAuthToken(email, password);
    const project = await createQaProject(token);
    const projectModel = await createDraftingDrawing(token, project.id, {
      kind: 'model',
      title: 'Project Model',
    });
    const sandboxDrawing = await createDraftingDrawing(
      token,
      project.id,
      createTemporaryDraftingQaSandboxDrawingInput(new Date('2026-04-27T00:00:00.000Z')),
    );
    let sandboxArchived = false;

    try {
      await page.goto(`/projects/${project.id}/drafting/${sandboxDrawing.id}`);
      await expect(page.getByTestId('drafting-canvas-stage')).toBeVisible();
      await expect(page.locator('[data-drafting-object-id]')).toHaveCount(0);

      const canvas = page.getByTestId('drafting-canvas-svg');
      await canvas.scrollIntoViewIfNeeded();

      await startPathPreview({
        canvas,
        next: { xRatio: 0.48, yRatio: 0.5 },
        page,
        previewTestId: 'drafting-command-preview-secant-pile-wall',
        start: { xRatio: 0.34, yRatio: 0.5 },
        toolLabel: 'Secant pile wall',
      });
      await page.keyboard.press('Escape');
      await expect(page.getByTestId('drafting-command-preview-secant-pile-wall')).toHaveCount(0);
      await expect(page.locator('[data-drafting-object-id]')).toHaveCount(0);

      await startPathPreview({
        canvas,
        next: { xRatio: 0.52, yRatio: 0.54 },
        page,
        previewTestId: 'drafting-command-preview-secant-pile-wall',
        start: { xRatio: 0.36, yRatio: 0.58 },
        toolLabel: 'Secant pile wall',
      });
      await page.getByRole('button', { exact: true, name: 'Select / Move' }).click();
      await expect(page.getByTestId('drafting-command-preview-secant-pile-wall')).toHaveCount(0);
      await expect(page.locator('[data-drafting-object-id]')).toHaveCount(0);

      const toolButton = page.getByRole('button', { exact: true, name: 'Secant pile wall' });
      await toolButton.click();
      await expect(toolButton).toHaveAttribute('aria-pressed', 'true');
      await canvas.scrollIntoViewIfNeeded();
      const startPoint = await pointInLocator(canvas, { xRatio: 0.38, yRatio: 0.62 });
      const endPoint = await pointInLocator(canvas, { xRatio: 0.62, yRatio: 0.56 });

      await page.mouse.move(startPoint.x, startPoint.y);
      await page.mouse.click(startPoint.x, startPoint.y);
      await expect(page.getByText('1 point(s) captured for the current path.')).toBeVisible();
      await page.mouse.move(endPoint.x, endPoint.y, { steps: 6 });
      await expect(page.getByTestId('drafting-command-preview-secant-pile-wall')).toHaveAttribute(
        'points',
        /.+ .+/,
      );
      await page.mouse.click(endPoint.x, endPoint.y);

      await expect(page.getByTestId('drafting-command-preview-secant-pile-wall')).toHaveCount(0);
      await expect(page.locator('[data-drafting-object-id]')).toHaveCount(1);
      const authoredSecantWallId = await page
        .locator('[data-drafting-object-id]')
        .getAttribute('data-drafting-object-id');
      expect(authoredSecantWallId).toBeTruthy();
      await expect(
        page.getByRole('button', { exact: true, name: 'Soldier pile wall' }),
      ).toBeVisible();

      await page.getByRole('button', { name: 'Save' }).click();
      await expect(page.getByText('Saved').first()).toBeVisible();

      await page.reload();
      await expect(page.getByTestId('drafting-canvas-stage')).toBeVisible();
      await expect(page.locator('[data-drafting-object-id]')).toHaveCount(1);
      await expect(page.getByTestId(`drafting-object-${authoredSecantWallId}`)).toHaveCount(1);

      const reloadedDrawing = await apiRequest<DraftingDrawing>(
        token,
        `/projects/${project.id}/drafting/drawings/${sandboxDrawing.id}`,
      );
      const authoredSecantWall = reloadedDrawing.model.objects.find(
        (object): object is DraftingSecantPileWallObject =>
          object.id === authoredSecantWallId && object.type === 'secant_pile_wall',
      );
      expect(authoredSecantWall).toBeDefined();
      expect(authoredSecantWall!.geometry.baselinePoints).toHaveLength(2);
      expect(authoredSecantWall!.geometry.pileCentres.length).toBe(
        authoredSecantWall!.metadata.pileCount,
      );
      expect(authoredSecantWall!.parameters.pileDiameterMm).toBe(900);
      expect(authoredSecantWall!.parameters.spacingMm).toBe(750);
      expect(authoredSecantWall!.parameters.overlapMm).toBe(150);
      expect(authoredSecantWall!.parameters.primarySecondaryPattern).toBe('hard_soft');
      expect(authoredSecantWall!.metadata.wallId).toMatch(/^SEC\d+$/);
      expect(authoredSecantWall!.sourceRef).toBeUndefined();
      expect(authoredSecantWall).not.toHaveProperty('pileIds');
      expect(authoredSecantWall).not.toHaveProperty('strata');
      expect(authoredSecantWall).not.toHaveProperty('surface');
      expect(authoredSecantWall).not.toHaveProperty('capacity');
      expect(reloadedDrawing.model.objects).toHaveLength(1);
      expect(
        reloadedDrawing.model.objects.some((object) => object.type === 'soldier_pile_wall'),
      ).toBe(false);

      const downloadPromise = page.waitForEvent('download');
      await page.getByRole('button', { name: 'Export JSON' }).click();
      const download = await downloadPromise;
      const downloadPath = await download.path();
      expect(downloadPath).toBeTruthy();
      const exportedJson = await readDownloadedText(downloadPath!);
      const exported = JSON.parse(exportedJson) as { model: DraftingDrawing['model'] };
      const exportedSecantWall = exported.model.objects.find(
        (object): object is DraftingSecantPileWallObject =>
          object.id === authoredSecantWallId && object.type === 'secant_pile_wall',
      );
      expect(exportedSecantWall).toBeDefined();
      expect(exportedSecantWall!.geometry.baselinePoints).toHaveLength(2);
      expect(exportedSecantWall!.geometry.pileCentres.length).toBe(
        exportedSecantWall!.metadata.pileCount,
      );
      expect(exportedSecantWall!.parameters.pileDiameterMm).toBe(900);
      expect(exportedSecantWall!.parameters.spacingMm).toBe(750);
      expect(exportedSecantWall!.parameters.overlapMm).toBe(150);
      expect(exportedSecantWall!.metadata.wallId).toBe(authoredSecantWall!.metadata.wallId);
      expect(exportedSecantWall!.sourceRef).toBeUndefined();
      expect(exportedSecantWall).not.toHaveProperty('pileIds');
      expect(exportedSecantWall).not.toHaveProperty('strata');
      expect(exportedSecantWall).not.toHaveProperty('surface');
      expectExportIsMetadataOnly(exportedJson);

      await archiveDraftingSandbox(token, project.id, sandboxDrawing.id);
      sandboxArchived = true;

      await page.goto(`/projects/${project.id}/drafting`);
      await expect(page.getByText(sandboxDrawing.title)).toBeHidden();

      const untouchedProjectModel = await apiRequest<DraftingDrawing>(
        token,
        `/projects/${project.id}/drafting/drawings/${projectModel.id}`,
      );
      expect(untouchedProjectModel.model.objects).toHaveLength(0);
    } finally {
      if (!sandboxArchived) {
        await archiveDraftingSandbox(token, project.id, sandboxDrawing.id).catch(() => undefined);
      }
    }
  });

  test('authors a manual soldier pile wall through the generated-wall baseline boundary', async ({
    page,
  }) => {
    const { email, password } = await signInWithSeedUser(page);
    const token = await getAuthToken(email, password);
    const project = await createQaProject(token);
    const projectModel = await createDraftingDrawing(token, project.id, {
      kind: 'model',
      title: 'Project Model',
    });
    const sandboxDrawing = await createDraftingDrawing(
      token,
      project.id,
      createTemporaryDraftingQaSandboxDrawingInput(new Date('2026-04-27T00:00:00.000Z')),
    );
    let sandboxArchived = false;

    try {
      await page.goto(`/projects/${project.id}/drafting/${sandboxDrawing.id}`);
      await expect(page.getByTestId('drafting-canvas-stage')).toBeVisible();
      await expect(page.locator('[data-drafting-object-id]')).toHaveCount(0);

      const canvas = page.getByTestId('drafting-canvas-svg');
      await canvas.scrollIntoViewIfNeeded();

      await startPathPreview({
        canvas,
        next: { xRatio: 0.48, yRatio: 0.5 },
        page,
        previewTestId: 'drafting-command-preview-soldier-pile-wall',
        start: { xRatio: 0.34, yRatio: 0.5 },
        toolLabel: 'Soldier pile wall',
      });
      await page.keyboard.press('Escape');
      await expect(page.getByTestId('drafting-command-preview-soldier-pile-wall')).toHaveCount(0);
      await expect(page.locator('[data-drafting-object-id]')).toHaveCount(0);

      await startPathPreview({
        canvas,
        next: { xRatio: 0.52, yRatio: 0.54 },
        page,
        previewTestId: 'drafting-command-preview-soldier-pile-wall',
        start: { xRatio: 0.36, yRatio: 0.58 },
        toolLabel: 'Soldier pile wall',
      });
      await page.getByRole('button', { exact: true, name: 'Select / Move' }).click();
      await expect(page.getByTestId('drafting-command-preview-soldier-pile-wall')).toHaveCount(0);
      await expect(page.locator('[data-drafting-object-id]')).toHaveCount(0);

      const toolButton = page.getByRole('button', { exact: true, name: 'Soldier pile wall' });
      await toolButton.click();
      await expect(toolButton).toHaveAttribute('aria-pressed', 'true');
      await canvas.scrollIntoViewIfNeeded();
      const startPoint = await pointInLocator(canvas, { xRatio: 0.38, yRatio: 0.62 });
      const endPoint = await pointInLocator(canvas, { xRatio: 0.62, yRatio: 0.56 });

      await page.mouse.move(startPoint.x, startPoint.y);
      await page.mouse.click(startPoint.x, startPoint.y);
      await expect(page.getByText('1 point(s) captured for the current path.')).toBeVisible();
      await page.mouse.move(endPoint.x, endPoint.y, { steps: 6 });
      await expect(page.getByTestId('drafting-command-preview-soldier-pile-wall')).toHaveAttribute(
        'points',
        /.+ .+/,
      );
      await page.mouse.click(endPoint.x, endPoint.y);

      await expect(page.getByTestId('drafting-command-preview-soldier-pile-wall')).toHaveCount(0);
      await expect(page.locator('[data-drafting-object-id]')).toHaveCount(1);
      const authoredSoldierWallId = await page
        .locator('[data-drafting-object-id]')
        .getAttribute('data-drafting-object-id');
      expect(authoredSoldierWallId).toBeTruthy();
      await expect(
        page.getByRole('button', { exact: true, name: 'Secant pile wall' }),
      ).toBeVisible();

      await page.getByRole('button', { name: 'Save' }).click();
      await expect(page.getByText('Saved').first()).toBeVisible();

      await page.reload();
      await expect(page.getByTestId('drafting-canvas-stage')).toBeVisible();
      await expect(page.locator('[data-drafting-object-id]')).toHaveCount(1);
      await expect(page.getByTestId(`drafting-object-${authoredSoldierWallId}`)).toHaveCount(1);

      const reloadedDrawing = await apiRequest<DraftingDrawing>(
        token,
        `/projects/${project.id}/drafting/drawings/${sandboxDrawing.id}`,
      );
      const authoredSoldierWall = reloadedDrawing.model.objects.find(
        (object): object is DraftingSoldierPileWallObject =>
          object.id === authoredSoldierWallId && object.type === 'soldier_pile_wall',
      );
      expect(authoredSoldierWall).toBeDefined();
      expect(authoredSoldierWall!.geometry.baselinePoints).toHaveLength(2);
      expect(authoredSoldierWall!.geometry.pilePositions.length).toBe(
        authoredSoldierWall!.metadata.pileCount,
      );
      expect(authoredSoldierWall!.parameters.pileDiameterMm).toBe(600);
      expect(authoredSoldierWall!.parameters.sectionLabel).toBe('UC310');
      expect(authoredSoldierWall!.parameters.spacingMm).toBe(1500);
      expect(authoredSoldierWall!.parameters.laggingType).toBe('timber lagging');
      expect(authoredSoldierWall!.metadata.wallId).toMatch(/^SOL\d+$/);
      expect(authoredSoldierWall!.sourceRef).toBeUndefined();
      expect(authoredSoldierWall).not.toHaveProperty('pileIds');
      expect(authoredSoldierWall).not.toHaveProperty('strata');
      expect(authoredSoldierWall).not.toHaveProperty('surface');
      expect(authoredSoldierWall).not.toHaveProperty('capacity');
      expect(reloadedDrawing.model.objects).toHaveLength(1);
      expect(
        reloadedDrawing.model.objects.some((object) => object.type === 'secant_pile_wall'),
      ).toBe(false);

      const downloadPromise = page.waitForEvent('download');
      await page.getByRole('button', { name: 'Export JSON' }).click();
      const download = await downloadPromise;
      const downloadPath = await download.path();
      expect(downloadPath).toBeTruthy();
      const exportedJson = await readDownloadedText(downloadPath!);
      const exported = JSON.parse(exportedJson) as { model: DraftingDrawing['model'] };
      const exportedSoldierWall = exported.model.objects.find(
        (object): object is DraftingSoldierPileWallObject =>
          object.id === authoredSoldierWallId && object.type === 'soldier_pile_wall',
      );
      expect(exportedSoldierWall).toBeDefined();
      expect(exportedSoldierWall!.geometry.baselinePoints).toHaveLength(2);
      expect(exportedSoldierWall!.geometry.pilePositions.length).toBe(
        exportedSoldierWall!.metadata.pileCount,
      );
      expect(exportedSoldierWall!.parameters.pileDiameterMm).toBe(600);
      expect(exportedSoldierWall!.parameters.sectionLabel).toBe('UC310');
      expect(exportedSoldierWall!.parameters.spacingMm).toBe(1500);
      expect(exportedSoldierWall!.parameters.laggingType).toBe('timber lagging');
      expect(exportedSoldierWall!.metadata.wallId).toBe(authoredSoldierWall!.metadata.wallId);
      expect(exportedSoldierWall!.sourceRef).toBeUndefined();
      expect(exportedSoldierWall).not.toHaveProperty('pileIds');
      expect(exportedSoldierWall).not.toHaveProperty('strata');
      expect(exportedSoldierWall).not.toHaveProperty('surface');
      expectExportIsMetadataOnly(exportedJson);

      await archiveDraftingSandbox(token, project.id, sandboxDrawing.id);
      sandboxArchived = true;

      await page.goto(`/projects/${project.id}/drafting`);
      await expect(page.getByText(sandboxDrawing.title)).toBeHidden();

      const untouchedProjectModel = await apiRequest<DraftingDrawing>(
        token,
        `/projects/${project.id}/drafting/drawings/${projectModel.id}`,
      );
      expect(untouchedProjectModel.model.objects).toHaveLength(0);
    } finally {
      if (!sandboxArchived) {
        await archiveDraftingSandbox(token, project.id, sandboxDrawing.id).catch(() => undefined);
      }
    }
  });

  test('authors an anchored dimension from a browser-created line', async ({ page }) => {
    const { email, password } = await signInWithSeedUser(page);
    const token = await getAuthToken(email, password);
    const project = await createQaProject(token);
    const projectModel = await createDraftingDrawing(token, project.id, {
      kind: 'model',
      title: 'Project Model',
    });
    const sandboxDrawing = await createDraftingDrawing(
      token,
      project.id,
      createTemporaryDraftingQaSandboxDrawingInput(new Date('2026-04-27T00:00:00.000Z')),
    );
    let sandboxArchived = false;

    try {
      await page.goto(`/projects/${project.id}/drafting/${sandboxDrawing.id}`);
      await expect(page.getByTestId('drafting-canvas-stage')).toBeVisible();
      await expect(page.locator('[data-drafting-object-id]')).toHaveCount(0);

      const canvas = page.getByTestId('drafting-canvas-svg');
      await canvas.scrollIntoViewIfNeeded();
      const lineStartRatio = { xRatio: 0.38, yRatio: 0.42 };
      const lineEndRatio = { xRatio: 0.58, yRatio: 0.42 };
      const dimensionOffsetRatio = { xRatio: 0.38, yRatio: 0.32 };

      await authorTwoPointPrimitive({
        canvas,
        page,
        previewTestId: 'drafting-command-preview-line',
        start: lineStartRatio,
        end: lineEndRatio,
        toolLabel: 'Line',
      });
      await expect(page.locator('[data-drafting-object-id]')).toHaveCount(1);
      const authoredLineId = await page
        .locator('[data-drafting-object-id]')
        .getAttribute('data-drafting-object-id');
      expect(authoredLineId).toBeTruthy();

      await authorDimensionChain({
        canvas,
        firstWitness: lineStartRatio,
        offset: dimensionOffsetRatio,
        page,
        secondWitness: lineEndRatio,
      });
      await expect(page.locator('[data-drafting-object-id]')).toHaveCount(2);

      await page.getByRole('button', { name: 'Save' }).click();
      await expect(page.getByText('Saved').first()).toBeVisible();

      await page.reload();
      await expect(page.getByTestId('drafting-canvas-stage')).toBeVisible();
      await expect(page.locator('[data-drafting-object-id]')).toHaveCount(2);

      const reloadedDrawing = await apiRequest<DraftingDrawing>(
        token,
        `/projects/${project.id}/drafting/drawings/${sandboxDrawing.id}`,
      );
      const authoredDimension = reloadedDrawing.model.objects.find(
        (object): object is DraftingDimensionChainObject => object.type === 'dimension_chain',
      );
      expect(authoredDimension).toBeDefined();
      expect(authoredDimension!.geometry.points).toHaveLength(2);
      expect(authoredDimension!.metadata.witnessAnchorRefs).toHaveLength(2);
      expect(authoredDimension!.metadata.witnessAnchorRefs?.[0]?.sourceObjectId).toBe(
        authoredLineId,
      );
      expect(authoredDimension!.metadata.witnessAnchorRefs?.[1]?.sourceObjectId).toBe(
        authoredLineId,
      );
      const resolvedDimension = resolveDraftingDimensionAnchoredObject(
        authoredDimension!,
        reloadedDrawing.model.objects,
      );
      expect(calculateDimensionChainTotal(resolvedDimension.geometry.points)).toBeGreaterThan(0);

      const downloadPromise = page.waitForEvent('download');
      await page.getByRole('button', { name: 'Export JSON' }).click();
      const download = await downloadPromise;
      const downloadPath = await download.path();
      expect(downloadPath).toBeTruthy();
      const exportedJson = await readDownloadedText(downloadPath!);
      expect(exportedJson).toContain(authoredDimension!.id);
      expectExportIsMetadataOnly(exportedJson);

      await archiveDraftingSandbox(token, project.id, sandboxDrawing.id);
      sandboxArchived = true;

      await page.goto(`/projects/${project.id}/drafting`);
      await expect(page.getByText(sandboxDrawing.title)).toBeHidden();

      const untouchedProjectModel = await apiRequest<DraftingDrawing>(
        token,
        `/projects/${project.id}/drafting/drawings/${projectModel.id}`,
      );
      expect(untouchedProjectModel.model.objects).toHaveLength(0);
    } finally {
      if (!sandboxArchived) {
        await archiveDraftingSandbox(token, project.id, sandboxDrawing.id).catch(() => undefined);
      }
    }
  });

  test('updates an anchored dimension after dragging a line endpoint in the live canvas', async ({
    page,
  }) => {
    const { email, password } = await signInWithSeedUser(page);
    const token = await getAuthToken(email, password);
    const project = await createQaProject(token);
    const projectModel = await createDraftingDrawing(token, project.id, {
      kind: 'model',
      title: 'Project Model',
    });
    const sandboxDrawing = await createDraftingDrawing(
      token,
      project.id,
      createTemporaryDraftingQaSandboxDrawingInput(new Date('2026-04-27T00:00:00.000Z')),
    );
    let sandboxArchived = false;

    try {
      const sandbox = createDraftingConnectedEditSandboxModel(sandboxDrawing.id);
      await apiRequest(
        token,
        `/projects/${project.id}/drafting/drawings/${sandboxDrawing.id}/model`,
        {
          method: 'PUT',
          body: { model: sandbox.model },
        },
      );

      await page.goto(`/projects/${project.id}/drafting/${sandboxDrawing.id}`);
      await expect(page.getByTestId('drafting-canvas-stage')).toBeVisible();
      await expect(
        page.getByTestId(`drafting-dimension-label-${QA_LINE_DIMENSION_ID}-segment-0`),
      ).toContainText('4000 mm');

      await page.getByTestId(`drafting-object-${QA_LINE_ID}`).click({ force: true });
      const endpointHandle = page.getByTestId(`drafting-handle-${QA_LINE_ID}-end`);
      await expect(endpointHandle).toBeVisible();
      await dragLocatorBy(page, endpointHandle, { x: 60, y: 0 });

      const dimensionLabel = page.getByTestId(
        `drafting-dimension-label-${QA_LINE_DIMENSION_ID}-segment-0`,
      );
      await expect(dimensionLabel).not.toContainText('4000 mm');
      const updatedDimensionText = await dimensionLabel.textContent();
      expect(updatedDimensionText).toBeTruthy();
      const updatedDimensionLength = parseDimensionLength(updatedDimensionText!);
      expect(updatedDimensionLength).toBeGreaterThan(5000);

      await page.getByRole('button', { name: 'Save' }).click();
      await expect(page.getByText('Saved').first()).toBeVisible();

      await page.reload();
      await expect(page.getByTestId('drafting-canvas-stage')).toBeVisible();
      await expect(
        page.getByTestId(`drafting-dimension-label-${QA_LINE_DIMENSION_ID}-segment-0`),
      ).toContainText(updatedDimensionText!);

      const reloadedDrawing = await apiRequest<DraftingDrawing>(
        token,
        `/projects/${project.id}/drafting/drawings/${sandboxDrawing.id}`,
      );
      const reloadedDimension = reloadedDrawing.model.objects.find(
        (object): object is DraftingDimensionChainObject =>
          object.id === QA_LINE_DIMENSION_ID && object.type === 'dimension_chain',
      );
      expect(reloadedDimension).toBeDefined();
      const resolvedDimension = resolveDraftingDimensionAnchoredObject(
        reloadedDimension!,
        reloadedDrawing.model.objects,
      );
      expect(Math.round(calculateDimensionChainTotal(resolvedDimension.geometry.points))).toBe(
        updatedDimensionLength,
      );
      expect(reloadedDimension!.metadata.witnessAnchorRefs?.[1]?.sourceObjectId).toBe(QA_LINE_ID);

      const downloadPromise = page.waitForEvent('download');
      await page.getByRole('button', { name: 'Export JSON' }).click();
      const download = await downloadPromise;
      const downloadPath = await download.path();
      expect(downloadPath).toBeTruthy();
      const exportedJson = await readDownloadedText(downloadPath!);
      expect(exportedJson).toContain(QA_LINE_DIMENSION_ID);
      expectExportIsMetadataOnly(exportedJson);
      expectExportIsMetadataOnly(serializeDraftingQaSandboxExportJson(reloadedDrawing.model));

      await archiveDraftingSandbox(token, project.id, sandboxDrawing.id);
      sandboxArchived = true;

      await page.goto(`/projects/${project.id}/drafting`);
      await expect(page.getByText(sandboxDrawing.title)).toBeHidden();

      const untouchedProjectModel = await apiRequest<DraftingDrawing>(
        token,
        `/projects/${project.id}/drafting/drawings/${projectModel.id}`,
      );
      expect(untouchedProjectModel.model.objects).toHaveLength(0);
    } finally {
      if (!sandboxArchived) {
        await archiveDraftingSandbox(token, project.id, sandboxDrawing.id).catch(() => undefined);
      }
    }
  });
});

async function createQaProject(token: string): Promise<Project> {
  const suffix = Date.now().toString(36);
  return apiRequest<Project>(token, '/projects', {
    method: 'POST',
    body: {
      code: `${PROJECT_CODE_PREFIX}-${suffix}`,
      description: 'Temporary e2e project for isolated Drafting pointer QA.',
      name: `${PROJECT_NAME} ${suffix}`,
    },
  });
}

async function createDraftingDrawing(
  token: string,
  projectId: string,
  input: { kind: 'model' | 'sketch'; title: string },
): Promise<DraftingDrawing> {
  return apiRequest<DraftingDrawing>(token, `/projects/${projectId}/drafting/drawings`, {
    method: 'POST',
    body: input,
  });
}

async function archiveDraftingSandbox(token: string, projectId: string, drawingId: string) {
  return apiRequest<DraftingDrawing>(
    token,
    `/projects/${projectId}/drafting/drawings/${drawingId}`,
    {
      method: 'PATCH',
      body: createTemporaryDraftingQaSandboxArchiveInput(),
    },
  );
}

async function dragLocatorBy(page: Page, locator: Locator, delta: { x: number; y: number }) {
  const box = await locator.boundingBox();
  expect(box).toBeTruthy();
  const start = {
    x: box!.x + box!.width / 2,
    y: box!.y + box!.height / 2,
  };
  const end = {
    x: start.x + delta.x,
    y: start.y + delta.y,
  };

  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(end.x, end.y, { steps: 6 });
  await page.mouse.up();
}

async function authorTwoPointPrimitive(args: {
  canvas: Locator;
  end: { xRatio: number; yRatio: number };
  page: Page;
  previewTestId: string;
  start: { xRatio: number; yRatio: number };
  toolLabel: string;
}) {
  await startPrimitivePreview(args);
  const end = await pointInLocator(args.canvas, args.end);
  await args.page.mouse.click(end.x, end.y);
}

async function startPrimitivePreview({
  canvas,
  end,
  page,
  previewTestId,
  start,
  toolLabel,
}: {
  canvas: Locator;
  end: { xRatio: number; yRatio: number };
  page: Page;
  previewTestId: string;
  start: { xRatio: number; yRatio: number };
  toolLabel: string;
}) {
  const toolButton = page.getByRole('button', { exact: true, name: toolLabel });
  await toolButton.click();
  await expect(toolButton).toHaveAttribute('aria-pressed', 'true');
  await canvas.scrollIntoViewIfNeeded();
  const startPoint = await pointInLocator(canvas, start);
  const endPoint = await pointInLocator(canvas, end);
  await page.mouse.move(startPoint.x, startPoint.y);
  await page.mouse.click(startPoint.x, startPoint.y);
  await page.mouse.move(endPoint.x, endPoint.y, { steps: 6 });
  await expect(page.getByTestId(previewTestId)).toHaveCount(1);
}

async function startPolylinePreview({
  canvas,
  next,
  page,
  start,
}: {
  canvas: Locator;
  next: { xRatio: number; yRatio: number };
  page: Page;
  start: { xRatio: number; yRatio: number };
}) {
  await startPathPreview({
    canvas,
    next,
    page,
    previewTestId: 'drafting-command-preview-polyline',
    start,
    toolLabel: 'Polyline',
  });
}

async function startPathPreview({
  canvas,
  next,
  page,
  previewTestId,
  start,
  toolLabel,
}: {
  canvas: Locator;
  next: { xRatio: number; yRatio: number };
  page: Page;
  previewTestId: string;
  start: { xRatio: number; yRatio: number };
  toolLabel: string;
}) {
  const toolButton = page.getByRole('button', { exact: true, name: toolLabel });
  await toolButton.click();
  await expect(toolButton).toHaveAttribute('aria-pressed', 'true');
  await canvas.scrollIntoViewIfNeeded();
  const startPoint = await pointInLocator(canvas, start);
  const nextPoint = await pointInLocator(canvas, next);
  await page.mouse.move(startPoint.x, startPoint.y);
  await page.mouse.click(startPoint.x, startPoint.y);
  await expect(page.getByText('1 point(s) captured for the current path.')).toBeVisible();
  await page.mouse.move(nextPoint.x, nextPoint.y, { steps: 6 });
  await expect(page.getByTestId(previewTestId)).toHaveCount(1);
  return { nextPoint, startPoint };
}

async function authorDimensionChain({
  canvas,
  firstWitness,
  offset,
  page,
  secondWitness,
}: {
  canvas: Locator;
  firstWitness: { xRatio: number; yRatio: number };
  offset: { xRatio: number; yRatio: number };
  page: Page;
  secondWitness: { xRatio: number; yRatio: number };
}) {
  const toolButton = page.getByRole('button', { exact: true, name: 'Dimension chain' });
  await toolButton.click();
  await expect(toolButton).toHaveAttribute('aria-pressed', 'true');
  await canvas.scrollIntoViewIfNeeded();
  const firstWitnessPoint = await pointInLocator(canvas, firstWitness);
  const secondWitnessPoint = await pointInLocator(canvas, secondWitness);
  const offsetPoint = await pointInLocator(canvas, offset);

  await page.mouse.move(firstWitnessPoint.x, firstWitnessPoint.y);
  await page.mouse.click(firstWitnessPoint.x, firstWitnessPoint.y);
  await expect(page.getByText('Pick next witness point', { exact: false })).toBeVisible();
  await page.mouse.move(secondWitnessPoint.x, secondWitnessPoint.y, { steps: 6 });
  await expect(page.getByTestId('drafting-command-preview-dimension-chain')).toHaveCount(1);
  await page.mouse.click(secondWitnessPoint.x, secondWitnessPoint.y);
  await expect(page.getByText('Pick dimension offset', { exact: false })).toBeVisible();
  await page.mouse.move(offsetPoint.x, offsetPoint.y, { steps: 6 });
  await expect(page.getByTestId('drafting-command-preview-dimension-chain')).toHaveCount(1);
  await page.mouse.click(offsetPoint.x, offsetPoint.y);
  await expect(page.getByTestId('drafting-command-preview-dimension-chain')).toHaveCount(0);
}

async function pointInLocator(locator: Locator, ratios: { xRatio: number; yRatio: number }) {
  const box = await locator.boundingBox();
  expect(box).toBeTruthy();
  return {
    x: box!.x + box!.width * ratios.xRatio,
    y: box!.y + box!.height * ratios.yRatio,
  };
}

async function clickInLocator(locator: Locator, ratios: { xRatio: number; yRatio: number }) {
  const box = await locator.boundingBox();
  expect(box).toBeTruthy();
  await locator.click({
    position: {
      x: box!.width * ratios.xRatio,
      y: box!.height * ratios.yRatio,
    },
  });
}

async function readDownloadedText(path: string) {
  const { readFile } = await import('node:fs/promises');
  return readFile(path, 'utf-8');
}

function expectExportIsMetadataOnly(exportedJson: string) {
  expect(exportedJson).toContain('Metadata only');
  const parsed = JSON.parse(exportedJson) as unknown;
  const unsafeKeys: string[] = [];
  const unsafeValues: string[] = [];

  walkExportJson(parsed, (key, value) => {
    if (
      key &&
      key !== 'binaryPolicy' &&
      /(token|password|secret|session|pdfBytes|imageBytes|documentBytes|storagePath)/i.test(key)
    ) {
      unsafeKeys.push(key);
    }
    if (
      typeof value === 'string' &&
      key !== 'binaryPolicy' &&
      /(blob:|data:application\/pdf|data:image\/)/i.test(value)
    ) {
      unsafeValues.push(value);
    }
  });

  expect(unsafeKeys).toEqual([]);
  expect(unsafeValues).toEqual([]);
}

function parseDimensionLength(label: string) {
  const match = label.match(/^(\d+)\s+mm$/);
  expect(match).toBeTruthy();
  return Number(match![1]);
}

function walkExportJson(
  value: unknown,
  visitor: (key: string | null, value: unknown) => void,
  key: string | null = null,
) {
  visitor(key, value);
  if (Array.isArray(value)) {
    value.forEach((entry) => walkExportJson(entry, visitor, null));
    return;
  }
  if (!value || typeof value !== 'object') {
    return;
  }
  Object.entries(value).forEach(([entryKey, entryValue]) =>
    walkExportJson(entryValue, visitor, entryKey),
  );
}
