-- Keep the active Project Model canvas production-facing in demo data without deleting objects,
-- revisions, snapshots, transmittals, or evidence.
UPDATE drafting_drawings
SET
  title = 'Project Model - Shoring Plan',
  model_json = jsonb_set(
    jsonb_set(
      jsonb_set(
        jsonb_set(
          jsonb_set(
            model_json,
            '{titleBlock,drawingTitle}',
            to_jsonb('Project Model - Shoring Plan'::text),
            true
          ),
          '{objects}',
          (
            SELECT coalesce(jsonb_agg(
              CASE
                WHEN object_entry->>'type' IN (
                  'pile',
                  'secant_pile_wall',
                  'soldier_pile_wall',
                  'capping_beam',
                  'waler',
                  'service_run',
                  'service_crossing',
                  'borehole',
                  'monitoring_point'
                )
                  THEN object_entry - 'style' || jsonb_build_object('style', coalesce(object_entry->'style', '{}'::jsonb) - 'stroke' - 'fill' - 'lineWeight')
                ELSE object_entry
              END
              ORDER BY object_index
            ), model_json->'objects')
            FROM jsonb_array_elements(model_json->'objects') WITH ORDINALITY AS object_rows(object_entry, object_index)
          ),
          true
        ),
        '{layers}',
        (
          SELECT coalesce(jsonb_agg(
            CASE layer_entry->>'id'
              WHEN 'shoring' THEN layer_entry || '{"color":"#111827"}'::jsonb
              WHEN 'piles' THEN layer_entry || '{"color":"#111827"}'::jsonb
              WHEN 'anchors' THEN layer_entry || '{"color":"#334155"}'::jsonb
              WHEN 'beams_walers' THEN layer_entry || '{"color":"#111827"}'::jsonb
              WHEN 'excavation' THEN layer_entry || '{"color":"#334155"}'::jsonb
              WHEN 'monitoring' THEN layer_entry || '{"color":"#0f172a"}'::jsonb
              WHEN 'boreholes' THEN layer_entry || '{"color":"#0f172a"}'::jsonb
              WHEN 'services_conflicts' THEN layer_entry || '{"color":"#7f1d1d"}'::jsonb
              WHEN 'sections' THEN layer_entry || '{"color":"#111827"}'::jsonb
              ELSE layer_entry
            END
            ORDER BY layer_index
          ), model_json->'layers')
          FROM jsonb_array_elements(model_json->'layers') WITH ORDINALITY AS layer_rows(layer_entry, layer_index)
        ),
        true
      ),
      '{view,scale}',
      to_jsonb(0.12),
      true
    ),
    '{drawingSheets,0,title}',
    to_jsonb('Project Model - Shoring Plan'::text),
    true
  ),
  updated_at = now()
WHERE kind = 'model'
  AND status <> 'archived'
  AND (
    title ILIKE '%QA%'
    OR title ILIKE '%test%'
    OR title ILIKE '%sample%'
  );

