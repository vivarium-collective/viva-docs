// Ecosystem catalog explorer.
//
// Live-fetches the authoritative marketplace ledger (ecosystem-index.json,
// published by viva-catalog to gh-pages) and renders a compact, grouped,
// filterable browse view. Capability tags are derived from each repo's text +
// artifacts (GitHub topics alone are too sparse to filter by). Data source is
// configured on #cat-root via data- attributes; a committed snapshot is the
// offline / fetch-failure fallback so the page is never blank.

(function () {
  "use strict";

  var KIND_META = {
    simulator: {
      label: "Simulators & process libraries",
      chip: "Simulators",
      blurb:
        "Real engines wrapped as process-bigraph Processes/Steps you can install and compose — plus reusable composites. No studies of their own.",
    },
    workspace: {
      label: "Workspaces & studies",
      chip: "Workspaces",
      blurb:
        "Research programs: a simulator (or one pinned by version) plus the studies and investigations asked of it.",
    },
    other: { label: "Other modules", chip: "Other", blurb: "Emitters, utilities, and infrastructure." },
  };
  var KIND_ORDER = ["simulator", "workspace", "other"];

  // Capability tags derived from name + description + artifact names. Each rule
  // is [tag, [substrings]]; a match on any substring adds the tag. Kept broad
  // but specific enough to be useful filters.
  var CAP_RULES = [
    ["fba", ["fba", "flux balance", "cobra", "dfba", "metabolic flux", "comets"]],
    ["ode", ["ode", "roadrunner", "tellurium", "differential equation", "kinetic", "rate law", "copasi", "amici"]],
    ["sbml", ["sbml", "antimony", "biomodels", "systems biology markup"]],
    ["pde", ["pde", "finite-volume", "finite volume", "finite-element", "finite element", "fipy", "fenics", "vcell"]],
    ["reaction-diffusion", ["reaction-diffusion", "reaction diffusion", "readdy", "smoldyn", "diffusion-advection"]],
    ["spatial", ["spatial", "lattice", "spatio-temporal", "spatio temporal"]],
    ["stochastic", ["stochastic", "gillespie", " ssa", "langevin", "monte carlo"]],
    ["agent-based", ["agent-based", "agent based", "individual-based", "individual based", "iirabm", " abm"]],
    ["multicellular", ["multicellular", "multi-cell", "multicell", "tissue", "cellular potts", "compucell", "vertex model", "artistoo", "chaste", "colony"]],
    ["molecular-dynamics", ["molecular dynamics", "lammps", "martini", "openmm", "coarse-grained", "coarse grained"]],
    ["membrane", ["membrane", "lipid", "vesicle", "bilayer", "mem3dg", "basement membrane"]],
    ["cytoskeleton", ["cytoskeleton", "actin", "medyan", "filament"]],
    ["metabolism", ["metabol", "enzyme", "crossfeeding", "cross-feeding"]],
    ["microbial", ["microbial", "microbiome", "lotka", "glv", "coculture", "co-culture", "community"]],
    ["signaling", ["signal", "mapk", "nf-kb", "nfkb", "boolean network", "maboss", "pathway"]],
    ["rule-based", ["rule-based", "rule based", "bionetgen", "nfsim", "grammar"]],
    ["whole-cell", ["whole-cell", "whole cell", "e. coli", "e.coli", "ecoli", "wholecell"]],
    ["particle", ["particle", "brownian", "readdy", "smoldyn", "pymunk", "particle-based"]],
    ["physics", ["physics", "mechanic", "pymunk", "force field", "rigid body"]],
    ["geochemistry", ["geochem", "phreeqc", "equilibrium chemistry"]],
    ["pharmacology", ["pharmac", "pkpd", "pbpk", "physiolog", "pulse"]],
    ["quantum", ["quantum", "pennylane", "qml"]],
    ["bioreactor", ["bioreactor", "fermentation"]],
    ["structural", ["structural", "molecular packing", "chromosome", "3d structure"]],
  ];

  function deriveTags(r) {
    var hay = [r.name, r.description]
      .concat(["processes", "steps", "composites", "studies", "investigations"]
        .reduce(function (acc, k) {
          (r[k] || []).forEach(function (it) { acc.push(it.name, it.description); });
          return acc;
        }, []))
      .join(" ")
      .toLowerCase();
    var tags = {};
    CAP_RULES.forEach(function (rule) {
      if (rule[1].some(function (kw) { return hay.indexOf(kw) !== -1; })) tags[rule[0]] = 1;
    });
    // fold in real GitHub topics
    (r.tags || []).forEach(function (t) { tags[t] = 1; });
    return Object.keys(tags).sort();
  }

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  function el(html) {
    var t = document.createElement("template");
    t.innerHTML = html.trim();
    return t.content.firstChild;
  }

  function kindOf(r) {
    var c = r.counts || {};
    if ((c.studies || 0) + (c.investigations || 0) > 0) return "workspace";
    if ((c.processes || 0) + (c.steps || 0) + (c.composites || 0) > 0) return "simulator";
    return "other";
  }

  var CAT = [
    ["processes", "proc"], ["steps", "steps"], ["composites", "comp"],
    ["studies", "studies"], ["investigations", "inv"],
  ];

  function countsLine(r) {
    var c = r.counts || {};
    var parts = [];
    CAT.forEach(function (cat) {
      var n = c[cat[0]] || 0;
      if (n) parts.push('<b>' + n + "</b> " + esc(cat[1]));
    });
    return parts.length ? '<div class="cat-counts">' + parts.join('<span class="cat-dot">·</span>') + "</div>" : "";
  }

  function artList(title, items, max) {
    if (!items || !items.length) return "";
    var rows = items.slice(0, max).map(function (it) {
      var d = (it.description || "").trim();
      return '<li><code>' + esc(it.name || "") + "</code>" +
        (d ? '<span class="cat-art-desc"> — ' + esc(d) + "</span>" : "") + "</li>";
    }).join("");
    var more = items.length > max ? '<li class="cat-art-more">+' + (items.length - max) + " more…</li>" : "";
    return '<div class="cat-art-group"><h4>' + esc(title) + ' <span class="cat-art-n">' + items.length +
      "</span></h4><ul>" + rows + more + "</ul></div>";
  }

  function detailsBlock(r) {
    var blocks = [
      artList("Processes", r.processes, 12), artList("Steps", r.steps, 12),
      artList("Composites", r.composites, 12), artList("Studies", r.studies, 12),
      artList("Investigations", r.investigations, 12),
    ].filter(Boolean).join("");
    return blocks
      ? '<details class="cat-details"><summary>Contents</summary><div class="cat-art">' + blocks + "</div></details>"
      : "";
  }

  function cardFor(r) {
    var tags = r._tags || [];
    var tagHtml = tags.slice(0, 5).map(function (t) { return '<span class="cat-tag">' + esc(t) + "</span>"; }).join("");
    if (tags.length > 5) tagHtml += '<span class="cat-tag cat-tag-more">+' + (tags.length - 5) + "</span>";
    var home = r.homepage || r.source || "https://github.com/vivarium-collective/" + r.name;
    var blob = (r.name + " " + r.description + " " + tags.join(" ") + " " + (r._artNames || "")).toLowerCase();
    return el(
      '<div class="cat-card" data-kind="' + esc(kindOf(r)) + '" data-tags="' + esc(tags.join(" ")) +
        '" data-text="' + esc(blob) + '">' +
        '<div class="cat-card-head"><h3>' + esc(r.name) + '</h3>' +
        '<a class="cat-repo" href="' + esc(home) + '" target="_blank" rel="noopener" title="Open repository">GitHub &#8599;</a></div>' +
        '<p class="cat-desc">' + (esc(r.description) || "<em>No description.</em>") + "</p>" +
        countsLine(r) +
        (tagHtml ? '<div class="cat-tags">' + tagHtml + "</div>" : "") +
        '<div class="cat-card-foot">' + detailsBlock(r) +
        '<code class="cat-install" title="Install into a workspace">install ' + esc(r.name) + "</code></div>" +
        "</div>"
    );
  }

  function render(root, index) {
    var repos = (index.repos || []).slice().sort(function (a, b) {
      return (a.name || "").toLowerCase() < (b.name || "").toLowerCase() ? -1 : 1;
    });

    // precompute tags + totals
    var byKind = { simulator: 0, workspace: 0, other: 0 };
    var totals = { processes: 0, composites: 0, studies: 0, investigations: 0 };
    var tagCount = {};
    repos.forEach(function (r) {
      byKind[kindOf(r)]++;
      var c = r.counts || {};
      totals.processes += (c.processes || 0) + (c.steps || 0);
      totals.composites += c.composites || 0;
      totals.studies += c.studies || 0;
      totals.investigations += c.investigations || 0;
      r._tags = deriveTags(r);
      r._tags.forEach(function (t) { tagCount[t] = (tagCount[t] || 0) + 1; });
      r._artNames = ["processes", "steps", "composites", "studies", "investigations"]
        .reduce(function (a, k) { (r[k] || []).forEach(function (it) { a.push(it.name); }); return a; }, []).join(" ");
    });

    var when = index.generated_at
      ? new Date(index.generated_at).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })
      : "";

    // ----- header: headline + ecosystem totals + legend -----
    var header =
      '<div class="cat-head">' +
        '<div class="cat-summary"><span class="cat-stat"><b>' + repos.length + "</b> modules</span>" +
          '<span class="cat-stat"><b>' + byKind.simulator + "</b> simulators</span>" +
          '<span class="cat-stat"><b>' + byKind.workspace + "</b> workspaces</span>" +
          (when ? '<span class="cat-asof">updated ' + esc(when) + "</span>" : "") + "</div>" +
        '<div class="cat-totals">In the catalog: ' +
          '<span><b>' + totals.processes + "</b> processes</span><span class=\"cat-dot\">·</span>" +
          '<span><b>' + totals.composites + "</b> composites</span><span class=\"cat-dot\">·</span>" +
          '<span><b>' + totals.studies + "</b> studies</span><span class=\"cat-dot\">·</span>" +
          '<span><b>' + totals.investigations + "</b> investigations</span></div>" +
        '<p class="cat-legend"><b>Simulators</b> wrap a real engine as installable Processes; ' +
          "<b>workspaces</b> are research programs whose studies pin a simulator by version.</p>" +
      "</div>";

    // ----- controls -----
    var tagNames = Object.keys(tagCount).sort(function (a, b) {
      return tagCount[b] - tagCount[a] || (a < b ? -1 : 1);
    });
    var kindChips = KIND_ORDER.filter(function (k) { return byKind[k]; }).map(function (k) {
      return '<button class="cat-chip cat-chip-kind" data-kind="' + k + '">' + esc(KIND_META[k].chip) +
        ' <span class="cat-chip-n">' + byKind[k] + "</span></button>";
    }).join("");
    var tagChips = tagNames.map(function (t) {
      return '<button class="cat-chip" data-tag="' + esc(t) + '">' + esc(t) +
        ' <span class="cat-chip-n">' + tagCount[t] + "</span></button>";
    }).join("");

    var controls = el(
      '<div class="cat-controls">' +
        '<input type="search" id="cat-search" class="cat-search" placeholder="Search modules, processes, studies…" aria-label="Search modules">' +
        '<div class="cat-chiprow"><span class="cat-chip-label">Kind</span>' + kindChips + "</div>" +
        '<div class="cat-chiprow"><span class="cat-chip-label">Capability</span>' + tagChips + "</div>" +
        '<div class="cat-count" id="cat-count"></div>' +
      "</div>"
    );

    // ----- grouped grid -----
    var wrap = el('<div class="cat-groups"></div>');
    var sections = {};
    KIND_ORDER.forEach(function (k) {
      if (!byKind[k]) return;
      var sec = el(
        '<section class="cat-group" data-kind="' + k + '"><div class="cat-group-head"><h2>' +
          esc(KIND_META[k].label) + ' <span class="cat-group-n">' + byKind[k] + "</span></h2>" +
          '<p class="cat-group-blurb">' + esc(KIND_META[k].blurb) + "</p></div><div class=\"cat-grid\"></div></section>"
      );
      sections[k] = sec;
      wrap.appendChild(sec);
    });
    repos.forEach(function (r) {
      var sec = sections[kindOf(r)];
      if (sec) sec.querySelector(".cat-grid").appendChild(cardFor(r));
    });

    var empty = el('<p class="cat-empty" id="cat-empty" hidden>No modules match your filter.</p>');
    root.innerHTML = "";
    root.appendChild(el(header));
    root.appendChild(controls);
    root.appendChild(wrap);
    root.appendChild(empty);
    wireFilters(root);
  }

  function wireFilters(root) {
    var search = root.querySelector("#cat-search");
    var countEl = root.querySelector("#cat-count");
    var emptyEl = root.querySelector("#cat-empty");
    var cards = Array.prototype.slice.call(root.querySelectorAll(".cat-card"));
    var activeTags = new Set();
    var activeKinds = new Set();

    function apply() {
      var q = (search && search.value ? search.value : "").trim().toLowerCase();
      var shown = 0;
      cards.forEach(function (card) {
        var text = card.getAttribute("data-text") || "";
        var tags = (card.getAttribute("data-tags") || "").split(/\s+/);
        var kind = card.getAttribute("data-kind") || "";
        var ok = (!q || text.indexOf(q) !== -1) &&
          (activeTags.size === 0 || tags.some(function (t) { return activeTags.has(t); })) &&
          (activeKinds.size === 0 || activeKinds.has(kind));
        card.hidden = !ok;
        if (ok) shown++;
      });
      root.querySelectorAll(".cat-group").forEach(function (sec) {
        sec.hidden = !sec.querySelector(".cat-card:not([hidden])");
      });
      if (countEl) countEl.textContent = shown === cards.length ? cards.length + " shown" : shown + " of " + cards.length + " shown";
      if (emptyEl) emptyEl.hidden = shown !== 0;
    }

    if (search) search.addEventListener("input", apply);
    root.querySelectorAll(".cat-chip").forEach(function (chip) {
      chip.addEventListener("click", function () {
        var tag = chip.getAttribute("data-tag");
        var kind = chip.getAttribute("data-kind");
        var set = kind ? activeKinds : activeTags;
        var key = kind || tag;
        if (set.has(key)) { set.delete(key); chip.classList.remove("is-active"); }
        else { set.add(key); chip.classList.add("is-active"); }
        apply();
      });
    });
    apply();
  }

  function fail(root, msg, home) {
    root.innerHTML = '<div class="cat-error"><p>' + esc(msg) +
      '</p><p>Browse the registry on <a href="' + esc(home) + '" target="_blank" rel="noopener">GitHub</a>.</p></div>';
  }

  function load() {
    var root = document.getElementById("cat-root");
    if (!root) return;
    var live = root.getAttribute("data-live");
    var fallback = root.getAttribute("data-fallback");
    var home = root.getAttribute("data-home") || "https://github.com/vivarium-collective/viva-catalog";
    function tryUrl(url) {
      return fetch(url, { cache: "no-cache" }).then(function (res) {
        if (!res.ok) throw new Error("HTTP " + res.status);
        return res.json();
      });
    }
    tryUrl(live)
      .catch(function () { return fallback ? tryUrl(fallback) : Promise.reject(); })
      .then(function (index) { render(root, index); })
      .catch(function () { fail(root, "Could not load the module catalog right now.", home); });
  }

  if (typeof document$ !== "undefined" && document$.subscribe) document$.subscribe(load);
  else document.addEventListener("DOMContentLoaded", load);
})();
