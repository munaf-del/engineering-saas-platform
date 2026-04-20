# SaaS Review — Multi‑Pile Migration

## Purpose

This note translates the earlier architecture review into a working migration brief for Codex. It assumes:

- the **legacy calculator** remains the parity oracle
- the **existing engineering SaaS** is the long-term home
- the best first delivery is a **thin but real vertical slice**, not a full rewrite

---

## 1. Executive summary

The existing SaaS already has the right **macro-boundaries** for the migration:

- **UI / web app** in `apps/web`
- **API / orchestration / persistence** in `apps/api`
- **deterministic engineering execution** in `apps/calc-engine`
- **shared contracts / schemas** in `packages/shared`

The main issue is **not** service layout.  
The issue is that the legacy multi-pile calculator is built around a richer **authored design aggregate** than the current SaaS request/response model.

### Recommendation

Use this migration spine:

- **Project**
- **PileGroup**
- **CalculationRun**
- **CalculationSnapshot**
- **CalculationReport**

Do **not** start from the generic “new calculation” form.  
Instead, evolve the SaaS around a project-scoped **multi-pile authoring model**.

---

## 2. Why the legacy calculator does not map 1:1 into the current SaaS

The legacy calculator is not just a set of formulas. It is an authored workflow with these coupled domains:

1. project identity / report metadata / references
2. structural default libraries
3. geotechnical material libraries
4. pile type registry
5. joints / nodes
6. generated pile register
7. load pattern library
8. joint load assignments
9. combination library
10. ARR / φg workflow
11. GEO workflow
12. STRUCT workflow
13. report and pricing outputs

The current SaaS can already host calculations, projects, and reports, but it does not yet have a first-class domain model for that whole authored pile workflow.

---

## 3. Best current SaaS fit

### 3.1 Existing layers that are already useful

These are the most relevant SaaS areas to reuse:

- `projects.service.ts`
- `standards.service.ts`
- `pile-groups.service.ts`
- `load-cases.service.ts`
- `load-combinations.service.ts`
- `calculators.service.ts`
- `orchestration.service.ts`
- `snapshot.service.ts`
- `reports.service.ts`
- `geotech.service.ts`
- `materials.service.ts`
- `pile-capacity.service.ts`

On the frontend, the best existing routes/components to extend are the:

- project page
- pile-groups page
- pile-group editor

### 3.2 Best aggregate for the first migration

For the **first migration pass**, the best fit is:

- **Project** as the business shell
- **PileGroup** as the authored calculator aggregate
- **CalculationRun / CalculationSnapshot** as immutable execution history
- **CalculationReport** as persisted report outputs

### 3.3 Practical interpretation

For phase 1, it is acceptable to store the authored multi-pile state in **validated JSON** under `PileGroup.metadata`, rather than prematurely normalizing every sub-table.

That metadata should eventually cover:

- pile types
- joints
- generated piles
- load patterns
- joint loads
- combination library
- ARR assessment
- GEO type settings
- STRUCT type settings
- project design basis / references / default libraries

---

## 4. What should be added to the SaaS domain

## 4.1 New project-level aggregate

Add a project-scoped aggregate such as:

- `ProjectDesignBasis`

Suggested responsibilities:

- project references
- report metadata
- structural defaults
- geotechnical library
- geotechnical basis / global notes
- migration seed provenance

This mirrors the legacy calculator’s **Project Specifics** tab.

## 4.2 PileGroup as the calculator authoring home

Use `PileGroup` for authored pile data:

- pile type definitions
- joints / node coordinates
- support counts
- pile generation rules
- load-pattern library
- joint-load matrix
- combination library
- selected active type / joint view state (if needed)

## 4.3 Run/snapshot/report separation

Keep the current SaaS pattern where:

- authored state is editable
- runs are immutable
- snapshots are execution evidence
- reports are generated artifacts

That is important because the legacy calculator mixes authoring, solving, and reporting in one browser runtime.

---

## 5. Shared schema direction

Eventually add dedicated shared schemas for:

- `project-reference`
- `project-design-basis`
- `structural-default-library`
- `geotechnical-material`
- `pile-type-definition`
- `joint`
- `generated-pile`
- `load-pattern`
- `joint-load-matrix`
- `combination-library`
- `arr-assessment`
- `type-geo-settings`
- `type-struct-settings`
- `multi-pile-envelope-snapshot`
- `multi-pile-report`

For the first slice, do not normalize all of them.  
Define shared **TypeScript / Zod / API contracts** first, even if the initial DB persistence is still JSON-backed.

---

## 6. What belongs in Python vs web/API

## 6.1 Keep in Python (`apps/calc-engine`)

The deterministic engineering logic should live in Python:

