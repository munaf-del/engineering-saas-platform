import * as React from 'react';
import type { DraftingObject } from '@eng/shared';
import { AnchorTiebackRenderer } from './anchor-tieback-renderer';
import { CappingBeamRenderer } from './capping-beam-renderer';
import { ExcavationLineRenderer } from './excavation-line-renderer';
import { LeaderNoteRenderer } from './leader-note-renderer';
import { MonitoringPointRenderer } from './monitoring-point-renderer';
import { PileRenderer } from './pile-renderer';
import { SecantPileWallRenderer } from './secant-pile-wall-renderer';
import { SoldierPileWallRenderer } from './soldier-pile-wall-renderer';
import { WalerRenderer } from './waler-renderer';
import type { DraftingRendererProps } from './renderer-types';

export function renderDraftingObject(props: DraftingRendererProps<DraftingObject>) {
  switch (props.object.type) {
    case 'pile':
      return <PileRenderer {...props} object={props.object} />;
    case 'secant_pile_wall':
      return <SecantPileWallRenderer {...props} object={props.object} />;
    case 'soldier_pile_wall':
      return <SoldierPileWallRenderer {...props} object={props.object} />;
    case 'anchor_tieback':
      return <AnchorTiebackRenderer {...props} object={props.object} />;
    case 'capping_beam':
      return <CappingBeamRenderer {...props} object={props.object} />;
    case 'waler':
      return <WalerRenderer {...props} object={props.object} />;
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
