// Ecosystem map — a cytoscape graph over the live catalog ledger.
//
// Nodes = catalog repos (from ecosystem-index.json). Edges = each entry's
// `reuses` (solid) and `simulator_refs` (dashed). Contained inside the Material
// page, themed from the page's color scheme, cytoscape loaded on demand so it
// costs nothing on other pages.

(function () {
  "use strict";

  // Verified seed edges — a fallback only if the live ledger hasn't been rebuilt
  // with reuses/simulator_refs yet (it falls back per-session, not permanently).
  var SEED_EDGES = [
    { s: "viva-genesis-sim", t: "viva-cpm", kind: "reuse" },
    { s: "viva-genesis-sim", t: "viva-equilibrator", kind: "reuse" },
    { s: "viva-genesis-sim", t: "viva-fenics", kind: "reuse" },
    { s: "viva-genesis-sim", t: "viva-fipy", kind: "reuse" },
    { s: "viva-genesis-sim", t: "viva-phreeqc", kind: "reuse" },
    { s: "viva-genesis-sim", t: "viva-tellurium", kind: "reuse" },
    { s: "viva-multicell-blueprint-sim", t: "viva-cpm", kind: "reuse" },
    { s: "viva-multicell-blueprint-sim", t: "viva-grammar", kind: "reuse" },
    { s: "viva-multicell-blueprint-sim", t: "viva-munk", kind: "reuse" },
    { s: "viva-multicell-blueprint-sim", t: "viva-tellurium", kind: "reuse" },
    { s: "viva-multicell-blueprint-sim", t: "vivarium-tyssue", kind: "reuse" },
    { s: "viva-genesis", t: "viva-genesis-sim", kind: "study", ref: "0.1.5" },
    { s: "viva-multicell-blueprint", t: "viva-multicell-blueprint-sim", kind: "study", ref: "0.1.0" },
  ];

  var cy = null;

  function $(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function adaptLedger(d) {
    // General tools / infrastructure (kind "other": emitters, utilities) are
    // listed in the catalog, not graphed — the map stays a domain graph of
    // simulators + workspaces and their reuse / study edges. Reuse edges that
    // pointed at an excluded tool drop out automatically (target not a node).
    var repos = (d.repos || d.modules || d || []).filter(function (r) {
      return r.kind !== "other";
    });
    var nodes = repos.map(function (r) {
      return {
        id: r.name, kind: r.kind || "other", pkg: r.package || "",
        p: (r.processes || []).length + (r.steps || []).length,
        c: (r.composites || []).length, s: (r.studies || []).length,
        i: (r.investigations || []).length,
        desc: (r.description || "").slice(0, 200),
      };
    });
    var ids = {}; nodes.forEach(function (n) { ids[n.id] = 1; });
    var byPkg = {}; repos.forEach(function (r) { if (r.package) byPkg[r.package] = r.name; });
    var edges = [];
    repos.forEach(function (r) {
      (r.reuses || []).forEach(function (t) {
        var tid = ids[t] ? t : byPkg[t];
        if (tid && ids[tid] && tid !== r.name) edges.push({ s: r.name, t: tid, kind: "reuse" });
      });
      (r.simulator_refs || []).forEach(function (sr) {
        var tid = ids[sr.repo] ? sr.repo : byPkg[sr.repo];
        if (tid && ids[tid] && tid !== r.name) edges.push({ s: r.name, t: tid, kind: "study", ref: sr.ref });
      });
    });
    if (!edges.length) edges = SEED_EDGES.filter(function (e) { return ids[e.s] && ids[e.t]; });
    return { nodes: nodes, edges: edges };
  }

  var tok = function (v, root) {
    return getComputedStyle(root || document.getElementById("ecomap")).getPropertyValue(v).trim();
  };
  function total(n) { return n.p + n.c + n.s + n.i; }

  function styleArray() {
    var root = $("ecomap");
    var C = {
      sim: tok("--em-sim", root), work: tok("--em-work", root), other: tok("--em-other", root),
      engine: tok("--em-engine", root), fg: tok("--em-fg", root),
      reuse: tok("--em-edge-reuse", root), study: tok("--em-edge-study", root),
    };
    return [
      { selector: "node", style: {
        "background-color": C.other, "label": "data(id)", "font-size": "9px",
        "color": C.fg, "text-valign": "bottom", "text-margin-y": 3, "text-max-width": "90px",
        "text-wrap": "ellipsis", "width": "mapData(sz,6,34,16,64)", "height": "mapData(sz,6,34,16,64)",
        "border-width": 0, "overlay-opacity": 0,
        "transition-property": "opacity,border-width", "transition-duration": "0.15s" } },
      { selector: 'node[kind="simulator"]', style: { "background-color": C.sim } },
      { selector: 'node[kind="workspace"]', style: { "background-color": C.work } },
      { selector: ".engine", style: { "border-width": 3, "border-color": C.engine } },
      { selector: "edge", style: {
        "width": 1.6, "curve-style": "bezier", "target-arrow-shape": "triangle", "arrow-scale": 0.8,
        "line-color": C.reuse, "target-arrow-color": C.reuse, "opacity": 0.7 } },
      { selector: 'edge[kind="study"]', style: {
        "line-color": C.study, "target-arrow-color": C.study, "line-style": "dashed", "width": 1.8 } },
      { selector: "node:selected", style: { "border-width": 4, "border-color": C.fg } },
      { selector: ".faded", style: { "opacity": 0.12 } },
      { selector: ".hi", style: { "opacity": 1 } },
      { selector: "edge.hi", style: { "width": 2.6, "opacity": 1 } },
    ];
  }

  var DATA;
  function build(d) {
    DATA = d;
    var engineIds = {};
    d.edges.forEach(function (e) { if (e.kind === "reuse") engineIds[e.t] = 1; });
    var els = d.nodes.map(function (n) {
      return { data: { id: n.id, kind: n.kind, sz: Math.sqrt(total(n)) }, classes: engineIds[n.id] ? "engine" : "" };
    }).concat(d.edges.map(function (e, i) {
      return { data: { id: "e" + i, source: e.s, target: e.t, kind: e.kind, ref: e.ref || "" } };
    }));
    if (cy) { try { cy.destroy(); } catch (e) {} }
    cy = window.cytoscape({
      container: $("cy"), elements: els, style: styleArray(),
      minZoom: 0.25, maxZoom: 2.5, wheelSensitivity: 0.25,
      layout: { name: "cose", animate: true, animationDuration: 600, idealEdgeLength: 90,
        nodeRepulsion: 9000, nodeOverlap: 14, gravity: 0.3, padding: 40, randomize: false },
    });
    cy.on("tap", "node", function (e) { select(e.target); });
    cy.on("tap", function (e) { if (e.target === cy) clearSel(); });
    $("ecomap-counts").textContent =
      d.nodes.length + " repos · " +
      d.nodes.filter(function (n) { return n.kind === "simulator"; }).length + " sims · " +
      d.edges.length + " links";
    var lg = $("ecomap-legend"); if (lg) lg.hidden = false;
  }

  function select(node) {
    var id = node.id();
    cy.elements().addClass("faded").removeClass("hi");
    node.closedNeighborhood().removeClass("faded").addClass("hi");
    node.removeClass("faded");
    cy.$(":selected").unselect(); node.select();
    openPanel(DATA.nodes.find(function (n) { return n.id === id; }));
  }
  function clearSel() {
    if (cy) { cy.elements().removeClass("faded hi"); cy.$(":selected").unselect(); }
    $("ecomap-panel").classList.remove("open");
  }
  function relList(title, items) {
    if (!items.length) return "";
    return '<div class="ecomap-relgrp"><h3>' + esc(title) + "</h3><ul>" + items.map(function (x) {
      return '<li data-go="' + esc(x.id) + '">' + esc(x.id) +
        (x.ref ? ' <span class="ecomap-ref">' + esc(x.ref) + "</span>" : "") + "</li>";
    }).join("") + "</ul></div>";
  }
  function openPanel(n) {
    var pk = $("ecomap-pk"); pk.textContent = n.kind;
    pk.style.background = n.kind === "simulator" ? tok("--em-sim") : n.kind === "workspace" ? tok("--em-work") : tok("--em-other");
    $("ecomap-pn").textContent = n.id;
    $("ecomap-pp").textContent = n.pkg ? "import " + n.pkg : "";
    $("ecomap-pd").textContent = n.desc || "";
    $("ecomap-ps").innerHTML = [["p", "processes"], ["c", "composites"], ["s", "studies"], ["i", "investig."]]
      .map(function (kl) { return '<div class="ecomap-stat"><b>' + n[kl[0]] + "</b><span>" + kl[1] + "</span></div>"; }).join("");
    var E = DATA.edges;
    var reuses = E.filter(function (e) { return e.s === n.id && e.kind === "reuse"; }).map(function (e) { return { id: e.t }; });
    var reusedBy = E.filter(function (e) { return e.t === n.id && e.kind === "reuse"; }).map(function (e) { return { id: e.s }; });
    var pins = E.filter(function (e) { return e.s === n.id && e.kind === "study"; }).map(function (e) { return { id: e.t, ref: e.ref }; });
    var pinnedBy = E.filter(function (e) { return e.t === n.id && e.kind === "study"; }).map(function (e) { return { id: e.s, ref: e.ref }; });
    var html = relList("Reuses engines →", reuses) + relList("Reused by ←", reusedBy) +
      relList("Pins simulator →", pins) + relList("Studied by ←", pinnedBy);
    $("ecomap-pr").innerHTML = html || '<p class="ecomap-empty">No mapped links yet.</p>';
    $("ecomap-pr").querySelectorAll("li[data-go]").forEach(function (li) {
      li.onclick = function () {
        var t = cy.$id(li.getAttribute("data-go"));
        if (t.length) { cy.animate({ center: { eles: t }, duration: 300 }); select(t); }
      };
    });
    $("ecomap-pl").href = "https://github.com/vivarium-collective/" + n.id;
    $("ecomap-panel").classList.add("open");
  }

  function wireControls() {
    $("ecomap-px").onclick = clearSel;
    $("ecomap-q").addEventListener("input", function (e) {
      var v = e.target.value.trim().toLowerCase();
      if (!cy) return;
      if (!v) { cy.elements().removeClass("faded hi"); return; }
      cy.nodes().forEach(function (n) {
        var m = n.id().toLowerCase().indexOf(v) !== -1;
        n.toggleClass("faded", !m); n.toggleClass("hi", m);
      });
      cy.edges().addClass("faded");
    });
    $("ecomap-chips").addEventListener("click", function (e) {
      var b = e.target.closest(".ecomap-chip"); if (!b || !cy) return;
      var on = b.getAttribute("aria-pressed") !== "true";
      b.setAttribute("aria-pressed", on);
      cy.nodes('[kind="' + b.getAttribute("data-kind") + '"]').style("display", on ? "element" : "none");
    });
    $("ecomap-reflow").onclick = function () {
      if (cy) cy.layout({ name: "cose", animate: true, animationDuration: 600, idealEdgeLength: 90,
        nodeRepulsion: 9000, nodeOverlap: 14, gravity: 0.3, padding: 40 }).run();
    };
  }

  function loadCytoscape(src) {
    return new Promise(function (resolve, reject) {
      if (window.cytoscape) return resolve();
      var s = document.createElement("script");
      s.src = src; s.onload = resolve; s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  // re-theme cytoscape when Material's color scheme changes
  var themeObserver = null;
  function watchTheme() {
    if (themeObserver) themeObserver.disconnect();
    themeObserver = new MutationObserver(function () { if (cy) cy.style(styleArray()); });
    themeObserver.observe(document.body, { attributes: true, attributeFilter: ["data-md-color-scheme"] });
  }

  function init() {
    var root = $("ecomap");
    if (!root || !$("cy")) return;
    wireControls();
    watchTheme();
    loadCytoscape(root.getAttribute("data-cytoscape"))
      .then(function () { return fetch(root.getAttribute("data-live"), { cache: "no-cache" }); })
      .then(function (res) { if (!res.ok) throw new Error("HTTP " + res.status); return res.json(); })
      .then(function (d) { build(adaptLedger(d)); })
      .catch(function () {
        $("ecomap-counts").textContent = "Could not load the ecosystem ledger.";
      });
  }

  if (typeof document$ !== "undefined" && document$.subscribe) document$.subscribe(init);
  else document.addEventListener("DOMContentLoaded", init);
})();
