import { expect, test, type Locator, type Page } from '@playwright/test';
import type {
  DraftingDimensionChainObject,
  DraftingDrawing,
  DraftingLineObject,
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

async function pointInLocator(locator: Locator, ratios: { xRatio: number; yRatio: number }) {
  const box = await locator.boundingBox();
  expect(box).toBeTruthy();
  return {
    x: box!.x + box!.width * ratios.xRatio,
    y: box!.y + box!.height * ratios.yRatio,
  };
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
