---
title: Module catalog
hide:
  - toc
---

# Module catalog

Every module here is an installable unit — a simulator wrapped as process-bigraph Processes, a reusable composite, or a whole research workspace — from the [Vivarium Collective](https://github.com/vivarium-collective). Install one into a workspace with [`/viva-catalog`](reference/skills.md) (`install <name>`), or browse the source on GitHub.

This page is **live**: it reads the authoritative ecosystem ledger published by [`viva-catalog`](https://github.com/vivarium-collective/viva-catalog), so a repo appears here as soon as it carries the `viva-marketplace` topic and the nightly index rebuild runs. For each module it shows the actual processes, composites, studies, and investigations it contains — type to search across all of them, or filter by kind and capability tag.

??? note "A note on install names"
    Modules, their GitHub repos, and their install ids are all `viva-*`. Copy the
    `/viva-catalog install …` line from each card verbatim — it is the id that
    resolves. (A couple of modules still import under a `pbg_` package name via a
    back-compat shim; that is internal and does not affect installing them.)

??? info "How a module joins the catalog"
    Add the **`viva-marketplace` GitHub topic** to a public `vivarium-collective`
    repo (`gh repo edit vivarium-collective/<repo> --add-topic viva-marketplace`).
    The nightly builder in `viva-catalog` discovers it, shallow-clones it, scans
    its source for processes / steps / composites / studies / investigations, and
    republishes the ledger this page reads. No PR needed.

<div id="cat-root"
     class="cat-root"
     data-live="https://vivarium-collective.github.io/viva-catalog/ecosystem-index.json"
     data-fallback="../catalog-data.json"
     data-home="https://github.com/vivarium-collective/viva-catalog">
  <p class="cat-loading">Loading the ecosystem ledger…</p>
</div>
