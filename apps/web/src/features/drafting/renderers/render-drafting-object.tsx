import * as React from 'react';
import type { DraftingObject } from '@eng/shared';
import { ExcavationLineRenderer } from './excavation-line-renderer';
import { LeaderNoteRenderer } from './leader-note-renderer';
import { MonitoringPointRenderer } from './monitoring-point-renderer';
import { PileRenderer } from './pile-renderer';
import type { DraftingRendererProps } from './renderer-types';

export function renderDraftingObject(props: DraftingRendererProps<DraftingObject>) {
  switch (props.object.type) {
    case 'pile':
      return <PileRenderer {...props} object={props.object} />;
    case 'monitoring_point':
      return <MonitoringPointRenderer {...props} object={props.object} />;
    case 'leader_note':
      return <LeaderNoteRenderer {...props} object={props.object} />;
    case 'excavation_line':
      return <ExcavationLineRenderer {...props} object={props.object} />;
    default:
      return null;
  }
}
