import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { getProjectSpecificsFromProjectMetadata } from '../projects/project-specifics.adapter';

const NSW_ASS_LAYER_QUERY_URL =
  'https://mapprod3.environment.nsw.gov.au/arcgis/rest/services/Planning/Protection/MapServer/1/query';
const NOMINATIM_SEARCH_URL = 'https://nominatim.openstreetmap.org/search';

export type WasteClassificationAssAutofillResult = {
  assClass: WasteClassificationAssClass;
  assClassSource: string;
  projectLocationNote: string | null;
  detectionMethod: 'spatial_site_boundary' | 'spatial_parcel_boundary' | 'project_coordinates' | 'project_address_geocode' | 'fallback';
  matchedPlanningPortalClass: string | null;
};

type WasteClassificationAssClass =
  | 'class_1'
  | 'class_2'
  | 'class_3'
  | 'class_4'
  | 'class_5'
  | 'not_mapped_unknown';

type ProjectLookupContext = {
  name: string;
  code: string;
  metadata: Prisma.JsonValue | null;
};

type SpatialLookupFeature = {
  featureType: string;
  label: string;
  geometryJson: Prisma.JsonValue | null;
};

type LookupPoint = {
  latitude: number;
  longitude: number;
  method: WasteClassificationAssAutofillResult['detectionMethod'];
  sourceLabel: string;
  note: string;
};

@Injectable()
export class NswAssAutofillService {
  private readonly logger = new Logger(NswAssAutofillService.name);

