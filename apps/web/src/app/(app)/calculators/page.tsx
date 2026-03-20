'use client';

import { Calculator } from 'lucide-react';
import { useCalculators, useSeedCalculators } from '@/hooks/use-calculators';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/empty-state';
import { PageLoading } from '@/components/loading';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';

export default function CalculatorsPage() {
  const { data: calculators, isLoading } = useCalculators();
  const seedCalcs = useSeedCalculators();
  const { hasOrgRole } = useAuth();

  if (isLoading) return <PageLoading />;

  return (
    <>
      <PageHeader
        title="Calculators"
        description="Available engineering calculation tools"
        actions={
          hasOrgRole('owner', 'admin') && (!calculators || calculators.length === 0) ? (
            <Button
              onClick={async () => {
                try {
                  await seedCalcs.mutateAsync();
                  toast.success('Calculators seeded');
                } catch {
                  toast.error('Seed failed');
                }
              }}
              disabled={seedCalcs.isPending}
            >
              Seed Default Calculators
            </Button>
          ) : null
        }
      />

      {!calculators?.length ? (
        <EmptyState
          icon={<Calculator className="h-12 w-12" />}
          title="No calculators available"
          description="Seed the default calculators or create custom ones."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {calculators.map((calc) => (
            <Card key={calc.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{calc.name}</CardTitle>
                  <Badge variant="outline">{calc.category}</Badge>
                </div>
                <CardDescription>{calc.description ?? `${calc.calcType} calculator`}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Badge variant="secondary" className="font-mono text-xs">{calc.calcType}</Badge>
                  <span>Code: {calc.code}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
