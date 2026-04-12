# First Slice Plan — Load Patterns, Joint Loads, Combinations, Envelope Snapshot

## Goal

Build the **first real SaaS migration slice** for the multi-pile calculator:

- load pattern library
- joints / node authoring
- joint load assignments
- built-in/custom combination library
- governing envelope snapshot

This slice should be implemented **inside the existing SaaS repo**, not as another standalone HTML calculator.

---

## 1. Why this slice first

This is the best first slice because it:

- is upstream of both GEO and STRUCT
- gives a clean parity target against the legacy calculator
- avoids the hardest geotechnical/structural migration first
- creates the authored data shape the rest of the migration needs
- fits well inside existing SaaS boundaries

If this slice is wrong, every later GEO / STRUCT / report output will drift.

---

## 2. In scope

### 2.1 Authoring
- pile-group level joint / node register
- support count per joint
- pile type assignment per joint
- load pattern library
- joint-load matrix

### 2.2 Combination engine
- built-in combinations
- custom linear combinations
- envelope inclusion flag
- enabled/disabled state
- combination provenance fields

### 2.3 Results
- per joint governing envelope values:
  - `Nmax`
  - `Nmin`
  - `Vx`
  - `Vy`
  - `Mx`
  - `My`
- governing combination ID / source / expression summary
- latest run + snapshot persistence

### 2.4 Basic UI
A minimal migrated multi-pile page/route that allows a user to:

- create/edit joints
- create/edit patterns
- edit joint loads
- view combination library
- run envelope calculation
- view governing results

---

## 3. Out of scope

Do **not** implement yet:

- project references editor
- structural default libraries
- geotechnical material library
- ARR / φg
- GEO checks
- STRUCT checks
- technical report builder
- pricing summary
- PDF / Word / XLSX export
- fancy visuals / sketches
- browser-only print workflows

Keep this slice narrow.

---

## 4. Legacy parity target

The legacy calculator’s upstream chain is:

```text
joints
→ load patterns
→ joint load assignments
→ combinations
→ governing envelopes
```

The SaaS slice is done when it can reproduce the same envelope outputs as the legacy app for a fixed test fixture:

- `Nmax`
- `Nmin`
- `Vx`
- `Vy`
- `Mx`
- `My`

and also report:

- governing combination name
- source (built-in/custom)
- governing joint
- pile type / representative pile reference

---

## 5. Target SaaS domain model

## 5.1 Project shell
Reuse existing `Project`.

No heavy schema changes are required yet beyond linking the migrated authored state.

## 5.2 PileGroup as authored aggregate
For the first pass, store the authored multi-pile state in `PileGroup.metadata` with schema validation.

Suggested metadata root:

```json
{
  "multiPile": {
    "version": 1,
    "pileTypes": [],
    "joints": [],
    "generatedPiles": [],
    "loadPatterns": [],
    "jointLoads": [],
    "combinationLibrary": [],
    "uiState": {}
  }
}
```

### Note
`generatedPiles` may be persisted or derived.  
For phase 1, derivation is acceptable if it is deterministic.

---

## 6. Suggested shared schemas

These can live in `packages/shared`.

## 6.1 Pile type
```ts
type PileTypeDefinition = {
  id: string;
  displayName: string;
  nominalDiameterMm: number;
  eoopM?: number;
  active: boolean;
  order: number;
};
```

## 6.2 Joint
```ts
type MultiPileJoint = {
  id: string;
  displayName?: string;
  x: number;
  y: number;
  z: number;
  supportCount: number;
  pileTypeId: string;
  active: boolean;
  order: number;
};
```

## 6.3 Generated pile
```ts
type GeneratedPile = {
  id: string;
  parentJointId: string;
  supportIndex: number;
  pileTypeId: string;
};
```

## 6.4 Load pattern
```ts
type LoadPattern = {
  id: string;
  displayName: string;
  patternType: "Permanent" | "Imposed" | "Wind" | "Earthquake" | "Groundwater" | "Other";
  reversible: boolean;
  enabled: boolean;
  order: number;
};
```

## 6.5 Joint load row
```ts
type JointLoadRow = {
  jointId: string;
  patternId: string;
  p: number;
  vx: number;
  vy: number;
  mx: number;
  my: number;
  mz: number;
};
```

## 6.6 Combination library row
```ts
type CombinationTerm = {
  patternId: string;
  factor: number;
};

type CombinationRow = {
  id: string;
  displayName: string;
  source: "built-in" | "custom";
  kind: "linear" | "envelope";
  enabled: boolean;
  includeInEnvelope: boolean;
  reversibleAware?: boolean;
  terms?: CombinationTerm[];
  childCombinationIds?: string[];
  expressionSummary?: string;
  order: number;
};
```

## 6.7 Envelope snapshot
```ts
type GoverningEnvelopeValue = {
  value: number;
  combinationId: string;
  combinationName: string;
  source: "built-in" | "custom";
};

type JointEnvelopeSnapshot = {
  jointId: string;
  pileTypeId: string;
  representativePileId?: string;
  activePatternIds: string[];
  nMax: GoverningEnvelopeValue;
  nMin: GoverningEnvelopeValue;
  vx: GoverningEnvelopeValue;
  vy: GoverningEnvelopeValue;
  mx: GoverningEnvelopeValue;
  my: GoverningEnvelopeValue;
};
```

---

## 7. Persistence plan

## 7.1 Phase 1 persistence
Keep authored state in `PileGroup.metadata` with validation.

