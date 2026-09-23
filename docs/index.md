---
hide:
  - navigation
  - toc
---

<div class="viva-hero" markdown>

# The Vivarium Users Guide

<p class="tagline">Simulation you can compose. Reasoning you can audit.</p>

</div>

Vivarium is a framework for building **multiscale biological models** by composing
independently-written simulators into one executable whole — and for turning the runs
into **auditable scientific evidence**. It is built as two spines wired into a single
discovery loop:

<div class="viva-grid" markdown>

<div class="viva-card" markdown>
### :material-cog: The computational spine
*What runs.* A compositional runtime built on Milner's bigraphs. State lives in typed
**Stores**; dynamics live in **Processes** and **Steps** wired to those stores; whole
simulations nest as **Composites**. Updates are deltas merged by the type system.
</div>

<div class="viva-card" markdown>
### :material-brain: The agentic spine
*What reasons.* A knowledge layer that frames each run as a **Study** inside an
**Investigation**. Studies form a gated DAG; a code-computed evaluator rolls runs up
into a **verdict**, a readiness score, and open epistemic debts.
</div>

</div>

!!! quote ""
    Neither spine is the engine — the engine is the closed loop between them, and the
    **Workbench** is where the loop turns.

## The four packages

<div class="viva-stack" markdown>

<div class="layer" markdown>
**`viva-superpowers`** — the `/viva-*` Claude Code skills that author and run everything.
All AI lives here, so the tool below stays auditable and the AI stays swappable.
</div>

<div class="layer" markdown>
**`vivarium-workbench`** — the AI-free dashboard server. Investigations, studies, runs,
analyses, report cards, a browsable run store — every change committed to git.
</div>

<div class="layer" markdown>
**`process-bigraph`** — the engine and the composite / process / step / template
primitives. Processes return typed deltas; wiring is the coupling; composites nest.
</div>

<div class="layer" markdown>
**`bigraph-schema`** — the type system beneath every store. `apply` is the one law that
merges deltas, so independently-written processes compose without knowing about each other.
</div>

</div>

<p class="viva-pull">A Composite is the runnable object; a Study is the reason you run it;
an Investigation is the argument several studies build together.</p>

Read the stack top-down and it's an argument; read it bottom-up and it's a simulation.

## Where to start

<div class="viva-grid" markdown>

<div class="viva-card" markdown>
### :material-map-marker-path: New here?
Start with **[What is Vivarium?](foundations/what-is-viva-eco.md)** for the mental model,
then **[Core concepts](foundations/core-concepts.md)** for the vocabulary from first
principles.
</div>

<div class="viva-card" markdown>
### :material-hammer-wrench: Want to build a model?
Jump to **[Processes & Steps](compute/processes-and-steps.md)** and
**[Composites & wiring](compute/composites-and-wiring.md)** to write and run your first
composite.
</div>

<div class="viva-card" markdown>
### :material-flask: Doing science?
Go to **[Studies](investigate/studies.md)** and **[Investigations](investigate/investigations.md)**
to turn runs into gated, verdict-bearing evidence.
</div>

<div class="viva-card" markdown>
### :material-book-open-variant: Need the details?
The **[Reference](reference/skills.md)** section has the skill catalog, HTTP API, on-disk
schemas, install/deploy, and a full worked example.
</div>

</div>

---

<small>The Vivarium framework is described in Agmon &amp; Spangler, *Process bigraphs and
the architecture of compositional systems biology* (arXiv:2512.23754). Source packages
live at [github.com/vivarium-collective](https://github.com/vivarium-collective).</small>
