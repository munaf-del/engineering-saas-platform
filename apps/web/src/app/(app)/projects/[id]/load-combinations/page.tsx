'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Layers, Plus, Trash2 } from 'lucide-react';
import { useLoadCombinationSets, useCreateLoadCombinationSet, useDeleteLoadCombinationSet } from '@/hooks/use-load-combinations';
import { useProject } from '@/hooks/use-projects';
import { PageHeader } from '@/components/page-header';
import { StandardsBadge } from '@/components/standards-badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { EmptyState } from '@/components/empty-state';
import { PageLoading } from '@/components/loading';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';

export default function LoadCombinationsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = use(params);
  const { data: project } = useProject(projectId);
  const { data: sets, isLoading } = useLoadCombinationSets(projectId);
  const createSet = useCreateLoadCombinationSet(projectId);
  const deleteSet = useDeleteLoadCombinationSet(projectId);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', standardRef: '', description: '' });

  if (isLoading) return <PageLoading />;

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    try {
      await createSet.mutateAsync({
        name: form.name,
        standardRef: form.standardRef || undefined,
        description: form.description || undefined,
      });
      toast.success('Combination set created');
      setShowCreate(false);
      setForm({ name: '', standardRef: '', description: '' });
    } catch {
      toast.error('Failed to create combination set');
    }
  }

  return (
    <>
      <div className="mb-4">
        <Link href={`/projects/${projectId}`} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to project
        </Link>
      </div>

      <PageHeader
        title="Load Combinations"
        description={`${project?.code ?? ''} · AS/NZS 1170.0 load combination sets`}
        badges={<StandardsBadge code="AS/NZS 1170.0" edition="2002" />}
        actions={
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="mr-2 h-4 w-4" /> New Combination Set
          </Button>
        }
      />

      {!sets?.length ? (
        <EmptyState icon={<Layers className="h-12 w-12" />} title="No combination sets" description="Create a load combination set to define factored combinations." />
      ) : (
        <div className="space-y-4">
          {sets.map((s) => (
            <Card key={s.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-base">{s.name}</CardTitle>
                    {s.standardRef && <Badge variant="outline" className="font-mono text-xs">{s.standardRef}</Badge>}
                  </div>
                  <Button variant="ghost" size="icon" onClick={async () => {
                    if (confirm('Delete this combination set?')) {
                      await deleteSet.mutateAsync(s.id);
                      toast.success('Deleted');
                    }
                  }}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </CardHeader>
              {s.combinations && s.combinations.length > 0 && (
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Limit State</TableHead>
                        <TableHead>Clause Ref</TableHead>
                        <TableHead className="text-right">Factors</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {s.combinations.map((c) => (
                        <TableRow key={c.id}>
                          <TableCell className="font-medium">{c.name}</TableCell>
                          <TableCell><Badge variant="outline">{c.limitState}</Badge></TableCell>
                          <TableCell className="font-mono text-xs">{c.clauseRef ?? '—'}</TableCell>
                          <TableCell className="text-right">{c.factors.length} factor(s)</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Load Combination Set</DialogTitle>
            <DialogDescription>Group related load combinations together.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required placeholder="e.g. ULS Combinations" />
            </div>
            <div className="space-y-2">
              <Label>Standard Reference</Label>
              <Input value={form.standardRef} onChange={(e) => setForm({ ...form, standardRef: e.target.value })} placeholder="e.g. AS/NZS 1170.0 Cl 4.2.1" />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
              <Button type="submit" disabled={createSet.isPending}>Create</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