  async autofillForProject(
    project: ProjectLookupContext,
    spatialFeatures: SpatialLookupFeature[],
  ): Promise<WasteClassificationAssAutofillResult> {
    const lookupPoint = await this.resolveLookupPoint(project, spatialFeatures);

    if (!lookupPoint) {
      return {
        assClass: 'not_mapped_unknown',
        assClassSource:
          'No project location could be resolved for NSW Planning Portal ASS lookup. Set the ASS class manually or add project coordinates / a site boundary.',
        projectLocationNote: null,
        detectionMethod: 'fallback',
        matchedPlanningPortalClass: null,
      };
    }

    try {
      const queryUrl = new URL(NSW_ASS_LAYER_QUERY_URL);
      queryUrl.searchParams.set('f', 'pjson');
      queryUrl.searchParams.set(
        'geometry',
        JSON.stringify({
          x: lookupPoint.longitude,
          y: lookupPoint.latitude,
          spatialReference: { wkid: 4326 },
        }),
      );
      queryUrl.searchParams.set('geometryType', 'esriGeometryPoint');
      queryUrl.searchParams.set('inSR', '4326');
      queryUrl.searchParams.set('spatialRel', 'esriSpatialRelIntersects');
      queryUrl.searchParams.set('returnGeometry', 'false');
      queryUrl.searchParams.set('outFields', 'LAY_CLASS,EPI_NAME,LGA_NAME');

      const response = await fetch(queryUrl, {
        headers: {
          'User-Agent': 'engineering-saas-platform/1.0 (+https://www.epa.nsw.gov.au)',
        },
      });

      if (!response.ok) {
        throw new Error(`Planning Portal ASS lookup failed with ${response.status}`);
      }

      const payload = (await response.json()) as {
        error?: { message?: string };
        features?: Array<{
          attributes?: {
            LAY_CLASS?: string | null;
            EPI_NAME?: string | null;
            LGA_NAME?: string | null;
          };
        }>;
      };

      if (payload.error) {
        throw new Error(payload.error.message ?? 'Planning Portal ASS lookup returned an error');
      }

      const matchedClasses = payload.features
        ?.map((feature) => feature.attributes?.LAY_CLASS?.trim())
        .filter((entry): entry is string => Boolean(entry)) ?? [];

      const matchedClass = selectMostSeverePlanningPortalClass(matchedClasses);
      if (!matchedClass) {
        return {
          assClass: 'not_mapped_unknown',
          assClassSource: `No ASS class was returned from the NSW Planning Portal ASS layer using ${lookupPoint.sourceLabel}.`,
          projectLocationNote: lookupPoint.note,
          detectionMethod: lookupPoint.method,
          matchedPlanningPortalClass: null,
        };
      }

      const epiName =
        payload.features?.find((feature) => feature.attributes?.LAY_CLASS === matchedClass)?.attributes
          ?.EPI_NAME ?? null;
      const lgaName =
        payload.features?.find((feature) => feature.attributes?.LAY_CLASS === matchedClass)?.attributes
          ?.LGA_NAME ?? null;

      const sourceSuffix = [epiName, lgaName].filter(Boolean).join(' · ');

      return {
        assClass: toInternalAssClass(matchedClass),
        assClassSource: [
          `Auto-filled from NSW Planning Portal ASS layer using ${lookupPoint.sourceLabel}.`,
          sourceSuffix || null,
        ]
          .filter(Boolean)
          .join(' '),
        projectLocationNote: lookupPoint.note,
        detectionMethod: lookupPoint.method,
        matchedPlanningPortalClass: matchedClass,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown ASS lookup error';
      this.logger.warn(`Failed NSW Planning Portal ASS autofill: ${message}`);

      return {
        assClass: 'not_mapped_unknown',
        assClassSource: `ASS autofill could not be completed automatically (${message}). Set the ASS class manually if needed.`,
        projectLocationNote: lookupPoint.note,
        detectionMethod: lookupPoint.method,
        matchedPlanningPortalClass: null,
      };
    }
  }

  private async resolveLookupPoint(
    project: ProjectLookupContext,
    spatialFeatures: SpatialLookupFeature[],
  ): Promise<LookupPoint | null> {
    const spatialLookup = this.resolveSpatialLookupPoint(spatialFeatures);
    if (spatialLookup) {
      return spatialLookup;
    }

    const projectSpecifics = getProjectSpecificsFromProjectMetadata(project.metadata, {
      projectName: project.name,
      projectNumber: project.code,
    });

    const latitude = parseCoordinate(projectSpecifics?.identity.latitude);
    const longitude = parseCoordinate(projectSpecifics?.identity.longitude);
    if (latitude !== null && longitude !== null) {
      return {
        latitude,
        longitude,
        method: 'project_coordinates',
        sourceLabel: 'stored project coordinates',
        note: `Lookup point derived from project coordinates (${latitude.toFixed(6)}, ${longitude.toFixed(6)}).`,
      };
    }

    const address =
      projectSpecifics?.identity.address?.trim() ||
      projectSpecifics?.identity.mapAddress?.trim() ||
      null;
    if (!address) {
      return null;
    }

    try {
      const geocodeUrl = new URL(NOMINATIM_SEARCH_URL);
      geocodeUrl.searchParams.set('format', 'jsonv2');
      geocodeUrl.searchParams.set('limit', '1');
      geocodeUrl.searchParams.set('countrycodes', 'au');
      geocodeUrl.searchParams.set('q', address);

      const response = await fetch(geocodeUrl, {
        headers: {
          'User-Agent': 'engineering-saas-platform/1.0 (+https://www.epa.nsw.gov.au)',
        },
      });

      if (!response.ok) {
        throw new Error(`Address geocode failed with ${response.status}`);
      }

      const payload = (await response.json()) as Array<{
        lat?: string;
        lon?: string;
        display_name?: string;
      }>;
      const match = payload[0];
      const geocodedLatitude = parseCoordinate(match?.lat);
      const geocodedLongitude = parseCoordinate(match?.lon);

      if (geocodedLatitude === null || geocodedLongitude === null) {
        return null;
      }

      return {
        latitude: geocodedLatitude,
        longitude: geocodedLongitude,
        method: 'project_address_geocode',
        sourceLabel: 'project address geocode',
        note: `Lookup point derived from project address geocode${match?.display_name ? ` (${match.display_name})` : ''}.`,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown address geocode error';
      this.logger.warn(`Failed project address geocode for ASS autofill: ${message}`);
      return null;
    }
  }

  private resolveSpatialLookupPoint(features: SpatialLookupFeature[]): LookupPoint | null {
    const orderedFeatures = features
      .filter((feature) => feature.geometryJson)
      .sort((left, right) => spatialFeaturePriority(left.featureType) - spatialFeaturePriority(right.featureType));

    for (const feature of orderedFeatures) {
      const coordinates = representativePointForGeometry(feature.geometryJson);
      if (!coordinates) {
        continue;
      }

      return {
        latitude: coordinates[1],
        longitude: coordinates[0],
        method:
          feature.featureType === 'parcel_boundary'
            ? 'spatial_parcel_boundary'
            : 'spatial_site_boundary',
        sourceLabel:
          feature.featureType === 'parcel_boundary'
            ? 'spatial parcel boundary centroid'
            : 'spatial site boundary centroid',
        note: `Lookup point derived from ${feature.label || feature.featureType.replace(/_/g, ' ')} (${coordinates[1].toFixed(6)}, ${coordinates[0].toFixed(6)}).`,
      };
    }

    return null;
  }
}

function representativePointForGeometry(value: Prisma.JsonValue | null): [number, number] | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  const record = value as {
    type?: string;
    coordinates?: unknown;
  };

  if (record.type === 'Point' && Array.isArray(record.coordinates)) {
    return toLngLat(record.coordinates);
  }

  if (record.type === 'LineString' && Array.isArray(record.coordinates)) {
    const positions = record.coordinates.map((entry) => toLngLat(entry)).filter(Boolean) as Array<
      [number, number]
    >;
    return averagePosition(positions);
  }

  if (record.type === 'Polygon' && Array.isArray(record.coordinates)) {
    const outerRing = Array.isArray(record.coordinates[0]) ? record.coordinates[0] : [];
    const positions = outerRing.map((entry) => toLngLat(entry)).filter(Boolean) as Array<
      [number, number]
    >;
    return polygonCentroid(positions) ?? averagePosition(positions);
  }

  return null;
}

function toLngLat(value: unknown): [number, number] | null {
  if (!Array.isArray(value) || value.length < 2) {
    return null;
  }

  const longitude = typeof value[0] === 'number' ? value[0] : Number(value[0]);
  const latitude = typeof value[1] === 'number' ? value[1] : Number(value[1]);
  if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) {
    return null;
  }

