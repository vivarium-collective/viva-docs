---
title: Ecosystem map
hide:
  - toc
---

# Ecosystem map

A graph of the whole [module catalog](../): every repo is a node — colored by kind, sized by how much it contains — and the edges are the two relationships a flat list can't show:

- **reuse** — a repo → the engine repos it depends on;
- **study pins** — a workspace → the simulator its studies pin (with the version).

Click any node to see what it reuses, what reuses it, which simulator its studies pin, and what science depends on it. Both edge sets are derived live from the ledger (`reuses` / `simulator_refs`), so the map stays current as the ecosystem changes.

<div class="ecomap" id="ecomap"
     data-live="https://vivarium-collective.github.io/viva-catalog/ecosystem-index.json"
     data-cytoscape="https://cdnjs.cloudflare.com/ajax/libs/cytoscape/3.30.2/cytoscape.min.js">
  <div class="ecomap-bar">
    <span class="ecomap-counts" id="ecomap-counts">Loading the ecosystem…</span>
    <input class="ecomap-search" id="ecomap-q" type="search" placeholder="Search repos…" autocomplete="off" aria-label="Search repositories">
    <div class="ecomap-chips" id="ecomap-chips">
      <button class="ecomap-chip" data-kind="simulator" aria-pressed="true"><span class="ecomap-dot" data-k="simulator"></span>Simulators</button>
      <button class="ecomap-chip" data-kind="workspace" aria-pressed="true"><span class="ecomap-dot" data-k="workspace"></span>Workspaces</button>
      <button class="ecomap-chip" data-kind="other" aria-pressed="true"><span class="ecomap-dot" data-k="other"></span>Other</button>
    </div>
    <button class="ecomap-btn" id="ecomap-reflow" type="button">Reflow</button>
  </div>
  <div class="ecomap-stage">
    <div id="cy"></div>
    <aside class="ecomap-legend" id="ecomap-legend" hidden>
      <div class="ecomap-row"><span class="ecomap-sw" data-k="simulator"></span>Simulator / engine</div>
      <div class="ecomap-row"><span class="ecomap-sw" data-k="workspace"></span>Workspace (studies)</div>
      <div class="ecomap-row"><span class="ecomap-sw" data-k="other"></span>Other</div>
      <div class="ecomap-row"><span class="ecomap-sw ecomap-sw-engine"></span>Reused engine</div>
      <div class="ecomap-row"><span class="ecomap-ln ecomap-ln-reuse"></span>reuses &rarr;</div>
      <div class="ecomap-row"><span class="ecomap-ln ecomap-ln-study"></span>studies pin &rarr;</div>
    </aside>
    <aside class="ecomap-panel" id="ecomap-panel" aria-live="polite">
      <button class="ecomap-x" id="ecomap-px" type="button" aria-label="Close">&times;</button>
      <span class="ecomap-pkind" id="ecomap-pk"></span>
      <h2 id="ecomap-pn"></h2>
      <div class="ecomap-pkg" id="ecomap-pp"></div>
      <div class="ecomap-desc" id="ecomap-pd"></div>
      <div class="ecomap-stats" id="ecomap-ps"></div>
      <div class="ecomap-rel" id="ecomap-pr"></div>
      <a class="ecomap-repo" id="ecomap-pl" target="_blank" rel="noopener">View repository &rarr;</a>
    </aside>
  </div>
</div>
