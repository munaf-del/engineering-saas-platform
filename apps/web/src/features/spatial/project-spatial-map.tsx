'use client';

import { useEffect, useEffectEvent, useMemo, useRef } from 'react';
import type {
  ProjectSpatialFeature,
  ProjectSpatialFeatureType,
  ProjectSpatialGeometryJson,
  ProjectSpatialGeometryType,
} from '@eng/shared';
import Feature from 'ol/Feature.js';
import GeoJSON from 'ol/format/GeoJSON.js';
import type Geometry from 'ol/geom/Geometry.js';
import Point from 'ol/geom/Point.js';
import Draw from 'ol/interaction/Draw.js';
import type Interaction from 'ol/interaction/Interaction.js';
import Modify from 'ol/interaction/Modify.js';
import Select from 'ol/interaction/Select.js';
import { defaults as defaultInteractions } from 'ol/interaction/defaults.js';
import TileLayer from 'ol/layer/Tile.js';
import VectorLayer from 'ol/layer/Vector.js';
import Map from 'ol/Map.js';
import View from 'ol/View.js';
import { fromLonLat, getPointResolution, toLonLat } from 'ol/proj.js';
import VectorSource from 'ol/source/Vector.js';
import TileWMS from 'ol/source/TileWMS.js';
import WMTS from 'ol/source/WMTS.js';
import XYZ from 'ol/source/XYZ.js';
import CircleStyle from 'ol/style/Circle.js';
import Fill from 'ol/style/Fill.js';
import RegularShape from 'ol/style/RegularShape.js';
import Stroke from 'ol/style/Stroke.js';
import Style from 'ol/style/Style.js';
import Text from 'ol/style/Text.js';
import WMTSTileGrid from 'ol/tilegrid/WMTS.js';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  PROJECT_SPATIAL_GEOLOGY_QUERY_MARKER,
  getProjectSpatialFeatureSymbology,
  type ProjectSpatialFeatureSymbologyDefinition,
  type ProjectSpatialFillPattern,
  type ProjectSpatialPointSymbolShape,
} from './project-spatial-utils';

export type ProjectSpatialToolMode =
  | 'select'
  | 'modify'
  | 'draw_point'
  | 'draw_line_string'
  | 'draw_polygon';

export type ProjectSpatialDraftOverlay = {
  key: string;
  persistedId: string | null;
  featureType: ProjectSpatialFeatureType | '';
  geometryType: ProjectSpatialGeometryType;
  geometryJson: ProjectSpatialGeometryJson;
};

export type ProjectSpatialBasemap = 'osm' | 'nsw_aerial_imagery' | 'nsw_topographic';

export type ProjectSpatialGeologyInfoField = {
  key: string;
  label: string;
  value: string;
};

export type ProjectSpatialGeologyInfo = {
  layerName: string;
  sourceLabel: string;
  locationLonLat: [number, number];
  fields: ProjectSpatialGeologyInfoField[];
};

export type ProjectSpatialGeologyIdentifyState =
  | { status: 'idle' }
  | { status: 'loading'; locationLonLat: [number, number] }
  | { status: 'empty'; locationLonLat: [number, number] }
  | { status: 'error'; locationLonLat: [number, number]; message: string }
  | { status: 'success'; info: ProjectSpatialGeologyInfo };

export type ProjectSpatialMapScaleBar = {
  label: string;
  widthPx: number;
  distanceMeters: number;
};

export type ProjectSpatialMapSnapshot = {
  dataUrl: string;
  width: number;
  height: number;
  scaleBar: ProjectSpatialMapScaleBar;
};

export type ProjectSpatialMapViewState = {
  centerLonLat: [number, number];
  rotation: number;
  zoom: number | undefined;
};

export type ProjectSpatialMapExportApi = {
  captureSnapshot: () => Promise<ProjectSpatialMapSnapshot | null>;
  getViewState: () => ProjectSpatialMapViewState | null;
  isReady: () => boolean;
  readyStateLabel: () => string;
  setViewState: (viewState: ProjectSpatialMapViewState) => boolean;
  updateSize: () => boolean;
};

export type ProjectSpatialMapProps = {
  className?: string;
  projectId: string;
  features: ProjectSpatialFeature[];
  initialFeatures: ProjectSpatialFeature[];
  initialAddress: string | null;
  draftOverlay: ProjectSpatialDraftOverlay | null;
  selectedPersistedFeatureId: string | null;
  focusedPersistedFeatureId: string | null;
  focusRequestToken: number;
  selectionSyncToken: number;
  activeBasemap: ProjectSpatialBasemap;
  showGeologyOverlay: boolean;
  lockedViewState: ProjectSpatialMapViewState | null;
  exportRequestToken: number;
  mode: ProjectSpatialToolMode;
  onFeatureSelect: (featureId: string | null) => void;
  onGeologyIdentifyStateChange: (state: ProjectSpatialGeologyIdentifyState) => void;
  onExportApiReady?: (api: ProjectSpatialMapExportApi | null) => void;
  onDrawComplete: (
    geometryType: ProjectSpatialGeometryType,
    geometryJson: ProjectSpatialGeometryJson,
  ) => void;
  onPersistedFeatureGeometryChange: (
    featureId: string,
    geometryJson: ProjectSpatialGeometryJson,
    geometryType: ProjectSpatialGeometryType,
  ) => void;
  onDraftGeometryChange: (
    geometryJson: ProjectSpatialGeometryJson,
    geometryType: ProjectSpatialGeometryType,
  ) => void;
};

const FALLBACK_CENTER: [number, number] = [0, 0];
const FALLBACK_ZOOM = 5;
const PROJECT_ADDRESS_ZOOM = 14;
const MAP_PADDING: [number, number, number, number] = [50, 50, 50, 50];
const GEOJSON_FORMAT = new GeoJSON();
const PROJECT_SPATIAL_BASEMAPS = ['osm', 'nsw_aerial_imagery', 'nsw_topographic'] as const;
const WEB_MERCATOR_PROJECTION = 'EPSG:3857';
const GOOGLE_MAPS_COMPATIBLE_ORIGIN: [number, number] = [-20037508.342789244, 20037508.342789244];
const GOOGLE_MAPS_COMPATIBLE_RESOLUTIONS = Array.from(
  { length: 19 },
  (_, zoom) => 156543.03392804097 / 2 ** zoom,
);
const GOOGLE_MAPS_COMPATIBLE_MATRIX_IDS = GOOGLE_MAPS_COMPATIBLE_RESOLUTIONS.map((_, zoom) =>
  zoom.toString(),
);
const NSW_GEOLOGY_OVERLAY_CONFIG = {
  url: 'https://gs-seamless.geoscience.nsw.gov.au/geoserver/ows',
  layer: 'geology:rock_units_nsw',
  title: 'Rock units - NSW surface',
  projection: WEB_MERCATOR_PROJECTION,
  format: 'image/png',
  tiled: true,
  opacity: 0.6,
} as const;
const GEOLOGY_GET_FEATURE_INFO_FEATURE_COUNT = 1;
const GEOLOGY_FIELD_LABELS: Record<string, string> = {
  feature_id: 'Feature ID',
  nsw_code: 'Map symbol',
  colour_rgb: 'Colour',
  unit_name: 'Unit name',
  descriptn: 'Unit description',
  all_stratigraphy: 'Stratigraphy',
  province: 'Province',
  sub_province: 'Sub-province',
  dominant_lithology: 'Lithology',
  igneous_type: 'Igneous type',
  age_range: 'Age range',
  top_end_age_ma: 'Top end age (Ma)',
  base_start_age_ma: 'Base start age (Ma)',
  depositional_environment: 'Depositional environment',
  darkness: 'Darkness',
};
const GEOLOGY_FIELD_ORDER = [
  'unit_name',
  'nsw_code',
  'dominant_lithology',
  'descriptn',
  'all_stratigraphy',
  'province',
  'sub_province',
  'age_range',
  'depositional_environment',
  'igneous_type',
  'feature_id',
  'colour_rgb',
  'top_end_age_ma',
  'base_start_age_ma',
  'darkness',
];
const FEATURE_STYLE_CACHE = new globalThis.Map<string, Style | Style[]>();
const FILL_PATTERN_CACHE = new globalThis.Map<string, CanvasPattern | null>();
const GEOLOGY_QUERY_MARKER_STYLES = createGeologyQueryMarkerStyles();

