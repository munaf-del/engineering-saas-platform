# ADR-003: Standards Registry and Licensed Data Handling

**Status:** Accepted
**Date:** 2026-03-20

## Context

Australian engineering standards (AS/NZS series) are copyrighted by Standards Australia. We cannot reproduce verbatim text, tables, figures, or proprietary data (e.g., steel section properties from OneSteel/Liberty catalogues). However, the platform must reference these standards and use their rules in calculations.

## Decision

### Standards Registry (Metadata Only)

The platform maintains a **standards registry** that stores metadata about each standard:

```
StandardEdition {
  id: UUID
  code: string           // e.g. "AS 2159"
  title: string          // e.g. "Piling: design and installation"
  edition: string        // e.g. "2009"
  amendment: string?     // e.g. "Amdt 1 (2010)"
  effective_date: Date
  status: enum           // CURRENT | SUPERSEDED | WITHDRAWN
  source_doc: string     // Reference to licensed document
  note: string?          // Internal usage notes
  rule_pack_id: UUID?    // Link to approved rule pack
}
```

### Rule Packs

Engineering rules (factors, formulae, lookup tables) are encapsulated in **rule packs**:

- A rule pack is a versioned, immutable JSON bundle containing the numerical rules extracted from a licensed standard by a qualified engineer.
- Each rule pack references specific clauses (e.g., `AS 2159 Cl 4.3.1`).
- Rule packs are loaded via an **import pipeline** — never hardcoded.
- The calc-engine refuses to perform a calculation if the required rule pack is not present.

### Import Pipeline

```
Licensed PDF / Internal Data
       ↓
  Manual extraction by qualified engineer
       ↓
  Rule Pack JSON (schema-validated)
       ↓
  Import CLI tool validates and loads into DB
       ↓
  Immutable rule pack stored with version hash
```

### Steel Sections and Rebar Catalogues

- Section properties (e.g., UB, UC, CHS, RHS dimensions and properties) are **not shipped with the codebase**.
- The schema for sections and rebar is defined. Data is loaded via the import pipeline from licensed sources (e.g., Liberty Steel catalogues, InfraBuild data).
- The platform provides an import tool that validates CSV/JSON against the schema and loads into the database.

### Supported Standards (Metadata Pre-seeded)

The following standards have metadata entries in the registry. Rule packs are loaded separately:

- AS/NZS 1170.0:2002 — General principles
- AS/NZS 1170.1:2002 — Permanent, imposed and other actions
- AS/NZS 1170.2:2021 — Wind actions
- AS 1170.4:2024 — Earthquake actions
- AS 3600:2018 — Concrete structures
- AS 4100:2020 — Steel structures
- AS/NZS 4671:2019 — Reinforcing steel
- AS/NZS 3678:2016 — Hot-rolled plates
- AS/NZS 3679.1:2016 — Hot-rolled bars and sections
- AS/NZS 3679.2:2016 — Welded I sections
- AS/NZS 1163:2016 — Cold-formed hollow sections
- AS 2159-2009 — Piling
- AS 1726:2017 — Geotechnical investigations
- AS 1289 series — Soil testing methods
- AS 3798-2007 — Earthworks guidelines

### Safety Rule

**If a numerical factor or engineering rule is not present in an approved rule pack, the calculation engine must return an error — never guess or use a default.**

## Consequences

- No copyrighted content in the git repository.
- Initial deployment requires loading rule packs before calculations work.
- Qualified engineers must review and approve rule packs.
- Standards metadata can be version-controlled; rule pack data cannot.
- The import pipeline needs validation, versioning, and audit trail.
