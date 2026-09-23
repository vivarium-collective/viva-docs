// Client-side filter for the module catalog page.
// Works with Material's instant navigation via document$ when available.
function initVivaCatalog() {
  var grid = document.getElementById("cat-grid");
  if (!grid) return;
  var search = document.getElementById("cat-search");
  var chipBox = document.getElementById("cat-chips");
  var countEl = document.getElementById("cat-count");
  var emptyEl = document.getElementById("cat-empty");
  var cards = Array.prototype.slice.call(grid.querySelectorAll(".cat-card"));
  var active = new Set();

  function apply() {
    var q = (search && search.value ? search.value : "").trim().toLowerCase();
    var shown = 0;
    cards.forEach(function (card) {
      var text = card.getAttribute("data-text") || "";
      var tags = (card.getAttribute("data-tags") || "").split(/\s+/);
      var matchText = !q || text.indexOf(q) !== -1;
      var matchTags =
        active.size === 0 ||
        tags.some(function (t) {
          return active.has(t);
        });
      var show = matchText && matchTags;
      card.hidden = !show;
      if (show) shown++;
    });
    if (countEl) {
      countEl.textContent =
        shown === cards.length
          ? cards.length + " modules"
          : shown + " of " + cards.length;
    }
    if (emptyEl) emptyEl.hidden = shown !== 0;
  }

  if (search) search.addEventListener("input", apply);
  if (chipBox) {
    chipBox.querySelectorAll(".cat-chip").forEach(function (chip) {
      chip.addEventListener("click", function () {
        var tag = chip.getAttribute("data-tag");
        if (active.has(tag)) {
          active.delete(tag);
          chip.classList.remove("is-active");
        } else {
          active.add(tag);
          chip.classList.add("is-active");
        }
        apply();
      });
    });
  }
  apply();
}

if (typeof document$ !== "undefined" && document$.subscribe) {
  document$.subscribe(initVivaCatalog);
} else {
  document.addEventListener("DOMContentLoaded", initVivaCatalog);
}