type MapFeatureRecord = {
  key: string;
  persistedId: string | null;
  featureType: ProjectSpatialFeatureType | '';
  geometryType: ProjectSpatialGeometryType;
  geometryJson: ProjectSpatialGeometryJson;
  isDraft: boolean;
};

export function ProjectSpatialMap({
  className,
  projectId,
  features,
  initialFeatures,
  initialAddress,
  draftOverlay,
  selectedPersistedFeatureId,
  focusedPersistedFeatureId,
  focusRequestToken,
  selectionSyncToken,
  activeBasemap,
  showGeologyOverlay,
  lockedViewState,
  exportRequestToken,
  mode,
  onFeatureSelect,
  onGeologyIdentifyStateChange,
  onExportApiReady,
  onDrawComplete,
  onPersistedFeatureGeometryChange,
  onDraftGeometryChange,
}: ProjectSpatialMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<Map | null>(null);
  const basemapLayersRef = useRef<Record<ProjectSpatialBasemap, TileLayer> | null>(null);
  const geologyOverlayLayerRef = useRef<TileLayer<TileWMS> | null>(null);
  const geologyQuerySourceRef = useRef<VectorSource<Feature<Geometry>> | null>(null);
  const navigationInteractionsRef = useRef<Interaction[]>([]);
  const sourceRef = useRef<VectorSource<Feature<Geometry>> | null>(null);
  const selectRef = useRef<Select | null>(null);
  const modifyRef = useRef<Modify | null>(null);
  const drawRef = useRef<Draw | null>(null);
  const hasResolvedInitialViewRef = useRef(false);
  const initialBasemapRef = useRef(activeBasemap);
  const geologyIdentifyRequestSequenceRef = useRef(0);
  const skipNextGeologyIdentifyRef = useRef(false);
  const lastHandledExportRequestTokenRef = useRef(0);
  const pendingTileLoadCountRef = useRef(0);
  const lastTileActivityAtRef = useRef(0);
  const lastRenderCompleteAtRef = useRef(0);

  const handleFeatureSelect = useEffectEvent((featureId: string | null) => {
    onFeatureSelect(featureId);
  });

  const handleDrawComplete = useEffectEvent(
    (geometryType: ProjectSpatialGeometryType, geometryJson: ProjectSpatialGeometryJson) => {
      onDrawComplete(geometryType, geometryJson);
    },
  );

  const handlePersistedFeatureGeometryChange = useEffectEvent(
    (
      featureId: string,
      geometryJson: ProjectSpatialGeometryJson,
      geometryType: ProjectSpatialGeometryType,
    ) => {
      onPersistedFeatureGeometryChange(featureId, geometryJson, geometryType);
    },
  );

  const handleDraftGeometryChange = useEffectEvent(
    (geometryJson: ProjectSpatialGeometryJson, geometryType: ProjectSpatialGeometryType) => {
      onDraftGeometryChange(geometryJson, geometryType);
    },
  );

  const handleGeologyIdentifyStateChange = useEffectEvent(
    (state: ProjectSpatialGeologyIdentifyState) => {
      onGeologyIdentifyStateChange(state);
    },
  );

  const handleExportApiReady = useEffectEvent((api: ProjectSpatialMapExportApi | null) => {
    onExportApiReady?.(api);
  });

  const handleMapSingleClick = useEffectEvent(async (coordinate: [number, number]) => {
    if (skipNextGeologyIdentifyRef.current) {
      skipNextGeologyIdentifyRef.current = false;
      return;
    }

    if (!showGeologyOverlay || mode !== 'select') {
      return;
    }

    const map = mapRef.current;
    const geologyOverlayLayer = geologyOverlayLayerRef.current;
    const source = geologyOverlayLayer?.getSource();
    const resolution = map?.getView().getResolution();
    const projection = map?.getView().getProjection();

    if (!map || !source || resolution === undefined || !projection) {
      return;
    }

    const locationLonLat = toLonLat(coordinate, projection) as [number, number];
    const requestSequence = ++geologyIdentifyRequestSequenceRef.current;
    updateGeologyQueryMarker(geologyQuerySourceRef.current, coordinate);
    handleGeologyIdentifyStateChange({ status: 'loading', locationLonLat });

    try {
      const info = await identifyGeologyAtCoordinate(source, coordinate, resolution, projection);
      if (requestSequence !== geologyIdentifyRequestSequenceRef.current) {
        return;
      }

      if (info) {
        handleGeologyIdentifyStateChange({
          status: 'success',
          info: {
            ...info,
            locationLonLat,
          },
        });
        return;
      }

      handleGeologyIdentifyStateChange({ status: 'empty', locationLonLat });
    } catch (error) {
      if (requestSequence !== geologyIdentifyRequestSequenceRef.current) {
        return;
      }

      console.error('Failed to identify geology', error);
      handleGeologyIdentifyStateChange({
        status: 'error',
        locationLonLat,
        message: 'Unable to load geology data right now.',
      });
    }
  });

  const mapFeatures = useMemo<MapFeatureRecord[]>(() => {
    const items = features.map<MapFeatureRecord>((feature) => ({
      key: feature.id,
      persistedId: feature.id,
      featureType: feature.featureType,
      geometryType: feature.geometryType,
      geometryJson: feature.geometryJson,
      isDraft: false,
    }));

    if (draftOverlay) {
      const overlay: MapFeatureRecord = {
        key: draftOverlay.key,
        persistedId: draftOverlay.persistedId,
        featureType: draftOverlay.featureType,
        geometryType: draftOverlay.geometryType,
        geometryJson: draftOverlay.geometryJson,
        isDraft: true,
      };

      if (draftOverlay.persistedId) {
        return items
          .filter((feature) => feature.persistedId !== draftOverlay.persistedId)
          .concat(overlay);
      }

      return items.concat(overlay);
    }

    return items;
  }, [draftOverlay, features]);

  const selectedSelectionKey = draftOverlay?.key ?? selectedPersistedFeatureId;

  useEffect(() => {
    if (!containerRef.current || mapRef.current) {
      return;
    }

    const vectorSource = new VectorSource<Feature<Geometry>>();
    const vectorLayer = new VectorLayer({
      source: vectorSource,
      zIndex: 20,
      style: (feature) =>
        createFeatureStyle(
          (feature.get('featureType') as ProjectSpatialFeatureType | '') || 'other',
          (feature.get('geometryType') as ProjectSpatialGeometryType) || 'point',
          Boolean(feature.get('isDraft')),
        ),
    });
    const select = new Select({
      layers: [vectorLayer],
      hitTolerance: 8,
      style: (feature) =>
        createFeatureStyle(
          (feature.get('featureType') as ProjectSpatialFeatureType | '') || 'other',
          (feature.get('geometryType') as ProjectSpatialGeometryType) || 'point',
          Boolean(feature.get('isDraft')),
          true,
        ),
    });
    const modify = new Modify({
      features: select.getFeatures(),
    });
    const basemapLayers = createBasemapLayers(initialBasemapRef.current);
    const geologyOverlayLayer = createGeologyOverlayLayer();
    const geologyQuerySource = new VectorSource<Feature<Geometry>>();
    const geologyQueryLayer = createGeologyQueryLayer(geologyQuerySource);
    const baseInteractions = defaultInteractions({
      doubleClickZoom: false,
    });

    select.on('select', (event) => {
      const selectedFeature = event.selected[0];
      if (!selectedFeature) {
        handleFeatureSelect(null);
        return;
      }

      const persistedId = selectedFeature.get('persistedId');
      handleFeatureSelect(typeof persistedId === 'string' ? persistedId : null);
    });

    modify.on('modifyend', (event) => {
      const changedFeature = event.features.item(0);
      if (!changedFeature) {
        return;
      }

      const geometryType = changedFeature.get('geometryType') as ProjectSpatialGeometryType;
      const geometryJson = serializeGeometry(changedFeature);

      if (Boolean(changedFeature.get('isDraft'))) {
        handleDraftGeometryChange(geometryJson, geometryType);
        return;
      }

      const persistedId = changedFeature.get('persistedId');
      if (typeof persistedId === 'string') {
        handlePersistedFeatureGeometryChange(persistedId, geometryJson, geometryType);
      }
    });

    const map = new Map({
      target: containerRef.current,
      layers: [
        basemapLayers.osm,
        basemapLayers.nsw_aerial_imagery,
        basemapLayers.nsw_topographic,
        geologyOverlayLayer,
        vectorLayer,
        geologyQueryLayer,
      ],
      view: new View({
        projection: WEB_MERCATOR_PROJECTION,
        center: fromLonLat(FALLBACK_CENTER),
        zoom: FALLBACK_ZOOM,
      }),
      interactions: baseInteractions.extend([select, modify]),
    });

    map.on('singleclick', (event) => {
      void handleMapSingleClick(event.coordinate as [number, number]);
    });
    const handleRenderComplete = () => {
      lastRenderCompleteAtRef.current = Date.now();
    };
    map.on('rendercomplete', handleRenderComplete);

    const trackedTileSources = [
      basemapLayers.osm.getSource(),
      basemapLayers.nsw_aerial_imagery.getSource(),
      basemapLayers.nsw_topographic.getSource(),
      geologyOverlayLayer.getSource(),
    ].filter(Boolean) as Array<XYZ | WMTS | TileWMS>;
    const handleTileLoadStart = () => {
      pendingTileLoadCountRef.current += 1;
      lastTileActivityAtRef.current = Date.now();
    };
    const handleTileLoadFinish = () => {
      pendingTileLoadCountRef.current = Math.max(0, pendingTileLoadCountRef.current - 1);
      lastTileActivityAtRef.current = Date.now();
    };

    for (const source of trackedTileSources) {
      source.on('tileloadstart', handleTileLoadStart);
      source.on('tileloadend', handleTileLoadFinish);
      source.on('tileloaderror', handleTileLoadFinish);
    }

    mapRef.current = map;
    basemapLayersRef.current = basemapLayers;
    geologyOverlayLayerRef.current = geologyOverlayLayer;
    geologyQuerySourceRef.current = geologyQuerySource;
    navigationInteractionsRef.current = baseInteractions.getArray();
    sourceRef.current = vectorSource;
    selectRef.current = select;
    modifyRef.current = modify;
    registerSpatialMapDebug(map, vectorSource);

    return () => {
      handleExportApiReady(null);
      for (const source of trackedTileSources) {
        source.un('tileloadstart', handleTileLoadStart);
        source.un('tileloadend', handleTileLoadFinish);
        source.un('tileloaderror', handleTileLoadFinish);
      }
      map.un('rendercomplete', handleRenderComplete);
      if (drawRef.current) {
        map.removeInteraction(drawRef.current);
      }
      map.setTarget(undefined);
      mapRef.current = null;
      basemapLayersRef.current = null;
      geologyOverlayLayerRef.current = null;
      geologyQuerySourceRef.current = null;
      navigationInteractionsRef.current = [];
      sourceRef.current = null;
      selectRef.current = null;
      modifyRef.current = null;
      drawRef.current = null;
      clearSpatialMapDebug();
    };
    // `useEffectEvent` handlers intentionally stay out of the dependency list here.
    // Re-running this effect recreates the OpenLayers map instance and would reset the shared
    // view back to its fallback center/zoom during basemap switches.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const source = sourceRef.current;
    const select = selectRef.current;

    if (!map || !source || !select) {
      return;
    }

    source.clear();
    select.getFeatures().clear();

    const olFeatures = mapFeatures.map((feature) => buildMapFeature(feature));
    source.addFeatures(olFeatures);

    if (selectedSelectionKey) {
      const selectedFeature = olFeatures.find(
        (feature) => feature.get('selectionKey') === selectedSelectionKey,
      );

      if (selectedFeature) {
        select.getFeatures().push(selectedFeature);
      }

      return;
    }
  }, [mapFeatures, selectedSelectionKey, selectionSyncToken]);

  useEffect(() => {
    const map = mapRef.current;
    const source = sourceRef.current;

    if (!map || !source || hasResolvedInitialViewRef.current) {
      return;
    }

    let cancelPendingFit: (() => void) | null = null;
    let isActive = true;

    if (initialFeatures.length > 0 && source.getFeatures().length > 0) {
      cancelPendingFit = fitMapToSourceWhenReady(map, source, MAP_PADDING, () => {
        if (!isActive) {
          return;
        }

        hasResolvedInitialViewRef.current = true;
      });

      return () => {
        isActive = false;
        cancelPendingFit?.();
      };
    }

    const address = initialAddress?.trim();

    if (!address) {
      centerMapView(map, FALLBACK_CENTER, FALLBACK_ZOOM);
      hasResolvedInitialViewRef.current = true;
      return;
    }

    void (async () => {
      const geocodedCenter = await geocodeProjectAddress(address);
      if (!isActive || hasResolvedInitialViewRef.current) {
        return;
      }

      if (geocodedCenter) {
        centerMapView(map, geocodedCenter, PROJECT_ADDRESS_ZOOM);
      } else {
        centerMapView(map, FALLBACK_CENTER, FALLBACK_ZOOM);
      }

      hasResolvedInitialViewRef.current = true;
    })();

    return () => {
      isActive = false;
    };
  }, [initialAddress, initialFeatures.length]);

  useEffect(() => {
    const map = mapRef.current;
    const source = sourceRef.current;

    if (
      !map ||
      !source ||
      !focusedPersistedFeatureId ||
      focusRequestToken === 0 ||
      lockedViewState
    ) {
      return;
    }

    const focusedFeature = source
      .getFeatures()
      .find((feature) => feature.get('persistedId') === focusedPersistedFeatureId);

    if (focusedFeature) {
      fitMapToFeature(map, focusedFeature);
    }
  }, [focusRequestToken, focusedPersistedFeatureId, lockedViewState]);

  useEffect(() => {
    for (const interaction of navigationInteractionsRef.current) {
      interaction.setActive(!lockedViewState);
    }
  }, [lockedViewState]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !lockedViewState) {
      return;
    }

    applyMapViewState(map, lockedViewState);
  }, [lockedViewState]);

  useEffect(() => {
    const basemapLayers = basemapLayersRef.current;

    if (!basemapLayers) {
      return;
    }

    for (const basemap of PROJECT_SPATIAL_BASEMAPS) {
      basemapLayers[basemap].setVisible(basemap === activeBasemap);
    }
  }, [activeBasemap]);

  useEffect(() => {
    geologyIdentifyRequestSequenceRef.current += 1;
    geologyOverlayLayerRef.current?.setVisible(showGeologyOverlay);
    if (!showGeologyOverlay) {
      geologyQuerySourceRef.current?.clear();
    }
  }, [showGeologyOverlay]);

  useEffect(() => {
    geologyIdentifyRequestSequenceRef.current += 1;
    geologyQuerySourceRef.current?.clear();
  }, [projectId]);

  useEffect(() => {
    const map = mapRef.current;
    const source = sourceRef.current;
    const select = selectRef.current;
    const modify = modifyRef.current;

    if (!map || !source || !select || !modify) {
      return;
    }

    select.setActive(mode === 'select' || mode === 'modify');
    modify.setActive(mode === 'modify');

    if (drawRef.current) {
      map.removeInteraction(drawRef.current);
      drawRef.current = null;
    }

    const drawType = drawGeometryType(mode);
    if (!drawType) {
      return;
    }

    const draw = new Draw({
      source,
      type: drawType,
    });

    draw.on('drawend', (event) => {
      skipNextGeologyIdentifyRef.current = true;
      const geometryType = geometryTypeFromDrawMode(mode);
      const geometryJson = serializeGeometry(event.feature);
      source.removeFeature(event.feature);
      handleDrawComplete(geometryType, geometryJson);
    });

    map.addInteraction(draw);
    drawRef.current = draw;

    return () => {
      if (drawRef.current === draw) {
        map.removeInteraction(draw);
        drawRef.current = null;
      }
    };
  }, [handleDrawComplete, mode]);

  useEffect(() => {
    const map = mapRef.current;

    if (
      !map ||
      exportRequestToken === 0 ||
      exportRequestToken === lastHandledExportRequestTokenRef.current
    ) {
      return;
    }

    lastHandledExportRequestTokenRef.current = exportRequestToken;

    void exportMapAsPng(map, `project-spatial-${projectId}.png`).catch((error) => {
      console.error('Failed to export spatial map', error);
      toast.error('Failed to export map as PNG');
    });
  }, [exportRequestToken, projectId]);

  useEffect(() => {
    handleExportApiReady({
      captureSnapshot: async () => {
        const map = mapRef.current;
        if (!map) {
          return null;
        }

        return captureMapSnapshot(map, {
          getLastRenderCompleteAt: () => lastRenderCompleteAtRef.current,
          getLastTileActivityAt: () => lastTileActivityAtRef.current,
          getPendingTileLoadCount: () => pendingTileLoadCountRef.current,
        });
      },
      getViewState: () => {
        const map = mapRef.current;
        if (!map) {
          return null;
        }

        return readMapViewState(map);
      },
      isReady: () => {
        const map = mapRef.current;
        return map
          ? isMapReadyForCapture(map, {
              lastRenderCompleteAt: lastRenderCompleteAtRef.current,
              lastTileActivityAt: lastTileActivityAtRef.current,
              pendingTileLoadCount: pendingTileLoadCountRef.current,
            })
          : false;
      },
      readyStateLabel: () => {
        const map = mapRef.current;
        return map
          ? describeMapCaptureReadiness(map, {
              lastRenderCompleteAt: lastRenderCompleteAtRef.current,
              lastTileActivityAt: lastTileActivityAtRef.current,
              pendingTileLoadCount: pendingTileLoadCountRef.current,
            })
          : 'Map loading / map not ready yet.';
      },
      setViewState: (viewState) => {
        const map = mapRef.current;
        if (!map) {
          return false;
        }

        lastRenderCompleteAtRef.current = 0;
        lastTileActivityAtRef.current = Date.now();
        applyMapViewState(map, viewState);
        return true;
      },
      updateSize: () => {
        const map = mapRef.current;
        if (!map) {
          return false;
        }

        lastRenderCompleteAtRef.current = 0;
        map.updateSize();
        return true;
      },
    });

    return () => {
      handleExportApiReady(null);
    };
  }, [handleExportApiReady]);

  return (
    <div ref={containerRef} className={cn('h-[640px] w-full rounded-lg bg-slate-100', className)} />
  );
}

