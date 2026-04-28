import { expect, test, type Locator, type Page } from '@playwright/test';
import type {
  DraftingCalloutObject,
  DraftingCircleObject,
  DraftingDimensionChainObject,
  DraftingDrawing,
  DraftingLineObject,
  DraftingLeaderNoteObject,
  DraftingPolygonObject,
  DraftingPolylineObject,
  DraftingRectangleObject,
  DraftingSectionMarkerObject,
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
