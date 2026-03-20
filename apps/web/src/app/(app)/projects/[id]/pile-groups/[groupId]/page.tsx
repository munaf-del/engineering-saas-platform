'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import { usePileGroup, useAddPile, useDeletePile, useAddLayoutPoint } from '@/hooks/use-pile-groups';
import { useProject } from '@/hooks/use-projects';
import { PageHeader } from '@/components/page-header';
import { StandardsBadge } from '@/components/standards-badge';
import { PileLayoutSVG } from '@/components/pile-layout-svg';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PageLoading } from '@/components/loading';
import { toast } from 'sonner';
import { PILE_TYPES } from '@eng/shared';

export default function PileGroupEditorPage({ params }: { params: Promise<{ id: string; groupId: string }> }) {
  const { id: projectId, groupId } = use(params);
  const { data: project } = useProject(projectId);
  const { data: group, isLoading } = usePileGroup(projectId, groupId);
  const addPile = useAddPile(projectId, groupId);
  const deletePile = useDeletePile(projectId, groupId);
  const addPoint = useAddLayoutPoint(projectId, groupId);

  const [showAddPile, setShowAddPile] = useState(false);
  const [showAddPoint, setShowAddPoint] = useState(false);
  const [pileForm, setPileForm] = useState({
    name: '',
    pileType: 'bored' as string,
    diameter: '',
    length: '',
    embedmentDepth: '',
  });
  const [pointForm, setPointForm] = useState({ pileId: '', x: '', y: '', label: '' });

  if (isLoading || !group) return <PageLoading />;

  const piles = (group as { piles?: { id: string; name: string; pileType: string; diameter: number; length: number; embedmentDepth?: number }[] }).piles ?? [];
  const layoutPoints = (group as { layoutPoints?: { id: string; pileGroupId: string; pileId?: string; x: number; y: number; z: number; label?: string }[] }).layoutPoints ?? [];

  async function handleAddPile(e: React.FormEvent) {
    e.preventDefault();
    try {
      await addPile.mutateAsync({
        name: pileForm.name,
        pileType: pileForm.pileType,
        diameter: parseFloat(pileForm.diameter),
        length: parseFloat(pileForm.length),
        embedmentDepth: pileForm.embedmentDepth ? parseFloat(pileForm.embedmentDepth) : undefined,
      });
      toast.success('Pile added');
      setShowAddPile(false);
      setPileForm({ name: '', pileType: 'bored', diameter: '', length: '', embedmentDepth: '' });
    } catch {
      toast.error('Failed to add pile');
    }
  }

  async function handleAddPoint(e: React.FormEvent) {
    e.preventDefault();
    try {
      await addPoint.mutateAsync({
        pileId: pointForm.pileId || undefined,
        x: parseFloat(pointForm.x),
        y: parseFloat(pointForm.y),
        label: pointForm.label || undefined,
      });
      toast.success('Layout point added');
      setShowAddPoint(false);
      setPointForm({ pileId: '', x: '', y: '', label: '' });
    } catch {
      toast.error('Failed to add layout point');
    }
  }

  return (
    <>
      <div className="mb-4">
        <Link href={`/projects/${projectId}/pile-groups`} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3.5 w-3.5" /> All pile groups
        </Link>
      </div>

      <PageHeader
        title={group.name}
        description={group.description ?? `${project?.code ?? ''} · Pile group editor`}
        badges={<StandardsBadge code="AS 2159" edition="2009" />}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowAddPile(true)}><Plus className="mr-1 h-4 w-4" />Pile</Button>
            <Button variant="outline" onClick={() => setShowAddPoint(true)}><Plus className="mr-1 h-4 w-4" />Layout Point</Button>
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Pile Layout</CardTitle>
          </CardHeader>
          <CardContent className="flex justify-center">
            <PileLayoutSVG points={layoutPoints} width={450} height={400} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Piles ({piles.length})</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {piles.length === 0 ? (
              <p className="text-sm text-muted-foreground">No piles defined yet.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Dia (mm)</TableHead>
                    <TableHead className="text-right">Length (m)</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {piles.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.name}</TableCell>
                      <TableCell><Badge variant="outline">{p.pileType}</Badge></TableCell>
                      <TableCell className="text-right font-mono">{p.diameter}</TableCell>
                      <TableCell className="text-right font-mono">{p.length}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={async () => {
                          if (confirm('Delete this pile?')) {
                            await deletePile.mutateAsync(p.id);
                            toast.success('Pile deleted');
                          }
                        }}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={showAddPile} onOpenChange={setShowAddPile}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Pile</DialogTitle>
            <DialogDescription>Define a pile element.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddPile} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input value={pileForm.name} onChange={(e) => setPileForm({ ...pileForm, name: e.target.value })} required placeholder="P1" />
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={pileForm.pileType} onValueChange={(v) => setPileForm({ ...pileForm, pileType: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PILE_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Diameter (mm)</Label>
                <Input type="number" step="any" value={pileForm.diameter} onChange={(e) => setPileForm({ ...pileForm, diameter: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label>Length (m)</Label>
                <Input type="number" step="any" value={pileForm.length} onChange={(e) => setPileForm({ ...pileForm, length: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label>Embed. Depth (m)</Label>
                <Input type="number" step="any" value={pileForm.embedmentDepth} onChange={(e) => setPileForm({ ...pileForm, embedmentDepth: e.target.value })} />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowAddPile(false)}>Cancel</Button>
              <Button type="submit" disabled={addPile.isPending}>Add</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={showAddPoint} onOpenChange={setShowAddPoint}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Layout Point</DialogTitle>
            <DialogDescription>Position a pile on the layout grid (metres).</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddPoint} className="space-y-4">
            <div className="space-y-2">
              <Label>Associated Pile</Label>
              <Select value={pointForm.pileId} onValueChange={(v) => setPointForm({ ...pointForm, pileId: v })}>
                <SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
                <SelectContent>
                  {piles.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>X (m)</Label>
                <Input type="number" step="any" value={pointForm.x} onChange={(e) => setPointForm({ ...pointForm, x: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label>Y (m)</Label>
                <Input type="number" step="any" value={pointForm.y} onChange={(e) => setPointForm({ ...pointForm, y: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label>Label</Label>
                <Input value={pointForm.label} onChange={(e) => setPointForm({ ...pointForm, label: e.target.value })} placeholder="P1" />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowAddPoint(false)}>Cancel</Button>
              <Button type="submit" disabled={addPoint.isPending}>Add</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