function drawGeometryType(mode: ProjectSpatialToolMode) {
  if (mode === 'draw_point') {
    return 'Point' as const;
  }
  if (mode === 'draw_line_string') {
    return 'LineString' as const;
  }
  if (mode === 'draw_polygon') {
    return 'Polygon' as const;
  }
  return null;
}

function geometryTypeFromDrawMode(mode: ProjectSpatialToolMode): ProjectSpatialGeometryType {
  if (mode === 'draw_point') {
    return 'point';
  }
  if (mode === 'draw_line_string') {
    return 'line_string';
  }
  return 'polygon';
}

function buildMapFeature(item: MapFeatureRecord) {
  const feature = new Feature({
    geometry: GEOJSON_FORMAT.readGeometry(item.geometryJson, {
      dataProjection: 'EPSG:4326',
      featureProjection: 'EPSG:3857',
    }),
  });

  feature.setId(item.key);
  feature.set('selectionKey', item.key);
  feature.set('persistedId', item.persistedId);
  feature.set('featureType', item.featureType);
  feature.set('geometryType', item.geometryType);
  feature.set('isDraft', item.isDraft);

  return feature;
}

function serializeGeometry(feature: Feature<Geometry>): ProjectSpatialGeometryJson {
  return GEOJSON_FORMAT.writeGeometryObject(feature.getGeometry()!, {
    dataProjection: 'EPSG:4326',
    featureProjection: 'EPSG:3857',
  }) as ProjectSpatialGeometryJson;
}

