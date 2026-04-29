CREATE TYPE "AiReportDocumentFamily" AS ENUM (
  'geotechnical',
  'environmental',
  'structural',
  'hydrogeology_dewatering',
  'inspections',
  'temporary_works',
  'other'
);

CREATE TYPE "AiReportType" AS ENUM (
  'geotechnical_investigation',
  'geotechnical_comment',
  'dewatering_management_plan',
  'contamination_assessment',
  'structural_design_report',
  'inspection_report',
  'temporary_works_report',
  'other'
);

CREATE TYPE "AiReportOwnerWorkspace" AS ENUM (
  'project',
  'project_geotechnical',
  'foundations',
  'structural',
  'environmental',
  'inspections',
  'other'
);

ALTER TABLE "ai_documents"
ADD COLUMN "document_family" "AiReportDocumentFamily",
ADD COLUMN "report_type" "AiReportType",
ADD COLUMN "owner_workspace" "AiReportOwnerWorkspace";

UPDATE "ai_documents"
SET
  "document_family" =
    CASE
      WHEN "filename" ~* '(dewater|groundwater|ground water|hydrogeolog|hydrostatic|water management)' THEN 'hydrogeology_dewatering'::"AiReportDocumentFamily"
      WHEN "filename" ~* '(contamin|environmental|remediation|acid sulfate|asbestos)' THEN 'environmental'::"AiReportDocumentFamily"
      WHEN "filename" ~* '(structural|structure)' THEN 'structural'::"AiReportDocumentFamily"
      WHEN "filename" ~* '(inspection|site record|dilapidation|condition survey)' THEN 'inspections'::"AiReportDocumentFamily"
      WHEN "filename" ~* '(temporary works|temp works|working platform)' THEN 'temporary_works'::"AiReportDocumentFamily"
      WHEN "filename" ~* '(geotech|geo[ _-]*investigation|ground investigation|soil report)' THEN 'geotechnical'::"AiReportDocumentFamily"
      ELSE 'other'::"AiReportDocumentFamily"
    END,
  "report_type" =
    CASE
      WHEN "filename" ~* '(dewater|groundwater|ground water|hydrogeolog|hydrostatic|water management)' THEN 'dewatering_management_plan'::"AiReportType"
      WHEN "filename" ~* '(contamin|environmental|remediation|acid sulfate|asbestos)' THEN 'contamination_assessment'::"AiReportType"
      WHEN "filename" ~* '(structural|structure)' THEN 'structural_design_report'::"AiReportType"
      WHEN "filename" ~* '(inspection|site record|dilapidation|condition survey)' THEN 'inspection_report'::"AiReportType"
      WHEN "filename" ~* '(temporary works|temp works|working platform)' THEN 'temporary_works_report'::"AiReportType"
      WHEN "filename" ~* '(geotech|geo[ _-]*investigation|ground investigation|soil report)' AND "filename" ~* '(comment|letter|advice|memo)' THEN 'geotechnical_comment'::"AiReportType"
      WHEN "filename" ~* '(geotech|geo[ _-]*investigation|ground investigation|soil report)' THEN 'geotechnical_investigation'::"AiReportType"
      ELSE 'other'::"AiReportType"
    END,
  "owner_workspace" =
    CASE
      WHEN "filename" ~* '(dewater|groundwater|ground water|hydrogeolog|hydrostatic|water management)' THEN 'environmental'::"AiReportOwnerWorkspace"
      WHEN "filename" ~* '(contamin|environmental|remediation|acid sulfate|asbestos)' THEN 'environmental'::"AiReportOwnerWorkspace"
      WHEN "filename" ~* '(structural|structure)' THEN 'structural'::"AiReportOwnerWorkspace"
      WHEN "filename" ~* '(inspection|site record|dilapidation|condition survey)' THEN 'inspections'::"AiReportOwnerWorkspace"
      WHEN "filename" ~* '(temporary works|temp works|working platform)' THEN 'other'::"AiReportOwnerWorkspace"
      WHEN "filename" ~* '(geotech|geo[ _-]*investigation|ground investigation|soil report)' THEN 'project_geotechnical'::"AiReportOwnerWorkspace"
      ELSE 'project'::"AiReportOwnerWorkspace"
    END;

ALTER TABLE "ai_documents"
ALTER COLUMN "document_family" SET DEFAULT 'other',
ALTER COLUMN "document_family" SET NOT NULL,
ALTER COLUMN "report_type" SET DEFAULT 'other',
ALTER COLUMN "report_type" SET NOT NULL,
ALTER COLUMN "owner_workspace" SET DEFAULT 'project',
ALTER COLUMN "owner_workspace" SET NOT NULL;
