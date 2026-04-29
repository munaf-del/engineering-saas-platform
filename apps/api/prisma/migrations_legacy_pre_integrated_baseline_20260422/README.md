# Legacy Prisma Migration Archive

This directory preserves the historical Prisma migration chain that existed before the integrated baseline reset on 2026-04-22.

It was archived because a fresh `prisma migrate deploy` against an empty database no longer replayed cleanly.

The first known replay failure is:

- migration: `20260411050419_add_environmental_monitoring_reports`
- issue: it references enum `ProjectCnvmpSelectionPurpose` before that enum is created by the later `20260411100000_add_project_cnvmp_builder` migration

The current integrated schema was promoted to the new active baseline migration:

- `apps/api/prisma/migrations/20260422000000_integrated_schema_baseline`

Do not replay the archived migrations in this folder for new local or development databases.
