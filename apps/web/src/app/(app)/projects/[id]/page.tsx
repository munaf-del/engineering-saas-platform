'use client';

import { use } from 'react';
import Link from 'next/link';
import { ArrowLeft, Calculator, ClipboardList, Layers, Settings, Users, Weight } from 'lucide-react';
import { useProject } from '@/hooks/use-projects';
import { useProjectStandardAssignments, useCurrentEditions } from '@/hooks/use-standards';
import { useCalculations } from '@/hooks/use-calculations';
import { usePileGroups } from '@/hooks/use-pile-groups';
import { PageHeader } from '@/components/page-header';
import { StandardsBadgeList } from '@/components/standards-badge';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PageLoading } from '@/components/loading';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';

export default function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: project, isLoading } = useProject(id);
  const { data: assignments } = useProjectStandardAssignments(id);
  const { data: editions } = useCurrentEditions();
  const { data: calcs } = useCalculations(id, 1, 5);
  const { data: pileGroups } = usePileGroups(id);

  if (isLoading || !project) return <PageLoading />;

  const assignedStandards = assignments?.map((a) => {
    const ed = editions?.find((e) => e.id === a.standardEditionId);
    return { code: ed?.code ?? '', edition: ed?.edition ?? '' };
  }).filter((s) => s.code) ?? [];

  const hasRulePacks = editions?.some((e) => e.rulePackId) ?? false;

  const navCards = [
    { href: `/projects/${id}/load-cases`, icon: Weight, title: 'Load Cases', desc: 'Define load actions' },
    { href: `/projects/${id}/load-combinations`, icon: Layers, title: 'Load Combinations', desc: 'AS/NZS 1170.0 combinations' },
    { href: `/projects/${id}/pile-groups`, icon: Layers, title: 'Pile Groups', desc: `${pileGroups?.length ?? 0} group(s)` },
    { href: `/projects/${id}/calculations`, icon: Calculator, title: 'Calculations', desc: `${calcs?.meta?.total ?? 0} run(s)` },
    { href: `/projects/${id}/standards`, icon: ClipboardList, title: 'Standards', desc: 'Project standard assignments' },
    { href: `/projects/${id}/members`, icon: Users, title: 'Members', desc: 'Project team' },
    { href: `/projects/${id}/settings`, icon: Settings, title: 'Settings', desc: 'Project configuration' },
  ];

  return (
    <>
      <div className="mb-4">
        <Link href="/projects" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3.5 w-3.5" /> All Projects
        </Link>
      </div>

      <PageHeader
        title={project.name}
        description={`${project.code} · ${project.description ?? 'No description'}`}
        badges={
          <>
            <Badge variant={project.status === 'active' ? 'success' : 'secondary'}>
              {project.status.replace('_', ' ')}
            </Badge>
            <StandardsBadgeList standards={assignedStandards} />
          </>
        }
      />

      {!hasRulePacks && (
        <Alert variant="warning" className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Missing Approved Rule Packs</AlertTitle>
          <AlertDescription>
            No approved rule packs are loaded for the current standards. Import rule packs via the standards administration
            before running calculations.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {navCards.map((card) => (
          <Link key={card.href} href={card.href}>
            <Card className="transition-colors hover:border-primary/50 hover:bg-accent/30">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <card.icon className="h-5 w-5 text-muted-foreground" />
                  <CardTitle className="text-base">{card.title}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription>{card.desc}</CardDescription>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </>
  );
}
