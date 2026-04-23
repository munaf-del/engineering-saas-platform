import * as React from 'react';
import type { DraftingModel } from '@eng/shared';
import { Download } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { DraftingScheduleGroupKey } from '../schedules/drafting-schedule-types';
import {
  DRAFTING_SCHEDULE_GROUP_DEFINITIONS,
  buildDraftingScheduleSummary,
  getDraftingScheduleGroup,
} from '../schedules/drafting-schedule-utils';

export function DraftingSchedulesPanel({
  model,
  onExportAllJson,
  onExportGroupCsv,
}: {
  model: DraftingModel;
  onExportAllJson: () => void;
  onExportGroupCsv: (groupKey: DraftingScheduleGroupKey) => void;
}) {
  const [activeGroupKey, setActiveGroupKey] =
    React.useState<DraftingScheduleGroupKey>('shoring_piles');
  const summary = React.useMemo(() => buildDraftingScheduleSummary(model), [model]);
  const activeGroup = getDraftingScheduleGroup(summary, activeGroupKey);

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex flex-wrap gap-2">
          {summary.groups.map((group) => (
            <Badge key={group.key} variant={group.rows.length ? 'secondary' : 'outline'}>
              {group.title.replace(' Schedule', '')}: {group.rows.length}
            </Badge>
          ))}
        </div>
      </div>

      <div className="space-y-3 rounded-md border p-3">
        <div className="space-y-2">
          <Select
            value={activeGroupKey}
            onValueChange={(value) => setActiveGroupKey(value as DraftingScheduleGroupKey)}
          >
            <SelectTrigger aria-label="Schedule group">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DRAFTING_SCHEDULE_GROUP_DEFINITIONS.map((group) => (
                <SelectItem key={group.key} value={group.key}>
                  {group.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex flex-wrap gap-2">
            <Button
              className="gap-2"
              onClick={() => onExportGroupCsv(activeGroup.key)}
              size="sm"
              variant="outline"
            >
              <Download className="h-4 w-4" />
              CSV
            </Button>
            <Button className="gap-2" onClick={onExportAllJson} size="sm" variant="outline">
              <Download className="h-4 w-4" />
              JSON
            </Button>
          </div>
        </div>

        <div className="rounded-md border">
          <Table className="min-w-[920px] text-xs">
            <TableHeader>
              <TableRow>
                {activeGroup.columns.map((column) => (
                  <TableHead key={column.key} className="h-9 whitespace-nowrap px-3 py-2">
                    {column.label}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {activeGroup.rows.length > 0 ? (
                activeGroup.rows.map((row) => (
                  <TableRow key={`${activeGroup.key}-${row.sourceObjectId}`}>
                    {activeGroup.columns.map((column) => (
                      <TableCell
                        key={`${row.sourceObjectId}-${column.key}`}
                        className="max-w-[220px] whitespace-normal px-3 py-2 align-top"
                      >
                        {row.cells[column.key] || ' '}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    className="px-3 py-6 text-center text-muted-foreground"
                    colSpan={activeGroup.columns.length}
                  >
                    No rows
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