function fitMapToFeature(map: Map, feature: Feature<Geometry>) {
  const geometry = feature.getGeometry();
  if (!geometry) {
    return;
  }

  map.getView().fit(geometry.getExtent(), {
    padding: MAP_PADDING,
    duration: 250,
    maxZoom: 18,
  });
}

function fitMapToSource(
  map: Map,
  source: VectorSource<Feature<Geometry>>,
  padding: [number, number, number, number] = MAP_PADDING,
) {
  const extent = source.getExtent();
  if (!extent) {
    return;
  }

  map.getView().fit(extent, {
    padding,
    duration: 250,
    maxZoom: 16,
  });
}

function fitMapToSourceWhenReady(
  map: Map,
  source: VectorSource<Feature<Geometry>>,
  padding: [number, number, number, number],
  onResolved: () => void,
) {
  let attemptCount = 0;
  let frameId: number | null = null;
  const maxAttempts = 12;

  const attemptFit = () => {
    const size = map.getSize();

    if ((!size || size[0] === 0 || size[1] === 0) && attemptCount < maxAttempts) {
      attemptCount += 1;
      frameId = requestAnimationFrame(attemptFit);
      return;
    }

    map.updateSize();
    fitMapToSource(map, source, padding);
    onResolved();
  };

  frameId = requestAnimationFrame(attemptFit);

  return () => {
    if (frameId !== null) {
      cancelAnimationFrame(frameId);
    }
  };
}

