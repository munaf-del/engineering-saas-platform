# ADR 007: Licensed/Internal Data Ingestion Workflow

## Status

Accepted

## Context

The platform requires data from licensed standards (e.g., structural material properties, steel section catalogues, rebar sizes, load combination rules, pile design rules). These files contain proprietary data that must never be stored in the repository.

## Decision

### Safe Local Path Workflow

1. **Licensed data files are never committed to the repository.** The `.gitignore` protects `data/local-imports/`, `data/staging/`, and files matching `*.licensed.*`.

2. **Administrators prepare files locally** at `data/local-imports/` or any local path. The repository provides only placeholder template files under `scripts/templates/`.

3. **Expected input files:**
   - `structural_materials.csv` — Material families and grades
   - `geotechnical_materials.csv` — Geotech parameter sets
   - `steel_sections.csv` — Steel section catalogues
   - `rebar_sizes.csv` — Rebar bar size catalogues
   - `standards_registry.csv` — Standards and edition metadata
   - `load_combination_rules.yaml` — Load combination factors and rules
   - `pile_design_rules.yaml` — Pile design reduction factors and methods

### Ingestion Flow

```
Local File → Admin Upload (UI or API) → Parse → Validate → Dry-run/Diff
  → Submit for Approval → Admin Review (diff preview, errors)
  → Approve / Reject → Activate → Versioned Snapshot Created
```

### Validation Requirements

Every import must include:
- **Standard code** (which standard the data comes from)
- **Edition** (which edition/year)
- **Source dataset identifier** (traceability to the licensed source)
- **Effective date** (when the data becomes valid)

Missing metadata fails the import loudly — no silent corrections.

### Approval Workflow

- Validated imports can be submitted for admin approval
- Admins review the diff preview and validation results
- Approval is explicit and auditable (stored in `import_approvals`)
- Only approved imports can be activated
- Rule-pack imports that conflict with active packs are rejected

### Rule-Pack Integration

- YAML rule files map to `StandardRulePack` entities
- Approved rule packs must be explicitly activated
- The calc-engine resolves activated rule packs at calculation time
- Calculation snapshots capture the exact rule-pack version used
- Missing rules cause calculation failures, not guesses

### Rollback

- Applied imports can be rolled back, deleting created snapshots
- Rule-pack activations can be deactivated independently

## Consequences

- Raw licensed files never enter version control
- All data changes are traceable through the import/approval audit trail
- Rule-pack versioning prevents accidental data corruption
- Engineers can trust that calculations use explicitly approved data

## API Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/imports/upload` | Upload and validate file |
| POST | `/imports/:id/submit-for-approval` | Submit for admin review |
| POST | `/imports/:id/approve` | Approve import |
| POST | `/imports/:id/reject` | Reject import |
| POST | `/imports/:id/activate` | Activate approved import |
| POST | `/imports/:id/apply` | Apply (for non-rule-pack types) |
| POST | `/imports/:id/rollback` | Rollback applied import |
| GET | `/imports/:id/approvals` | Get approval history |
| GET | `/imports/rule-packs/active` | List active rule packs |
| POST | `/imports/rule-packs/:id/activate` | Activate a rule pack |
| POST | `/imports/rule-packs/:id/deactivate` | Deactivate a rule pack |

## Frontend Routes

| Route | Purpose |
|-------|---------|
| `/imports` | Import history with upload dialog |
| `/imports/:id` | Import detail with approval/reject/activate |
| `/rule-packs` | Active rule-pack management |
