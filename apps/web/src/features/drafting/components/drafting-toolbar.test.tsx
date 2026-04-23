import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { createEmptyDraftingModel, type DraftingDrawing } from '@eng/shared';
import { DraftingToolbar } from './drafting-toolbar';

describe('DraftingToolbar', () => {
  beforeAll(() => {
    vi.stubGlobal('React', React);
  });

  it('links to the schedule sheet preview route without leaving the editor tab', () => {
    const markup = renderToStaticMarkup(
      <DraftingToolbar
        drawing={drawing()}
        isDirty={false}
        isSaving={false}
        onExportJson={() => undefined}
        onFitView={() => undefined}
        onSave={() => undefined}
        projectCode="NSYD"
        projectId="project-1"
      />,
    );

    expect(markup).toContain('/projects/project-1/drafting/drawing-1/schedules/preview');
    expect(markup).toContain('target="_blank"');
    expect(markup).toContain('Schedule Preview');
  });
});

function drawing(): DraftingDrawing {
  return {
    id: 'drawing-1',
    projectId: 'project-1',
    title: 'Drafting Schedule Sheet QA',
    status: 'draft',
    currentRevision: 1,
    modelVersion: 1,
    objectCount: 0,
    createdById: 'user-1',
    updatedById: 'user-1',
    createdAt: '2026-04-22T00:00:00.000Z',
    updatedAt: '2026-04-23T00:00:00.000Z',
    model: createEmptyDraftingModel('drawing-1'),
    revisions: [],
  };
}
