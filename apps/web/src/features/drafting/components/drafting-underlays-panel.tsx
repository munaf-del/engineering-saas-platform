import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function DraftingUnderlaysPanel() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">PDF Underlays</CardTitle>
        <CardDescription>
          Underlay management is reserved here for the next phase of the Drafting editor.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Button variant="outline" disabled>
          Add PDF Underlay Placeholder
        </Button>
        <div className="rounded-md border bg-muted/30 p-3 text-sm text-muted-foreground">
          No underlays are loaded yet. This refactor keeps the underlay seam in place without adding
          PDF rendering, calibration, or crop behavior.
        </div>
      </CardContent>
    </Card>
  );
}