### Why
- fastest path
- least risky
- aligns with review recommendation
- avoids premature table explosion

## 7.2 Persist runs separately
Reuse existing `CalculationRun` / `CalculationSnapshot` pattern.

Suggested snapshot contents:

```json
{
  "multiPileEnvelope": {
    "jointResults": [],
    "projectSummary": {}
  }
}
```

This makes later GEO / STRUCT phases easier because they can consume a persisted envelope snapshot instead of recalculating from browser state.

---

## 8. Backend implementation shape

## 8.1 API layer
Add API endpoints/service methods for:

- get pile-group multi-pile state
- save pile-group multi-pile state
- run envelope calculation
- get latest envelope snapshot

## 8.2 Calc-engine
Add a focused Python engine module for this slice only.

Suggested files:

- `multi_pile_loads.py`
- `multi_pile_combinations.py`
- `multi_pile_envelopes.py`

### Responsibilities
- normalize pattern library
- expand built-in combinations
- evaluate custom combinations
- compute joint envelopes
- return governing provenance

## 8.3 No GEO/STRUCT logic yet
Do not import geotechnical or structural rules into this slice.

---

## 9. Frontend route

## 9.1 Use the pile-group editor route
Do not use the generic “new calculation” page.

Create or extend a pile-group editor based route with a multi-pile shell.

## 9.2 First page layout
Minimal tabs or sections:

1. **Pile Types**
2. **Joints**
3. **Load Patterns**
4. **Joint Loads**
5. **Combinations**
6. **Envelope Results**

This is enough for phase 1.

---

## 10. Built-in combination strategy

## 10.1 Store built-ins explicitly
Do not hardcode them only in UI.

Have a clear built-in registry produced by the backend or shared module.

Each built-in row should include:

- stable ID
- display name
- expression summary
- source = built-in
- enabled default
- include-in-envelope default

## 10.2 Custom combinations
Allow the user to add/edit custom combinations, but only within the same schema as built-ins.

No separate custom-only engine path.

---

## 11. Pile generation rule

The legacy app auto-generates piles from joints.

For phase 1, keep the same rule:

- each joint has a `supportCount`
- each support becomes a generated pile row
- generated pile ID = deterministic format based on joint ID + support index

That allows later GEO / STRUCT reporting to remain compatible.

---

## 12. Parity test set

## 12.1 Minimum golden tests
Before merging, create a small parity fixture with:

1. one joint, one type, simple G/Q
2. one joint with reversible patterns
3. multiple joints with different type assignments
4. custom combination added
5. disabled pattern / disabled combination behavior
6. governing envelope provenance check

## 12.2 Hard outputs to compare
Compare SaaS vs legacy on:

- `Nmax`
- `Nmin`
- `Vx`
- `Vy`
- `Mx`
- `My`
- governing combination ID/name/source
- active pattern list

## 12.3 Fixture sources
Use small copied fixtures from the legacy calculator, not a full production project first.

---

## 13. Acceptance criteria

This phase is complete when:

- a user can author pile types, joints, load patterns, joint loads, and combinations in the SaaS
- the system computes governing envelope values per joint
- the latest envelope snapshot is persisted
- the output matches the legacy calculator for the golden fixtures
- changes stay isolated to this slice
- GEO and STRUCT are still untouched

---

## 14. Risks

### Risk 1 — over-scoping
Trying to add ARR, GEO, and STRUCT in the same pass will likely blur the domain boundary.

### Risk 2 — wrong data model
If the first slice is implemented as flat load-case inputs instead of `joint × pattern` authoring, the later migration will drift from legacy behavior.

### Risk 3 — UI-first shortcuts
If logic is implemented only in React/web state, later backend parity will be painful.

### Risk 4 — report-driven design
Do not start with report generation. Start with the envelope engine.

---

## 15. Codex implementation order

Ask Codex to work in this order:

1. plan
2. shared schema/contracts
3. Prisma / persistence updates
4. API services
5. calc-engine slice
6. frontend authoring route
7. parity tests
8. summary of what remains for GEO/STRUCT phase

---

## 16. Recommended prompt to use next

```text
You are working ONLY in the engineering-saas-platform repository.

Read these files first:
- docs/migration/saas-review.md
- docs/migration/legacy-multi-pile-source-map.md
- docs/migration/first-slice-plan.md

Goal:
Implement the first migration slice for the Multi-Pile calculator inside the SaaS platform.

Scope for this slice only:
- load pattern library
- joint load assignments
- built-in/custom load combinations
- governing envelope snapshot
- persistence for that slice
- minimal UI route/page to author and run that slice

Do NOT implement yet:
- full GEO
- full STRUCT
- report builder
- pricing summary
- billing/admin
- unrelated calculators

Constraints:
- preserve existing repo architecture and module boundaries
- keep implementation inside the existing SaaS patterns
- prefer additive changes over rewrites
- create types/schemas first, then API/service layer, then UI
- no placeholder mock logic if a real schema/service can be created cleanly
- keep a clear migration seam for later GEO/STRUCT/report phases

Done when:
- Prisma/domain model for this slice exists
- backend service/API path exists
- frontend page/route exists
- a user can create/edit patterns, joints, joint loads, and combinations
- governing envelope values can be computed and shown
- changes are limited to this repo only

Process:
1. first output a short implementation plan
2. then list exact files to create/change
3. then apply the changes
4. then summarize what remains for phase 2
```

