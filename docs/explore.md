---
title: Explore a bigraph
tags:
  - composite
  - workbench
  - getting-started
---

# Explore a bigraph

The best way to understand a composite is to *look* at one. Below is a live, interactive
**bigraph-loom** explorer — the very same viewer the [Workbench](investigate/workspaces-and-workbench.md)
serves at `/loom-explore`, exported here so it runs with no server. Pan and zoom, expand a
node to drill into a sub-composite, and inspect how **processes** and **steps** wire to
shared **stores**.

!!! info "On this page"
    **What's here** a real composite rendered by the actual workbench loom viewer. · **Try it**
    drag to pan, scroll to zoom, click a node to expand it, and use the picker to switch
    composites. · **See also** [Composites & wiring](compute/composites-and-wiring.md).

<div class="loom-toolbar">
<label for="loom-picker">Composite:</label>
<select id="loom-picker" disabled><option>Loading…</option></select>
<a class="loom-open" href="../assets/loom/index.html?chrome=off&amp;tab=explore" target="_blank" rel="noopener">Open in a new tab &#8599;</a>
</div>
<p id="loom-caption" class="loom-caption"></p>

<div class="loom-embed">
<iframe
  id="loom-frame"
  title="bigraph-loom explorer"
  src="../assets/loom/index.html?chrome=off&amp;tab=explore"
  data-manifest="../assets/loom/composites/manifest.json"
  loading="lazy"></iframe>
</div>

## Add your own composite

The picker is driven by a small manifest, so adding a composite takes two steps — no build:

1. Drop its JSON into `docs/assets/loom/composites/` (the same shape the Workbench's
   Composite Explorer and loom save-points export: an object with `state`, `parameters`,
   `default_n_steps`, `name`, and `description`).
2. Add a row to `docs/assets/loom/composites/manifest.json`:

```json
{
  "composites": [
    { "id": "my-model", "label": "My model", "file": "my-model.json",
      "description": "One line about it." }
  ]
}
```

To embed a specific composite on any other page, drop in an iframe pointing at the same
bundle and hand it a manifest (or a single composite file) — the small script in
`docs/javascripts/loom-embed.js` does the `composite:load` handshake.

!!! note "Keeping it current"
    The bundle under `docs/assets/loom/` is the workbench's vendored loom build. To refresh
    it, rebuild `vivarium_workbench/loom/_dist` (`scripts/build_loom.sh`) and re-copy it
    here (minus the `*.map` source maps).
