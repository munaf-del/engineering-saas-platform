'use client';

import { use } from 'react';
import Link from 'next/link';
import { ArrowLeft, Layers } from 'lucide-react';
import { usePileGroup } from '@/hooks/use-pile-groups';
import { useProject } from '@/hooks/use-projects';
import { PageHeader } from '@/components/page-header';
import { StandardsBadge } from '@/components/standards-badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { buttonVariants } from '@/components/ui/button';
import { PageLoading } from '@/components/loading';

export default function PileGroupEditorPage({
  params,
}: {
  params: Promise<{ id: string; groupId: string }>;
}) {
  const { id: projectId, groupId } = use(params);
  const { data: project } = useProject(projectId);
  const { data: group, isLoading } = usePileGroup(projectId, groupId);

  if (isLoading || !group) return <PageLoading />;

  const piles =
    (
      group as {
        piles?: Array<{ id: string }>;
      }
    ).piles ?? [];
  const layoutPoints =
    (
      group as {
        layoutPoints?: Array<{ id: string }>;
      }
    ).layoutPoints ?? [];

  return (
    <>
      <div className="mb-4">
        <Link
          href={`/projects/${projectId}/pile-groups`}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          All foundations
        </Link>
      </div>

      <PageHeader
        title={group.name}
        description={
          group.description ?? `${project?.code ?? ''} · Foundation workspace container and setup`
        }
        badges={<StandardsBadge code="AS 2159" edition="2009" />}
        actions={
          <Link
            href={`/projects/${projectId}/pile-groups/${groupId}/multi-pile`}
            className={buttonVariants()}
          >
            Open Multi-Pile
          </Link>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Foundation Workspace Setup</CardTitle>
            <CardDescription>
              This page stays as the container for pile-group metadata. Calculator authoring lives
              in the Multi-Pile workspace.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <DetailRow label="Project" value={project?.name ?? 'Unknown project'} />
            <DetailRow label="Group name" value={group.name} />
            <DetailRow label="Description" value={group.description || 'No description'} />
            <DetailRow label="Legacy pile rows" value={String(piles.length)} />
            <DetailRow label="Legacy layout points" value={String(layoutPoints.length)} />
            <DetailRow label="Group id" value={group.id} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Workspace Ownership</CardTitle>
            <CardDescription>
              Use the Multi-Pile route for active calculator authoring.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <OwnershipRow
              label="Project"
              value="Identity, references, default libraries, shared geotechnical materials, and site map"
            />
            <OwnershipRow
              label="Foundations"
              value="GEO basis settings, workspace entry points, and legacy pile-group metadata"
            />
            <OwnershipRow
              label="Multi-Pile"
              value="Pile types, joints, load patterns, combinations, and envelope results"
            />
            <Link
              href={`/projects/${projectId}/pile-groups/${groupId}/multi-pile`}
              className={`${buttonVariants()} w-full`}
            >
              <Layers className="mr-2 h-4 w-4" />
              Open Multi-Pile
            </Link>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 border-b border-border/50 pb-3 last:border-b-0 last:pb-0">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="font-medium text-foreground">{value}</p>
    </div>
  );
}

function OwnershipRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p>{value}</p>
    </div>
  );
}
