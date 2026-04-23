'use client';

import * as React from 'react';
import Link from 'next/link';
import type { DraftingDrawing } from '@eng/shared';
import { ArrowLeft, Download, ExternalLink, Save } from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { formatDrawingRevision } from '../model-utils';

export function DraftingToolbar({
  drawing,
  isDirty,
  isSaving,
  onExportJson,
  onFitView,
  onSave,
  projectCode,
  projectId,
}: {
  drawing: DraftingDrawing;
  isDirty: boolean;
  isSaving: boolean;
  onExportJson: () => void;
  onFitView: () => void;
  onSave: () => void;
  projectCode: string;
  projectId: string;
}) {
  return (
    <>
      <div className="mb-4">
        <Link
          href={`/projects/${projectId}/drafting`}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to drawing register
        </Link>
      </div>

      <PageHeader
        title={drawing.title}
        description={`${projectCode} · Drafting editor`}
        badges={
          <>
            <Badge variant={drawing.status === 'draft' ? 'warning' : 'secondary'}>
              {drawing.status}
            </Badge>
            <Badge variant="outline">{formatDrawingRevision(drawing)}</Badge>
            {isDirty ? (
              <Badge variant="warning">Unsaved changes</Badge>
            ) : (
              <Badge variant="success">Saved</Badge>
            )}
          </>
        }
        actions={
          <>
            <Button variant="outline" onClick={onFitView}>
              Fit View
            </Button>
            <Link
              href={`/projects/${projectId}/drafting/${drawing.id}/schedules/preview`}
              target="_blank"
              rel="noreferrer"
              className={buttonVariants({ variant: 'outline' })}
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              Schedule Preview
            </Link>
            <Button variant="outline" onClick={onExportJson}>
              <Download className="mr-2 h-4 w-4" />
              Export JSON
            </Button>
            <Button variant="outline" disabled>
              Revision Placeholder
            </Button>
            <Button onClick={onSave} disabled={!isDirty || isSaving}>
              <Save className="mr-2 h-4 w-4" />
              Save
            </Button>
          </>
        }
      />
    </>
  );
}
