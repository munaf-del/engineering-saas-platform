'use client';

import { useState } from 'react';
import { ShieldCheck, ShieldOff, Package } from 'lucide-react';
import { useActiveRulePacks, useActivateRulePack, useDeactivateRulePack } from '@/hooks/use-imports';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { EmptyState } from '@/components/empty-state';
import { PageLoading } from '@/components/loading';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';

export default function RulePacksPage() {
  const { data: activePacks, isLoading } = useActiveRulePacks();
  const deactivate = useDeactivateRulePack();

  if (isLoading) return <PageLoading />;

  const packs = activePacks ?? [];

  return (
    <>
      <PageHeader
        title="Rule Packs"
        description="Active rule packs loaded from approved licensed data. Rule-pack files are never stored in the repository."
      />

      <Alert className="mb-6">
        <AlertDescription>
          Rule packs contain licensed standards data. Raw files are not stored in the repository.
          To load new rule packs, use the <strong>Imports</strong> page to upload YAML files, then follow the
          approval workflow before activation.
        </AlertDescription>
      </Alert>

      {packs.length === 0 ? (
        <EmptyState
          icon={<Package className="h-12 w-12" />}
          title="No active rule packs"
          description="Upload and approve rule-pack YAML files via the Imports page."
        />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Active Rule Packs ({packs.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Standard Code</TableHead>
                  <TableHead>Version</TableHead>
                  <TableHead>Activated</TableHead>
                  <TableHead className="w-[100px]">Status</TableHead>
                  <TableHead className="w-[140px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {packs.map((p) => (
                  <TableRow key={p.rulePackId}>
                    <TableCell className="font-medium">{p.standardCode}</TableCell>
                    <TableCell className="font-mono text-sm">{p.version}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(p.activatedAt).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Badge variant="success">
                        <ShieldCheck className="mr-1 h-3 w-3" />Active
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={async () => {
                          if (!confirm(`Deactivate ${p.standardCode}@${p.version}?`)) return;
                          try {
                            await deactivate.mutateAsync(p.rulePackId);
                            toast.success('Rule pack deactivated');
                          } catch {
                            toast.error('Deactivation failed');
                          }
                        }}
                        disabled={deactivate.isPending}
                      >
                        <ShieldOff className="mr-1 h-3 w-3" />Deactivate
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </>
  );
}
