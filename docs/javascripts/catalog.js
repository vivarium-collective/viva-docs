// Ecosystem catalog explorer.
//
// Live-fetches the authoritative marketplace ledger
// (ecosystem-index.json, published by viva-catalog to gh-pages) and renders a
// grouped, filterable browse view: every repo's processes / steps / composites
// / studies / investigations, grouped by kind, with counts and expandable
// detail. The data source is configured on #cat-root via data- attributes; a
// committed snapshot is the offline / fetch-failure fallback so the page is
// never blank.

(function () {
  "use strict";

  var KIND_META = {
    simulator: {
      label: "Simulators & process libraries",
      badge: "simulator",
      blurb:
        "Real simulators wrapped as process-bigraph Processes/Steps, plus reusable composites. Install one and compose it into a study.",
    },
    workspace: {
      label: "Workspaces & studies",
      badge: "workspace",
      blurb:
        "Research programs that carry their own studies and investigations — a simulator (or a pinned one) plus the questions asked of it.",
    },
    other: {
      label: "Other modules",
      badge: "module",
      blurb: "Supporting modules — emitters, utilities, and infrastructure.",
    },
  };
  var KIND_ORDER = ["simulator", "workspace", "other"];

  // Fine-grained badge within a group, for the card.
  function badgeFor(r) {
    var c = r.counts || {};
    var proc = (c.processes || 0) + (c.steps || 0);
    var comp = c.composites || 0;
    var studies = (c.studies || 0) + (c.investigations || 0);
    if (studies > 0) {
      return proc > 0 || comp > 0 ? "workspace" : "studies";
    }
    if (proc > 0 && comp > 0) return "simulator";
    if (comp > 0) return "composites";
    if (proc > 0) return "processes";
    return "module";
  }

  function kindOf(r) {
    var c = r.counts || {};
    var studies = (c.studies || 0) + (c.investigations || 0);
    var proc = (c.processes || 0) + (c.steps || 0);
    var comp = c.composites || 0;
    if (studies > 0) return "workspace";
    if (proc > 0 || comp > 0) return "simulator";
    return "other";
  }

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function el(html) {
    var t = document.createElement("template");
    t.innerHTML = html.trim();
    return t.content.firstChild;
  }

  // Count categories shown on each card, in order.
  var CAT = [
    ["processes", "process", "processes"],
    ["steps", "step", "steps"],
    ["composites", "composite", "composites"],
    ["studies", "study", "studies"],
    ["investigations", "investigation", "investigations"],
  ];

  function countsRow(r) {
    var c = r.counts || {};
    var parts = [];
    CAT.forEach(function (cat) {
      var n = c[cat[0]] || 0;
      if (!n) return;
      parts.push(
        '<span class="cat-count-pill"><b>' +
          n +
          "</b> " +
          esc(n === 1 ? cat[1] : cat[2]) +
          "</span>"
      );
    });
    return parts.length
      ? '<div class="cat-counts">' + parts.join("") + "</div>"
      : "";
  }

  function artifactList(title, items, max) {
    if (!items || !items.length) return "";
    var shown = items.slice(0, max);
    var rows = shown
      .map(function (it) {
        var name = esc(it.name || "");
        var d = (it.description || "").trim();
        return (
          '<li><code>' +
          name +
          "</code>" +
          (d ? '<span class="cat-art-desc"> — ' + esc(d) + "</span>" : "") +
          "</li>"
        );
      })
      .join("");
    var more =
      items.length > max
        ? '<li class="cat-art-more">+' + (items.length - max) + " more…</li>"
        : "";
    return (
      '<div class="cat-art-group"><h4>' +
      esc(title) +
      ' <span class="cat-art-n">' +
      items.length +
      "</span></h4><ul>" +
      rows +
      more +
      "</ul></div>"
    );
  }

  function detailsBlock(r) {
    var blocks = [
      artifactList("Processes", r.processes, 12),
      artifactList("Steps", r.steps, 12),
      artifactList("Composites", r.composites, 12),
      artifactList("Studies", r.studies, 12),
      artifactList("Investigations", r.investigations, 12),
    ]
      .filter(Boolean)
      .join("");
    if (!blocks) return "";
    return (
      '<details class="cat-details"><summary>Contents</summary>' +
      '<div class="cat-art">' +
      blocks +
      "</div></details>"
    );
  }

  function searchBlob(r) {
    var bits = [r.name, r.description, (r.tags || []).join(" ")];
    ["processes", "steps", "composites", "studies", "investigations"].forEach(
      function (k) {
        (r[k] || []).forEach(function (it) {
          bits.push(it.name);
        });
      }
    );
    return bits.join(" ").toLowerCase();
  }

  function cardFor(r) {
    var tags = (r.tags || []).map(function (t) {
      return '<span class="cat-tag">' + esc(t) + "</span>";
    });
    var home =
      r.homepage || r.source || "https://github.com/vivarium-collective/" + r.name;
    var badge = badgeFor(r);
    var html =
      '<div class="cat-card" data-kind="' +
      esc(kindOf(r)) +
      '" data-tags="' +
      esc((r.tags || []).join(" ")) +
      '" data-text="' +
      esc(searchBlob(r)) +
      '">' +
      '<div class="cat-card-head"><h3>' +
      esc(r.name) +
      '</h3><a class="cat-repo" href="' +
      esc(home) +
      '" target="_blank" rel="noopener" title="Open repository">GitHub &#8599;</a></div>' +
      '<div class="cat-badges"><span class="cat-kind cat-kind-' +
      esc(badge) +
      '">' +
      esc(badge) +
      "</span></div>" +
      '<p class="cat-desc">' +
      (esc(r.description) || "<em>No description yet.</em>") +
      "</p>" +
      countsRow(r) +
      (tags.length ? '<div class="cat-tags">' + tags.join("") + "</div>" : "") +
      detailsBlock(r) +
      '<code class="cat-install">/viva-catalog install ' +
      esc(r.name) +
      "</code>" +
      "</div>";
    return el(html);
  }

  function render(root, index) {
    var repos = (index.repos || []).slice();
    repos.sort(function (a, b) {
      return (a.name || "").toLowerCase() < (b.name || "").toLowerCase() ? -1 : 1;
    });

    // ----- summary bar -----
    var byKind = { simulator: 0, workspace: 0, other: 0 };
    repos.forEach(function (r) {
      byKind[kindOf(r)]++;
    });
    var when = index.generated_at
      ? new Date(index.generated_at).toLocaleDateString(undefined, {
          year: "numeric",
          month: "short",
          day: "numeric",
        })
      : "";
    var summary =
      '<div class="cat-summary"><b>' +
      repos.length +
      "</b> modules &middot; <b>" +
      byKind.simulator +
      "</b> simulators &middot; <b>" +
      byKind.workspace +
      "</b> workspaces" +
      (byKind.other ? " &middot; <b>" + byKind.other + "</b> other" : "") +
      (when ? ' <span class="cat-asof">updated ' + esc(when) + "</span>" : "") +
      "</div>";

    // ----- controls -----
    var allTags = {};
    repos.forEach(function (r) {
      (r.tags || []).forEach(function (t) {
        allTags[t] = (allTags[t] || 0) + 1;
      });
    });
    var tagNames = Object.keys(allTags).sort();
    var kindChips = KIND_ORDER.filter(function (k) {
      return byKind[k] > 0;
    })
      .map(function (k) {
        return (
          '<button class="cat-chip cat-chip-kind" data-kind="' +
          k +
          '">' +
          esc(KIND_META[k].badge) +
          ' <span class="cat-chip-n">' +
          byKind[k] +
          "</span></button>"
        );
      })
      .join("");
    var tagChips = tagNames
      .map(function (t) {
        return '<button class="cat-chip" data-tag="' + esc(t) + '">' + esc(t) + "</button>";
      })
      .join("");

    var controls = el(
      '<div class="cat-controls">' +
        summary +
        '<input type="search" id="cat-search" class="cat-search" placeholder="Search modules, processes, studies…" aria-label="Search modules">' +
        '<div class="cat-chiprow"><span class="cat-chip-label">Kind</span>' +
        kindChips +
        "</div>" +
        '<div class="cat-chiprow"><span class="cat-chip-label">Tags</span>' +
        tagChips +
        "</div>" +
        '<div class="cat-count" id="cat-count"></div>' +
        "</div>"
    );

    // ----- grouped grid -----
    var wrap = el('<div class="cat-groups"></div>');
    var sections = {};
    KIND_ORDER.forEach(function (k) {
      if (!byKind[k]) return;
      var sec = el(
        '<section class="cat-group" data-kind="' +
          k +
          '"><div class="cat-group-head"><h2>' +
          esc(KIND_META[k].label) +
          ' <span class="cat-group-n">' +
          byKind[k] +
          '</span></h2><p class="cat-group-blurb">' +
          esc(KIND_META[k].blurb) +
          '</p></div><div class="cat-grid"></div></section>'
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
        var matchText = !q || text.indexOf(q) !== -1;
        var matchTags =
          activeTags.size === 0 ||
          tags.some(function (t) {
            return activeTags.has(t);
          });
        var matchKind = activeKinds.size === 0 || activeKinds.has(kind);
        var show = matchText && matchTags && matchKind;
        card.hidden = !show;
        if (show) shown++;
      });
      // hide empty group sections
      root.querySelectorAll(".cat-group").forEach(function (sec) {
        var any = sec.querySelector(".cat-card:not([hidden])");
        sec.hidden = !any;
      });
      if (countEl) {
        countEl.textContent =
          shown === cards.length
            ? cards.length + " modules shown"
            : shown + " of " + cards.length + " shown";
      }
      if (emptyEl) emptyEl.hidden = shown !== 0;
    }

    if (search) search.addEventListener("input", apply);
    root.querySelectorAll(".cat-chip").forEach(function (chip) {
      chip.addEventListener("click", function () {
        var tag = chip.getAttribute("data-tag");
        var kind = chip.getAttribute("data-kind");
        var set = kind ? activeKinds : activeTags;
        var key = kind || tag;
        if (set.has(key)) {
          set.delete(key);
          chip.classList.remove("is-active");
        } else {
          set.add(key);
          chip.classList.add("is-active");
        }
        apply();
      });
    });
    apply();
  }

  function fail(root, msg, home) {
    root.innerHTML =
      '<div class="cat-error"><p>' +
      esc(msg) +
      "</p><p>Browse the registry directly on " +
      '<a href="' +
      esc(home) +
      '" target="_blank" rel="noopener">GitHub</a>.</p></div>';
  }

  function load() {
    var root = document.getElementById("cat-root");
    if (!root) return;
    var live = root.getAttribute("data-live");
    var fallback = root.getAttribute("data-fallback");
    var home =
      root.getAttribute("data-home") ||
      "https://github.com/vivarium-collective/viva-catalog";

    function tryUrl(url) {
      return fetch(url, { cache: "no-cache" }).then(function (res) {
        if (!res.ok) throw new Error("HTTP " + res.status);
        return res.json();
      });
    }

    tryUrl(live)
      .catch(function () {
        return fallback ? tryUrl(fallback) : Promise.reject();
      })
      .then(function (index) {
        render(root, index);
      })
      .catch(function () {
        fail(root, "Could not load the module catalog right now.", home);
      });
  }

  if (typeof document$ !== "undefined" && document$.subscribe) {
    document$.subscribe(load);
  } else {
    document.addEventListener("DOMContentLoaded", load);
  }
})();
