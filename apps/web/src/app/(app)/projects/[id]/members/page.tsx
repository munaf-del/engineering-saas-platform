'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Plus, Trash2, Users } from 'lucide-react';
import { useProject, useProjectMembers, useAddProjectMember, useRemoveProjectMember } from '@/hooks/use-projects';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PageLoading } from '@/components/loading';
import { EmptyState } from '@/components/empty-state';
import { toast } from 'sonner';
import { PROJECT_ROLES } from '@eng/shared';
import { useAuth } from '@/lib/auth';

export default function ProjectMembersPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { hasOrgRole } = useAuth();
  const { data: project } = useProject(id);
  const { data: members, isLoading } = useProjectMembers(id);
  const addMember = useAddProjectMember(id);
  const removeMember = useRemoveProjectMember(id);
  const [showAdd, setShowAdd] = useState(false);
  const [userId, setUserId] = useState('');
  const [role, setRole] = useState('engineer');

  const canManage = hasOrgRole('owner', 'admin');

  if (isLoading) return <PageLoading />;

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    try {
      await addMember.mutateAsync({ userId, role });
      toast.success('Member added');
      setShowAdd(false);
      setUserId('');
    } catch {
      toast.error('Failed to add member');
    }
  }

  async function handleRemove(uid: string) {
    if (!confirm('Remove this member from the project?')) return;
    try {
      await removeMember.mutateAsync(uid);
      toast.success('Member removed');
    } catch {
      toast.error('Failed to remove member');
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
        title="Project Members"
        description={`Team members for ${project?.code ?? ''}`}
        actions={canManage ? <Button onClick={() => setShowAdd(true)}><Plus className="mr-2 h-4 w-4" />Add Member</Button> : null}
      />

      {!members?.length ? (
        <EmptyState
          icon={<Users className="h-12 w-12" />}
          title="No members"
          description="Add team members to collaborate on this project."
        />
      ) : (
        <div className="space-y-2">
          {members.map((m) => (
            <Card key={m.id}>
              <CardContent className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-xs font-medium">
                    {m.userId.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium">User {m.userId.slice(0, 8)}</p>
                    <p className="text-xs text-muted-foreground">Added {new Date(m.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{m.role}</Badge>
                  {canManage && (
                    <Button variant="ghost" size="icon" onClick={() => handleRemove(m.userId)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Project Member</DialogTitle>
            <DialogDescription>Add a user to this project.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAdd} className="space-y-4">
            <div className="space-y-2">
              <Label>User ID</Label>
              <Input value={userId} onChange={(e) => setUserId(e.target.value)} required placeholder="User UUID" />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PROJECT_ROLES.map((r) => (
                    <SelectItem key={r} value={r}>{r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
              <Button type="submit" disabled={addMember.isPending}>Add</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
