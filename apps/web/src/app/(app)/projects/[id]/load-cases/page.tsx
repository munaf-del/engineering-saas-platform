'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Plus, Trash2, Weight } from 'lucide-react';
import { useLoadCases, useCreateLoadCase, useDeleteLoadCase, useAddLoadAction } from '@/hooks/use-load-cases';
import { useProject } from '@/hooks/use-projects';
import { PageHeader } from '@/components/page-header';
import { StandardsBadge } from '@/components/standards-badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { EmptyState } from '@/components/empty-state';
import { PageLoading } from '@/components/loading';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { LOAD_CATEGORIES } from '@eng/shared';

export default function LoadCasesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = use(params);
  const { data: project } = useProject(projectId);
  const { data: loadCases, isLoading } = useLoadCases(projectId);
  const createLC = useCreateLoadCase(projectId);
  const deleteLC = useDeleteLoadCase(projectId);
  const [showCreate, setShowCreate] = useState(false);
  const [showAction, setShowAction] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', category: 'permanent', description: '' });
  const [actionForm, setActionForm] = useState({ name: '', direction: 'vertical', magnitude: '', unit: 'kN' });

  const addAction = useAddLoadAction(projectId, showAction ?? '');

  if (isLoading) return <PageLoading />;

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    try {
      await createLC.mutateAsync({
        name: form.name,
        category: form.category,
        description: form.description || undefined,
      });
      toast.success('Load case created');
      setShowCreate(false);
      setForm({ name: '', category: 'permanent', description: '' });
    } catch {
      toast.error('Failed to create load case');
    }
  }

  async function handleAddAction(e: React.FormEvent) {
    e.preventDefault();
    try {
      await addAction.mutateAsync({
        name: actionForm.name,
        direction: actionForm.direction,
        magnitude: parseFloat(actionForm.magnitude),
        unit: actionForm.unit,
      });
      toast.success('Action added');
      setShowAction(null);
      setActionForm({ name: '', direction: 'vertical', magnitude: '', unit: 'kN' });
    } catch {
      toast.error('Failed to add action');
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
        title="Load Cases"
        description={`${project?.code ?? ''} · Define loads per AS/NZS 1170`}
        badges={<StandardsBadge code="AS/NZS 1170.0" edition="2002" />}
        actions={
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="mr-2 h-4 w-4" /> Add Load Case
          </Button>
        }
      />

      {!loadCases?.length ? (
        <EmptyState icon={<Weight className="h-12 w-12" />} title="No load cases" description="Define load cases to use in calculations." />
      ) : (
        <div className="space-y-4">
          {loadCases.map((lc) => (
            <Card key={lc.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-base">{lc.name}</CardTitle>
                    <Badge variant="outline">{lc.category}</Badge>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" onClick={() => setShowAction(lc.id)}>
                      <Plus className="mr-1 h-3.5 w-3.5" /> Action
                    </Button>
                    <Button variant="ghost" size="icon" onClick={async () => {
                      if (confirm('Delete this load case?')) {
                        await deleteLC.mutateAsync(lc.id);
                        toast.success('Deleted');
                      }
                    }}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              {lc.actions && lc.actions.length > 0 && (
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Action</TableHead>
                        <TableHead>Direction</TableHead>
                        <TableHead className="text-right">Magnitude</TableHead>
                        <TableHead>Unit</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {lc.actions.map((a) => (
                        <TableRow key={a.id}>
                          <TableCell className="font-medium">{a.name}</TableCell>
                          <TableCell>{a.direction}</TableCell>
                          <TableCell className="text-right font-mono">{a.magnitude}</TableCell>
                          <TableCell>{a.unit}</TableCell>
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
            <DialogTitle>New Load Case</DialogTitle>
            <DialogDescription>Create a load case per AS/NZS 1170.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required placeholder="e.g. Dead Load G" />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {LOAD_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
              <Button type="submit" disabled={createLC.isPending}>Create</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!showAction} onOpenChange={() => setShowAction(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Load Action</DialogTitle>
            <DialogDescription>Define a force or pressure action.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddAction} className="space-y-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={actionForm.name} onChange={(e) => setActionForm({ ...actionForm, name: e.target.value })} required />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Direction</Label>
                <Select value={actionForm.direction} onValueChange={(v) => setActionForm({ ...actionForm, direction: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="vertical">Vertical</SelectItem>
                    <SelectItem value="horizontal_x">Horizontal X</SelectItem>
                    <SelectItem value="horizontal_y">Horizontal Y</SelectItem>
                    <SelectItem value="moment_x">Moment X</SelectItem>
                    <SelectItem value="moment_y">Moment Y</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Magnitude</Label>
                <Input type="number" step="any" value={actionForm.magnitude} onChange={(e) => setActionForm({ ...actionForm, magnitude: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label>Unit</Label>
                <Select value={actionForm.unit} onValueChange={(v) => setActionForm({ ...actionForm, unit: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="kN">kN</SelectItem>
                    <SelectItem value="kN·m">kN·m</SelectItem>
                    <SelectItem value="kPa">kPa</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowAction(null)}>Cancel</Button>
              <Button type="submit" disabled={addAction.isPending}>Add</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
