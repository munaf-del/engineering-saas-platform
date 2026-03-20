'use client';

import { useState } from 'react';
import { ClipboardList, Plus, Pin } from 'lucide-react';
import { useStandardsProfiles, useCreateStandardsProfile } from '@/hooks/use-standards';
import { PageHeader } from '@/components/page-header';
import { StandardsBadge } from '@/components/standards-badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { EmptyState } from '@/components/empty-state';
import { PageLoading } from '@/components/loading';
import { toast } from 'sonner';
import { STANDARDS_REGISTRY } from '@eng/shared';

export default function StandardsPage() {
  const { data: profiles, isLoading } = useStandardsProfiles();
  const createProfile = useCreateStandardsProfile();
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  if (isLoading) return <PageLoading />;

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    try {
      await createProfile.mutateAsync({ name, description: description || undefined });
      toast.success('Profile created');
      setShowCreate(false);
      setName('');
      setDescription('');
    } catch {
      toast.error('Failed to create profile');
    }
  }

  return (
    <>
      <PageHeader
        title="Standards Profiles"
        description="Manage organisation standards profiles and pinned editions"
        actions={
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="mr-2 h-4 w-4" /> New Profile
          </Button>
        }
      />

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">Standards Registry</CardTitle>
          <CardDescription>Australian Standards supported by the platform</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {STANDARDS_REGISTRY.map((s) => (
              <StandardsBadge key={s.code} code={s.code} edition={s.edition} />
            ))}
          </div>
        </CardContent>
      </Card>

      {!profiles?.length ? (
        <EmptyState
          icon={<ClipboardList className="h-12 w-12" />}
          title="No standards profiles"
          description="Create a profile to pin specific standard editions for your projects."
        />
      ) : (
        <div className="space-y-4">
          {profiles.map((profile) => (
            <Card key={profile.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-base">{profile.name}</CardTitle>
                    {profile.isDefault && <Badge variant="success">Default</Badge>}
                  </div>
                </div>
                {profile.description && <CardDescription>{profile.description}</CardDescription>}
              </CardHeader>
              <CardContent>
                {profile.pinnedStandards?.length ? (
                  <div className="flex flex-wrap gap-1.5">
                    {profile.pinnedStandards.map((ps) => (
                      <div key={ps.id} className="flex items-center gap-1">
                        <Pin className="h-3 w-3 text-muted-foreground" />
                        <StandardsBadge code={ps.standardCode} edition={ps.edition} size="sm" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No standards pinned to this profile.</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Standards Profile</DialogTitle>
            <DialogDescription>Create a standards profile to group pinned standard editions.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} required placeholder="e.g. AS Standard Set 2024" />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional description" />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
              <Button type="submit" disabled={createProfile.isPending}>Create</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
