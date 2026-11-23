---
tags:
  - concepts
  - getting-started
---

# The stack

Vivarium is a small stack of packages in a strict dependency order. Each layer builds on the
ones below it and never the reverse — the lower layers by direct import, and the AI layer
(`viva-superpowers`) by calling the Workbench over HTTP rather than importing it. That
acyclicity *is* the separation of concerns — and it is why you can swap the AI layer without
touching the engine, or run the engine with no dashboard at all. `process-bigraph` is a
*composition protocol*: rather than unifying models into one representation the way standards
like SBML or CellML do, it standardizes how independently-built models connect, share state,
and are orchestrated in time.

<div class="viva-stack" markdown>

<div class="layer" markdown>
**5 · `viva-superpowers`** — the `/viva-*` Claude Code skills. Scaffolds workspaces, wraps
simulators, and authors / hardens / drives studies and investigations by calling the
Workbench and the engine over HTTP. **All AI in the ecosystem lives here.**
</div>

<div class="layer" markdown>
**4 · `vivarium-workbench`** — the dashboard server + the investigation-as-composite
substrate. A FastAPI app that exposes the HTTP API, renders the study / investigation UI,
runs composites, publishes read-only snapshots, and commits every change to git. Embeds the
`bigraph-loom` state-tree explorer. **Contains no AI.**
</div>

<div class="layer" markdown>
**3 · `discovery-engine`** — the investigation / study framework and the discovery cycle.
The code-computed study evaluator (verdict · readiness · epistemic debts), the deterministic
**rigor scorecard**, the report linter, the argument / knowledge / narrative projections, and
the project → frontier → opportunity cycle that turns a set of studies into "what to ask
next." This is the **science** layer — pure, deterministic, and AI-free (an agent *drives* it;
it never contains one). *(Extracted from `viva-superpowers` so the framework stands on its own.)*
</div>

<div class="layer" markdown>
**2 · `process-bigraph`** — the engine + the composite / process / step / template
primitives. The `Composite` object, the tick scheduler, and per-process intervals. Runs are
recorded by **`viva-emitters`** — the sqlite / parquet / xarray emitters plus the `RunReader`
that reads a run's trajectories back for grading and visualization.
</div>

<div class="layer" markdown>
**1 · `bigraph-schema`** — the type system beneath every store. Types, ports, schema
resolution, and the store-write law (`apply`). The `Core` registry that everything above
consults.
</div>

</div>

One-line version:

!!! quote ""
    `bigraph-schema` (types) ⊂ `process-bigraph` (the engine + composite/template primitives,
    with `viva-emitters` recording runs) ⊂ `discovery-engine` (the study/investigation
    framework + discovery cycle) ⊂ `vivarium-workbench` (the dashboard server, embedding
    `bigraph-loom`) ⊂ `viva-superpowers` (the `/viva-*` skills).

## Read it two ways

**Bottom-up, it's a simulation.** Types define what state can be; processes and steps act
on that state; composites assemble them; the engine runs them; emitters record them.

**Top-down, it's an argument.** A skill authors an investigation; the investigation groups
studies; each study wraps a question around a composite; the composite runs; the evidence
rolls back up into a verdict.

## What each layer gives you

| Layer | You reach for it when… | Key objects |
|---|---|---|
| **bigraph-schema** | you need a new data type, units, or to understand how deltas merge | `Core`, types, `apply`, `resolve` |
| **process-bigraph** | you are writing or wiring a model | `Process`, `Step`, `Composite` |
| **viva-emitters** | you are recording a run or reading its trajectories back | emitters (sqlite/parquet/xarray), `RunReader` |
| **discovery-engine** | you need a study's verdict, rigor scorecard, or the "what to ask next" cycle | the evaluator, verdicts, rigor, report linter, the cycle |
| **vivarium-workbench** | you are running, browsing, or grading models in the UI/API | the server, `/api/*`, studies, report cards |
| **viva-superpowers** | you are driving the platform with an AI agent | the `/viva-*` skills |

## The unifying idea

Underneath, every Workbench object — a composite, a study, an investigation, a
template — is a **`bigraph-schema`-typed document**. Once its sites are filled, it is a
`process-bigraph` composite: Steps transform Stores, wiring expresses dependencies, and the
engine produces durable artifacts.

- A **process** is a ground document.
- A **composite** is a document whose sites were filled by other documents — so a composite
  *is* a process; composition is closed.
- A **template** is a not-yet-ground document.
- A **study** is a template with its model site filled.
- An **investigation** is a document with one site per study, filled by gate edges.

You do not write orchestration code that runs studies in the right order — you declare each
study's prerequisites, and *the wiring is the orchestration*: the engine schedules the
network. Templates, studies, and investigations differ in **structure, not in execution
machinery**.

??? info "Design vs shipped"
    The "everything is one typed document" unification is the framework's north star, and
    the load-bearing pieces have shipped (an investigation compiles to a composite;
    `bigraph-schema` has `fill`/`is_ground`). Some deeper unification is still in progress.
    This guide flags, per chapter, where a described capability is a current API versus a
    documented direction.

## A note on names

The ecosystem was renamed from **pbg** ("process-bigraph") to **viva**. The migration is
real but not complete, so you will see both:

- Skills are `/viva-*`; the older `/pbg-*` command names are retired.
- The plugin is distributed as `viva-superpowers` (with a `pbg_superpowers` import shim).
- Python **import names are stable**: `import process_bigraph`, `import bigraph_schema`.
- Still carrying the old prefix: the runtime control directory `.pbg/`, and the
  `pbg_<pkg>` / `pbg_superpowers` import shims. (Catalog install ids and their source repos
  are now `viva-*`; older workspaces still use a `pbg_<pkg>/` package.)
- Newer workspaces use a `viva_<pkg>/` Python package; older ones use `pbg_<pkg>/`.

When in doubt, prefer the **viva** spelling; this guide notes the exceptions where they
matter.

---

**Next:** start building with [Schemas, types & state](../compute/schema-types-state.md),
or jump to [Processes & Steps](../compute/processes-and-steps.md) to write your first model.
