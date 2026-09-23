// Drives the embedded bigraph-loom explorer on the "Explore a bigraph" page.
//
// loom (in the iframe) posts {type:'explore:ready'} when it mounts; we reply with
// {type:'composite:load', state, ...}. A manifest.json lists the available composites
// and populates the picker, so adding a composite is just: drop a JSON in
// docs/assets/loom/composites/ and add a row to manifest.json. Works on a static site
// (same-origin iframe, no server). Instant-navigation safe via document$.
function initLoomExplorer() {
  var frame = document.getElementById("loom-frame");
  if (!frame || frame.dataset.wired === "1") return;
  frame.dataset.wired = "1";

  var picker = document.getElementById("loom-picker");
  var caption = document.getElementById("loom-caption");
  var manifestUrl = frame.getAttribute("data-manifest");
  var base = manifestUrl.replace(/[^/]*$/, ""); // directory of the manifest
  var payload = null;

  function send() {
    if (!payload || !frame.contentWindow) return;
    frame.contentWindow.postMessage(
      {
        type: "composite:load",
        state: payload.state,
        parameters: payload.parameters,
        default_n_steps: payload.default_n_steps,
        metadata: { title: payload.name, description: payload.description }
      },
      "*"
    );
  }

  function nudge() {
    var tries = 0;
    var iv = setInterval(function () {
      send();
      if (++tries > 6) clearInterval(iv);
    }, 1000);
  }

  function load(entry) {
    if (caption) caption.textContent = entry.description || "";
    fetch(base + entry.file)
      .then(function (r) { return r.json(); })
      .then(function (data) {
        payload = data;
        send();
        nudge();
      })
      .catch(function () {
        if (caption) caption.textContent = "Could not load this composite.";
      });
  }

  // loom announces itself; reply with whatever is currently selected.
  window.addEventListener("message", function (e) {
    if (frame.contentWindow && e.source === frame.contentWindow) {
      var d = e.data || {};
      if (d.type === "explore:ready") send();
    }
  });

  fetch(manifestUrl)
    .then(function (r) { return r.json(); })
    .then(function (m) {
      var entries = (m && m.composites) || [];
      if (!entries.length) return;
      if (picker) {
        picker.innerHTML = "";
        entries.forEach(function (entry, i) {
          var opt = document.createElement("option");
          opt.value = String(i);
          opt.textContent = entry.label || entry.id || entry.file;
          picker.appendChild(opt);
        });
        picker.addEventListener("change", function () {
          load(entries[parseInt(picker.value, 10) || 0]);
        });
        picker.disabled = entries.length < 2;
      }
      load(entries[0]);
    })
    .catch(function () {});
}

if (typeof document$ !== "undefined" && document$.subscribe) {
  document$.subscribe(initLoomExplorer);
} else {
  document.addEventListener("DOMContentLoaded", initLoomExplorer);
}
