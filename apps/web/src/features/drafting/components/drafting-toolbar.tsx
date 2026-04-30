'use client';

import * as React from 'react';
import Link from 'next/link';
import type { DraftingDrawing } from '@eng/shared';
import {
  ArrowLeft,
  CheckCircle2,
  Clock3,
  Download,
  ExternalLink,
  FileText,
  Maximize2,
  Save,
} from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { formatDraftingTimestamp, formatDrawingRevision } from '../model-utils';

export function DraftingToolbar({
  drawing,
  currentRevisionLabel,
  isDirty,
  isSaving,
  onExportJson,
  onFitView,
  onOpenTitleRevision,
  onSave,
  projectCode,
  projectId,
}: {
  drawing: DraftingDrawing;
  currentRevisionLabel?: string;
  isDirty: boolean;
  isSaving: boolean;
  onExportJson: () => void;
  onFitView: () => void;
  onOpenTitleRevision: () => void;
  onSave: () => void;
  projectCode: string;
  projectId: string;
}) {
  const title = drawing.isProjectModel ? 'Project Model Workspace' : drawing.title;
  const description = drawing.isProjectModel
    ? `${projectCode} · Drafting project model`
    : `${projectCode} · Drafting editor`;
  const revisionLabel = currentRevisionLabel ?? formatDrawingRevision(drawing);
  const saveStateLabel = isSaving ? 'Saving changes' : isDirty ? 'Unsaved changes' : 'Saved';

  return (
    <section className="mb-4" data-testid="drafting-editor-toolbar">
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
        title={title}
        description={description}
        badges={
          <>
            <Badge variant={drawing.status === 'draft' ? 'warning' : 'secondary'}>
              {drawing.status}
            </Badge>
            <Badge variant="outline">{formatDrawingRevision(drawing)}</Badge>
            {currentRevisionLabel ? (
              <Badge variant="secondary">Current rev {currentRevisionLabel}</Badge>
            ) : null}
            {isSaving ? (
              <Badge variant="secondary">Saving</Badge>
            ) : isDirty ? (
              <Badge variant="warning">Unsaved changes</Badge>
            ) : (
              <Badge variant="success">Saved</Badge>
            )}
          </>
        }
        actions={
          <div
            className="flex flex-wrap items-center justify-end gap-2"
            data-testid="drafting-toolbar-actions"
          >
            <Button variant="outline" onClick={onFitView}>
              <Maximize2 className="mr-2 h-4 w-4" />
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
            <Button variant="outline" onClick={onOpenTitleRevision}>
              <FileText className="mr-2 h-4 w-4" />
              Title / Revision
            </Button>
            <Button onClick={onSave} disabled={!isDirty || isSaving}>
              <Save className="mr-2 h-4 w-4" />
              {isSaving ? 'Saving' : 'Save'}
            </Button>
          </div>
        }
      />

      <div
        className="mt-3 grid gap-2 rounded-md border bg-muted/20 p-2 text-xs sm:grid-cols-2 lg:grid-cols-4"
        data-testid="drafting-toolbar-status-rail"
      >
        <ToolbarStatusItem
          label="Workspace"
          value={drawing.isProjectModel ? 'Project model' : 'Drawing sheet model'}
        />
        <ToolbarStatusItem label="Revision" value={revisionLabel} />
        <ToolbarStatusItem label="Status" value={drawing.status} />
        <ToolbarStatusItem
          icon={isDirty || isSaving ? Clock3 : CheckCircle2}
          label="Save state"
          value={`${saveStateLabel} · ${formatDraftingTimestamp(drawing.updatedAt)}`}
        />
      </div>
    </section>
  );
}

function ToolbarStatusItem({
  icon: Icon,
  label,
  value,
}: {
  icon?: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0 rounded-sm border bg-background px-2 py-1.5">
      <div className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
        {Icon ? <Icon className="h-3 w-3" /> : null}
        {label}
      </div>
      <div className="truncate font-medium capitalize text-foreground" title={value}>
        {value}
      </div>
    </div>
  );
}
