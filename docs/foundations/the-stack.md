---
tags:
  - concepts
  - getting-started
---

# The stack

Vivarium is four packages in a strict dependency order. Each layer imports the ones below
it and never the reverse. That acyclicity *is* the separation of concerns — and it is why
you can swap the AI layer without touching the engine, or run the engine with no dashboard
at all. At its heart, `process-bigraph` is a *composition protocol*: rather than unifying
models into one representation the way standards like SBML or CellML do, it standardizes how
independently-built models connect, share state, and are orchestrated in time.

!!! info "On this page"
    **Assumes** you've read [Core concepts](core-concepts.md). · **You'll learn** the four
    packages and their dependency order, how to read the stack bottom-up and top-down, which
    layer to reach for, and how the pbg → viva rename maps onto names you'll see.

<div class="viva-stack" markdown>

<div class="layer" markdown>
**4 · `viva-superpowers`** — the `/viva-*` Claude Code skills + study/investigation
authoring. Scaffolds workspaces, wraps simulators, authors and hardens studies, computes a
deterministic rigor scorecard. **All AI in the ecosystem lives here.**
</div>

<div class="layer" markdown>
**3 · `vivarium-workbench`** — the dashboard server + the investigation-as-composite
substrate. A FastAPI app that exposes the HTTP API, renders the study/investigation UI,
runs composites, and commits every change to git. **Contains no AI.**
</div>

<div class="layer" markdown>
**2 · `process-bigraph`** — the engine + the composite / process / step / template
primitives. The `Composite` object, the tick scheduler, per-process intervals, and the
emitters that record state.
</div>

<div class="layer" markdown>
**1 · `bigraph-schema`** — the type system beneath every store. Types, ports, schema
resolution, and the store-write law (`apply`). The `Core` registry that everything above
consults.
</div>

</div>

One-line version:

!!! quote ""
    `bigraph-schema` (the type system) ⊂ `process-bigraph` (the engine + composite/template
    primitives) ⊂ `vivarium-workbench` (the dashboard server) ⊂ `viva-superpowers` (the
    `/viva-*` skills).

## Read it two ways

**Bottom-up, it's a simulation.** Types define what state can be; processes and steps act
on that state; composites assemble them; the engine runs them; emitters record them.

**Top-down, it's an argument.** A skill authors an investigation; the investigation groups
studies; each study wraps a question around a composite; the composite runs; the evidence
rolls back up into a verdict.

The whole point of the split is leverage:

!!! quote ""
    You can re-run the science without rewriting the argument — and audit the argument
    without re-reading the code.

## What each layer gives you

| Layer | You reach for it when… | Key objects |
|---|---|---|
| **bigraph-schema** | you need a new data type, units, or to understand how deltas merge | `Core`, types, `apply`, `resolve` |
| **process-bigraph** | you are writing or wiring a model | `Process`, `Step`, `Composite`, emitters |
| **vivarium-workbench** | you are running, browsing, or grading models in the UI/API | the server, `/api/*`, studies, report cards |
| **viva-superpowers** | you are driving the platform with an AI agent | the `/viva-*` skills |

## The unifying idea

The layers look like different kinds of machinery, but underneath they are one idea applied
at different altitudes. Every Workbench object — a composite, a study, an investigation, a
template — is a **`bigraph-schema`-typed document**. Once its sites are filled, it is a
`process-bigraph` composite: Steps transform Stores, wiring expresses dependencies, and the
engine produces durable artifacts.

- A **process** is a ground document.
- A **composite** is a document whose sites were filled by other documents — so a composite
  *is* a process; composition is closed.
- A **template** is a not-yet-ground document.
- A **study** is a template with its model site filled.
- An **investigation** is a document with one site per study, filled by gate edges.

Three slogans capture the design ethos this produces:

!!! quote ""
    **Declare, do not script. Compose, do not duplicate. Artifacts are outputs.**

You do not write orchestration code that runs studies in the right order — you declare each
study's prerequisites, and *the wiring is the orchestration*: the engine schedules the
network. Templates, studies, and investigations differ in **structure, not in execution
machinery**.

!!! info "Design vs shipped"
    The "everything is one typed document" unification is the framework's north star, and
    the load-bearing pieces have shipped (an investigation compiles to a composite;
    `bigraph-schema` has `fill`/`is_ground`). Some deeper unification is still in progress.
    This guide flags, per chapter, where a described capability is a current API versus a
    documented direction.

## A note on names

The ecosystem was renamed from **pbg** ("process-bigraph") to **viva**. The migration is
real but not complete, so you will see both:

- Skills are `/viva-*` (older `/pbg-*` names still work as aliases).
- Python **import names are stable**: `import process_bigraph`, `import bigraph_schema`.
- Some packaging still uses the old prefix (the plugin is distributed as `pbg-superpowers`;
  the runtime control directory is `.pbg/`).
- Newer workspaces use a `viva_<pkg>/` Python package; older ones use `pbg_<pkg>/`.

When in doubt, prefer the **viva** spelling; this guide notes the exceptions where they
matter.

---

**Next:** start building with [Schemas, types & state](../compute/schema-types-state.md),
or jump to [Processes & Steps](../compute/processes-and-steps.md) to write your first model.
