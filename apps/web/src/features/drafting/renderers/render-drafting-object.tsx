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
import { normalizeDraftingRendererProps, type DraftingRendererProps } from './renderer-types';

export function renderDraftingObject(props: DraftingRendererProps<DraftingObject>) {
  const normalizedProps = normalizeDraftingRendererProps(props);

  switch (normalizedProps.object.type) {
    case 'pile':
      return <PileRenderer {...normalizedProps} object={normalizedProps.object} />;
    case 'secant_pile_wall':
      return <SecantPileWallRenderer {...normalizedProps} object={normalizedProps.object} />;
    case 'soldier_pile_wall':
      return <SoldierPileWallRenderer {...normalizedProps} object={normalizedProps.object} />;
    case 'anchor_tieback':
      return <AnchorTiebackRenderer {...normalizedProps} object={normalizedProps.object} />;
    case 'capping_beam':
      return <CappingBeamRenderer {...normalizedProps} object={normalizedProps.object} />;
    case 'waler':
      return <WalerRenderer {...normalizedProps} object={normalizedProps.object} />;
    case 'monitoring_point':
      return <MonitoringPointRenderer {...normalizedProps} object={normalizedProps.object} />;
    case 'leader_note':
      return <LeaderNoteRenderer {...normalizedProps} object={normalizedProps.object} />;
    case 'dimension_chain':
      return <DimensionChainRenderer {...normalizedProps} object={normalizedProps.object} />;
    case 'callout':
      return <CalloutRenderer {...normalizedProps} object={normalizedProps.object} />;
    case 'section_marker':
      return <SectionMarkerRenderer {...normalizedProps} object={normalizedProps.object} />;
    case 'borehole':
      return <BoreholeRenderer {...normalizedProps} object={normalizedProps.object} />;
    case 'service_run':
      return <ServiceRunRenderer {...normalizedProps} object={normalizedProps.object} />;
    case 'service_crossing':
      return <ServiceCrossingRenderer {...normalizedProps} object={normalizedProps.object} />;
    case 'excavation_line':
      return <ExcavationLineRenderer {...normalizedProps} object={normalizedProps.object} />;
    case 'draft_line':
      return <DraftLineRenderer {...normalizedProps} object={normalizedProps.object} />;
    case 'draft_polyline':
      return <DraftPolylineRenderer {...normalizedProps} object={normalizedProps.object} />;
    case 'draft_rectangle':
      return <DraftRectangleRenderer {...normalizedProps} object={normalizedProps.object} />;
    case 'draft_circle':
      return <DraftCircleRenderer {...normalizedProps} object={normalizedProps.object} />;
    case 'draft_polygon':
      return <DraftPolygonRenderer {...normalizedProps} object={normalizedProps.object} />;
    case 'structural_joint':
      return <StructuralJointRenderer {...normalizedProps} object={normalizedProps.object} />;
    case 'geotech_surface':
      return <GeotechSurfaceRenderer {...normalizedProps} object={normalizedProps.object} />;
    default:
      return null;
  }
}
