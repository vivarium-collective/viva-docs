---
title: Start here
---

# Start here

This guide is organized into four parts — [Foundations](foundations/index.md),
[Build & run models](compute/index.md), [Investigate](investigate/index.md), and
[Reference](reference/index.md). You don't have to read them in order. Pick the path that
matches what you're trying to do; each is a short, numbered route through the chapters that
matter for it.

!!! tip "Two things almost everything assumes"
    Most hands-on work needs **a workspace** (a directory with a `workspace.yaml` and a
    `viva_<pkg>/` package) and **a running Workbench** (the dashboard server). If either is
    missing, start at [Workspaces & the Workbench](investigate/workspaces-and-workbench.md).

!!! abstract "Just want it running?"
    The [**Quick start**](quickstart.md) is a copy-pasteable, top-to-bottom path from nothing
    to a running Workbench — and it's written so you can point an **AI agent** straight at it.

## Everyone: the 20-minute mental model

Before any path, read these three — they're short and everything else builds on them.

1. [**What is Vivarium?**](foundations/what-is-viva-eco.md) — the Two Spines and the problem it solves.
2. [**Core concepts**](foundations/core-concepts.md) — stores, processes, steps, wiring, the `apply` law, and sites/fill/ground.
3. [**The stack**](foundations/the-stack.md) — how the four packages layer.

---

## :material-hammer-wrench: Path A — Build a model

*You want to wrap simulators as processes and run a composite.*

<div class="viva-grid" markdown>

<div class="viva-card part-build" markdown>
### 1. Types & state
[Schemas, types & state](compute/schema-types-state.md) — how state is typed and how deltas merge.
</div>

<div class="viva-card part-build" markdown>
### 2. Processes & Steps
[Processes & Steps](compute/processes-and-steps.md) — write the two kinds of edge.
</div>

<div class="viva-card part-build" markdown>
### 3. Compose & run
[Composites & wiring](compute/composites-and-wiring.md) — assemble, wire, and run a composite.
</div>

<div class="viva-card part-build" markdown>
### 4. Get data out
[Emitters](compute/emitters.md) — record the run into a durable store.
</div>

<div class="viva-card part-build" markdown>
### 5. Design interface-first
[Templates & draft processes](compute/templates-and-draft-processes.md) — sketch an interface before the mechanism.
</div>

</div>

**Then:** run it in the UI via [Workspaces & the Workbench](investigate/workspaces-and-workbench.md).

---

## :material-flask: Path B — Turn runs into evidence

*You want reproducible, inspectable, verdict-bearing science.*

<div class="viva-grid" markdown>

<div class="viva-card part-investigate" markdown>
### 1. Set up
[Workspaces & the Workbench](investigate/workspaces-and-workbench.md) — scaffold and start the server.
</div>

<div class="viva-card part-investigate" markdown>
### 2. Ask a question
[Studies](investigate/studies.md) — wrap one question, one emit-contract, one pass/fail bar around a composite.
</div>

<div class="viva-card part-investigate" markdown>
### 3. See the result
[Analyses, visualizations & report cards](investigate/analyses-visualizations-report-cards.md) — figures, tables, and graded scorecards.
</div>

<div class="viva-card part-investigate" markdown>
### 4. Build the argument
[Investigations](investigate/investigations.md) — group studies into a gated DAG.
</div>

<div class="viva-card part-investigate" markdown>
### 5. Make it defensible
[Rigor & the evidence engine](investigate/rigor-and-evidence.md) — computed-not-asserted verdicts, gates, and provenance.
</div>

</div>

**Then:** follow it end to end in [A worked example](reference/worked-example.md).

---

## :material-robot: Path C — Drive it with agents

*You want AI agents to build and run investigations on your behalf.*

<div class="viva-grid" markdown>

<div class="viva-card part-reference" markdown>
### 1. How agents fit
[Working with AI agents](investigate/working-with-agents.md) — the AI-free tool + swappable-plugin split and the access contract.
</div>

<div class="viva-card part-reference" markdown>
### 2. The skills
[Skill reference](reference/skills.md) — every `/viva-*` command and what it wraps.
</div>

<div class="viva-card part-reference" markdown>
### 3. The API
[HTTP API reference](reference/http-api.md) — the endpoints agents call.
</div>

<div class="viva-card part-reference" markdown>
### 4. The shapes
[On-disk schema reference](reference/schemas.md) — the YAML shapes agents read and write.
</div>

</div>

---

!!! quote ""
    New science is a **new study**, not a patch to the model.

Whichever path you take, the loop is the same: **Question → Composite → Run → Verdict →
Next.** When you're ready for the full detail, everything is in the
[Reference](reference/index.md).
