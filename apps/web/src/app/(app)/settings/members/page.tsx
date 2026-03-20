'use client';

import { useState } from 'react';
import { Plus, Trash2, Users } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useOrgMembers, useAddOrgMember, useUpdateOrgMemberRole, useRemoveOrgMember } from '@/hooks/use-organisations';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { EmptyState } from '@/components/empty-state';
import { PageLoading } from '@/components/loading';
import { toast } from 'sonner';
import { ORG_ROLES } from '@eng/shared';

export default function OrgMembersPage() {
  const { user, hasOrgRole } = useAuth();
  const orgId = user?.organisationId ?? '';
  const { data: members, isLoading } = useOrgMembers(orgId);
  const addMember = useAddOrgMember(orgId);
  const updateRole = useUpdateOrgMemberRole(orgId);
  const removeMember = useRemoveOrgMember(orgId);
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

  async function handleRoleChange(memberId: string, uid: string, newRole: string) {
    try {
      await updateRole.mutateAsync({ userId: uid, role: newRole });
      toast.success('Role updated');
    } catch {
      toast.error('Failed to update role');
    }
  }

  async function handleRemove(uid: string) {
    if (!confirm('Remove this member from the organisation?')) return;
    try {
      await removeMember.mutateAsync(uid);
      toast.success('Member removed');
    } catch {
      toast.error('Failed to remove member');
    }
  }

  return (
    <>
      <PageHeader
        title="Organisation Members"
        description="Manage team members and their roles"
        actions={
          canManage ? (
            <Button onClick={() => setShowAdd(true)}>
              <Plus className="mr-2 h-4 w-4" /> Add Member
            </Button>
          ) : null
        }
      />

      {!members?.length ? (
        <EmptyState icon={<Users className="h-12 w-12" />} title="No members" description="Add members to your organisation." />
      ) : (
        <div className="space-y-2">
          {members.map((m) => (
            <Card key={m.id}>
              <CardContent className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-sm font-medium text-primary">
                    {m.userId.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium">User {m.userId.slice(0, 8)}…</p>
                    <p className="text-xs text-muted-foreground">
                      Since {new Date(m.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {canManage ? (
                    <Select
                      value={m.role}
                      onValueChange={(v) => handleRoleChange(m.id, m.userId, v)}
                    >
                      <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {ORG_ROLES.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Badge variant="outline">{m.role}</Badge>
                  )}
                  {canManage && m.userId !== user?.id && (
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
            <DialogTitle>Add Organisation Member</DialogTitle>
            <DialogDescription>Add a user to this organisation.</DialogDescription>
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
                  {ORG_ROLES.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
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
