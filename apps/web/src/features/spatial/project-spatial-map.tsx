'use client';

import {
  useEffect,
  useEffectEvent,
  useMemo,
  useRef,
} from 'react';
import type {
  ProjectSpatialFeature,
  ProjectSpatialFeatureType,
  ProjectSpatialGeometryJson,
  ProjectSpatialGeometryType,
} from '@eng/shared';
import Feature from 'ol/Feature.js';
import GeoJSON from 'ol/format/GeoJSON.js';
import type Geometry from 'ol/geom/Geometry.js';
import Draw from 'ol/interaction/Draw.js';
import Modify from 'ol/interaction/Modify.js';
import Select from 'ol/interaction/Select.js';
import { defaults as defaultInteractions } from 'ol/interaction/defaults.js';
import TileLayer from 'ol/layer/Tile.js';
import VectorLayer from 'ol/layer/Vector.js';
import Map from 'ol/Map.js';
import View from 'ol/View.js';
import { fromLonLat, toLonLat } from 'ol/proj.js';
import VectorSource from 'ol/source/Vector.js';
import XYZ from 'ol/source/XYZ.js';
import CircleStyle from 'ol/style/Circle.js';
import Fill from 'ol/style/Fill.js';
import Stroke from 'ol/style/Stroke.js';
import Style from 'ol/style/Style.js';
import { PROJECT_SPATIAL_FEATURE_COLORS } from './project-spatial-utils';

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

export type ProjectSpatialMapProps = {
  features: ProjectSpatialFeature[];
  initialFeatures: ProjectSpatialFeature[];
  initialAddress: string | null;
  draftOverlay: ProjectSpatialDraftOverlay | null;
  selectedPersistedFeatureId: string | null;
  focusedPersistedFeatureId: string | null;
  focusRequestToken: number;
  selectionSyncToken: number;
  mode: ProjectSpatialToolMode;
  onFeatureSelect: (featureId: string | null) => void;
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
const BASEMAP_PROVIDER = 'osm';

type MapFeatureRecord = {
  key: string;
  persistedId: string | null;
  featureType: ProjectSpatialFeatureType | '';
  geometryType: ProjectSpatialGeometryType;
  geometryJson: ProjectSpatialGeometryJson;
  isDraft: boolean;
};

export function ProjectSpatialMap({
  features,
  initialFeatures,
  initialAddress,
  draftOverlay,
  selectedPersistedFeatureId,
  focusedPersistedFeatureId,
  focusRequestToken,
  selectionSyncToken,
  mode,
  onFeatureSelect,
  onDrawComplete,
  onPersistedFeatureGeometryChange,
  onDraftGeometryChange,
}: ProjectSpatialMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<Map | null>(null);
  const sourceRef = useRef<VectorSource<Feature<Geometry>> | null>(null);
  const selectRef = useRef<Select | null>(null);
  const modifyRef = useRef<Modify | null>(null);
  const drawRef = useRef<Draw | null>(null);
  const hasResolvedInitialViewRef = useRef(false);

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
      layers: [createBasemapLayer(), vectorLayer],
      view: new View({
        center: fromLonLat(FALLBACK_CENTER),
        zoom: FALLBACK_ZOOM,
      }),
      interactions: defaultInteractions({
        doubleClickZoom: false,
      }).extend([select, modify]),
    });

    mapRef.current = map;
    sourceRef.current = vectorSource;
    selectRef.current = select;
    modifyRef.current = modify;
    registerSpatialMapDebug(map, vectorSource);

    return () => {
      drawRef.current && map.removeInteraction(drawRef.current);
      map.setTarget(undefined);
      mapRef.current = null;
      sourceRef.current = null;
      selectRef.current = null;
      modifyRef.current = null;
      drawRef.current = null;
      clearSpatialMapDebug();
    };
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

    if (!map || !source || !focusedPersistedFeatureId || focusRequestToken === 0) {
      return;
    }

    const focusedFeature = source
      .getFeatures()
      .find((feature) => feature.get('persistedId') === focusedPersistedFeatureId);

    if (focusedFeature) {
      fitMapToFeature(map, focusedFeature);
    }
  }, [focusedPersistedFeatureId, focusRequestToken]);

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

  return <div ref={containerRef} className="h-[640px] w-full rounded-lg bg-slate-100" />;
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

    if (
      (!size || size[0] === 0 || size[1] === 0) &&
      attemptCount < maxAttempts
    ) {
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

async function geocodeProjectAddress(address: string) {
  try {
    const response = await fetch(
      `/api/geocode/project-address?q=${encodeURIComponent(address)}`,
      {
        cache: 'no-store',
      },
    );

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
  const color = PROJECT_SPATIAL_FEATURE_COLORS[featureType || 'other'];
  const strokeWidth = isSelected ? 3 : 2;
  const dash = isDraft ? [8, 6] : undefined;

  if (geometryType === 'point') {
    return new Style({
      image: new CircleStyle({
        radius: isSelected ? 8 : 6,
        fill: new Fill({ color }),
        stroke: new Stroke({
          color: isSelected ? '#ffffff' : 'rgba(255,255,255,0.75)',
          width: isSelected ? 3 : 2,
        }),
      }),
    });
  }

  return new Style({
    stroke: new Stroke({
      color,
      width: strokeWidth,
      lineDash: dash,
    }),
    fill:
      geometryType === 'polygon'
        ? new Fill({
            color: isSelected ? withAlpha(color, 0.22) : withAlpha(color, 0.14),
          })
        : undefined,
  });
}

function withAlpha(hexColor: string, alpha: number) {
  const normalized = hexColor.replace('#', '');
  const bigint = Number.parseInt(normalized, 16);
  const red = (bigint >> 16) & 255;
  const green = (bigint >> 8) & 255;
  const blue = bigint & 255;
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

function createBasemapLayer() {
  // Future basemap providers can plug in here without changing the editing workflow.
  const basemapFactories = {
    osm: () =>
      new TileLayer({
        source: new XYZ({
          url: 'https://{a-c}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        }),
      }),
  } as const;

  return basemapFactories[BASEMAP_PROVIDER]();
}

function registerSpatialMapDebug(
  map: Map,
  source: VectorSource<Feature<Geometry>>,
) {
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
    getViewState: () => {
      const view = map.getView();
      const center = view.getCenter();

      return {
        centerLonLat: center ? (toLonLat(center) as [number, number]) : [0, 0],
        zoom: view.getZoom(),
        rotation: view.getRotation(),
      };
    },
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