function centerMapView(map: Map, center: [number, number], zoom: number) {
  const view = map.getView();
  view.setCenter(fromLonLat(center));
  view.setZoom(zoom);
}

function readMapViewState(map: Map): ProjectSpatialMapViewState {
  const view = map.getView();
  const center = view.getCenter();

  return {
    centerLonLat: center ? (toLonLat(center) as [number, number]) : [0, 0],
    rotation: view.getRotation(),
    zoom: view.getZoom(),
  };
}

function applyMapViewState(map: Map, viewState: ProjectSpatialMapViewState) {
  const view = map.getView();
  view.setCenter(fromLonLat(viewState.centerLonLat));
  if (typeof viewState.zoom === 'number') {
    view.setZoom(viewState.zoom);
  }
  view.setRotation(viewState.rotation);
}

async function geocodeProjectAddress(address: string) {
  try {
    const response = await fetch(`/api/geocode/project-address?q=${encodeURIComponent(address)}`, {
      cache: 'no-store',
    });

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as {
      result?: { lat?: number; lon?: number } | null;
    };
    const latitude = Number(payload.result?.lat);
    const longitude = Number(payload.result?.lon);

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return null;
    }

    return [longitude, latitude] as [number, number];
  } catch {
    return null;
  }
}

function createFeatureStyle(
  featureType: ProjectSpatialFeatureType | '',
  geometryType: ProjectSpatialGeometryType,
  isDraft: boolean,
  isSelected = false,
) {
  const cacheKey = [
    featureType || 'other',
    geometryType,
    isDraft ? 'draft' : 'persisted',
    isSelected ? 'selected' : 'default',
  ].join('|');
  const cachedStyle = FEATURE_STYLE_CACHE.get(cacheKey);

  if (cachedStyle) {
    return cachedStyle;
  }

  const symbology = getProjectSpatialFeatureSymbology(featureType);
  const styles =
    geometryType === 'point'
      ? createPointFeatureStyles(symbology, isDraft, isSelected)
      : geometryType === 'line_string'
        ? createLineFeatureStyles(symbology, isDraft, isSelected)
        : createPolygonFeatureStyles(symbology, isDraft, isSelected);

  FEATURE_STYLE_CACHE.set(cacheKey, styles);
  return styles;
}

