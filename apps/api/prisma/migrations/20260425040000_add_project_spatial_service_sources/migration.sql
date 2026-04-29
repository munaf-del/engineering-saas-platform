-- Add explicit project service/utility feature types for source-linked Drafting objects.
ALTER TYPE "ProjectSpatialFeatureType" ADD VALUE IF NOT EXISTS 'service_run';
ALTER TYPE "ProjectSpatialFeatureType" ADD VALUE IF NOT EXISTS 'service_crossing';
