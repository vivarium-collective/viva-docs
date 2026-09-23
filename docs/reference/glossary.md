# Glossary

Every load-bearing term in one place, with its formal anchor and its legacy synonyms. The
Process Bigraph vocabulary is drawn from Table 1 of Agmon & Spangler, *Process bigraphs and
the architecture of compositional systems biology*; the knowledge vocabulary from the
Investigation Spine framework. Where a term has an older name, it is marked **(legacy:
…)** — the ecosystem is mid-migration and older documents use different words for the same
idea.

Entries are grouped by the layer they belong to. Each links to the chapter that develops it.

---

## Process Bigraph core vocabulary

The formal spine of *what runs*. These are the entries of the paper's core-vocabulary table,
in dependency order.

**Path** *(P)* — a name for a location in the state tree, e.g. `['cell', 'cytoplasm',
'glucose']`. Paths address where a value lives. → [Core concepts](../foundations/core-concepts.md#stores-the-state)

**Type** *(T)* — a declaration of what may be stored at a path: it knows how to produce a
default, serialize, check validity, and — crucially — **apply** a delta. Types compose
(`map[string, float]`, `array[(3|4), float]`, `tree[float]`), carry units, and can inherit.
→ [Schemas, types & state](../compute/schema-types-state.md)

**Value** *(V)* — the concrete datum stored at a path: a molecule count, a concentration
field, the clock reading. → [Core concepts](../foundations/core-concepts.md#stores-the-state)

**Schema** *(Σ : P ⇀ T)* — the map from paths to types; "the typed organizational blueprint
of the system." The separation of schema from state is the central principle — it lets you
validate, reuse, and reason about composition independently of execution. →
[Schemas, types & state](../compute/schema-types-state.md)

**State** *(x : P ⇀ V)* — the map from paths to values: the actual data the model holds at a
moment in time. → [Core concepts](../foundations/core-concepts.md#stores-the-state)

**Store** — a state location that functions as a shared variable. Stores nest hierarchically,
and that nesting *is* the place graph. Processes never talk to each other directly; they read
and write shared stores, and that wiring is the coupling. → [Core concepts](../foundations/core-concepts.md#stores-the-state)

**Process** *(f : (in^τ, …) → (out^τ, …))* — a temporal edge: a mechanism with a typed
interface, defined by what it reads, what it can update, its configuration, and an
**interval**. Its `update(state, interval)` advances dynamics over a span of time (an ODE
solve, an FBA step, a stochastic tick). → [Processes & Steps](../compute/processes-and-steps.md)

**Step** — a reactive edge that declares **no interval**. Its `update(state)` fires when its
inputs are ready — a dataflow rule run to convergence. Emitters, analyses, visualizations, and
report cards are all Steps. → [Processes & Steps](../compute/processes-and-steps.md)

**Delta** *(δ = update(x_in, Δt))* — the typed change a process returns. Processes emit
deltas rather than overwriting state. → [Core concepts](../foundations/core-concepts.md#the-one-semantic-that-makes-it-compose)

**Typed application** *(apply)* *(x′ = apply_τ(x, δ))* — the one law that merges a delta into
shared state through the type's own combination rule: numeric types **accumulate**, others
**set** or **merge**. Because *how* deltas combine is a property of the data type, not the
process, two independently-written processes can write to the same store without knowing about
each other. This is what lets them compose. → [Core concepts](../foundations/core-concepts.md#the-one-semantic-that-makes-it-compose)

**Port** — a single input or output of an edge. A process declares typed input and output
ports; wiring connects them to stores. → [Composites & wiring](../compute/composites-and-wiring.md)

**Wiring** *(W : (process, port) → P)* — the map connecting a process's port to a store path.
Wiring makes every coupling explicit and checkable — it is the link graph. →
[Composites & wiring](../compute/composites-and-wiring.md)

**Place graph** — the containment structure: dict nesting, "cell contains cytoplasm."
Distinct from the link graph (wiring). → [Core concepts](../foundations/core-concepts.md#structure-stores-edges-and-wires)

**Link graph** — the wiring structure: ports connected to store paths. In a *process bigraph*
this is a **process graph** — processes connect to stores via typed ports. →
[Core concepts](../foundations/core-concepts.md#structure-stores-edges-and-wires)

**Type registry** *(R_T)* — the collection of types the engine knows. **Link registry**
*(R_L)* — the map from a process's address to its concrete handler class. Both live on the
`Core`, populated by discovery (no manual registration). → [Schemas, types & state](../compute/schema-types-state.md)

**Core** — the operational registry of types and process classes the engine consults, built
via `allocate_core()`. → [Schemas, types & state](../compute/schema-types-state.md)

**Process bigraph** *(B = (Σ, x, R_T, R_L))* — the typed, executable organization as a whole:
a schema, a state, and the two registries. → [Core concepts](../foundations/core-concepts.md)

**Composite** — a state-tree of typed process and step nodes wired to shared stores; **the
only object the engine actually runs**. A composite is itself a Process (via its bridge), so
composites nest — big models are assembled from small ones by *containment, not
hole-filling*. → [Composites & wiring](../compute/composites-and-wiring.md)

**Bridge** *(bridge : (external port) → P)* — the map that packages a composite's internal
process bigraph as a single higher-level process, wiring its external interface onto internal
store paths. → [Composites & wiring](../compute/composites-and-wiring.md)

**Orchestration** *(⟨B, t, t_next⟩ → ⟨B′, t′, t′_next⟩)* — the scheduling semantics: when
processes run, how their deltas are combined, and how structural rewrites are incorporated
over time. The three patterns are multi-timestepping, workflow (Step DAG), and event-driven
graph rewrite. → [Processes & Steps](../compute/processes-and-steps.md)

**Emitter** — a Step that records wired state each tick into a durable sink (SQLite, Parquet,
XArray). The emitter is a study's durable phase boundary. → [Emitters](../compute/emitters.md)

---

## Document vocabulary: site, fill, ground

The unifying idea — a composite, a template, a study, and an investigation are all the same
kind of typed document, differing in structure, not in execution machinery.

**Document** — a `bigraph-schema`-typed object: a place graph (dict nesting), a link graph
(wiring), and holes (sites). One object, one operation, one law. → [The stack](../foundations/the-stack.md#the-unifying-idea)

**Site** *(legacy: slot, hole)* — a place-graph hole: a slot where a whole composite, process,
or value plugs in. This is Milner's bigraph *site*. A composite refuses to run while any
required site is open. → [Templates & draft processes](../compute/templates-and-draft-processes.md)

**Fill** *(legacy: bind, reify, substitute)* — the one operation on documents: substitute a
value or a sub-composite into a site. Gating a study and binding a template are the same
mechanism. → [Templates & draft processes](../compute/templates-and-draft-processes.md)

**Ground** *(`is_ground`)* — the one law: a document runs iff it has no unfilled required
sites. A **ground** document is runnable; one with open sites is a **template**. →
[Core concepts](../foundations/core-concepts.md#from-documents-to-templates-sites-fill-and-ground)

**Template** — a composite that is not yet ground — it has open sites. A **study template**
fixes the analysis network and leaves the model as a site; an **investigation template** has
one site per member study. → [Templates & draft processes](../compute/templates-and-draft-processes.md)

**Draft process** — a template idea applied to one process: a `DraftProcess` declares a
contract (its ports plus a description of the transformation it is *meant* to perform) but
carries **no dynamics**. Stepped, it stays inert and never fabricates behavior; it shows in
the dashboard marked `DRAFT`. Distinct from a site: a draft process is an inert *node*, a site
is an empty *hole*. → [Templates & draft processes](../compute/templates-and-draft-processes.md)

!!! note "Legacy vocabulary"
    Design documents from mid-2026 use **slot / bind / reify** for what are now **site / fill
    / ground**. The unified-architecture plan renamed and narrowed these terms and explicitly
    retired *slot, bind, reify, gate evaluator, barrier, phase, flush engine*. Prefer site /
    fill / ground; treat the older words as synonyms when you meet them.

---

## Knowledge vocabulary

The agentic spine — *what reasons*. These are metadata objects that reference a composite by a
dotted id and record what came out. None of them is the thing that runs.

**Investigation** — a named collection of studies under one research question; the unit of a
git branch and worktree. It stores no edges — the cross-study DAG is computed from its
members' prerequisites and compiled into a composite. → [Investigations](../investigate/investigations.md)

**Study** — the reason you run a composite: one question, one emit-contract, and one pass/fail
bar wrapped around it. A study is never compiled into a composite itself — it stays metadata
that points at one and reads back what came out. → [Studies](../investigate/studies.md)

**Run** — one execution of a composite; produces a run store of trajectories recorded to
`runs.db` (and `parquet-runs/`). Runs are asynchronous — a failed run can still return HTTP
200, so check the *result*, not the status code. → [Studies](../investigate/studies.md)

**Analysis** — a Step (an `AnalysisStep`) that *derives* an artifact — a figure, table, CSV,
or markdown — from a run's normalized results, **without** issuing a verdict. Renders under
Evidence › Analyses. → [Analyses, visualizations & report cards](../investigate/analyses-visualizations-report-cards.md)

**Visualization** — a curated figure (a `Visualization` Step) authored to make a finding
clear. The bar is deliberately high: a bare line of one observable versus time rarely clears
it. Renders under Evidence › Visualizations. → [Analyses, visualizations & report cards](../investigate/analyses-visualizations-report-cards.md)

**Behavior test** — a machine-checkable spec, not prose: it names how to *measure* a result
from a run (`measure` + `window`) and what *passing* means (`pass_if`), so one definition
drives both execution and the dashboard's pass/fail rendering. → [Rigor & evidence](../investigate/rigor-and-evidence.md)

**Report card** — a Step (a `TestStep`) that reads a run and produces pass/fail outcomes keyed
by test — the raw evidence. A report card **grades** (→ Assurance › Tests); an analysis merely
**derives**. → [Analyses, visualizations & report cards](../investigate/analyses-visualizations-report-cards.md)

**Acceptance band** — the tolerance or direction a test accepts (e.g. "within 2%", "at most
0.02"), ideally cited to literature via band provenance. The related `gate_class` field
distinguishes a pre-stated **acceptance criterion** from a post-hoc **regression pin**,
discouraging tune-to-pass. → [Rigor & evidence](../investigate/rigor-and-evidence.md)

**Acceptance criterion** — an investigation-level `{study, behavior}` pair linking a criterion
the investigation must meet to a member study's behavior test. → [Investigations](../investigate/investigations.md)

**Finding** — a summary of what was seen, floored by a lifecycle (`confirms / partial /
contradicts / novel`) so an unproven claim can't look settled. Carries `evidence`, `expected`,
and `provenance` slots; a finding is reproducible once a fresh checkout can regenerate it. →
[Rigor & evidence](../investigate/rigor-and-evidence.md)

**Verdict** — a study's conclusion state, **computed from its evidence, not asserted**. The
evaluator rolls run outcomes and prerequisites into `passed / failed / needs_calibration /
blocked / not_started` (passed iff fail == 0 and pass > 0), writing a coded slot parallel to
the authored one. → [Rigor & evidence](../investigate/rigor-and-evidence.md)

**Provenance** — the audit trail: every Workbench write is a git commit, so verdict,
readiness, and debts are diff-able. A test's `requires_simulation` + `cites` bind a verdict to
a specific run and to the literature. → [Rigor & evidence](../investigate/rigor-and-evidence.md)

**Epistemic debt** — an open question the investigation owes: an item bucketed as unresolved
rather than fabricated into a verdict. Part of a study's knowledge object. →
[Rigor & evidence](../investigate/rigor-and-evidence.md)

**Readiness** — a report-linter score that counts open gaps ("6 gaps" style), telling you
exactly what is missing before a verdict is trustworthy. Because a study is typed data,
hardening it is a transformation an agent can apply and verify. → [Rigor & evidence](../investigate/rigor-and-evidence.md)

---

## Naming: pbg vs viva

!!! note "Prefer `viva`; expect `pbg` on disk"
    The ecosystem was renamed from **pbg** ("process-bigraph") to **viva**. The migration is
    real but not complete, so both spellings appear:

    - **Skills** are `/viva-*` (older `/pbg-*` names still work as aliases).
    - **Python import names are stable**: `import process_bigraph`, `import bigraph_schema` —
      the rebrand did not touch them.
    - **Packages**: new workspaces use a `viva_<pkg>/` package; older ones use `pbg_<pkg>/`.
      The Claude Code plugin is still distributed as **`pbg-superpowers`** (import
      `viva_superpowers`, with a `pbg_superpowers` shim).
    - **The runtime control directory is still `.pbg/`** — that path was not renamed.
    - **The scaffold repo** is `viva-template` (formerly `pbg-template`); both names resolve.

    When in doubt, prefer the **viva** spelling; this guide flags the exceptions where they
    matter. See [The stack](../foundations/the-stack.md#a-note-on-names).

---

**Next:** [Home](../index.md)