function withAlpha(hexColor: string, alpha: number) {
  const normalized = hexColor.replace('#', '');
  const bigint = Number.parseInt(normalized, 16);
  const red = (bigint >> 16) & 255;
  const green = (bigint >> 8) & 255;
  const blue = bigint & 255;
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

function createPointFeatureStyles(
  symbology: ProjectSpatialFeatureSymbologyDefinition,
  isDraft: boolean,
  isSelected: boolean,
) {
  const styles: Style[] = [];

  if (isSelected) {
    styles.push(
      new Style({
        image: new CircleStyle({
          radius: symbology.pointRadius + 6,
          fill: new Fill({ color: 'rgba(255,255,255,0.28)' }),
          stroke: new Stroke({
            color: 'rgba(17,24,39,0.35)',
            width: 1.5,
          }),
        }),
      }),
    );
  }

  styles.push(
    new Style({
      image: createPointImageStyle(
        symbology.pointShape,
        symbology.pointRadius + 2.25,
        'rgba(255,255,255,0.96)',
        'rgba(255,255,255,0.96)',
        1,
      ),
    }),
  );

  styles.push(
    new Style({
      image: createPointImageStyle(
        symbology.pointShape,
        symbology.pointRadius,
        resolvePointFillColor(symbology, isDraft),
        isDraft ? withAlpha(symbology.color, 0.88) : symbology.color,
        isSelected ? 2.75 : 2.25,
      ),
    }),
  );

  if (symbology.pointVariant === 'bullseye') {
    styles.push(
      new Style({
        image: new CircleStyle({
          radius: 2.5,
          fill: new Fill({
            color: isDraft ? withAlpha(symbology.color, 0.72) : symbology.color,
          }),
          stroke: new Stroke({
            color: '#ffffff',
            width: 1,
          }),
        }),
      }),
    );
  }

  return styles;
}

function createLineFeatureStyles(
  symbology: ProjectSpatialFeatureSymbologyDefinition,
  isDraft: boolean,
  isSelected: boolean,
) {
  const styles: Style[] = [];

  if (isSelected) {
    styles.push(
      new Style({
        stroke: new Stroke({
          color: 'rgba(255,255,255,0.96)',
          width: symbology.strokeWidth + 4,
          lineCap: 'round',
          lineJoin: 'round',
        }),
      }),
    );
  }

  styles.push(
    new Style({
      stroke: new Stroke({
        color: isDraft ? withAlpha(symbology.color, 0.88) : symbology.color,
        width: isSelected ? symbology.strokeWidth + 1 : symbology.strokeWidth,
        lineDash: resolveStrokeDash(symbology.strokeDash, isDraft),
        lineCap: 'round',
        lineJoin: 'round',
      }),
    }),
  );

  return styles;
}

function createPolygonFeatureStyles(
  symbology: ProjectSpatialFeatureSymbologyDefinition,
  isDraft: boolean,
  isSelected: boolean,
) {
  const styles: Style[] = [];

  if (isSelected) {
    styles.push(
      new Style({
        stroke: new Stroke({
          color: 'rgba(255,255,255,0.96)',
          width: symbology.strokeWidth + 4,
          lineCap: 'round',
          lineJoin: 'round',
        }),
      }),
    );
  }

  styles.push(
    new Style({
      stroke: new Stroke({
        color: isDraft ? withAlpha(symbology.color, 0.9) : symbology.color,
        width: isSelected ? symbology.strokeWidth + 1 : symbology.strokeWidth,
        lineDash: resolveStrokeDash(symbology.strokeDash, isDraft),
        lineCap: 'round',
        lineJoin: 'round',
      }),
      fill: new Fill({
        color: withAlpha(
          symbology.color,
          resolvePolygonFillOpacity(symbology, isDraft, isSelected),
        ),
      }),
    }),
  );

  const patternFill = createFillPattern(
    symbology.fillPattern,
    symbology.color,
    isSelected ? 0.34 : 0.26,
  );

  if (patternFill) {
    styles.push(
      new Style({
        fill: new Fill({
          color: patternFill,
        }),
      }),
    );
  }

  return styles;
}

function createPointImageStyle(
  shape: ProjectSpatialPointSymbolShape,
  radius: number,
  fillColor: string,
  strokeColor: string,
  strokeWidth: number,
) {
  const fill = new Fill({ color: fillColor });
  const stroke = new Stroke({
    color: strokeColor,
    width: strokeWidth,
    lineJoin: 'round',
  });

  if (shape === 'circle') {
    return new CircleStyle({ radius, fill, stroke });
  }

  if (shape === 'square') {
    return new RegularShape({
      points: 4,
      radius,
      angle: Math.PI / 4,
      fill,
      stroke,
    });
  }

  if (shape === 'triangle') {
    return new RegularShape({
      points: 3,
      radius,
      angle: 0,
      fill,
      stroke,
    });
  }

  if (shape === 'diamond') {
    return new RegularShape({
      points: 4,
      radius,
      angle: 0,
      fill,
      stroke,
    });
  }

  return new RegularShape({
    points: 5,
    radius,
    radius2: radius * 0.45,
    angle: 0,
    fill,
    stroke,
  });
}

function resolvePointFillColor(
  symbology: ProjectSpatialFeatureSymbologyDefinition,
  isDraft: boolean,
) {
  if (symbology.pointVariant === 'open' || symbology.pointVariant === 'bullseye') {
    return isDraft ? 'rgba(255,255,255,0.84)' : 'rgba(255,255,255,0.96)';
  }

  return isDraft ? withAlpha(symbology.color, 0.82) : symbology.color;
}

function resolveStrokeDash(baseDash: number[], isDraft: boolean) {
  if (!isDraft) {
    return baseDash.length > 0 ? baseDash : undefined;
  }

  return baseDash.length > 0 ? [...baseDash, 4, 4] : [8, 6];
}

function resolvePolygonFillOpacity(
  symbology: ProjectSpatialFeatureSymbologyDefinition,
  isDraft: boolean,
  isSelected: boolean,
) {
  const opacity = symbology.fillOpacity + (isSelected ? 0.06 : 0) - (isDraft ? 0.02 : 0);
  return Math.max(0.06, Math.min(0.32, opacity));
}

function createFillPattern(fillPattern: ProjectSpatialFillPattern, color: string, alpha: number) {
  if (fillPattern === 'none' || fillPattern === 'solid' || typeof document === 'undefined') {
    return null;
  }

  const cacheKey = `${fillPattern}|${color}|${alpha}`;
  const cachedPattern = FILL_PATTERN_CACHE.get(cacheKey);
  if (cachedPattern !== undefined) {
    return cachedPattern;
  }

  const canvas = document.createElement('canvas');
  canvas.width = 8;
  canvas.height = 8;

  const context = canvas.getContext('2d');
  if (!context) {
    FILL_PATTERN_CACHE.set(cacheKey, null);
    return null;
  }

  const patternColor = withAlpha(color, alpha);
  context.strokeStyle = patternColor;
  context.fillStyle = patternColor;
  context.lineWidth = 1.25;

  if (fillPattern === 'diagonal') {
    context.beginPath();
    context.moveTo(-2, 8);
    context.lineTo(8, -2);
    context.moveTo(2, 10);
    context.lineTo(10, 2);
    context.stroke();
  }

  if (fillPattern === 'cross') {
    context.beginPath();
    context.moveTo(-2, 8);
    context.lineTo(8, -2);
    context.moveTo(2, 10);
    context.lineTo(10, 2);
    context.moveTo(0, 0);
    context.lineTo(8, 8);
    context.moveTo(8, 0);
    context.lineTo(0, 8);
    context.stroke();
  }

  if (fillPattern === 'dot') {
    context.beginPath();
    context.arc(2, 2, 1.15, 0, Math.PI * 2);
    context.arc(6, 6, 1.15, 0, Math.PI * 2);
    context.fill();
  }

  const pattern = context.createPattern(canvas, 'repeat');
  FILL_PATTERN_CACHE.set(cacheKey, pattern);
  return pattern;
}

function createGeologyQueryLayer(source: VectorSource<Feature<Geometry>>) {
  return new VectorLayer({
    source,
    zIndex: 30,
    declutter: true,
    style: GEOLOGY_QUERY_MARKER_STYLES,
  });
}

function createGeologyQueryMarkerStyles() {
  return [
    new Style({
      image: new CircleStyle({
        radius: 11,
        fill: new Fill({ color: 'rgba(255,255,255,0.18)' }),
        stroke: new Stroke({
          color: withAlpha(PROJECT_SPATIAL_GEOLOGY_QUERY_MARKER.color, 0.55),
          width: 2,
        }),
      }),
    }),
    new Style({
      image: new CircleStyle({
        radius: 7,
        fill: new Fill({ color: PROJECT_SPATIAL_GEOLOGY_QUERY_MARKER.accentColor }),
        stroke: new Stroke({
          color: PROJECT_SPATIAL_GEOLOGY_QUERY_MARKER.color,
          width: 2,
        }),
      }),
      text: new Text({
        text: 'GEO',
        offsetY: -18,
        font: '600 11px ui-sans-serif, system-ui, sans-serif',
        fill: new Fill({ color: PROJECT_SPATIAL_GEOLOGY_QUERY_MARKER.textColor }),
        backgroundFill: new Fill({ color: 'rgba(255,255,255,0.92)' }),
        padding: [2, 4, 2, 4],
      }),
    }),
    new Style({
      image: new CircleStyle({
        radius: 2.5,
        fill: new Fill({ color: PROJECT_SPATIAL_GEOLOGY_QUERY_MARKER.color }),
        stroke: new Stroke({
          color: '#ffffff',
          width: 1,
        }),
      }),
    }),
  ] satisfies Style[];
}

function updateGeologyQueryMarker(
  source: VectorSource<Feature<Geometry>> | null,
  coordinate: [number, number],
) {
  if (!source) {
    return;
  }

  source.clear();
  source.addFeature(
    new Feature({
      geometry: new Point(coordinate),
    }),
  );
}

function createBasemapLayers(activeBasemap: ProjectSpatialBasemap) {
  return {
    osm: new TileLayer({
      zIndex: 0,
      visible: activeBasemap === 'osm',
      source: new XYZ({
        crossOrigin: 'anonymous',
        projection: WEB_MERCATOR_PROJECTION,
        url: 'https://{a-c}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      }),
    }),
    nsw_aerial_imagery: new TileLayer({
      zIndex: 0,
      visible: activeBasemap === 'nsw_aerial_imagery',
      source: new WMTS({
        crossOrigin: 'anonymous',
        layer: 'public_NSW_Imagery',
        matrixSet: 'GoogleMapsCompatible',
        projection: WEB_MERCATOR_PROJECTION,
        requestEncoding: 'REST',
        style: 'default',
        tileGrid: createGoogleMapsCompatibleWmtsTileGrid(),
        url: 'https://maps.six.nsw.gov.au/arcgis/rest/services/public/NSW_Imagery/MapServer/WMTS/tile/1.0.0/public_NSW_Imagery/{Style}/{TileMatrixSet}/{TileMatrix}/{TileRow}/{TileCol}',
      }),
    }),
    nsw_topographic: new TileLayer({
      zIndex: 0,
      visible: activeBasemap === 'nsw_topographic',
      source: new XYZ({
        crossOrigin: 'anonymous',
        maxZoom: 21,
        projection: WEB_MERCATOR_PROJECTION,
        url: 'https://maps.six.nsw.gov.au/arcgis/rest/services/public/NSW_Base_Map/MapServer/tile/{z}/{y}/{x}',
      }),
    }),
  };
}

function createGeologyOverlayLayer() {
  return new TileLayer({
    opacity: NSW_GEOLOGY_OVERLAY_CONFIG.opacity,
    visible: false,
    zIndex: 10,
    source: new TileWMS({
      crossOrigin: 'anonymous',
      projection: NSW_GEOLOGY_OVERLAY_CONFIG.projection,
      serverType: 'geoserver',
      url: NSW_GEOLOGY_OVERLAY_CONFIG.url,
      params: {
        LAYERS: NSW_GEOLOGY_OVERLAY_CONFIG.layer,
        FORMAT: NSW_GEOLOGY_OVERLAY_CONFIG.format,
        TILED: NSW_GEOLOGY_OVERLAY_CONFIG.tiled,
        TRANSPARENT: true,
      },
    }),
  });
}

async function identifyGeologyAtCoordinate(
  source: TileWMS,
  coordinate: [number, number],
  resolution: number,
  projection: ReturnType<View['getProjection']>,
) {
  const jsonUrl = source.getFeatureInfoUrl(coordinate, resolution, projection, {
    INFO_FORMAT: 'application/json',
    FEATURE_COUNT: GEOLOGY_GET_FEATURE_INFO_FEATURE_COUNT,
    QUERY_LAYERS: NSW_GEOLOGY_OVERLAY_CONFIG.layer,
  });

  if (!jsonUrl) {
    return null;
  }

  try {
    const response = await fetch(jsonUrl, {
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error(`Geology GetFeatureInfo failed with ${response.status}`);
    }

    const contentType = response.headers.get('content-type') ?? '';
    if (contentType.includes('application/json')) {
      const payload = (await response.json()) as {
        features?: Array<{
          properties?: Record<string, unknown> | null;
        }>;
      };
      return buildGeologyInfoFromAttributes(payload.features?.[0]?.properties ?? null);
    }

    const html = await response.text();
    return buildGeologyInfoFromAttributes(parseGeologyHtmlAttributes(html));
  } catch (error) {
    const fallbackUrl = source.getFeatureInfoUrl(coordinate, resolution, projection, {
      INFO_FORMAT: 'text/html',
      FEATURE_COUNT: GEOLOGY_GET_FEATURE_INFO_FEATURE_COUNT,
      QUERY_LAYERS: NSW_GEOLOGY_OVERLAY_CONFIG.layer,
    });

    if (!fallbackUrl) {
      throw error;
    }

    const fallbackResponse = await fetch(fallbackUrl, {
      cache: 'no-store',
    });

    if (!fallbackResponse.ok) {
      throw error;
    }

    return buildGeologyInfoFromAttributes(
      parseGeologyHtmlAttributes(await fallbackResponse.text()),
    );
  }
}

function buildGeologyInfoFromAttributes(attributes: Record<string, unknown> | null) {
  if (!attributes || Object.keys(attributes).length === 0) {
    return null;
  }

  const fields = normalizeGeologyFields(attributes);
  if (fields.length === 0) {
    return null;
  }

  return {
    layerName: NSW_GEOLOGY_OVERLAY_CONFIG.layer,
    sourceLabel: NSW_GEOLOGY_OVERLAY_CONFIG.title,
    fields,
  };
}

function normalizeGeologyFields(attributes: Record<string, unknown>) {
  const remainingKeys = new Set(Object.keys(attributes));
  const orderedKeys = GEOLOGY_FIELD_ORDER.filter((key) => remainingKeys.delete(key)).concat(
    Array.from(remainingKeys).sort(),
  );

  return orderedKeys
    .map((key) => {
      const value = formatGeologyFieldValue(attributes[key]);
      if (!value) {
        return null;
      }

      return {
        key,
        label: GEOLOGY_FIELD_LABELS[key] ?? humanizeGeologyKey(key),
        value,
      };
    })
    .filter((field): field is ProjectSpatialGeologyInfoField => field !== null);
}

function formatGeologyFieldValue(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === 'string') {
    const normalized = value.replace(/\s+/g, ' ').trim();
    return normalized || null;
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  if (Array.isArray(value)) {
    const items = value
      .map((item) => formatGeologyFieldValue(item))
      .filter((item): item is string => Boolean(item));
    return items.length > 0 ? items.join(', ') : null;
  }

  if (typeof value === 'object') {
    return JSON.stringify(value);
  }

  return null;
}

function humanizeGeologyKey(key: string) {
  const normalized = key.replace(/[_-]+/g, ' ').trim();
  if (!normalized) {
    return key;
  }

  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function parseGeologyHtmlAttributes(html: string) {
  const document = new DOMParser().parseFromString(html, 'text/html');
  const table = document.querySelector('table.featureInfo');

  if (!table) {
    const bodyText = document.body.textContent?.replace(/\s+/g, ' ').trim() ?? '';
    return /no features were found/i.test(bodyText) || !bodyText ? null : { result: bodyText };
  }

  const headings = Array.from(table.querySelectorAll('tr th')).map(
    (heading) => heading.textContent?.trim() ?? '',
  );
  const firstDataRow = Array.from(table.querySelectorAll('tr')).find(
    (row) => row.querySelectorAll('td').length > 0,
  );

  if (!firstDataRow) {
    return null;
  }

  const cells = Array.from(firstDataRow.querySelectorAll('td')).map(
    (cell) => cell.textContent?.trim() ?? '',
  );

  const attributes: Record<string, unknown> = {};
  headings.forEach((heading, index) => {
    const value = cells[index];
    if (!heading || !value) {
      return;
    }
    attributes[heading] = value;
  });

  return Object.keys(attributes).length > 0 ? attributes : null;
}

function createGoogleMapsCompatibleWmtsTileGrid() {
  return new WMTSTileGrid({
    origin: GOOGLE_MAPS_COMPATIBLE_ORIGIN,
    resolutions: GOOGLE_MAPS_COMPATIBLE_RESOLUTIONS,
    matrixIds: GOOGLE_MAPS_COMPATIBLE_MATRIX_IDS,
  });
}

async function exportMapAsPng(map: Map, filename: string) {
  const exportCanvas = await renderMapToCanvas(map);
  const link = document.createElement('a');
  link.download = filename;
  link.href = exportCanvas.toDataURL('image/png');
  link.click();
}

async function captureMapSnapshot(
  map: Map,
  readiness: {
    getLastRenderCompleteAt: () => number;
    getLastTileActivityAt: () => number;
    getPendingTileLoadCount: () => number;
  },
): Promise<ProjectSpatialMapSnapshot> {
  await waitForMapCaptureSettle(map, readiness);
  const exportCanvas = await renderMapToCanvas(map);

  return {
    dataUrl: exportCanvas.toDataURL('image/png'),
    width: exportCanvas.width,
    height: exportCanvas.height,
    scaleBar: buildScaleBarSpec(map),
  };
}

async function renderMapToCanvas(map: Map) {
  await waitForMapRenderComplete(map);

  return new Promise<HTMLCanvasElement>((resolve, reject) => {
    map.once('rendercomplete', () => {
      try {
        const size = map.getSize();
        if (!size) {
          reject(new Error('Map size is unavailable.'));
          return;
        }

        const [exportWidth, exportHeight] = size;
        if (exportWidth === undefined || exportHeight === undefined) {
          reject(new Error('Map size is incomplete.'));
          return;
        }

        const exportCanvas = document.createElement('canvas');
        exportCanvas.width = exportWidth;
        exportCanvas.height = exportHeight;

        const context = exportCanvas.getContext('2d');
        if (!context) {
          reject(new Error('PNG export canvas context is unavailable.'));
          return;
        }

        const canvases = map
          .getViewport()
          .querySelectorAll<HTMLCanvasElement>('.ol-layer canvas, canvas.ol-layer');

        for (const canvas of canvases) {
          if (canvas.width === 0 || canvas.height === 0) {
            continue;
          }

          const container = canvas.parentElement;
          const canvasStyle = getComputedStyle(canvas);
          const containerStyle = container ? getComputedStyle(container) : null;

          if (canvasStyle.display === 'none' || containerStyle?.display === 'none') {
            continue;
          }

          const opacityValue = canvasStyle.opacity || containerStyle?.opacity || '1';
          const opacity = Number(opacityValue);

          if (Number.isFinite(opacity) && opacity <= 0) {
            continue;
          }

          const transform = canvas.style.transform;
          const transformMatch = transform.match(/^matrix\(([^)]+)\)$/);
          const transformValues = transformMatch?.[1];
          const matrix = transformValues
            ? transformValues.split(',').map((value) => Number(value.trim()))
            : null;
          const fallbackMatrix: [number, number, number, number, number, number] = [
            parseFloat(canvasStyle.width) / canvas.width,
            0,
            0,
            parseFloat(canvasStyle.height) / canvas.height,
            0,
            0,
          ];
          const [a, b, c, d, e, f] =
            matrix && matrix.length === 6 && matrix.every((value) => Number.isFinite(value))
              ? (matrix as [number, number, number, number, number, number])
              : fallbackMatrix;

          context.save();
          context.globalAlpha = Number.isFinite(opacity) ? opacity : 1;
          context.setTransform(a, b, c, d, e, f);

          const backgroundColor = containerStyle?.backgroundColor;
          if (backgroundColor && backgroundColor !== 'rgba(0, 0, 0, 0)') {
            context.fillStyle = backgroundColor;
            context.fillRect(0, 0, canvas.width, canvas.height);
          }

          context.drawImage(canvas, 0, 0);
          context.restore();
        }

        resolve(exportCanvas);
      } catch (error) {
        reject(error);
      }
    });

    map.renderSync();
  });
}

async function waitForMapCaptureSettle(
  map: Map,
  readiness: {
    getLastRenderCompleteAt: () => number;
    getLastTileActivityAt: () => number;
    getPendingTileLoadCount: () => number;
  },
) {
  const startTime = Date.now();
  const maximumWaitMs = 3500;

  while (Date.now() - startTime < maximumWaitMs) {
    map.updateSize();
    map.renderSync();
    await waitForMapRenderComplete(map, 400);

    if (
      isMapReadyForCapture(map, {
        lastRenderCompleteAt: readiness.getLastRenderCompleteAt(),
        lastTileActivityAt: readiness.getLastTileActivityAt(),
        pendingTileLoadCount: readiness.getPendingTileLoadCount(),
      })
    ) {
      return;
    }

    await waitForDelay(140);
  }
}

function isMapReadyForCapture(
  map: Map,
  state: {
    lastRenderCompleteAt: number;
    lastTileActivityAt: number;
    pendingTileLoadCount: number;
  },
) {
  const size = map.getSize();
  const hasPositiveSize =
    Array.isArray(size) &&
    typeof size[0] === 'number' &&
    typeof size[1] === 'number' &&
    size[0] > 0 &&
    size[1] > 0;
  const quietSinceLastTileMs =
    state.lastTileActivityAt > 0 ? Date.now() - state.lastTileActivityAt : Number.POSITIVE_INFINITY;
  const hasRenderedAtLeastOnce = state.lastRenderCompleteAt > 0;

  return (
    hasPositiveSize &&
    hasRenderedAtLeastOnce &&
    state.pendingTileLoadCount === 0 &&
    quietSinceLastTileMs >= 180
  );
}

function describeMapCaptureReadiness(
  map: Map,
  state: {
    lastRenderCompleteAt: number;
    lastTileActivityAt: number;
    pendingTileLoadCount: number;
  },
) {
  if (!map.getTarget()) {
    return 'Map loading / map not ready yet.';
  }

  const size = map.getSize();
  const hasPositiveSize =
    Array.isArray(size) &&
    typeof size[0] === 'number' &&
    typeof size[1] === 'number' &&
    size[0] > 0 &&
    size[1] > 0;

  if (!hasPositiveSize) {
    return 'Map loading / map not ready yet.';
  }

  if (state.pendingTileLoadCount > 0) {
    return `Map loading ${state.pendingTileLoadCount} tile${state.pendingTileLoadCount === 1 ? '' : 's'}…`;
  }

  if (state.lastRenderCompleteAt <= 0) {
    return 'Map rendering / map not ready yet.';
  }

  const quietSinceLastTileMs =
    state.lastTileActivityAt > 0 ? Date.now() - state.lastTileActivityAt : Number.POSITIVE_INFINITY;

  if (quietSinceLastTileMs < 180) {
    return 'Map tiles are still settling…';
  }

  return 'Map ready.';
}

function waitForMapRenderComplete(map: Map, timeoutMs = 250) {
  return new Promise<void>((resolve) => {
    let resolved = false;
    const timeoutId = window.setTimeout(() => {
      if (resolved) {
        return;
      }

      resolved = true;
      resolve();
    }, timeoutMs);

    map.once('rendercomplete', () => {
      if (resolved) {
        return;
      }

      resolved = true;
      window.clearTimeout(timeoutId);
      resolve();
    });

    map.renderSync();
  });
}

function waitForDelay(durationMs: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, durationMs);
  });
}

function buildScaleBarSpec(map: Map): ProjectSpatialMapScaleBar {
  const view = map.getView();
  const resolution = view.getResolution();
  const center = view.getCenter();

  if (resolution === undefined || !center) {
    return {
      label: '100 m',
      widthPx: 100,
      distanceMeters: 100,
    };
  }

  const metersPerPixel = getPointResolution(view.getProjection(), resolution, center, 'm');
  const safeMetersPerPixel =
    Number.isFinite(metersPerPixel) && metersPerPixel > 0 ? metersPerPixel : 1;
  const targetWidthPx = 160;
  const distanceMeters = chooseNiceScaleDistance(safeMetersPerPixel * targetWidthPx);

  return {
    label: formatScaleDistance(distanceMeters),
    widthPx: Math.max(24, Math.round(distanceMeters / safeMetersPerPixel)),
    distanceMeters,
  };
}

function chooseNiceScaleDistance(distanceMeters: number) {
  const safeDistance = Math.max(distanceMeters, 1);
  const magnitude = 10 ** Math.floor(Math.log10(safeDistance));
  const candidates = [1, 2, 5, 10].map((factor) => factor * magnitude);
  const candidate = [...candidates].reverse().find((value) => value <= safeDistance);

  if (candidate) {
    return candidate;
  }

  return 5 * magnitude * 0.1;
}

function formatScaleDistance(distanceMeters: number) {
  if (distanceMeters >= 1000) {
    const kilometers = distanceMeters / 1000;
    return Number.isInteger(kilometers) ? `${kilometers} km` : `${kilometers.toFixed(1)} km`;
  }

  return `${Math.round(distanceMeters)} m`;
}

function registerSpatialMapDebug(map: Map, source: VectorSource<Feature<Geometry>>) {
  if (process.env.NODE_ENV === 'production' || typeof window === 'undefined') {
    return;
  }

  (
    window as Window & {
      __engSpatialMapDebug?: {
        getViewState: () => {
          centerLonLat: [number, number];
          zoom: number | undefined;
          rotation: number;
        };
        getFeatures: () => Array<{
          id: string | null;
          geometry: ProjectSpatialGeometryJson;
        }>;
      };
    }
  ).__engSpatialMapDebug = {
    getViewState: () => readMapViewState(map),
    getFeatures: () =>
      source.getFeatures().map((feature) => ({
        id: typeof feature.get('persistedId') === 'string' ? feature.get('persistedId') : null,
        geometry: serializeGeometry(feature),
      })),
  };
}

function clearSpatialMapDebug() {
  if (process.env.NODE_ENV === 'production' || typeof window === 'undefined') {
    return;
  }

  delete (
    window as Window & {
      __engSpatialMapDebug?: unknown;
    }
  ).__engSpatialMapDebug;
}
