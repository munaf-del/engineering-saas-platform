'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Layers, Plus } from 'lucide-react';
import { usePileGroups, useCreatePileGroup } from '@/hooks/use-pile-groups';
import { useProject } from '@/hooks/use-projects';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/page-header';
import { StandardsBadge } from '@/components/standards-badge';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { EmptyState } from '@/components/empty-state';
import { PageLoading } from '@/components/loading';
import { toast } from 'sonner';

export default function PileGroupsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = use(params);
  const router = useRouter();
  const { data: project } = useProject(projectId);
  const { data: groups, isLoading } = usePileGroups(projectId);
  const createGroup = useCreatePileGroup(projectId);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', description: '' });

  if (isLoading) return <PageLoading />;

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    try {
      const group = await createGroup.mutateAsync({
        name: form.name,
        description: form.description || undefined,
      });
      toast.success('Pile group created');
      setShowCreate(false);
      setForm({ name: '', description: '' });
      router.push(`/projects/${projectId}/pile-groups/${group.id}`);
    } catch {
      toast.error('Failed to create pile group');
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
        title="Pile Groups"
        description={`${project?.code ?? ''} · Define pile arrangements for AS 2159 analysis`}
        badges={<StandardsBadge code="AS 2159" edition="2009" />}
        actions={
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="mr-2 h-4 w-4" /> New Pile Group
          </Button>
        }
      />

      {!groups?.length ? (
        <EmptyState icon={<Layers className="h-12 w-12" />} title="No pile groups" description="Create a pile group to define pile layout and run analysis." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {groups.map((g) => (
            <Link key={g.id} href={`/projects/${projectId}/pile-groups/${g.id}`}>
              <Card className="transition-colors hover:border-primary/50">
                <CardHeader>
                  <CardTitle className="text-base">{g.name}</CardTitle>
                  {g.description && <CardDescription>{g.description}</CardDescription>}
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      )}

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Pile Group</DialogTitle>
            <DialogDescription>Define a group of piles for analysis.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required placeholder="e.g. Pile Cap PC-01" />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
              <Button type="submit" disabled={createGroup.isPending}>Create</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
