'use client';

import * as React from 'react';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { FileText, Layers3, Plus, Send } from 'lucide-react';
import type { DraftingDrawingSummary, Project } from '@eng/shared';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { EmptyState } from '@/components/empty-state';
import { PageLoading } from '@/components/loading';
import { PageHeader } from '@/components/page-header';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  useCreateDraftingDrawing,
  useDraftingDrawings,
  useUpdateDraftingDrawing,
} from '@/hooks/use-drafting';
import { formatDrawingRevision, formatDraftingTimestamp } from './model-utils';

type RenameState = {
  id: string;
  title: string;
} | null;

export function DraftingRegister({ projectId, project }: { projectId: string; project: Project }) {
  const router = useRouter();
  const { data: drawings, isLoading } = useDraftingDrawings(projectId);
  const createDrawing = useCreateDraftingDrawing(projectId);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [renameState, setRenameState] = useState<RenameState>(null);
  const [newTitle, setNewTitle] = useState('General Arrangement 01');

  if (isLoading) {
    return <PageLoading />;
  }

  const sortedDrawings = [...(drawings ?? [])].sort(
    (first, second) =>
      new Date(second.updatedAt).getTime() - new Date(first.updatedAt).getTime() ||
      first.title.localeCompare(second.title),
  );
  const activeDrawings = sortedDrawings.filter((drawing) => drawing.status !== 'archived');
  const explicitProjectModel = activeDrawings.find((drawing) => drawing.isProjectModel);
  const projectModel = explicitProjectModel ?? activeDrawings[0] ?? null;
  const sketchDrawings = activeDrawings.filter((drawing) => drawing.id !== projectModel?.id);
  const archivedDrawings = sortedDrawings.filter((drawing) => drawing.status === 'archived');
  const sketchCount = sketchDrawings.length;
  const archivedCount = archivedDrawings.length;

  async function handleCreateDrawing(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      const drawing = await createDrawing.mutateAsync({
        title: newTitle,
        kind: 'sketch',
      });
      toast.success('Drafting sketch created');
      setShowCreateDialog(false);
      setNewTitle('General Arrangement 01');
      router.push(`/projects/${projectId}/drafting/${drawing.id}`);
    } catch {
      toast.error('Failed to create drafting drawing');
    }
  }

  async function handleOpenProjectModel() {
    if (projectModel) {
      router.push(`/projects/${projectId}/drafting/${projectModel.id}`);
      return;
    }

    try {
      const drawing = await createDrawing.mutateAsync({
        title: 'Project Model',
        kind: 'model',
      });
      toast.success('Project model created');
      router.push(`/projects/${projectId}/drafting/${drawing.id}`);
    } catch {
      toast.error('Failed to create project model');
    }
  }

  return (
    <>
      <PageHeader
        title="Drafting"
        description={`${project.code} · Project model canvas, sheet outputs, sketches, and transmittals`}
        actions={
          <div className="flex flex-wrap gap-2">
            <Link
              href={`/projects/${projectId}/drafting/transmittals`}
              className={buttonVariants({ variant: 'outline' })}
            >
              <Send className="mr-2 h-4 w-4" />
              Project Transmittals
            </Link>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="mr-2 h-4 w-4" />
              New Sketch
            </Button>
          </div>
        }
        badges={
          <>
            <Badge variant="outline">1 project model canvas</Badge>
            <Badge variant="secondary">
              Sheets and transmittals are outputs of the project model.
            </Badge>
          </>
        }
      />

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Project Model</h2>
          <p className="text-sm text-muted-foreground">
            Single model space for project drafting objects, underlays, reference point, and
            coordinates.
          </p>
        </div>

        {projectModel ? (
          <ProjectModelCard
            drawing={projectModel}
            onOpenProjectModel={handleOpenProjectModel}
            projectId={projectId}
          />
        ) : (
          <EmptyState
            icon={<Layers3 className="h-12 w-12" />}
            title="No project model canvas"
            description="Create the single model space for drafting objects, underlays, reference point, and coordinates."
            action={<Button onClick={handleOpenProjectModel}>Open Project Model</Button>}
          />
        )}

        <section className="space-y-4" aria-label="Sheets and outputs">
          <div>
            <h2 className="text-lg font-semibold">Sheets / Outputs</h2>
            <p className="text-sm text-muted-foreground">
              Plotted views, drawing sheet previews, issue snapshots, schedules, and sheet exports
              come from the project model.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href={
                projectModel
                  ? `/projects/${projectId}/drafting/${projectModel.id}/sheets/preview`
                  : `/projects/${projectId}/drafting`
              }
              className={buttonVariants({ variant: 'outline' })}
              aria-disabled={!projectModel}
            >
              Drawing Sheet Preview
            </Link>
            <Link
              href={
                projectModel
                  ? `/projects/${projectId}/drafting/${projectModel.id}/schedules/preview`
                  : `/projects/${projectId}/drafting`
              }
              className={buttonVariants({ variant: 'outline' })}
              aria-disabled={!projectModel}
            >
              Schedule Pack Preview
            </Link>
          </div>
        </section>

        <section className="space-y-4" aria-label="Project transmittals">
          <div>
            <h2 className="text-lg font-semibold">Transmittals</h2>
            <p className="text-sm text-muted-foreground">
              Project-level transmittals package issued sheet snapshots without changing the model
              canvas.
            </p>
          </div>
          <Link
            href={`/projects/${projectId}/drafting/transmittals`}
            className={buttonVariants({ variant: 'outline' })}
          >
            <Send className="mr-2 h-4 w-4" />
            Project Transmittal Register
          </Link>
        </section>

        <section className="space-y-4" aria-label="Sketches">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-lg font-semibold">Sketches</h2>
              <p className="text-sm text-muted-foreground">
                QA, scratch, and freeform canvases. These are not production model spaces.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {sketchCount > 0 ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowArchived((value) => !value)}
                >
                  {showArchived
                    ? 'Hide sketches'
                    : `Show sketches (${sketchCount + archivedCount})`}
                </Button>
              ) : null}
              {archivedCount > 0 && sketchCount === 0 ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowArchived((value) => !value)}
                >
                  {showArchived
                    ? 'Hide archived sketches'
                    : `Show archived sketches (${archivedCount})`}
                </Button>
              ) : null}
            </div>
          </div>

          {showArchived ? (
            <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
              {[...sketchDrawings, ...archivedDrawings].map((drawing) => (
                <DraftingSketchCard
                  key={drawing.id}
                  projectId={projectId}
                  onRename={() => setRenameState({ id: drawing.id, title: drawing.title })}
                  drawing={drawing}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-md border border-dashed bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
              Sketch and QA canvases are hidden by default.
            </div>
          )}
        </section>
      </section>

      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Sketch</DialogTitle>
            <DialogDescription>
              Create a QA, scratch, or freeform drafting canvas separate from the project model.
            </DialogDescription>
          </DialogHeader>

          <form className="space-y-4" onSubmit={handleCreateDrawing}>
            <div className="space-y-2">
              <Label htmlFor="drawing-title">Sketch title</Label>
              <Input
                id="drawing-title"
                value={newTitle}
                onChange={(event) => setNewTitle(event.target.value)}
                placeholder="QA sketch or freeform check"
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowCreateDialog(false)}
                disabled={createDrawing.isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createDrawing.isPending || newTitle.trim().length === 0}
              >
                Create sketch
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <RenameDrawingDialog
        projectId={projectId}
        state={renameState}
        onClose={() => setRenameState(null)}
      />
    </>
  );
}

