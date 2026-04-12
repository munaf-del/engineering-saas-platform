# Legacy Multi‑Pile Source Map

## Purpose

This document maps the legacy multi-pile calculator into a set of migration-friendly domains.  
It is intended for Codex work inside the SaaS repo.

Use it together with:

- `saas-review.md`
- `first-slice-plan.md`

---

## 1. Canonical legacy references

Use these legacy artifacts in this order:

### 1. Runtime / feature oracle
- `Multi-Pile_Load_Calculator_v102c_pricing_print_safe_backup102c_printfix.html`
- `Multi-Pile_Load_Calculator_v102c_pricing_print_safe_backup102c.html`

These are the best stable references for:
- pricing summary logic
- pricing XLSX export logic
- late-stage report/pricing behavior
- current authored workflow shape

### 2. Navigation / refactor oracle
- `Multi-Pile_Load_Calculator_v102c_modular_cleanup_base.html`
- `v102c_modular_assets/MODULE_MAP.md`
- `Multi-Pile_Load_Calculator_v102c_modular_cleanup_README.md`

These are the safest references for:
- tab/screen layout
- runtime section boundaries
- extraction order
- safe modularisation

### 3. Report / evidence oracle
- `ASHMORE BUILDING G & H — Design Note.pdf`

Use this for:
- actual report structure
- section ordering
- envelope / ARR / GEO / STRUCT output expectations
- naming and provenance expectations

### 4. Earlier stable structural basis reference
- `Multi-Pile_Load_Calculator_v89_structural_library_normalization.html`

Use this only when you need to understand the structural-library split that happened before the late v102c cleanup path.

### 5. Geotechnical source / project seed reference
- `221715.00.R.007.Rev1.GI_Phase6 (1).pdf`

Use this for:
- Ashmore project geology
- geotechnical unit names
- indicative geotechnical parameters
- project seed context

---

## 2. Current modular shell shape

The modular cleanup base externalized CSS and JS from the inline HTML into:

- `v102c_modular_assets/app.css`
- `v102c_modular_assets/app.bundle.js`

while keeping the DOM and runtime behavior unchanged.

That modular shell keeps the working calculator structure visible without requiring another risky solver rewrite.

---

## 3. Top-level workflow

The legacy calculator follows this authored chain:

1. project specifics
2. pile type registry
3. joint / node authoring
4. auto-generated piles
5. load pattern library
6. joint-load assignments
7. load combination library
8. load-engine envelope generation
9. ARR / φg derivation
10. GEO strength checks
11. STRUCT checks
12. report / pricing outputs

A full report example states the trace explicitly as:

> project references → raw joint inputs → load patterns and combinations → governing pile actions → geotechnical and structural checks

---

## 4. Main UI tabs

The stable late calculator exposes **seven** main tabs:

1. **Project Specifics**
2. **Pile Types**
3. **Load Engine**
4. **ARR / φg**
5. **GEO Strength**
6. **Structural Design**
7. **Report Outputs**

These tabs are already close to the domain boundaries the SaaS migration should use.

---

## 5. Domain map

## 5.1 Project specifics / metadata

Owns:

- project identity
- project number
- client
- address
- status
- coordinates / map search override
- notes
- logo
- report metadata
- project references
- project structural default libraries
- project geotechnical materials
- project geotechnical basis / global notes

### Why it matters
This is the authored **design basis** and should become the SaaS `ProjectDesignBasis` aggregate.

---

## 5.2 Pile type library

Owns the lightweight type registry:

- type ID
- display name
- nominal diameter / custom diameter
- out-of-position eccentricity (`eoop`)
- active flag
- ordering

### Why it matters
This is not the full solver model. It is the type registry that other tabs resolve against.

---

## 5.3 Joints / nodes

Owns:

- joint ID
- global coordinates
- support count
- assigned pile type
- auto-generated linked pile rows

### Important behavior
Piles are not authored separately first.  
They are generated from joint definitions and support counts.

---

## 5.4 Load patterns

Owns:

- pattern ID
- load type
- reversible flag
- enabled flag

The load engine maps pattern types back into the existing AS/NZS action buckets.

---

## 5.5 Joint load assignments

Owns the matrix:

- joint × pattern × (P, Vx, Vy, Mx, My, Mz)

### Important behavior
Every joint exposes every pattern.  
Loads are authored at the **joint** level, not the pile level.

---

## 5.6 Load combination library

Owns:

- built-in combinations
- custom combinations
- linear combinations
- envelope combinations
- enabled / disabled state
- include-in-envelope state
- source metadata
- expression summary

This is one of the first-class authored domains missing in the SaaS today.

---

## 5.7 ARR / φg workflow

Owns:

- Table 4.3.2(A) individual risk ratings
- weighting factors
- ARR total
- low/high redundancy selection
- φgb
- testing type
- tested percentage `p`
- intrinsic test factor `φtf`
- testing benefit factor `K`
- adopted `φg`

This is authored workflow state, not a one-off calculation input.