- load combination expansion
- envelope generation
- governing-action selection
- ARR / φg calculation
- GEO strength calculation
- STRUCT calculation
- report-data assembly helpers once stabilized

## 6.2 Keep in web/API

The following are not engine concerns:

- tab state
- editors / modals / register tables
- import / export plumbing
- Word / PDF / XLSX browser generation
- visual sketches / section drawings
- pricing preview HTML

## 6.3 Hybrid boundary

The API should orchestrate:

1. validate authored state
2. call calc-engine
3. persist run + snapshot
4. expose report-friendly read models

---

## 7. Missing gaps in the current SaaS

The review identified these real gaps:

1. **No project-level design-basis aggregate**
   - there is no clear place for project references, structural defaults, geotechnical library, and report metadata

2. **No real multi-pile authoring model**
   - current pile group modelling is still too light for the legacy workflow

3. **Load contracts are too flat**
   - current contracts expect flat inputs, not authored `joint × pattern` data

4. **No first-class combination library abstraction**
   - built-in vs custom vs envelope inclusion need their own model

5. **ARR has no SaaS home**
   - it is not yet a persisted authored state

6. **Report pipeline is too thin**
   - current reports are much smaller than the legacy sectioned justification and pricing outputs

7. **Verification snapshots are too coarse**
   - the legacy app reports per-type and per-joint provenance, not just a single run summary

8. **Full import/export models are missing**
   - especially for full calculator JSON and joint-load CSV/XLSX

9. **The current web calculation page is not the migration target**
   - the future migrated calculator should live on the pile-group editor route, not on the generic submit-calc page

---

## 8. Target architecture

## 8.1 Short-term target

### Project

Owns:

- project metadata
- client / address / report identity
- references
- design-basis aggregate

### PileGroup

Owns:

- multi-pile authored model
- pile types
- joints
- load patterns
- joint loads
- combinations
- ARR authored data
- GEO / STRUCT authored settings

### CalculationRun / CalculationSnapshot

Own:

- run request
- deterministic result payload
- governing envelopes
- audit trail

### CalculationReport

Owns:

- full technical report
- pricing summary
- export metadata

## 8.2 Long-term target

As the migration matures, move from JSON-backed metadata toward normalized tables only where:

- querying becomes important
- cross-project reuse matters
- permissions / audit demands it

Do **not** normalize everything at once.

---

## 9. Recommended migration phases

## Phase 1 — domain model + first authored slice

Move first:

- load patterns
- joint-load matrix
- built-in/custom combinations
- envelope snapshot

## Phase 2 — project design basis

Move:

- project references
- report metadata
- structural default libraries
- geotechnical library
- geo basis / notes

## Phase 3 — pile authoring model

Move:

- pile type definitions
- joints
- generated piles
- linkage rules

## Phase 4 — GEO + STRUCT parity

Move:

- type geo input resolution
- GEO solver parity
- structural input resolution
- STRUCT parity

## Phase 5 — reports and exports

Move:

- full report data assembly
- pricing summary
- JSON / XLSX / PDF export services

---

## 10. Best first slice

The best first implementation slice is:

- **load patterns**
- **joint loads**
- **built-in / custom combinations**
- **joint envelope snapshot**

### Why this slice first

Because it:

- is upstream of both GEO and STRUCT
- maps cleanly to existing SaaS concepts
- gives a clear parity target against the legacy HTML
- avoids premature geotechnical/structural migration
- creates the authored state model the rest of the system needs

### Hard parity target

Before touching GEO or STRUCT, the SaaS should be able to reproduce the same governing envelope outputs as the legacy app for:

- `Nmax`
- `Nmin`
- `Vx`
- `Vy`
- `Mx`
- `My`

plus the governing combination provenance.

---

## 11. What not to migrate directly

The following should not be copied into the SaaS as-is:

- browser `localStorage` repository logic
- browser-only print / Word / XLSX plumbing
- one-time migration fallback branches
- HTML-only view helpers
- DOM-driven runtime state coupling

Treat these as:

- reference behavior
- migration compatibility logic
- temporary adapters

—not as permanent domain code.

---

## 12. Immediate next action for Codex

Create the first slice implementation plan in the SaaS repo:

1. shared schema for joints / patterns / joint loads / combinations / envelope snapshot
2. Prisma + persistence for JSON-backed authored state
3. API route/service to save and run this slice
4. calc-engine module for envelope evaluation
5. frontend editor route for:
   - joints
   - patterns
   - joint loads
   - combinations
   - results snapshot

---

## 13. Decision

**Do not move everything into the SaaS yet.**  
Move the **first slice** into the SaaS now, using the legacy calculator as the parity oracle.