function ProjectModelCard({
  projectId,
  drawing,
  onOpenProjectModel,
}: {
  projectId: string;
  drawing: DraftingDrawingSummary;
  onOpenProjectModel: () => void;
}) {
  return (
    <Card className="max-w-3xl">
      <CardHeader className="space-y-3">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle className="text-base">Project Model</CardTitle>
            <Badge variant="secondary">model space</Badge>
            <Badge variant={drawing.status === 'draft' ? 'warning' : 'secondary'}>
              {drawing.status}
            </Badge>
          </div>
          <CardDescription>
            Single model space for project drafting objects, underlays, reference point, and
            coordinates. {drawing.objectCount} object{drawing.objectCount === 1 ? '' : 's'} ·
            Updated {formatDraftingTimestamp(drawing.updatedAt)}
          </CardDescription>
        </div>
        <CardContent className="space-y-3 px-0 pb-0">
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={onOpenProjectModel}>
              Open Project Model
            </Button>
            <Link
              href={`/projects/${projectId}/drafting/${drawing.id}/sheets/preview`}
              className={buttonVariants({ size: 'sm', variant: 'outline' })}
            >
              Sheet Outputs
            </Link>
          </div>
        </CardContent>
      </CardHeader>
    </Card>
  );
}

function DraftingSketchCard({
  projectId,
  drawing,
  onRename,
}: {
  projectId: string;
  drawing: DraftingDrawingSummary;
  onRename: () => void;
}) {
  const updateDrawing = useUpdateDraftingDrawing(projectId, drawing.id);

  async function handleArchive(nextStatus: 'archived' | 'draft') {
    try {
      await updateDrawing.mutateAsync({ status: nextStatus });
      toast.success(nextStatus === 'archived' ? 'Sketch archived' : 'Sketch restored');
    } catch {
      toast.error('Failed to update drawing status');
    }
  }

  return (
    <Card className="h-full">
      <CardHeader className="space-y-3">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle className="text-base">{drawing.title}</CardTitle>
            <Badge variant="outline">sketch / QA</Badge>
            <Badge variant={drawing.status === 'draft' ? 'warning' : 'secondary'}>
              {drawing.status}
            </Badge>
          </div>
          <CardDescription>
            {formatDrawingRevision(drawing)} · {drawing.objectCount} object
            {drawing.objectCount === 1 ? '' : 's'} · Updated{' '}
            {formatDraftingTimestamp(drawing.updatedAt)}
          </CardDescription>
        </div>

        <CardContent className="space-y-3 px-0 pb-0">
          <div className="flex flex-wrap gap-2">
            <Link
              href={`/projects/${projectId}/drafting/${drawing.id}`}
              className={buttonVariants({ size: 'sm' })}
            >
              Open Sketch
            </Link>
            <Button size="sm" variant="outline" onClick={onRename}>
              Rename
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleArchive(drawing.status === 'archived' ? 'draft' : 'archived')}
              disabled={updateDrawing.isPending}
            >
              {drawing.status === 'archived' ? 'Restore' : 'Archive'}
            </Button>
          </div>
        </CardContent>
      </CardHeader>
    </Card>
  );
}

function RenameDrawingDialog({
  projectId,
  state,
  onClose,
}: {
  projectId: string;
  state: RenameState;
  onClose: () => void;
}) {
  const [title, setTitle] = useState('');
  const updateDrawing = useUpdateDraftingDrawing(projectId, state?.id ?? '');

  useEffect(() => {
    setTitle(state?.title ?? '');
  }, [state]);

  async function handleRename(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!state) {
      return;
    }

    try {
      await updateDrawing.mutateAsync({
        title,
      });
      toast.success('Drawing renamed');
      onClose();
    } catch {
      toast.error('Failed to rename drawing');
    }
  }

  return (
    <Dialog
      open={Boolean(state)}
      onOpenChange={(open) => {
        if (!open) {
          onClose();
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Rename Drawing</DialogTitle>
          <DialogDescription>Update the register title for this sketch.</DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={handleRename}>
          <div className="space-y-2">
            <Label htmlFor="rename-title">Title</Label>
            <Input
              id="rename-title"
              value={state ? title : ''}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Updated drawing title"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!state || title.trim().length === 0 || updateDrawing.isPending}
            >
              Save title
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
