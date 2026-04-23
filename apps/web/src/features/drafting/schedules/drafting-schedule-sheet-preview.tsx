'use client';

import * as React from 'react';
import Link from 'next/link';
import { ArrowLeft, Printer } from 'lucide-react';
import type { DraftingDrawing, Project } from '@eng/shared';
import { PageLoading } from '@/components/loading';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useDraftingDrawing } from '@/hooks/use-drafting';
import { useRootSheetTemplates } from '@/hooks/use-root-sheet-templates';
import { coerceRootSheetTemplateDocument } from '@/features/templates/root-sheet-template-types';
import { formatOperatorFacingSheetLabel } from '@/features/templates/sheet-display-labels';
import { SharedSheetRenderer } from '@/features/templates/components/shared-sheet-renderer';
import {
  DRAFTING_SCHEDULE_ALL_GROUPS,
  buildDraftingScheduleSheetRenderModel,
  getDraftingScheduleSheetPaper,
  type DraftingScheduleSheetGroupSelection,
  type DraftingScheduleSheetTemplateSource,
} from './drafting-schedule-sheet';
import { DRAFTING_SCHEDULE_GROUP_DEFINITIONS } from './drafting-schedule-utils';
import { formatDrawingRevision, formatDraftingTimestamp } from '../model-utils';

const DEFAULT_TEMPLATE_VALUE = 'default';

export function DraftingScheduleSheetPreviewPage({
  drawingId,
  project,
  projectId,
}: {
  drawingId: string;
  project: Project;
  projectId: string;
}) {
  const { data: drawing, isLoading: drawingLoading } = useDraftingDrawing(projectId, drawingId);
  const { data: rootTemplates = [], isLoading: templatesLoading } = useRootSheetTemplates();
  const [groupSelection, setGroupSelection] = React.useState<DraftingScheduleSheetGroupSelection>(
    DRAFTING_SCHEDULE_ALL_GROUPS,
  );
  const [templateValue, setTemplateValue] = React.useState(DEFAULT_TEMPLATE_VALUE);
  const templateOptions = React.useMemo(
    () =>
      rootTemplates
        .map((template) => {
          const document = coerceRootSheetTemplateDocument(template);
          if (!document || !template.currentVersion) {
            return null;
          }

          return {
            label: `${formatOperatorFacingSheetLabel(template.label)} · ${document.paperSize.toUpperCase()} ${document.orientation}`,
            source: {
              label: formatOperatorFacingSheetLabel(template.label),
              template: document,
            } satisfies DraftingScheduleSheetTemplateSource,
            value: template.id,
          };
        })
        .filter((option): option is NonNullable<typeof option> => option !== null),
    [rootTemplates],
  );
  const selectedTemplateSource = React.useMemo(() => {
    if (templateValue === DEFAULT_TEMPLATE_VALUE) {
      return {
        label: 'Default drafting schedule sheet',
        template: null,
      } satisfies DraftingScheduleSheetTemplateSource;
    }

    return (
      templateOptions.find((option) => option.value === templateValue)?.source ?? {
        label: 'Default drafting schedule sheet',
        template: null,
      }
    );
  }, [templateOptions, templateValue]);

  if (drawingLoading || templatesLoading || !drawing) {
    return <PageLoading />;
  }

  return (
    <DraftingScheduleSheetPreview
      drawing={drawing}
      groupSelection={groupSelection}
      onGroupSelectionChange={setGroupSelection}
      onTemplateValueChange={setTemplateValue}
      project={project}
      projectId={projectId}
      selectedTemplateSource={selectedTemplateSource}
      templateOptions={templateOptions}
      templateValue={templateValue}
    />
  );
}

