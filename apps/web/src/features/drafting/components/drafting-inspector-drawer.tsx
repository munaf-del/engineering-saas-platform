import * as React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { DraftingInspectorTab } from '../hooks/use-drafting';

const INSPECTOR_TABS: Array<{ value: DraftingInspectorTab; label: string }> = [
  { value: 'setup', label: 'Setup' },
  { value: 'properties', label: 'Properties' },
  { value: 'layers', label: 'Layers' },
  { value: 'underlays', label: 'Underlays' },
  { value: 'sheets', label: 'Sheets' },
  { value: 'transmittals', label: 'Transmittals' },
  { value: 'schedules', label: 'Schedules' },
];

export function DraftingInspectorDrawer({
  activeTab,
  childrenByTab,
  expanded,
  objectCount,
  onExpandedChange,
  onTabChange,
  selectedObjectSummary,
}: {
  activeTab: DraftingInspectorTab;
  childrenByTab: Record<DraftingInspectorTab, React.ReactNode>;
  expanded: boolean;
  objectCount: number;
  onExpandedChange: (expanded: boolean) => void;
  onTabChange: (tab: DraftingInspectorTab) => void;
  selectedObjectSummary: string;
}) {
  return (
    <section
      className="rounded-md border bg-background shadow-sm"
      data-state={expanded ? 'expanded' : 'collapsed'}
      data-testid="drafting-inspector-drawer"
    >
      <div className="flex flex-wrap items-center gap-2 border-b px-3 py-2">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold">Project Model Inspector</span>
            <Badge variant="outline" className="capitalize">
              {activeTab}
            </Badge>
            <Badge variant="secondary">{objectCount} objects</Badge>
          </div>
          <p className="truncate text-xs text-muted-foreground">{selectedObjectSummary}</p>
        </div>
        <Button
          className="h-8"
          onClick={() => onExpandedChange(!expanded)}
          size="sm"
          variant="outline"
        >
          {expanded ? 'Collapse Inspector' : 'Expand Inspector'}
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={(value) => onTabChange(value as DraftingInspectorTab)}>
        <div className="overflow-x-auto px-3 py-2">
          <TabsList className="inline-flex h-8 w-max">
            {INSPECTOR_TABS.map((tab) => (
              <TabsTrigger className="h-7 px-2 text-xs" key={tab.value} value={tab.value}>
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        {expanded ? (
          <div className="border-t px-3 py-3" data-testid="drafting-inspector-drawer-body">
            {childrenByTab[activeTab]}
          </div>
        ) : (
          <div className="border-t px-3 py-2 text-xs text-muted-foreground">
            Inspector collapsed. Select objects normally; expand for setup, properties, layers,
            underlays, sheets, transmittals, or schedules.
          </div>
        )}
      </Tabs>
    </section>
  );
}
