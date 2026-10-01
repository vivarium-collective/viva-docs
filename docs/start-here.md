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
### 1. [Types & state](compute/schema-types-state.md)
How state is typed and how deltas merge.
</div>

<div class="viva-card part-build" markdown>
### 2. [Processes & Steps](compute/processes-and-steps.md)
Write the two kinds of edge.
</div>

<div class="viva-card part-build" markdown>
### 3. [Compose & run](compute/composites-and-wiring.md)
Assemble, wire, and run a composite.
</div>

<div class="viva-card part-build" markdown>
### 4. [Get data out](compute/emitters.md)
Record the run into a durable store.
</div>

<div class="viva-card part-build" markdown>
### 5. [Design interface-first](compute/templates-and-draft-processes.md)
Sketch an interface before the mechanism.
</div>

</div>

**Then:** run it in the UI via [Workspaces & the Workbench](investigate/workspaces-and-workbench.md).

---

## :material-flask: Path B — Turn runs into evidence

*You want reproducible, inspectable, verdict-bearing science.*

<div class="viva-grid" markdown>

<div class="viva-card part-investigate" markdown>
### 1. [Set up](investigate/workspaces-and-workbench.md)
Scaffold and start the server.
</div>

<div class="viva-card part-investigate" markdown>
### 2. [Ask a question](investigate/studies.md)
Wrap one question, one emit-contract, one pass/fail bar around a composite.
</div>

<div class="viva-card part-investigate" markdown>
### 3. [See the result](investigate/analyses-visualizations-report-cards.md)
Figures, tables, and graded scorecards.
</div>

<div class="viva-card part-investigate" markdown>
### 4. [Build the argument](investigate/investigations.md)
Group studies into a gated DAG.
</div>

<div class="viva-card part-investigate" markdown>
### 5. [Make it defensible](investigate/rigor-and-evidence.md)
Computed-not-asserted verdicts, gates, and provenance.
</div>

</div>

**Then:** follow it end to end in [A worked example](reference/worked-example.md).

---

## :material-robot: Path C — Drive it with agents

*You want AI agents to build and run investigations on your behalf.*

<div class="viva-grid" markdown>

<div class="viva-card part-reference" markdown>
### 1. [How agents fit](investigate/working-with-agents.md)
The AI-free tool + swappable-plugin split and the access contract.
</div>

<div class="viva-card part-reference" markdown>
### 2. [The skills](reference/skills.md)
Every `/viva-*` command and what it wraps.
</div>

<div class="viva-card part-reference" markdown>
### 3. [The API](reference/http-api.md)
The endpoints agents call.
</div>

<div class="viva-card part-reference" markdown>
### 4. [The shapes](reference/schemas.md)
The YAML shapes agents read and write.
</div>

</div>

---

Whichever path you take, the loop is the same: **Question → Composite → Run → Verdict →
Next.** When you're ready for the full detail, everything is in the
[Reference](reference/index.md).