  return [longitude, latitude];
}

function averagePosition(positions: Array<[number, number]>): [number, number] | null {
  if (positions.length === 0) {
    return null;
  }

  const sums = positions.reduce(
    (accumulator, [longitude, latitude]) => [accumulator[0] + longitude, accumulator[1] + latitude],
    [0, 0],
  );

  return [sums[0] / positions.length, sums[1] / positions.length];
}

function polygonCentroid(positions: Array<[number, number]>): [number, number] | null {
  if (positions.length < 3) {
    return null;
  }

  let area = 0;
  let x = 0;
  let y = 0;

  for (let index = 0; index < positions.length; index += 1) {
    const current = positions[index];
    const next = positions[(index + 1) % positions.length];
    if (!current || !next) {
      return null;
    }
    const [x0, y0] = current;
    const [x1, y1] = next;
    const factor = x0 * y1 - x1 * y0;
    area += factor;
    x += (x0 + x1) * factor;
    y += (y0 + y1) * factor;
  }

  if (area === 0) {
    return null;
  }

  return [x / (3 * area), y / (3 * area)];
}

function spatialFeaturePriority(featureType: string) {
  switch (featureType) {
    case 'site_boundary':
      return 0;
    case 'parcel_boundary':
      return 1;
    default:
      return 2;
  }
}

function parseCoordinate(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function selectMostSeverePlanningPortalClass(classes: string[]) {
  return [...classes]
    .sort((left, right) => planningPortalClassRank(left) - planningPortalClassRank(right))
    .at(0) ?? null;
}

function planningPortalClassRank(value: string) {
  if (/class\s*1/i.test(value)) {
    return 1;
  }
  if (/class\s*2/i.test(value)) {
    return 2;
  }
  if (/class\s*3/i.test(value)) {
    return 3;
  }
  if (/class\s*4/i.test(value)) {
    return 4;
  }
  if (/class\s*5/i.test(value)) {
    return 5;
  }
  return 99;
}

function toInternalAssClass(value: string): WasteClassificationAssClass {
  if (/class\s*1/i.test(value)) {
    return 'class_1';
  }
  if (/class\s*2/i.test(value)) {
    return 'class_2';
  }
  if (/class\s*3/i.test(value)) {
    return 'class_3';
  }
  if (/class\s*4/i.test(value)) {
    return 'class_4';
  }
  if (/class\s*5/i.test(value)) {
    return 'class_5';
  }
  return 'not_mapped_unknown';
}
