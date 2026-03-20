'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { useProject, useUpdateProject, useDeleteProject } from '@/hooks/use-projects';
import { useStandardsProfiles } from '@/hooks/use-standards';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PageLoading } from '@/components/loading';
import { toast } from 'sonner';
import { PROJECT_STATUSES } from '@eng/shared';

export default function ProjectSettingsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { data: project, isLoading } = useProject(id);
  const profilesQuery = useStandardsProfiles();
  const update = useUpdateProject(id);
  const remove = useDeleteProject();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('');
  const [profileId, setProfileId] = useState('');
  const [initialized, setInitialized] = useState(false);

  if (isLoading || !project) return <PageLoading />;

  if (!initialized) {
    setName(project.name);
    setDescription(project.description ?? '');
    setStatus(project.status);
    setProfileId(project.standardsProfileId ?? '');
    setInitialized(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    try {
      await update.mutateAsync({
        name,
        description: description || undefined,
        status,
        standardsProfileId: profileId || undefined,
      });
      toast.success('Project updated');
    } catch {
      toast.error('Failed to update project');
    }
  }

  async function handleDelete() {
    if (!confirm(`Delete project "${project!.name}"? This cannot be undone.`)) return;
    try {
      await remove.mutateAsync(id);
      toast.success('Project deleted');
      router.replace('/projects');
    } catch {
      toast.error('Failed to delete project');
    }
  }

  return (
    <>
      <div className="mb-4">
        <Link href={`/projects/${id}`} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to project
        </Link>
      </div>

      <PageHeader title="Project Settings" description={`Configure ${project.code}`} />

      <div className="max-w-2xl space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">General</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSave} className="space-y-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea value={description} onChange={(e) => setDescription(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PROJECT_STATUSES.map((s) => (
                        <SelectItem key={s} value={s}>{s.replace('_', ' ')}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Standards Profile</Label>
                  <Select value={profileId} onValueChange={setProfileId}>
                    <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                    <SelectContent>
                      {profilesQuery.data?.map((p) => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button type="submit" disabled={update.isPending}>
                {update.isPending ? 'Saving…' : 'Save Changes'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="text-lg text-destructive">Danger Zone</CardTitle>
            <CardDescription>Permanently delete this project and all associated data.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="destructive" onClick={handleDelete} disabled={remove.isPending}>
              {remove.isPending ? 'Deleting…' : 'Delete Project'}
            </Button>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
