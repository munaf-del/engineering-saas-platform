import * as React from 'react';
import type { DraftingObject } from '@eng/shared';
import { AnchorTiebackRenderer } from './anchor-tieback-renderer';
import { BoreholeRenderer } from './borehole-renderer';
import { CalloutRenderer } from './callout-renderer';
import { CappingBeamRenderer } from './capping-beam-renderer';
import { DimensionChainRenderer } from './dimension-chain-renderer';
import { ExcavationLineRenderer } from './excavation-line-renderer';
import { LeaderNoteRenderer } from './leader-note-renderer';
import { MonitoringPointRenderer } from './monitoring-point-renderer';
import { PileRenderer } from './pile-renderer';
import {
  DraftCircleRenderer,
  DraftLineRenderer,
  DraftPolygonRenderer,
  DraftPolylineRenderer,
  DraftRectangleRenderer,
  GeotechSurfaceRenderer,
  StructuralJointRenderer,
} from './primitive-geometry-renderer';
import { SecantPileWallRenderer } from './secant-pile-wall-renderer';
import { SectionMarkerRenderer } from './section-marker-renderer';
import { ServiceCrossingRenderer } from './service-crossing-renderer';
import { ServiceRunRenderer } from './service-run-renderer';
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
    case 'dimension_chain':
      return <DimensionChainRenderer {...props} object={props.object} />;
    case 'callout':
      return <CalloutRenderer {...props} object={props.object} />;
    case 'section_marker':
      return <SectionMarkerRenderer {...props} object={props.object} />;
    case 'borehole':
      return <BoreholeRenderer {...props} object={props.object} />;
    case 'service_run':
      return <ServiceRunRenderer {...props} object={props.object} />;
    case 'service_crossing':
      return <ServiceCrossingRenderer {...props} object={props.object} />;
    case 'excavation_line':
      return <ExcavationLineRenderer {...props} object={props.object} />;
    case 'draft_line':
      return <DraftLineRenderer {...props} object={props.object} />;
    case 'draft_polyline':
      return <DraftPolylineRenderer {...props} object={props.object} />;
    case 'draft_rectangle':
      return <DraftRectangleRenderer {...props} object={props.object} />;
    case 'draft_circle':
      return <DraftCircleRenderer {...props} object={props.object} />;
    case 'draft_polygon':
      return <DraftPolygonRenderer {...props} object={props.object} />;
    case 'structural_joint':
      return <StructuralJointRenderer {...props} object={props.object} />;
    case 'geotech_surface':
      return <GeotechSurfaceRenderer {...props} object={props.object} />;
    default:
      return null;
  }
}
