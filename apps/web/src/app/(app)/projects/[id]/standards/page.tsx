'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Pin, Plus } from 'lucide-react';
import { useProjectStandardAssignments, useAssignProjectStandard, useCurrentEditions } from '@/hooks/use-standards';
import { useProject } from '@/hooks/use-projects';
import { PageHeader } from '@/components/page-header';
import { StandardsBadge } from '@/components/standards-badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { PageLoading } from '@/components/loading';
import { EmptyState } from '@/components/empty-state';
import { toast } from 'sonner';

export default function ProjectStandardsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: project } = useProject(id);
  const { data: assignments, isLoading } = useProjectStandardAssignments(id);
  const { data: editions } = useCurrentEditions();
  const assign = useAssignProjectStandard(id);
  const [showAssign, setShowAssign] = useState(false);
  const [selectedEdition, setSelectedEdition] = useState('');

  if (isLoading) return <PageLoading />;

  const assignedIds = new Set(assignments?.map((a) => a.standardEditionId) ?? []);
  const available = editions?.filter((e) => !assignedIds.has(e.id)) ?? [];

  async function handleAssign(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedEdition) return;
    try {
      await assign.mutateAsync({ standardEditionId: selectedEdition });
      toast.success('Standard assigned');
      setShowAssign(false);
      setSelectedEdition('');
    } catch {
      toast.error('Failed to assign standard');
    }
  }

  return (
    <>
      <div className="mb-4">
        <Link href={`/projects/${id}`} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to project
        </Link>
      </div>

      <PageHeader
        title="Project Standards"
        description={`Standards assigned to ${project?.code ?? 'this project'}`}
        actions={
          available.length > 0 ? (
            <Button onClick={() => setShowAssign(true)}>
              <Plus className="mr-2 h-4 w-4" /> Assign Standard
            </Button>
          ) : null
        }
      />

      {!assignments?.length ? (
        <EmptyState
          icon={<Pin className="h-12 w-12" />}
          title="No standards assigned"
          description="Assign standards editions to this project to track applicable codes."
          action={
            available.length > 0 ? (
              <Button onClick={() => setShowAssign(true)}>
                <Plus className="mr-2 h-4 w-4" /> Assign Standard
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {assignments.map((a) => {
            const edition = editions?.find((e) => e.id === a.standardEditionId);
            return (
              <Card key={a.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <StandardsBadge code={edition?.code ?? ''} edition={edition?.edition} />
                    {edition?.rulePackId ? (
                      <Badge variant="success" className="text-[10px]">Rule pack loaded</Badge>
                    ) : (
                      <Badge variant="warning" className="text-[10px]">No rule pack</Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <CardTitle className="text-sm">{edition?.title ?? 'Unknown'}</CardTitle>
                  {a.notes && <p className="mt-1 text-xs text-muted-foreground">{a.notes}</p>}
                  <p className="mt-2 text-xs text-muted-foreground">
                    Pinned {new Date(a.pinnedAt).toLocaleDateString()}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={showAssign} onOpenChange={setShowAssign}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Standard</DialogTitle>
            <DialogDescription>Select a standard edition to assign to this project.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAssign} className="space-y-4">
            <Select value={selectedEdition} onValueChange={setSelectedEdition}>
              <SelectTrigger><SelectValue placeholder="Select edition…" /></SelectTrigger>
              <SelectContent>
                {available.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.code} ({e.edition}){e.amendment ? ` ${e.amendment}` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowAssign(false)}>Cancel</Button>
              <Button type="submit" disabled={!selectedEdition || assign.isPending}>Assign</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