export function DraftingScheduleSheetPreview({
  drawing,
  groupSelection,
  onGroupSelectionChange,
  onTemplateValueChange,
  project,
  projectId,
  selectedTemplateSource,
  templateOptions,
  templateValue,
}: {
  drawing: DraftingDrawing;
  groupSelection: DraftingScheduleSheetGroupSelection;
  onGroupSelectionChange: (selection: DraftingScheduleSheetGroupSelection) => void;
  onTemplateValueChange: (value: string) => void;
  project: Project;
  projectId: string;
  selectedTemplateSource: DraftingScheduleSheetTemplateSource;
  templateOptions: Array<{
    label: string;
    source: DraftingScheduleSheetTemplateSource;
    value: string;
  }>;
  templateValue: string;
}) {
  const renderModel = React.useMemo(
    () =>
      buildDraftingScheduleSheetRenderModel({
        groupSelection,
        metadata: {
          drawingId: drawing.id,
          drawingStatus: drawing.status,
          drawingTitle: drawing.title,
          generatedAtLabel: `Updated ${formatDraftingTimestamp(drawing.updatedAt)}`,
          projectCode: project.code,
          projectName: project.name,
          revision: formatDrawingRevision(drawing),
        },
        model: drawing.model,
        templateSource: selectedTemplateSource,
      }),
    [drawing, groupSelection, project.code, project.name, selectedTemplateSource],
  );
  const paper = getDraftingScheduleSheetPaper(renderModel);
  const activeGroupCount =
    groupSelection === DRAFTING_SCHEDULE_ALL_GROUPS
      ? DRAFTING_SCHEDULE_GROUP_DEFINITIONS.length
      : 1;

  return (
    <div className="mx-auto max-w-[1600px] space-y-4 print:max-w-none print:space-y-0">
      <div className="flex flex-wrap items-start justify-between gap-4 print:hidden">
        <div className="space-y-2">
          <Link
            href={`/projects/${projectId}/drafting/${drawing.id}`}
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Drafting editor
          </Link>
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight">Schedule Sheet Preview</h1>
              <Badge variant="secondary">{paper.paperSize.toUpperCase()}</Badge>
              <Badge variant="outline">{paper.orientation}</Badge>
              <Badge variant="outline">{activeGroupCount} group(s)</Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {project.code} · {drawing.title} · {selectedTemplateSource.label}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={groupSelection}
            onValueChange={(value) =>
              onGroupSelectionChange(value as DraftingScheduleSheetGroupSelection)
            }
          >
            <SelectTrigger className="w-[240px]" aria-label="Schedule group">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={DRAFTING_SCHEDULE_ALL_GROUPS}>All schedule groups</SelectItem>
              {DRAFTING_SCHEDULE_GROUP_DEFINITIONS.map((group) => (
                <SelectItem key={group.key} value={group.key}>
                  {group.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={templateValue} onValueChange={onTemplateValueChange}>
            <SelectTrigger className="w-[280px]" aria-label="Sheet template">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={DEFAULT_TEMPLATE_VALUE}>Default A3 schedule sheet</SelectItem>
              {templateOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Link
            href={`/projects/${projectId}/drafting/${drawing.id}`}
            className={buttonVariants({ variant: 'outline' })}
          >
            Editor
          </Link>
          <Button type="button" onClick={() => window.print()}>
            <Printer className="mr-2 h-4 w-4" />
            Print / Save PDF
          </Button>
        </div>
      </div>

      <div className="overflow-auto rounded-md border bg-slate-100 p-6 print:overflow-visible print:rounded-none print:border-0 print:bg-white print:p-0">
        <div
          className="package-print-page"
          data-print-orientation={paper.orientation}
          data-print-page-size={paper.paperSize}
        >
          <DraftingScheduleSheet renderModel={renderModel} />
        </div>
      </div>
    </div>
  );
}

export function DraftingScheduleSheet({
  renderModel,
}: {
  renderModel: ReturnType<typeof buildDraftingScheduleSheetRenderModel>;
}) {
  return <SharedSheetRenderer model={renderModel} previewMode showDesignerChrome={false} />;
}
