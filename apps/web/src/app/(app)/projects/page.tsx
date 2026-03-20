'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FolderOpen, Plus } from 'lucide-react';
import { useProjects, useCreateProject } from '@/hooks/use-projects';
import { useStandardsProfiles } from '@/hooks/use-standards';
import { PageHeader } from '@/components/page-header';
import { DataTable, type Column } from '@/components/data-table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/empty-state';
import { PageLoading } from '@/components/loading';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import type { Project } from '@eng/shared';

const statusColors: Record<string, string> = {
  active: 'success',
  on_hold: 'warning',
  completed: 'default',
  archived: 'secondary',
};

const columns: Column<Project & Record<string, unknown>>[] = [
  {
    key: 'code',
    header: 'Code',
    cell: (row) => <span className="font-mono font-medium">{row.code}</span>,
    className: 'w-[120px]',
  },
  { key: 'name', header: 'Project Name', cell: (row) => <span className="font-medium">{row.name}</span> },
  {
    key: 'status',
    header: 'Status',
    cell: (row) => (
      <Badge variant={(statusColors[row.status] as 'success' | 'warning' | 'default' | 'secondary') ?? 'default'}>
        {row.status.replace('_', ' ')}
      </Badge>
    ),
    className: 'w-[120px]',
  },
  {
    key: 'updatedAt',
    header: 'Last Modified',
    cell: (row) => <span className="text-sm text-muted-foreground">{new Date(row.updatedAt).toLocaleDateString()}</span>,
    className: 'w-[140px]',
  },
];

export default function ProjectsPage() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [showCreate, setShowCreate] = useState(false);
  const { data, isLoading, error } = useProjects(page);
  const profilesQuery = useStandardsProfiles();
  const createProject = useCreateProject();
  const [form, setForm] = useState({ name: '', code: '', description: '', standardsProfileId: '' });

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    try {
      const project = await createProject.mutateAsync({
        name: form.name,
        code: form.code,
        description: form.description || undefined,
        standardsProfileId: form.standardsProfileId || undefined,
      });
      toast.success('Project created');
      setShowCreate(false);
      setForm({ name: '', code: '', description: '', standardsProfileId: '' });
      router.push(`/projects/${project.id}`);
    } catch {
      toast.error('Failed to create project');
    }
  }

  const projects = data?.data ?? [];
  const total = data?.meta?.total ?? 0;

  return (
    <>
      <PageHeader
        title="Projects"
        description={`${total} project${total !== 1 ? 's' : ''} in this organisation`}
        actions={
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New Project
          </Button>
        }
      />

      {isLoading ? (
        <PageLoading />
      ) : error ? (
        <div className="text-destructive">Failed to load projects</div>
      ) : projects.length === 0 ? (
        <EmptyState
          icon={<FolderOpen className="h-12 w-12" />}
          title="No projects yet"
          description="Create your first project to start engineering calculations."
        />
      ) : (
        <DataTable
          columns={columns}
          data={projects as (Project & Record<string, unknown>)[]}
          searchKey="name"
          searchPlaceholder="Search projects…"
          onRowClick={(row) => router.push(`/projects/${row.id}`)}
          totalFromServer={total}
          page={page}
          onPageChange={setPage}
        />
      )}

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Project</DialogTitle>
            <DialogDescription>Set up a new engineering project.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="code">Code</Label>
                <Input id="code" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} required placeholder="PRJ-001" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            {profilesQuery.data && profilesQuery.data.length > 0 && (
              <div className="space-y-2">
                <Label>Standards Profile</Label>
                <Select value={form.standardsProfileId} onValueChange={(v) => setForm({ ...form, standardsProfileId: v })}>
                  <SelectTrigger><SelectValue placeholder="Select profile…" /></SelectTrigger>
                  <SelectContent>
                    {profilesQuery.data.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
              <Button type="submit" disabled={createProject.isPending}>
                {createProject.isPending ? 'Creating…' : 'Create Project'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