---

## 5.8 GEO workflow

### Inputs resolved from:
- project geotechnical material library
- type-level geotechnical mapping
- global geo notes/basis
- governing load-engine actions
- ARR / φg

### Outputs include:
- design compression capacity
- uplift capacity
- adopted socket length
- solved socket length
- redundancy
- base resistance inclusion
- compression utilization
- uplift utilization
- per-type and all-piles GEO summaries

### Notes
The later fixes in the v94–v101 range were mainly about:
- target selection
- stale display state
- per-type GEO refresh
- correct use of resolved foundation material data

Use late v102c or modular base as reference, not the broken intermediate experiments.

---

## 5.9 STRUCT workflow

### Inputs resolved from:
- project structural default libraries
- type-owned detailing and geometry
- governing load-engine actions

### Outputs include:
- material and section properties
- axial and bending checks
- shear checks
- P–M interaction views
- reinforcement section sketch
- reinforcement elevation schematic
- pile schedule summaries

The full report sample clearly shows structural outputs grouped by:
- material/section properties
- axial/bending
- shear
- visuals
- pile schedule

---

## 5.10 Report outputs

The calculator has at least two report families:

### Technical report path
- full report
- summary preview
- plain text
- AI prompt

### Estimator / pricing path
- pricing summary preview
- pricing XLSX export
- later section/elevation visuals for estimators
- pricing print/PDF experiments

### Important rule
Pricing outputs are **separate** from the technical report path and should stay separate in the SaaS.

---

## 6. Core data flow

## 6.1 Upstream authoring flow

```text
Project basis
→ Pile types
→ Joints
→ Generated piles
→ Load patterns
→ Joint load matrix
→ Combination library
→ Governing envelopes
```

## 6.2 Downstream verification flow

```text
Governing envelopes
→ ARR / φg
→ GEO checks
→ STRUCT checks
→ Full report / pricing outputs
```

---

## 7. Key runtime assumptions

These behaviors matter for migration parity:

1. **Loads are authored per joint**
   - not per generated pile

2. **Piles are generated from joints**
   - based on support count and type assignment

3. **Combinations are authored against patterns**
   - not flat global load-case arrays

4. **Envelopes are the parity hinge**
   - GEO and STRUCT depend on the governing envelopes

5. **Project specifics resolve into later tabs**
   - structural and geotechnical tabs consume upstream authored defaults and libraries

6. **Report outputs are read models**
   - they should consume built report data, not drive solver state

---

## 8. Safe extraction order

The modular cleanup README and module map recommend extracting in this order:

1. helpers + repository
2. project specifics / workspace
3. load engine + combinations
4. geotechnical runtime
5. structural runtime
6. report + pricing outputs
7. boot / event wiring

That order is still the safest path.

---

## 9. Internal section markers from the modular bundle

The modular bundle identified these major blocks:

- helpers
- project repository / storage abstraction
- occupancy ψ presets
- ARR items
- φg vs ARR
- UI init
- derived reinforcement-length logic
- elevation / longitudinal schematic SVG
- combo library UI
- combo editor modal
- multi-pile registers
- load engine
- calculation CRUD
- project dashboard
- geo strength
- geo check
- report outputs
- full report generation
- live recalculation
- wire events
- structural design

This is the best available internal map for controlled extraction.

---

## 10. Report structure learned from the full report sample

The full report sample demonstrates the section order the legacy app expects:

1. project information
2. design basis
3. load patterns and combinations
4. ARR / φg derivation
5. project-wide governing ULS actions
6. per-type chapters
   - type overview
   - linked piles / joints
   - input loads
   - derived governing actions
   - geotechnical check
   - structural check
7. appendices / schedule style outputs

This is useful when later rebuilding report APIs in the SaaS.

---

## 11. Pricing summary structure learned from the v102c pricing path

The pricing summary logic builds an estimator-facing view from `buildReportData()` and includes:

### Per pile schedule
- pile ID
- parent joint
- pile type
- diameter
- concrete grade
- cover
- reinforcement details
- socket / founding material
- adopted socket length
- cage length
- structural section

### Type quantity summary
- pile type
- count
- diameter
- concrete grade
- reinforcement details
- typical socket material
- typical adopted socket length

### Visual type summary
- section sketch
- reinforcement elevation
- compact type metadata

This is separate from standards-heavy technical reporting.

---

## 12. Recommended migration usage

When Codex works in the SaaS repo, use this document as the “what exists in legacy” map.

### Use the legacy calculator for:
- domain truth
- parity checking
- workflow order
- field naming
- report shape
- pricing output shape

### Do not copy directly:
- browser storage
- print-window hacks
- DOM-coupled tab state
- experimental broken versions
- fallback-heavy migration branches as permanent logic

---

## 13. Immediate conclusion

For migration purposes, the **single most important upstream dependency** is:

- **load patterns**
- **joint loads**
- **combination library**
- **governing envelope snapshot**

That is the dependency chain both GEO and STRUCT sit on top of.

