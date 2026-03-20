# Local Import Staging Directory

This directory is for staging licensed/internal data files before importing them into the platform.

**IMPORTANT: This directory is git-ignored. Files placed here will NOT be committed to the repository.**

## Expected Files

Place your licensed data files here before uploading via the admin UI:

| File | Entity Type | Format |
|------|-------------|--------|
| `structural_materials.csv` | `material` | CSV |
| `geotechnical_materials.csv` | `geotech_parameter` | CSV |
| `steel_sections.csv` | `steel_section` | CSV |
| `rebar_sizes.csv` | `rebar_size` | CSV |
| `standards_registry.csv` | `standards_registry` | CSV |
| `load_combination_rules.yaml` | `load_combination_rules` | YAML |
| `pile_design_rules.yaml` | `pile_design_rules` | YAML |

## Workflow

1. Obtain licensed data files from the appropriate standards body or internal source
2. Place them in this directory
3. Upload via the admin UI at `/imports` or via the API `POST /api/v1/imports/upload`
4. Review the validation results and diff preview
5. For rule-pack files: submit for admin approval, then activate after approval
6. For catalogue files: apply directly or submit for approval first
7. Verify the imported data is correct

## Templates

Placeholder templates are available at `scripts/templates/` for reference on the expected format.

## Safety

- Never commit raw licensed files to the repository
- The `.gitignore` protects this directory and `*.licensed.*` files
- All imports are versioned and auditable
- Rule-pack changes require explicit admin approval and activation
