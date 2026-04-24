'use client';

import * as React from 'react';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { FileText, Plus, Send } from 'lucide-react';
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
  const archivedDrawings = sortedDrawings.filter((drawing) => drawing.status === 'archived');
  const activeCount = activeDrawings.length;
  const archivedCount = archivedDrawings.length;

  async function handleCreateDrawing(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      const drawing = await createDrawing.mutateAsync({
        title: newTitle,
      });
      toast.success('Drafting drawing created');
      setShowCreateDialog(false);
      setNewTitle('General Arrangement 01');
      router.push(`/projects/${projectId}/drafting/${drawing.id}`);
    } catch {
      toast.error('Failed to create drafting drawing');
    }
  }

  return (
    <>
      <PageHeader
        title="Drafting"
        description={`${project.code} · Project-native drawing register and editor`}
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
              New Drawing
            </Button>
          </div>
        }
        badges={
          <>
            <Badge variant="outline">{activeCount} active drawing(s)</Badge>
            <Badge variant="secondary">
              Project-native drawing register, sheets, schedules, underlays, and transmittals.
            </Badge>
          </>
        }
      />

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Drawing Register</h2>
          <p className="text-sm text-muted-foreground">
            Manage project-owned engineering drawings, revisions, and exports from one place.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {archivedCount > 0 ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowArchived((value) => !value)}
            >
              {showArchived ? 'Hide archived' : `Show archived (${archivedCount})`}
            </Button>
          ) : null}
        </div>

        {activeCount === 0 ? (
          <EmptyState
            icon={<FileText className="h-12 w-12" />}
            title={archivedCount > 0 ? 'No active drafting drawings' : 'No drafting drawings yet'}
            description={
              archivedCount > 0
                ? 'Archived drawings are hidden from the default register view.'
                : 'Create the first project-native drawing to start authoring piles, excavation lines, monitoring points, and notes.'
            }
            action={
              archivedCount > 0 ? (
                <Button variant="outline" onClick={() => setShowArchived(true)}>
                  Show archived ({archivedCount})
                </Button>
              ) : (
                <Button onClick={() => setShowCreateDialog(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create drawing
                </Button>
              )
            }
          />
        ) : (
          <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
            {activeDrawings.map((drawing) => (
              <DraftingDrawingCard
                key={drawing.id}
                projectId={projectId}
                onRename={() => setRenameState({ id: drawing.id, title: drawing.title })}
                drawing={drawing}
              />
            ))}
          </div>
        )}

        {showArchived && archivedCount > 0 ? (
          <section className="space-y-4" aria-label="Archived drawings">
            <div>
              <h3 className="text-base font-semibold">Archived drawings</h3>
              <p className="text-sm text-muted-foreground">
                Restored drawings return to the active register.
              </p>
            </div>
            <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
              {archivedDrawings.map((drawing) => (
                <DraftingDrawingCard
                  key={drawing.id}
                  projectId={projectId}
                  onRename={() => setRenameState({ id: drawing.id, title: drawing.title })}
                  drawing={drawing}
                />
              ))}
            </div>
          </section>
        ) : null}
      </section>

      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Drafting Drawing</DialogTitle>
            <DialogDescription>
              Start a project-native drawing backed by a typed drafting model.
            </DialogDescription>
          </DialogHeader>

          <form className="space-y-4" onSubmit={handleCreateDrawing}>
            <div className="space-y-2">
              <Label htmlFor="drawing-title">Title</Label>
              <Input
                id="drawing-title"
                value={newTitle}
                onChange={(event) => setNewTitle(event.target.value)}
                placeholder="Basement shoring layout"
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
                Create drawing
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

function DraftingDrawingCard({
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
      toast.success(nextStatus === 'archived' ? 'Drawing archived' : 'Drawing restored');
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
              Open Editor
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
          <DialogDescription>Update the register title for this drawing.</DialogDescription>
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
