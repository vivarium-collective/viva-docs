---
title: Build & run models
---

<p class="part-eyebrow part-build">Part 2</p>

# Build & run models

The computational spine — how you write and run composites. This part is for modelers: it turns the vocabulary from Foundations into the concrete API for typing state, writing edges, wiring them into a runnable whole, and getting the data back out.

<div class="viva-grid" markdown>

<div class="viva-card part-build" markdown>
### [Schemas, types & state](schema-types-state.md)
The `bigraph-schema` type system — what state can be and how deltas merge back into it.
</div>

<div class="viva-card part-build" markdown>
### [Processes & Steps](processes-and-steps.md)
The two kinds of edge, split by their relationship to time, from base-class contract to runnable code.
</div>

<div class="viva-card part-build" markdown>
### [Composites & wiring](composites-and-wiring.md)
Assemble edges and stores into the one object the engine runs, and see what happens on every tick.
</div>

<div class="viva-card part-build" markdown>
### [Emitters](emitters.md)
The one part of a composite allowed to leave the run — recording wired state each tick to a durable sink.
</div>

<div class="viva-card part-build" markdown>
### [Templates & draft processes](templates-and-draft-processes.md)
Interface-first modeling — design a document with the mechanism left out, then fill it in later.
</div>

<div class="viva-card part-build" markdown>
### [Explore a bigraph](../explore.md) :material-cursor-default-click:
See a real composite in the live loom explorer — pan, zoom, and drill into its wiring.
</div>

</div>

!!! tip "Suggested path"
    Read in order: **Schemas** for the ground rules, **Processes & Steps** to write functionality, **Composites & wiring** to run it, then **Emitters** to capture the output. Reach for **Templates & draft processes** when you want to design an interface before its mechanism exists.
