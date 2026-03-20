'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Pin, Plus, AlertTriangle, ShieldCheck, ShieldAlert } from 'lucide-react';
import { useProjectStandardAssignments, useAssignProjectStandard, useCurrentEditions } from '@/hooks/use-standards';
import { useProject } from '@/hooks/use-projects';
import { PageHeader } from '@/components/page-header';
import { StandardsBadge } from '@/components/standards-badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
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

  const assignmentsWithEditions = assignments?.map((a) => {
    const edition = editions?.find((e) => e.id === a.standardEditionId);
    return { ...a, edition };
  }) ?? [];

  const missingRulePacks = assignmentsWithEditions.filter((a) => a.edition && !a.edition.rulePackId);
  const hasAllRulePacks = missingRulePacks.length === 0 && assignmentsWithEditions.length > 0;

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

      {missingRulePacks.length > 0 && (
        <Alert variant="warning" className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Missing Rule Packs</AlertTitle>
          <AlertDescription>
            The following assigned standards are missing approved rule packs:{' '}
            <strong>{missingRulePacks.map((a) => a.edition?.code).join(', ')}</strong>.
            Calculations using these standards may fail or produce limited results.
            Import rule packs via standards administration.
          </AlertDescription>
        </Alert>
      )}

      {hasAllRulePacks && (
        <Alert variant="success" className="mb-6">
          <ShieldCheck className="h-4 w-4" />
          <AlertTitle>Standards Ready</AlertTitle>
          <AlertDescription>
            All assigned standards have approved rule packs loaded. Calculations can proceed.
          </AlertDescription>
        </Alert>
      )}

      {!assignments?.length ? (
        <EmptyState
          icon={<Pin className="h-12 w-12" />}
          title="No standards assigned"
          description="Assign standards editions to this project to track applicable codes and enable calculation rule packs."
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
          {assignmentsWithEditions.map((a) => (
            <Card key={a.id} className={!a.edition?.rulePackId ? 'border-amber-300' : ''}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <StandardsBadge code={a.edition?.code ?? ''} edition={a.edition?.edition} />
                  {a.edition?.rulePackId ? (
                    <Badge variant="success" className="gap-1 text-[10px]">
                      <ShieldCheck className="h-3 w-3" /> Rule pack loaded
                    </Badge>
                  ) : (
                    <Badge variant="warning" className="gap-1 text-[10px]">
                      <ShieldAlert className="h-3 w-3" /> No rule pack
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <CardTitle className="text-sm">{a.edition?.title ?? 'Unknown'}</CardTitle>
                {a.edition?.status && (
                  <div className="mt-1.5 flex items-center gap-2">
                    <Badge variant={a.edition.status === 'current' ? 'success' : 'secondary'} className="text-[10px]">
                      {a.edition.status}
                    </Badge>
                    {a.edition.status !== 'current' && (
                      <span className="text-[10px] text-amber-600">Using non-current edition</span>
                    )}
                  </div>
                )}
                {a.notes && <p className="mt-1 text-xs text-muted-foreground">{a.notes}</p>}
                <p className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                  <Pin className="h-3 w-3" /> Pinned {new Date(a.pinnedAt).toLocaleDateString()}
                </p>
              </CardContent>
            </Card>
          ))}
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
                    {e.code} ({e.edition}){e.amendment ? ` ${e.amendment}` : ''}{e.rulePackId ? '' : ' — no rule pack'}
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