UPDATE drafting_drawings
SET
  model_json = jsonb_set(
    jsonb_set(
      jsonb_set(
        model_json,
        '{objects}',
        coalesce(model_json->'objects', '[]'::jsonb) || jsonb_build_array(
          jsonb_build_object(
            'id', 'production-secant-wall',
            'type', 'secant_pile_wall',
            'layerId', 'shoring',
            'name', 'Secant Pile Wall - North Boundary',
            'visible', true,
            'locked', false,
            'style', '{}'::jsonb,
            'geometry', jsonb_build_object(
              'baselinePoints', jsonb_build_array(
                jsonb_build_object('x', -11800, 'y', -800),
                jsonb_build_object('x', -7600, 'y', -800)
              ),
              'pileCentres', jsonb_build_array(
                jsonb_build_object('x', -11800, 'y', -800),
                jsonb_build_object('x', -11050, 'y', -800),
                jsonb_build_object('x', -10300, 'y', -800),
                jsonb_build_object('x', -9550, 'y', -800),
                jsonb_build_object('x', -8800, 'y', -800),
                jsonb_build_object('x', -8050, 'y', -800)
              )
            ),
            'parameters', jsonb_build_object(
              'pileDiameterMm', 900,
              'spacingMm', 750,
              'overlapMm', 150,
              'secantType', 'overlapping',
              'primarySecondaryPattern', 'hard_soft'
            ),
            'metadata', jsonb_build_object(
              'wallId', 'SW-01',
              'constructionMethod', 'secant bored piles',
              'pileCount', 6,
              'designNotes', 'Production model example'
            ),
            'createdAt', '2026-04-25T00:00:00.000Z',
            'updatedAt', '2026-04-25T00:00:00.000Z'
          ),
          jsonb_build_object(
            'id', 'production-capping-beam',
            'type', 'capping_beam',
            'layerId', 'beams_walers',
            'name', 'Capping Beam CB-01',
            'visible', true,
            'locked', false,
            'style', '{}'::jsonb,
            'geometry', jsonb_build_object(
              'points', jsonb_build_array(
                jsonb_build_object('x', -11800, 'y', -1250),
                jsonb_build_object('x', -7600, 'y', -1250)
              )
            ),
            'parameters', jsonb_build_object('beamId', 'CB-01', 'widthMm', 900, 'depthMm', 1200, 'levelRl', 12.4, 'concreteGrade', '40 MPa'),
            'metadata', jsonb_build_object('associatedWallId', 'SW-01', 'notes', ''),
            'createdAt', '2026-04-25T00:00:00.000Z',
            'updatedAt', '2026-04-25T00:00:00.000Z'
          ),
          jsonb_build_object(
            'id', 'production-anchor-01',
            'type', 'anchor_tieback',
            'layerId', 'anchors',
            'name', 'Anchor A1',
            'visible', true,
            'locked', false,
            'style', jsonb_build_object('lineStyle', 'solid'),
            'geometry', jsonb_build_object('headPoint', jsonb_build_object('x', -11050, 'y', -800), 'tailPoint', jsonb_build_object('x', -10400, 'y', -3250)),
            'parameters', jsonb_build_object('anchorId', 'A1', 'angleDeg', -15, 'planLengthMm', 2535, 'freeLengthMm', 1800, 'bondLengthMm', 735, 'designLoadKn', 400, 'lockOffLoadKn', 320, 'stage', 'Stage 1'),
            'metadata', jsonb_build_object('associatedWallId', 'SW-01', 'installationStage', 'Stage 1', 'notes', ''),
            'createdAt', '2026-04-25T00:00:00.000Z',
            'updatedAt', '2026-04-25T00:00:00.000Z'
          ),
          jsonb_build_object(
            'id', 'production-service-run',
            'type', 'service_run',
            'layerId', 'services',
            'name', 'Existing Water Service',
            'visible', true,
            'locked', false,
            'style', jsonb_build_object('lineStyle', 'solid', 'textSize', 220),
            'geometry', jsonb_build_object('path', jsonb_build_array(
              jsonb_build_object('x', -11900, 'y', 700),
              jsonb_build_object('x', -9700, 'y', 700),
              jsonb_build_object('x', -7600, 'y', 1000)
            )),
            'parameters', jsonb_build_object('serviceId', 'W-EX-01', 'serviceType', 'water', 'status', 'existing', 'diameterMm', 150, 'depthM', 1.2, 'levelRl', 10.8, 'authority', 'Sydney Water'),
            'metadata', jsonb_build_object('sourceReference', 'DBYD / survey pickup', 'surveyConfidence', 'approximate', 'notes', ''),
            'createdAt', '2026-04-25T00:00:00.000Z',
            'updatedAt', '2026-04-25T00:00:00.000Z'
          ),
          jsonb_build_object(
            'id', 'production-service-crossing',
            'type', 'service_crossing',
            'layerId', 'services_conflicts',
            'name', 'Service Crossing SC-01',
            'visible', true,
            'locked', false,
            'style', jsonb_build_object('textSize', 220),
            'geometry', jsonb_build_object('crossingPoint', jsonb_build_object('x', -9700, 'y', 700)),
            'parameters', jsonb_build_object('crossingId', 'SC-01', 'serviceType', 'water', 'conflictType', 'crosses_anchor', 'clearanceMm', 450, 'riskStatus', 'reviewed'),
            'metadata', jsonb_build_object('linkedServiceRunId', 'production-service-run', 'linkedObjectId', 'production-anchor-01', 'notes', ''),
            'createdAt', '2026-04-25T00:00:00.000Z',
            'updatedAt', '2026-04-25T00:00:00.000Z'
          ),
          jsonb_build_object(
            'id', 'production-borehole',
            'type', 'borehole',
            'layerId', 'boreholes',
            'name', 'Borehole BH-01',
            'visible', true,
            'locked', false,
            'style', jsonb_build_object('textSize', 220),
            'geometry', jsonb_build_object('point', jsonb_build_object('x', -12100, 'y', -2600)),
            'parameters', jsonb_build_object('boreholeId', 'BH-01', 'label', 'BH-01', 'groundLevelRl', 12.9, 'terminationDepthM', 18, 'terminationLevelRl', -5.1, 'boreholeType', 'geotech'),
            'metadata', jsonb_build_object('linkedGeotechEntityId', '', 'sourceReference', 'Geotech factual report', 'notes', ''),
            'createdAt', '2026-04-25T00:00:00.000Z',
            'updatedAt', '2026-04-25T00:00:00.000Z'
          ),
          jsonb_build_object(
            'id', 'production-monitoring-point',
            'type', 'monitoring_point',
            'layerId', 'monitoring',
            'name', 'Monitoring Point MP-01',
            'visible', true,
            'locked', false,
            'style', '{}'::jsonb,
            'geometry', jsonb_build_object('point', jsonb_build_object('x', -7400, 'y', -2600)),
            'metadata', jsonb_build_object('pointId', 'MP-01', 'monitoringType', 'vibration', 'notes', ''),
            'createdAt', '2026-04-25T00:00:00.000Z',
            'updatedAt', '2026-04-25T00:00:00.000Z'
          ),
          jsonb_build_object(
            'id', 'production-section',
            'type', 'section_marker',
            'layerId', 'sections',
            'name', 'Section A-A',
            'visible', true,
            'locked', false,
            'style', jsonb_build_object('textSize', 220),
            'geometry', jsonb_build_object('startPoint', jsonb_build_object('x', -11600, 'y', -3800), 'endPoint', jsonb_build_object('x', -8000, 'y', -3800)),
            'parameters', jsonb_build_object('sectionId', 'A-A', 'sectionLabel', 'A', 'sheetReference', 'S-101', 'arrowDirection', 'both'),
            'metadata', jsonb_build_object('linkedDrawingId', '', 'notes', ''),
            'createdAt', '2026-04-25T00:00:00.000Z',
            'updatedAt', '2026-04-25T00:00:00.000Z'
          )
        ),
        true
      ),
      '{drawingSheets,0,viewport,center}',
      jsonb_build_object('x', -9700, 'y', -1200),
      true
    ),
    '{drawingSheets,0,scaleLabel}',
    to_jsonb('1:100'::text),
    true
  ),
  updated_at = now()
WHERE kind = 'model'
  AND status <> 'archived'
  AND title = 'Project Model - Shoring Plan'
  AND NOT EXISTS (
    SELECT 1
    FROM jsonb_array_elements(coalesce(model_json->'objects', '[]'::jsonb)) AS existing_objects(object_entry)
    WHERE object_entry->>'id' = 'production-secant-wall'
  );
